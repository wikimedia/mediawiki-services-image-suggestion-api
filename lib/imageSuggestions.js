// Image Suggestion Generation
'use strict';
const { HTTPError } = require('../lib/util.js');
const algoResults = require('../lib/algoResults');
const mediaSearchResults = require('../lib/mediaSearchResults');

const getPages = ({ params, query }) => {
	const dataPath = process.env.TEST_MODE ? './test/fixtures' : './static';

	return algoResults.getResults(params, query, dataPath)
	.then((algoResults) => {
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

		return Promise.all(pages.map((page) => {
			return mediaSearchResults.getResults(params, page);
		}))
		.then((allMsResults) => {
			// ordering of allMsResults is guaranteed to match ordering of pages
			pages.forEach((page, index) => {
				page.suggestions = page.suggestions.concat(allMsResults[index]);
			});
			return pages;
		})
		.catch((err) => {
			throw new HTTPError({
				status: 500,
				type: 'error',
				title: 'Cannot retrieve mediasearch results',
				detail: err
			});
		});
	})
	.catch((err) => {
		throw new HTTPError({
			status: 500,
			type: 'error',
			title: 'Cannot retrieve image matching algorithm results',
			detail: err
		});
	});
};

module.exports = {
    getPages
};
