'use strict';

const BBPromise = require('bluebird');
const { HTTPError } = require('./util');
const fs = BBPromise.promisifyAll(require('fs'));
const wikiId = require('./wikiId');
const es = require('event-stream');
const expectedHeaders = [
	'page_id',
	'page_title',
	'image_id',
	'confidence_rating',
	'source',
	'dataset_id',
	'insertion_ts',
	'wiki',
	'found_on'
];
const pageTableAllRowCount = {};
const pageTableImaRowCount = {};

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
			throw new Error('TSV headers do not match expected headers');
		}
		headers.forEach((header, idx) => {
			if (expectedHeaders[idx] !== header) {
				throw new Error(`Expected ${header} to equal ${expectedHeaders[idx]}`);
			}
		});
	}

	/**
	 * Returns the size (number of rows) of the specified page table for the
	 * specified source.
	 *
	 * @param {string} wikiId wiki id of interest
	 * @param {string} source the source to consider (if any)
	 * @return {integer} the row count
	 */
	getPageTableRowCount(wikiId, source) {
		// We could do a db query, but as long as our data is immutable this is faster.
		// And we already count rows during population, so initializing it is virtually free.
		if (source === 'ima') {
			return pageTableImaRowCount[`${wikiId}_page`];
		} else {
			return pageTableAllRowCount[`${wikiId}_page`];
		}
	}

	/**
	 * Query database for rownums corresponding to the input page ids
	 *
	 * @param {string} wikiId combination of wiki type and language (e.g. enwiki, arwiki)
	 * @param {string} source the source to consider (if any)
	 * @param {Array} id page ids
	 * @return {Promise} resolves as array of row nums, or rejected if error occurs.
	 */
	async queryDBForRowNums(wikiId, source, id) {
		const inStr = id.join();
		const colName = source === 'ima' ? 'row_num_ima' : 'row_num';
		const selectStatement =
			`SELECT page.${colName}
			 FROM ${wikiId}_page page
			 WHERE page.id IN (${inStr})`;

		try {
			const results = await this.database.exec(selectStatement);
			return results.map((result) => {
				return result[colName];
			});
		} catch (err) {
			console.log(err);
			throw new HTTPError({
				status: 500,
				type: 'error',
				title: 'Error',
				detail: `Unable to retrieve page ids for ${wikiId}`
			});
		}
	}

	/**
	 * Query database for /pages endpoint.
	 *
	 * @param {string} wikiId combination of wiki type and language (e.g. enwiki, arwiki)
	 * @param {string} source
	 * @param {integer} limit
	 * @param {integer} offset
	 * @param {Array} rowNums specific row numbers to request, if desired
	 * @return {Promise} resolves as array of json objects representing db rows, or
	 * rejected if error occurs.
	 */
	async queryDBForPages(wikiId, source, limit, offset, rowNums = []) {
		let whereTest = '1';
		if (rowNums.length > 0) {
			const inCol = source === 'ima' ? 'row_num_ima' : 'row_num';
			whereTest = 'outerPage.' + inCol + ' IN (' + rowNums.join() + ')';
			offset = 0;
		}
		// The caller probably doesn't care about rowNum, but it is useful for debugging
		// and pulling it from a row we've already selected is extremely fast.
		const selectStatementImaOnly =
			`SELECT
				outerPage.row_num,
				outerPage.title AS page,
				outerPage.id AS page_id,
				"${wikiId}" AS project,
				json_group_array(
					json_object(
						'filename',
						${wikiId}_image.id,
						'confidence_rating',
						${wikiId}_image.confidence_rating,
						'source',
						${wikiId}_image.source,
						'found_on',
						${wikiId}_image.found_on,
						'dataset_id',
						${wikiId}_image.dataset_id
					)
				) suggestions
			FROM ${wikiId}_page outerPage
			INNER JOIN ${wikiId}_image_page ON ${wikiId}_image_page.page_id = outerPage.id
			INNER JOIN ${wikiId}_image ON ${wikiId}_image.id = ${wikiId}_image_page.image_id
				AND ${wikiId}_image.source = ${wikiId}_image_page.image_source
			WHERE ${whereTest}
			GROUP BY outerPage.id
			ORDER BY outerPage.id
			LIMIT ? OFFSET ?`;

		// TODO: We could also do this by using the "ima" query above but with the INNER JOIN
		// replaced by a LEFT JOIN. This would avoid the subquery, but we'd have to do the
		// json conversion ourselves, because there's no way to tell json_group_array to exclude
		// certain rows. See if one way or the other is significantly faster.
		const selectStatementAllSources =
			`SELECT
				outerPage.title AS page,
				outerPage.id AS page_id,
				"${wikiId}" AS project,
				(
					SELECT
						json_group_array(
							json_object(
								'filename',
								inner_image.id,
								'confidence_rating',
								inner_image.confidence_rating,
								'source',
								inner_image.source,
								'found_on',
								inner_image.found_on,
								'dataset_id',
								inner_image.dataset_id
							)
						)
					FROM ${wikiId}_image inner_image
					INNER JOIN ${wikiId}_image_page
						ON ${wikiId}_image_page.page_id = outerPage.id
						AND ${wikiId}_image_page.image_source = inner_image.source
					WHERE inner_image.id = ${wikiId}_image_page.image_id
				) suggestions
			FROM ${wikiId}_page outerPage
			WHERE ${whereTest}
			GROUP BY outerPage.id
			ORDER BY outerPage.id
			LIMIT ? OFFSET ?`;

		try {
			// For requests that want only image matching algorithm results, it should be
			// much more efficient to let the db filter out pages without algorithm results via
			// an INNER JOIN. But for requests that also include results from other sources, we
			// need the page portion of the results from the db even if there are no corresponding
			// image matching algorithm suggestions. This requires a more complicated query.
			// TODO: confirm the performance assumption that subqueries are significantly slower
			const selectStatement = source === 'ima' ? selectStatementImaOnly : selectStatementAllSources;
			const results = await this.database.exec(selectStatement, [limit, offset]);
			return results;
		} catch (err) {
			console.log(err);
			throw new HTTPError({
				status: 500,
				type: 'error',
				title: 'Error',
				detail: `Unable to retrieve image matching algorithm results for ${wikiId}`
			});
		}
	}

	isEmptyValue(value) {
		return value === '' || value === 'NULL' || value === null;
	}

	insertFile(tsvFile, tsvDir) {
		return new BBPromise((resolve, reject) => {
			const path = `${tsvDir}/${tsvFile}`;
			const filenameRegex = /(.{2,3}wi.{2,3})\.tsv/;
			const wikiId = tsvFile.match(filenameRegex)[1];
			const insertChunks = 40;
			const readStream = fs.createReadStream(path);

			readStream.on('error', (err) => {
				reject(`Cannot find algorithm results for ${tsvFile}`);
			});

			let pageRowNum = 1; // one-origin
			let pageRowNumIma = 1; // one-origin
			let lastPageID = 0;
			let lineCount = 0;
			let pageRows = [];
			let imageRows = [];
			let joinTableRows = [];
			let imageRow;
			let pageRow;

			readStream
			.pipe(es.split())
			.pipe(
				es.map((line, cb) => { // eslint-disable-line array-callback-return
					if (lineCount === 0) {
						const headers = line.split('\t'); // We assume first line is headers
						this.validateHeaders(headers, expectedHeaders);
					} else {
						const row = line.split('\t');
						if (row[0] === '') { // Ignore any empty lines
							cb(null, line);
							return; // eslint-disable-line array-callback-return
						}
						if (row.length !== expectedHeaders.length) {
							reject('Invalid row to insert');
						}

						pageRow = row.slice(0, 2);
						// TODO make a validate function here?
						const pageID = parseInt(pageRow[0]);
						pageRow[0] = pageID;
						pageRow.unshift(0); // in case we don't find any images for this page
						pageRow.unshift(pageRowNum);

						imageRow = row.slice(2);
						const imageID = imageRow[0];
						const imageSource = imageRow[2];
						imageRow.splice(5, 1); // wiki id is implied in table name, so don't store

						// Skip rows with no suggestions (null image_id) to the database
						// If we get a bunch of null images in successive .tsv rows, we may
						// not have any images to insert when it is time to insert pages.
						// So be sure to check for that below.
						if (!this.isEmptyValue(imageID)) {
							imageRows = imageRows.concat(imageRow);
							joinTableRows.push(pageID, imageID, imageSource);
						}

						// If this is the first row for a new page...
						if (pageID !== lastPageID) {
							if (!this.isEmptyValue(imageID)) {
								// This page has at least one image, so record the pageRowNumIma.
								// This makes it available when filtering by source=ima.
								pageRow.splice(1, 1, pageRowNumIma++);
							}
							pageRows = pageRows.concat(pageRow);
							lastPageID = pageID;
							pageRowNum++;
						}

						if (lineCount === insertChunks) {
							this.database.insert(`${wikiId}_page`, pageRow.length, pageRows);
							if (imageRows.length > 0) {
								this.database.insertOrIgnore(`${wikiId}_image`, imageRow.length, imageRows); // skips any nulls
								this.database.insert(`${wikiId}_image_page`, 3, joinTableRows); // skips any nulls
							}
							lineCount = 0;
							pageRows = [];
							imageRows = [];
							joinTableRows = [];
						}
					}
					lineCount++;
					cb(null, line);
				})
			)
			.on('end', () => {
				// Insert any pages if we have less rows than insertChunks
				if (pageRows.length) {
					this.database.insert(`${wikiId}_page`, pageRow.length, pageRows);
				}
				if (imageRows.length) {
					this.database.insertOrIgnore(`${wikiId}_image`, imageRow.length, imageRows); // skips any nulls
					this.database.insert(`${wikiId}_image_page`, 3, joinTableRows); // skips any nulls
				}
				resolve();
			});
		});
	}

	/**
	 * Populate in-memory database with data from project's tsv files.
	 * Stream tsv contents to readline module line by line, and do batch inserts into
	 * the database's page and image tables.
	 *
	 * @param {string} tsvDir relative directory to look for all tsv files to import
	 * @return {Promise} Resolves if no error occur, rejects with any errors during parsing
	 */
	async populateDatabase(tsvDir) {
		const tsvFiles = fs.readdirSync(tsvDir).filter((filename) => filename.split('.').pop() === 'tsv');
		if (!tsvFiles.length) {
			throw new Error('No tsv files found to populate database with');
		}
		const filesToProcess = tsvFiles.filter((file) => {
			return wikiId.isRecognizedLanguage(file);
		});
		for (const tsvFile of filesToProcess) {
			await new BBPromise((resolve) => {
				console.log('Starting ' + tsvFile);
				this.insertFile(tsvFile, tsvDir).then(() => {
					console.log('Done inserting ' + tsvFile);
					resolve();
				});
			});
		}
	}

	async initFromExistingDb() {
		// @todo: we could lazy-initialize these the first time it is requested for a wiki.
		// then we wouldn't need this function, and could save some logic in the "populate" function
		const tables = await this.database.exec("SELECT * from sqlite_master where type='table' AND name LIKE '%wiki_page';");
		for (const table of tables) {
			const allSql = `SELECT MAX (row_num) AS max FROM ${table.name}`;
			const allResults = await this.database.exec(allSql);
			pageTableAllRowCount[table.name] = allResults[0].max;

			const imaSql = `SELECT MAX (row_num_ima) AS max FROM ${table.name}`;
			const imaResults = await this.database.exec(imaSql);
			pageTableImaRowCount[table.name] = imaResults[0].max;
		}
	}
}

module.exports = AlgoResults;
