// Image Suggestion Generation
'use strict';

const { HTTPError } = require('../lib/util.js');
const algoResults = require('../lib/algoResults');
const mediaSearchResults = require('../lib/mediaSearchResults');
const wikiId = require('./wikiId');
const maxLimit = 100;
const defaultLimit = 10;
const maxSuggestionsPerPage = 10;
const sources = [ 'ima', 'ms' ];

function validateParams(pathParams, query) {
	const { lang, wiki } = pathParams;
	const id = wikiId.getWikiId(lang, wiki);
	// Q: Should this return an error object instead and pass to a
	// Promise.reject()?
	if (!id) {
		throw new HTTPError({
			status: 404,
			type: 'not_found',
			title: 'Not Found',
			detail: `Unable to find a wikiId for language ${lang} and property ${wiki}`
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
	const dataPath = process.env.TEST_MODE ? './test/fixtures' : './static';
	const { id } = validateParams(req.params, req.query);

	// We always get algo results, even if we aren't using the algorithm as a source.
	// We need them to know which pages to request other sources for suggestions on.
	const pagesPromise = algoResults.getResults(id, req.query, dataPath).then((algoResults) => {
		// Even though this mostly duplicates the .json structure, we create
		// the returned object field-by-field. This keeps control of the response
		// format at the controller level.
		const pages = algoResults.map((result) => {
			const page = {
				project: result.project,
				page: result.page,
				suggestions: []
			};

			// @todo: consider whether we want a source.js module similar to wikiId.js
			if (!req.query.source || req.query.source === 'ima') {
				page.suggestions = result.suggestions.map((image) => {
					return {
						filename: image.filename,
						source: 'ima',
						confidence_rating: image.confidence_rating
					};
				});
			}

			return page;
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
