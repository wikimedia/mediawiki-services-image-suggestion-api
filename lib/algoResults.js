'use strict';

const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const tsvToJson = require('./tsvToJson');
const { HTTPError } = require('./util');

const defaultLimit = 10;

// Expected headers for TSV validation
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

/** tsvToJson
 * Makes sure the .json files on which results are based are up to date.
 * This should be called at server startup, before the server responds to
 * any requests. It is synchronous, slow, memory intensive, and only intended
 * as a placeholder until a better approach can be implemented.
 *
 * @param {string} dataPath relative directory that suggestion data is written to
 */
function initAlgoResultsSync(dataPath = './static') {
    const newFiles = tsvToJson.getNewTsvFilesSync(dataPath);
    newFiles.forEach((file) => {
        tsvToJson.tsvFileToJsonFileSync(
            dataPath, file.tsvFile, file.jsonFile, expectedHeaders, (objArray, newObj) => {
                if (objArray.length === 0 ||
                    objArray[objArray.length - 1].page !== newObj.page_title) {
                    objArray.push({
                        project: newObj.wiki,
                        page: newObj.page_title,
                        suggestions: []
                    });
                }
                if (newObj.image_id !== 'NULL') {
                    objArray[objArray.length - 1].suggestions.push({
                        filename: newObj.image_id,
                        confidence_rating: newObj.confidence_rating
                    });
                }
            }
        );
    });

}
/*
* Gets results from the Image Matching Algorithm
*
* @param {string} id concatenation of params lang and wiki to get results for
* (e.g. 'enwiki' for english wikipedia)
* @param {Object} query endpoint query parameters
* @param {string} dataPath relative directory that suggestion data is written to
* @return {!Promise} promise resolving as JSON results or rejected with HTTPError
*/
function getResults(id, query, dataPath) {
	return new Promise((resolve, reject) => {
		let { limit = defaultLimit, offset = 0 } = query;
		limit = parseInt(limit);
		offset = parseInt(offset);
        let lineCount = 0;
        const path = `${dataPath}/${id}.json`;
        const jsonResults = [];

		const readStream = fs.createReadStream(path);
		readStream.on('error', function (err) {
			// TODO: Reject with a message and construct HTPTError in route?
			return reject(new HTTPError({
					status: 404,
					type: 'not_found',
					title: 'Not Found',
					detail: `Cannot find algorithm results for ${id}`
			}));
		});

        const lineReader = require('readline').createInterface({
            input: readStream
        });

		lineReader.on('line', (line) => {
            line = line.trim();
			const lastLineNumber = limit + offset;

			// We're done reading lines
            if (lineCount >= lastLineNumber) {
                lineReader.close();
            }
            if (line.charAt(line.length - 1) === ',') {
                line = line.substr(0, line.length - 1);
            }

			// We've hit the beginning of a line
            if (line.charAt(0) === '{') {
				// Only append records in the limit & offset range
				const hitOffsetMin = lineCount >= offset;
				const belowOffsetAndLimit = lineCount < lastLineNumber;
				if (hitOffsetMin && belowOffsetAndLimit) {
                    const parsedLine = JSON.parse(line);
                    jsonResults.push(parsedLine);
				}
				lineCount++;
            }
        });

		lineReader.on('close', () => {
            resolve(jsonResults);
        });
    });
}

module.exports = {
    initAlgoResultsSync,
    getResults
};
