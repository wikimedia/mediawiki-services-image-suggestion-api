// Image Suggestion Generation
'use strict';
const { HTTPError } = require('../lib/util.js');
const algoResults = require('../lib/algoResults');
const mediaSearchResults = require('../lib/mediaSearchResults');
const wikiId = require('./wikiId');
const maxLimit = 100;
const defaultLimit = 10;

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
function getPages({ params, query }) {
	const dataPath = process.env.TEST_MODE ? './test/fixtures' : './static';
	const { id } = validateParams(params, query);
	const pagesPromise = algoResults.getResults(id, query, dataPath).then((algoResults) => {
		// Even though this mostly duplicates the .json structure, we create
		// the returned object field-by-field. This keeps control of the response
		// format at the controller level.
		const pages = algoResults.map((result) => {
			return {
				project: result.project,
				page: result.page,
				suggestions: result.suggestions.map((image) => {
					return {
						filename: image.filename,
						source: 'ima',
						confidence_rating: image.confidence_rating
					};
				})
			};
		});
		const msPromises = pages.map((page) => {
			return mediaSearchResults.getResults(params, page);
		});
		const msResults = Promise.all(msPromises).then((allMsResults) => {
			// ordering of allMsResults is guaranteed to match ordering of pages
			pages.forEach((page, index) => {
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
