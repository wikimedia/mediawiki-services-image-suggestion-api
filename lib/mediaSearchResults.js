'use strict';

const apiUtil = require('../lib/api-util');
const { HTTPError } = require('./util');

/**
 * Worker function to get MediaSearch results.
 *
 * @param {Object} req request object
 * @param {Object} apiQuery object with query parameters for the api call
 * @return {Object[]} MediaSearch results
 */
async function doGetFromMediaSearch(req, apiQuery) {
    let apiRes;
    try {
        apiRes = await apiUtil.mwApiGet(req, apiQuery);
    } catch (err) {
        throw new HTTPError({
            status: 500,
            type: 'error',
            title: 'Error',
            detail: 'Unable to retrieve mediasearch results'
        });
    }
    const results = [];
    // @todo: is this a sufficient sanity check? Is there ever a case where the
    // result has a malformed or unexpected body.query subobject?
    if (apiRes instanceof Object && apiRes.body.query !== undefined) {
        if (apiRes.body.query.searchinfo.totalhits > 0) {
            return apiRes.body.query.pages.map((page) => {
                return {
                    filename: page.title.replace(/^File:/, ''),
                    confidence_rating: 'low',
                    source: {
                        name: 'ms',
                        details: {} // no extra details available for this source type
                    }
                };
            });
        }
    }
    return results;
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
    const results = doGetFromMediaSearch(req, apiQuery);
    return results;
}

/**
 * Gets results from MediaSearch
 *
 * @param {Object} req request object
 * @param {string} req.params.wiki the wiki property to get results for (ex: wikipedia)
 * @param {string} req.params.lang the language to get results for ("ar", "cs", etc.)
 * @param {integer} req.params.limit number of results to retrieve
 * @param {Object[]} page existing page result from any other source(s)
 * @param {integer} limit maximum number of results to return
 * @return {!Promise} a promise resolving as the results
 */
function getResults(req, page, limit) {
    const results = getFromMediaSearch(req, page.page, limit);
    return results;
}

module.exports = {
    getResults
};
