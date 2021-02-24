'use strict';

const BBPromise = require('bluebird');
const fs = BBPromise.promisifyAll(require('fs'));
const tsvToJson = require('./tsvToJson');
const wikiId = require('./wikiId');
const { HTTPError } = require('../lib/util.js');

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

/**
 * Gets results from the Image Matching Algorithm
 *
 * @param {Object} params endpoint path parameters
 * @param {string} params.lang the language to get results for ("ar", "cs", etc.)
 * @param {string} params.wiki the wiki property to get results for (ex: wikipedia)
 * @param {integer} params.limit number of results to retrieve
 *  @param {Object} query endpoint query parameters
 * @param {integer|string} query.offset offset into the dataset, or the string "random"
 * @param {string[]} query.source array of allowed source types, or empty array for any
 * @param {string} dataPath relative directory that suggestion data is written to
 * @return {!Promise} promise resolving as the results or rejected with error detail
 */
function getResults(params, query, dataPath) {
    // @todo: will we also need to exclude certain sources while allowing all others?
    // @todo: we can be a lot more efficient than this!
    // @todo: better error handling would be nice.
    const id = wikiId.getWikiId(params.lang, params.wiki);
    if (!id) {
        return BBPromise.reject(
            new HTTPError({
                status: 404,
                type: 'bad_request',
                title: 'Bad Request',
                detail: `Unable to find a wikiId for language ${params.lang} and property ${params.wiki}`
            })
        );
    }
    // @todo use streams instead, so we're gentler on memory?
    // @todo and some sort of caching or file map?
    return fs.readFileAsync(dataPath + '/' + id + '.json')
    .then(function (data) {
        // @todo: is this really the place to do param validation?
        // Or even the right syntax if it is?
        const offset = query.offset || 0;
        const limit = query.limit || 10;
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
    getResults
};
