'use strict';

const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const tsvToJson = require('./tsvToJson');
const { HTTPError } = require('./util');

const defaultLimit = 10;
const headers = [
    'wikiId',
    'pageId',
    'pageTitle',
    'imageFile',
    'confidenceRating',
    'source',
    'datasetId',
    'insertionTs'
];

/**
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
            dataPath, file.tsvFile, file.jsonFile, headers, (json, newObj) => {
                if (json.length === 0 || json[json.length - 1].page !== newObj.pageTitle) {
                    json.push({
                        project: newObj.wikiId,
                        page: newObj.pageTitle,
                        suggestions: []
                    });
                }
                json[json.length - 1].suggestions.push({
                    filename: newObj.imageFile,
                    confidence_rating: newObj.confidenceRating
                });
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
		let { limit } = query;
		if (!limit) {
			limit = defaultLimit;
		}
        let allResults = '';
        let lineCount = 0;
        const path = `${dataPath}/${id}.json`;

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
            if (lineCount >= limit) {
                lineReader.close();
            }

            if (line.charAt(line.length - 1) === ',') {
                line = line.substr(0, line.length - 1);
            }

            if (line.charAt(0) === '{') {
				if (line === ']' || line === '[') {
					return;
				}
				lineCount++;
				allResults = allResults + line + ',';
            }
        });

		lineReader.on('close', () => {
            allResults = allResults.slice(0, allResults.length - 1);
            allResults = '[' + allResults + ']';
            const json = JSON.parse(allResults);
            resolve(json);
        });
    });
}

module.exports = {
    initAlgoResultsSync,
    getResults
};
