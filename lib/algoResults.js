'use strict';

const BBPromise = require('bluebird');
const { HTTPError } = require('./util');
const fs = BBPromise.promisifyAll(require('fs'));
const wikiId = require('./wikiId');
const defaultLimit = 10;
const expectedHeaders = [
	'page_id',
	'page_title',
	'image_id',
	'confidence_rating',
	'source',
	'dataset_id',
	'insertion_ts',
	'wiki'
];

class AlgoResults {
	constructor(database) {
		this.database = database;
	}

	/**
	 * Validate first row of TSV file with exepcted headers
	 *
	 * @param {string[]} headers first row of tsv file as headers
	 * @param {string[]} expectedHeaders expected order of headers
	 * @throws {Error} If headers are not in the same order as expected headers
	 */
	validateHeaders(headers, expectedHeaders) {
		if (headers.length !== expectedHeaders.length) {
			throw new Error('TSV headers to not match expected headers');
		}
		headers.forEach((header, idx) => {
			if (expectedHeaders[idx] !== header) {
				throw new Error(`Expected ${header} to equal ${expectedHeaders[idx]}`);
			}
		});
	}

	/**
	 * Query database for /pages endpoint.
	 *
	 * @param {string} id combination of wiki type and language (e.g. enwiki, arwiki)
	 * @param {string} query request's query params
	 * @return {Promise} resolves as array of json objects representing db rows, or
	 * rejected if error occurs.
	 */
	async queryDBForPages(id, query) {
		let { limit = defaultLimit, offset = 0 } = query;
		limit = parseInt(limit);
		offset = parseInt(offset);

		const selectStatement =
			`SELECT
				outerPage.title AS page,
				${id}_image.wiki AS project,
				json_group_array(
					json_object(
						'filename',
						${id}_image.id,
						'confidence_rating',
						${id}_image.confidence_rating,
						'source',
						'ima'
					)
				) suggestions
			FROM ${id}_page outerPage
			INNER JOIN ${id}_image_page on ${id}_image_page.page_id = outerPage.id
			INNER JOIN ${id}_image on ${id}_image.id = ${id}_image_page.image_id
			GROUP BY outerPage.id
			ORDER BY outerPage.id
			LIMIT ? OFFSET ?`;

		try {
			const results = await this.database.exec(selectStatement, [limit, offset]);
			return results;
		} catch (err) {
			throw new HTTPError({
				status: 500,
				type: 'error',
				title: 'Error',
				detail: `Unable to retrieve image matching algorithm results for ${id}`
			});
		}
	}

	isNullValue(value) {
		return value === 'NULL' || value === null;
	}

	/**
	 * Populate in-memory database with data from project's tsv files.
	 * Stream tsv contents to readline module line by line, and do batch inserts into
	 * the database's page and image tables.
	 *
	 * @param {string} tsvDir relative directory to look for all tsv files to import
	 * @return {Promise} Resolves if no error occur, rejects with any errors during parsing
	 */
	populateDatabase(tsvDir) {
		return new Promise((resolve, reject) => {
			let tsvFiles;
			try {
				tsvFiles = fs.readdirSync(tsvDir).filter((filename) => filename.split('.').pop() === 'tsv');
			} catch (err) {
				reject(err);
			}
			if (!tsvFiles.length) {
				reject(new Error('No tsv files found to populate database with'));
			}
			let completedFiles = 0;
			tsvFiles.forEach((tsvFile) => {
				const fileAndExtension = tsvFile.match(/(.{2,3})(wi.{2,3})\.tsv/);
				const lang = fileAndExtension[1];
				const abbrevProject = fileAndExtension[2];
				const project = wikiId.getProjectName(abbrevProject);
				const id = wikiId.getWikiId(project, lang);
				if (id) {
					const path = `${tsvDir}/${tsvFile}`;
					const insertChunks = 20;
					const readStream = fs.createReadStream(path);

					readStream.on('error', (err) => {
						reject(`Cannot find algorithm results for ${tsvFile}`);
					});

					const lineReader = require('readline').createInterface({
						input: readStream
					});

					let lineCount = 0;
					let pageRows = [];
					let imageRows = [];
					let joinTableRows = [];
					let imageRow;
					let pageRow;
					lineReader.on('line', (line) => {
						if (lineCount === 0) {
							const headers = line.split('\t'); // We assume first line is headers
							this.validateHeaders(headers, expectedHeaders);
						} else {
							const row = line.split('\t');
							if (row.length !== expectedHeaders.length) {
								reject('Invalid row to insert');
							}

							pageRow = row.slice(0, 2);
							// TODO make a validate function here?
							const pageID = parseInt(pageRow[0]);
							pageRow[0] = pageID;

							imageRow = row.slice(2);
							const imageID = imageRow[0];

							if (lineCount > 0) {
								pageRows = pageRows.concat(pageRow);
								// Skip rows with no suggestions (null image_id) to the database
								// If we get a bunch of null images in successive .tsv rows, we may
								// not have any images to insert when it is time to insert pages.
								// So be sure to check for that below.
								if (!this.isNullValue(imageID)) {
									imageRows = imageRows.concat(imageRow);
									joinTableRows.push(pageID, imageID);
								}
							}
							if (lineCount === insertChunks) {
								this.database.insert(`${id}_page`, pageRow.length, pageRows);
								if (imageRows.length > 0) {
									this.database.insert(`${id}_image`, imageRow.length, imageRows); // skips any nulls
									this.database.insert(`${id}_image_page`, 2, joinTableRows); // skips any nulls
								}
								lineCount = 0;
								pageRows = [];
								imageRows = [];
								joinTableRows = [];
							}
						}
						lineCount++;
					});

					// We are done with the file, so insert any leftover rows
					lineReader.on('close', () => {
						if (pageRows.length) {
							this.database.insert(`${id}_page`, pageRow.length, pageRows);
						}
						if (imageRows.length) {  // skips any nulls
							this.database.insert(`${id}_image`, imageRow.length, imageRows);
							this.database.insert(`${id}_image_page`, 2, joinTableRows);
						}
						completedFiles++;
						if (completedFiles === tsvFiles.length) {
							resolve(id);
						}
					});
				}
			});
		});
	}
}

module.exports = AlgoResults;
