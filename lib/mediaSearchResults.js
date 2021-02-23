'use strict';

const wikiId = require('./wikiId');

/**
 * Gets results from MediaSearch
 *
 * @param {Object} params various parameters that control/filter the results
 * @param {string} params.lang the language to get results for ("ar", "cs", etc.)
 * @param {string} params.wiki the wiki property to get results for (ex: wikipedia)
 * @param {integer} params.limit number of results to retrieve
 * @param {Object[]} page existing page result from any other source(s)
 * @return {!Promise} a promise resolving as the results
 */
function getResults(params, page) {
    const id = wikiId.getWikiId(params.lang, params.wiki);
    if (!id) {
        throw new Error(
            `unable to find a wikiId for language ${params.lang} and property ${params.wiki}`
        );
    }

    // @todo: this is just a placeholder for now
    return new Promise((resolve, reject) => {
        resolve([]);
    })
    .then(function (data) {
        return data;
    })
    .catch((err) => {
        throw err;
    });
}

module.exports = {
    getResults
};
