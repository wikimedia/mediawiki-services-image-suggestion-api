'use strict';

const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const tsvToJson = require('./tsvToJson');
const wikiId = require('./wikiId');

const dataPath = './static';
const maxLimit = 100;
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
 */
function initAlgoResultsSync() {
    const newFiles = tsvToJson.getNewTsvFilesSync(dataPath);
    newFiles.forEach((file) => {
        tsvToJson.tsvFileToJsonFileSync(dataPath, file.tsvFile, file.jsonFile, headers);
    });
}

/**
 * Gets results from the Image Matching Algorithm
 *
 * @param {Object} params various parameters that control/filter the results
 * @param {string} params.lang the language to get results for ("ar", "cs", etc.)
 * @param {string} params.wiki the wiki property to get results for (ex: wikipedia)
 * @param {integer} params.limit number of results to retrieve
 * @param {integer|string} params.offset offset into the dataset, or the string "random"
 * @param {string[]} params.source array of allowed source types, or empty array for any
 * @return {!Promise} a promise resolving as the results
 */
function getAlgoResults(params) {
    // @todo: will we also need to exclude certain sources while allowing all others?
    // @todo: we can be a lot more efficient than this!
    // @todo: better error handling would be nice.
    const id = wikiId.getWikiId(params.lang, params.wiki);
    if (!id) {
        // @todo maybe this one should be HttpError instead?
        throw new Error(
            `unable to find a wikiId for language ${params.lang} and property ${params.wiki}`
        );
    }

    // @todo use streams instead, so we're gentler on memory?
    // @todo and some sort of caching or file map?
    return fs.readFileAsync(dataPath + '/' + id + '.json')
    .then(function (data) {
        // @todo: is this really the place to do param validation?
        //   Or even the right syntax if it is?
        const offset = params.offset || 0;
        const limit = params.limit || 10;
        const allResults = JSON.parse(data);
        let i = offset;
        const results = [];
        while (results.length < Math.min(limit, maxLimit) && i < allResults.length) {
            // @todo: actually check and filter by source here, per params.source
            results.push(allResults[i++]);
        }
        return results;
    })
    .catch((err) => {
        throw err;
    });
}

module.exports = {
    initAlgoResultsSync,
    getAlgoResults
};
