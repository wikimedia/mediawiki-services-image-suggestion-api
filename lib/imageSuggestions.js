// Image Suggestion Generation
'use strict';

const { HTTPError } = require('../lib/util.js');
const mediaSearchResults = require('../lib/mediaSearchResults');
const wikiId = require('./wikiId');
const database = require('./database/database');
const AlgoResults = require('./algoResults');
const seedrandom = require('seedrandom');

const maxLimit = 100;
const defaultLimit = 10;
const maxSuggestionsPerPage = 10;
const sources = [ 'ima', 'ms' ];

/**
 * Validate request path and query parameters
 *
 * @param {Object} pathParams
 * @param {Object} query
 * @param {integer} defaultSeed
 * @return {Object} validated params returned as query and wiki id
 * @throws {HTTPError} If any params deemed invalid
 */
function validateParams(pathParams, query, defaultSeed) {
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
	let { limit = defaultLimit, offset = 0, seed = defaultSeed } = query;
	limit = parseInt(limit);
	offset = parseInt(offset);
	seed = parseInt(seed);
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

	// Requiring a positive integer is technically unnecessary - seedrandom() can work
	// with other seed types - but it is convenient, sufficient, and easy for callers.
	if (isNaN(seed) || seed < 0) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Bad Request',
			detail: 'Seed must be a positive number'
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
 * Returns the seed value to use
 *
 * @param {Object} query
 * @param {integer} defaultSeed
 * @return {integer} the seed value to use
 */
 function getSeed(query, defaultSeed) {
	const { seed = defaultSeed } = query;
	return parseInt(seed);
}

/**
 * Returns the row_nums to retrieve
 *
 * @param {Object} query
 * @param {integer} pageTableRowCount number of rows in the table
 * @param {integer} seed
 * @return {Array} row_nums
 */
 function getRowNums(query, pageTableRowCount, seed) {
	let { limit = defaultLimit, offset = 0 } = query;
	limit = parseInt(limit);
	offset = parseInt(offset);

	// seedrandom returns a function that returns "random" values for the given seed
	const rng = seedrandom(seed);

	// If necessary, skip forward in the pseudorandom sequence for this
	// seed. This is how we do paginated "random" results. This isn't as
	// inefficient as it looks. The loop takes less than 20ms for an offset
	// of 100,000. But it does feel a little silly.
	//
	// TODO: consider if there's a better way to handle the offset.
	let i;
	for (i = 0; i < offset; i++) {
		rng();
	}

	// Create random row numbers in the correct range, ensuring uniqueness.
	const ret = [];
	while (ret.length < limit) {
		const num = (parseInt(rng() * pageTableRowCount)) + 1;
		if (!ret.includes(num)) {
			ret.push(num);
		}
	}
console.log('----');
console.log(ret + '|' + pageTableRowCount + '|' + seed);
console.log('----');
	return ret;
}

/**
 * Creates a response object ready to return to external callers.
 *
 * @param {integer} seed Seed value used to generate the results
 * @param {Array} pages array of page results
 * @return {Object} the response
 */
function makeResponse(seed, pages) {
	// Filter out pages with no suggestions. This may end up returning
	// fewer pages to the caller than expected. In extreme cases, we
	// may return no pages to the caller.
	// @todo: see if there's a better way to do filtering so that we can
	// return the expected number of results.
	return {
		seed: seed,
		pages: pages.filter((page) => page.suggestions.length > 0)
	};
}

/**
 * Gets page results from all sources
 *
 * @param {Object} req Express request object
 * @param {Object} req.params endpoint path parameters
 * @param {Object} req.query endpoint query parameters
 * @return {!Promise} promise resolving as the results or rejected with error detail
 */
async function getPages(req) {
	// The double parens look odd, but seedrandom() returns a function, which we
	// want to call. The "10000" is arbitrary - seedrandom() would work just fine
	// with a floating point seed, or a string one for that matter. But we scale up
	// and parse to integer for consistency with the seeds we expect callers to pass.
	const defaultSeed = parseInt(seedrandom()() * 10000);

	const { id } = validateParams(req.params, req.query, defaultSeed);
	const seed = getSeed(req.query, defaultSeed);

	const algoResults = new AlgoResults(database);
	let rowNums = [];
	if (seed > 0) {
		rowNums = getRowNums(
			req.query,
			algoResults.getPageTableRowCount(id, req.query.source),
			seed
		);
	}

	// We always get algo results, even if we aren't using the algorithm as a source.
    // We need them to know which pages to request other sources for suggestions on.
	const results = await algoResults.queryDBForPages(id, req.query, rowNums);
	const pages = results.map((result) => {
		if (result.suggestions.length) {
			result.suggestions = JSON.parse(result.suggestions);
		}

		const page = {
			project: result.project,
			page: result.page,
			suggestions: []
		};
		// @todo: consider whether we want a source.js module similar to wikiId.js
		if (!req.query.source || req.query.source === 'ima') {
			page.suggestions = result.suggestions.map((image) => {
				return { // we dont want to return this if we have no ms and ima results
					filename: image.filename,
					confidence_rating: image.confidence_rating,
					source: {
						name: 'ima',
						details: {
							from: image.source,
							found_on: image.found_on
						}
					}
				};
			});
		}
		return page;
	});

	// If we aren't supposed to add MediaSearch results, then we're done.
	if (req.query.source && req.query.source !== 'ms') {
		return makeResponse(seed, pages);
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
		return makeResponse(seed, pages);
	}

	let allMsResults;
	try {
		allMsResults = await Promise.all(msPromises);
	} catch (err) {
		throw new HTTPError({
			status: 500,
			type: 'error',
			title: 'Cannot retrieve mediasearch results',
			detail: err.message
		});
	}
	// ordering of allMsResults is guaranteed to match ordering of pages
	pages.forEach((page, index) => {
		// @todo: what happens if IMA and MS suggestion the same image? It is
		// technically possible for IMA to suggestion the same image multiple
		// times, so we should account for that type of duplication as well.
		page.suggestions = page.suggestions.concat(allMsResults[index]);
	});
	return makeResponse(seed, pages);
}

module.exports = {
    getPages,
	validateParams // for testing
};
