// Image Suggestion Generation
'use strict';

const { HTTPError } = require('../lib/util.js');
const mediaSearchResults = require('../lib/mediaSearchResults');
const WikiId = require('./wikiId');
const Database = require('./database/Database');
const AlgoResults = require('./algoResults');
const seedrandom = require('seedrandom');

const maxLimit = 500;
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
	const wikiId = WikiId.getWikiId(wiki, lang);
	if (!wikiId) {
		throw new HTTPError({
			status: 404,
			type: 'not_found',
			title: 'Not Found',
			detail: `Unable to find a wikiId for property ${wiki} and language ${lang}`
		});
	}
	let { id = '', limit = defaultLimit, offset = 0, seed = defaultSeed } = query;
	const { noFilter = 'false' } = query;

	if (id.length > 0) {
		id = id.split(',').map((e) => parseInt(e));
		id.forEach((e) => {
			if (isNaN(e)) {
				throw new HTTPError({
					status: 400,
					type: 'bad_request',
					title: 'Bad Request',
					detail: 'ids must be integers'
				});
			}
		});
		if (query.seed !== undefined || query.limit !== undefined || query.offset !== undefined) {
			throw new HTTPError({
				status: 400,
				type: 'bad_request',
				title: 'Bad Request',
				detail: 'If id is provided, then seed, limit, and offset cannot be provided'
			});
		} else if (id.length > maxLimit) {
			throw new HTTPError({
				status: 400,
				type: 'bad_request',
				title: 'Bad Request',
				detail: `No more than ${maxLimit} ids can be supplied.`
			});
		} else {
			limit = maxLimit;
		}
	} else {
		id = [];
	}

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

	if (!['true', 'false'].includes(noFilter)) {
		throw new HTTPError({
			status: 400,
			type: 'bad_request',
			title: 'Bad Request',
			detail: 'noFilter must be either "true" or "false"'
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

	return { id, limit, offset, wikiId };
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
 * @param {integer} pageTableRowCount number of rows in the table
 * @param {integer} seed
 * @param {integer} limit
 * @param {integer} offset
 * @return {Array} row_nums
 */
 function getPseudoRandomRowNums(pageTableRowCount, seed, limit, offset) {
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
		let rowNum;
		if (pageTableRowCount < limit) { // when there are total row nums < limit
			rowNum = (parseInt(rng() * limit));
		} else {
			rowNum = (parseInt(rng() * pageTableRowCount)) + 1;
		}
		if (!ret.includes(rowNum)) {
			ret.push(rowNum);
		}
	}
	return ret;
}

/**
 * Returns the row_nums to retrieve
 *
 * @param {Object} algoResults
 * @param {string} wikiId
 * @param {Array} id
 * @param {integer} seed
 * @param {integer} limit
 * @param {integer} offset
 * @param {string} source
 * @return {Array} rowNums
 */
 async function getRowNums(algoResults, wikiId, id, seed, limit, offset, source) {
	let rowNums = [];
	if (id.length > 0) {
		rowNums = await algoResults.queryDBForRowNums(wikiId, source, id);
	} else if (seed > 0) {
		rowNums = getPseudoRandomRowNums(
			algoResults.getPageTableRowCount(wikiId, source),
			seed,
			limit,
			offset
		);
	}
	// seed == 0 queries by db order, so we intentionally don't specify row nums

	return rowNums;
}

/**
 * Creates a response object ready to return to external callers.
 *
 * @param {Array} id array of specifc page ids requested, or empty if none
 * @param {integer} seed Seed value used to generate the results
 * @param {Array} pages array of page results
 * @param {string} noFilter "true" iff we are not supposed to filter suggestionless results
 * @return {Object} the response
 */
function makeResponse(id, seed, pages, noFilter) {
	// Filter out pages with no suggestions. This may end up returning
	// fewer pages to the caller than expected. In extreme cases, we
	// may return no pages to the caller. We allow disabling this filtering
	// for debugging purposes (it is sometimes helpful to see which pages
	// don't have suggestions).
	// @todo: see if there's a better way to do filtering so that we can
	// return the expected number of results.
	const responsePages = noFilter === 'true' ?
		pages :
		pages.filter((page) => page.suggestions.length > 0);

	return {
		seed: id.length > 0 ? '' : seed,
		pages: responsePages
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
	const { id, limit, offset, wikiId } = validateParams(req.params, req.query, defaultSeed);
	const seed = getSeed(req.query, defaultSeed);

	const database = new Database(req.logger);
	const algoResults = new AlgoResults(database);
	const rowNums = await getRowNums(
		algoResults,
		wikiId,
		id,
		seed,
		limit,
		offset,
		req.query.source
	);

	let results = [];

	// Note: rowNums.length === 0 is valid if seed === 0 and id is not specified.
	if (id.length === 0 || rowNums.length > 0) {
		// We always get algo results, even if we aren't using the algorithm as a source.
		// We need them to know which pages to request other sources for suggestions on.
		results = await algoResults.queryDBForPages(
			wikiId,
			req.query.source,
			limit,
			offset,
			rowNums
		);
	}
	const pages = results.map((result) => {
		if (result.suggestions.length) {
			result.suggestions = JSON.parse(result.suggestions);
		}

		const page = {
			project: result.project,
			page: result.page,
			page_id: result.page_id,
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
							found_on: image.found_on,
							dataset_id: image.dataset_id
						}
					}
				};
			});
		}
		return page;
	});

	// If we aren't supposed to add MediaSearch results, then we're done.
	if (req.query.source && req.query.source !== 'ms') {
		return makeResponse(id, seed, pages, req.query.noFilter);
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
		return makeResponse(id, seed, pages, req.query.noFilter);
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
	return makeResponse(id, seed, pages, req.query.noFilter);
}

module.exports = {
    getPages,
	getPseudoRandomRowNums, // for testing
	validateParams // for testing
};
