'use strict';

const apiUtil = require('../lib/api-util');

/**
 * Worker function to get MediaSearch results.
 *
 * @param {Object} req request object
 * @param {Object} apiQuery object with query parameters for the api call
 * @return {Object[]} MediaSearch results
 */
function doGetFromMediaSearch(req, apiQuery) {
    return apiUtil.mwApiGet(req, apiQuery).then((apiRes) => {
        const results = [];
        // @todo: is this a sufficient sanity check? Is there ever a case where the
        // result has a malformed or unexpected body.query subobject?
        if (apiRes instanceof Object && apiRes.body.query !== undefined) {
            if (apiRes.body.query.searchinfo.totalhits > 0) {
                return apiRes.body.query.pages.map((page) => {
                    return {
                        // @todo: this includes the namespace ("File:frog"), while algo results
                        // has just "frog". Should we alter one or the other to be consistent?
                        filename: page.title,
                        source: 'ms',
                        confidence_rating: 'low'
                    };
                });
            }
        }
        return results;
    }).catch((err) => {
        throw err;
    });
}

/**
 * Gets results from MediaSearch for the given page title
 *
 * @param {Object} req request object
 * @param {string} pageTitle the page title to get results for
 * @param {integer} limit maximum number of results to return
 * @return {Object[]} MediaSearch results
 */
function getFromMediaSearch(req, pageTitle, limit) {
    // construct the query for the MW Action API
    const apiQuery = {
        action: 'query',
        generator: 'search',
        gsrsearch: 'filetype:bitmap|drawing ' + pageTitle,
        gsrlimit: limit,
        gsroffset: 0,
        gsrnamespace: 6,
        gsrinfo: 'totalhits|suggestion',
        uselang: 'en'
    };
    req.params.domain = 'commons.wikimedia.org';
    return doGetFromMediaSearch(req, apiQuery);
}

/**
 * Gets results from MediaSearch
 *
 * @param {Object} req request object
 * @param {string} req.params.lang the language to get results for ("ar", "cs", etc.)
 * @param {string} req.params.wiki the wiki property to get results for (ex: wikipedia)
 * @param {integer} req.params.limit number of results to retrieve
 * @param {Object[]} page existing page result from any other source(s)
 * @param {integer} limit maximum number of results to return
 * @return {!Promise} a promise resolving as the results
 */
function getResults(req, page, limit) {
    // @todo: this is just a placeholder for now
    return new Promise((resolve, reject) => {
        // @todo: we don't want to make real calls to MediaSearch during tests.
        // But there's got to be a better way to do this.
        const results = getFromMediaSearch(req, page.page, limit);
        resolve(results);
    }).then(function (data) {
        return data;
    }).catch((err) => {
        throw err;
    });
}

module.exports = {
    getResults
};
