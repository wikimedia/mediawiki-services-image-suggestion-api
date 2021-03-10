// Image Suggestion Generation
'use strict';

const { HTTPError } = require('../lib/util.js');
const mediaSearchResults = require('../lib/mediaSearchResults');
const wikiId = require('./wikiId');
const database = require('./database/database');
const AlgoResults = require('./algoResults');

const maxLimit = 100;
const defaultLimit = 10;
const maxSuggestionsPerPage = 10;
const sources = [ 'ima', 'ms' ];

/**
 * Validate request path and query parameters
 *
 * @param {Object} pathParams
 * @param {Object} query
 * @return {Object} validated params returned as query and wiki id
 * @throws {HTTPError} If any params deemed invalid
 */
function validateParams(pathParams, query) {
	const { wiki, lang } = pathParams;
	const id = wikiId.getWikiId(wiki, lang);
	if (!id) {
		throw new HTTPError({
			status: 404,
			type: 'not_found',
			title: 'Not Found',
			detail: `Unable to find a wikiId for property ${wiki} and language ${lang}`
		});
	}
	let { limit = defaultLimit, offset = 0 } = query;
	limit = parseInt(limit);
	offset = parseInt(offset);
	if (isNaN(limit) || limit > maxLimit) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Bad Request',
			detail: `Limit must be a number less than ${maxLimit}`
		});
	}
	if (isNaN(offset) || offset < 0) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Bad Request',
			detail: 'Offset must be a positive number'
		});
	}

	if (query.source && !sources.includes(query.source)) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Bad Request',
			detail: `Unrecognized source: ${query.source}`
		});
	}
	return { query, id };
}

/**
 * Gets results from the Image Matching Algorithm
 *
 * @param {Object} req Express request object
 * @param {Object} req.params endpoint path parameters
 * @param {Object} req.query endpoint query parameters
 * @return {!Promise} promise resolving as the results or rejected with error detail
 */
function getPages(req) {
	const { id } = validateParams(req.params, req.query);
	const algoResults = new AlgoResults(database);
	const pagesPromise = algoResults.queryDBForPages(id, req.query).then((theResults) => {
		const pages = theResults.map((result) => {
			if (result.suggestions.length) {
				result.suggestions = JSON.parse(result.suggestions);
			}
			// @todo: consider whether we want a source.js module similar to wikiId.js
			if (!req.query.source || req.query.source === 'ima') {
				result.suggestions.map((image) => {
					return { // we dont want to return this if we have no ms and ima results
						filename: image.filename,
						source: 'ima',
						confidence_rating: image.confidence_rating
					};
				});
			}
			return result;
		});

		// If we aren't supposed to add MediaSearch results, then we're done.
		if (req.query.source && req.query.source !== 'ms') {
			return pages;
		}

		const msPromises = [];
		pages.forEach((page) => {
			const msResultsLimit = maxSuggestionsPerPage - page.suggestions.length;
			if (msResultsLimit > 0) {
				msPromises.push(mediaSearchResults.getResults(req, page, msResultsLimit));
			}
		});

		// If we don't need to add MediaSearch results, then we're done.
		if (msPromises.length === 0) {
			return pages;
		}

		const msResults = Promise.all(msPromises).then((allMsResults) => {
			// ordering of allMsResults is guaranteed to match ordering of pages
			pages.forEach((page, index) => {
				// @todo: what happens if IMA and MS suggestion the same image? It is
				// technically possible for IMA to suggestion the same image multiple
				// times, so we should account for that type of duplication as well.
				page.suggestions = page.suggestions.concat(allMsResults[index]);
			});
			return pages;
		}).catch((err) => {
			throw new HTTPError({
				status: 500,
				type: 'error',
				title: 'Cannot retrieve mediasearch results',
				detail: err
			});
		});
		return msResults;
	}).catch((err) => {
		throw new HTTPError({
			status: 500,
			type: 'error',
			title: 'Cannot retrieve image matching algorithm results',
			detail: err
		});
	});
	return pagesPromise;
}

module.exports = {
    getPages,
	validateParams // for testing
};
