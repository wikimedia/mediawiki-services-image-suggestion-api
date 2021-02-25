// Image Suggestion Generation
'use strict';
const { HTTPError } = require('../lib/util.js');
const algoResults = require('../lib/algoResults');

const getPages = (params) => {
	const dataPath = process.env.TEST_MODE ? './test/fixtures' : './static';
	return algoResults.getAlgoResults(params, dataPath).then((results) => {
		// Even though this mostly duplicates the .json structure, we create
		// the returned object field-by-field. This keeps control of the response
		// format at the controller level.
		const suggestions = results.map((result) => {
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
		return suggestions;
	}).catch((err) => {
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
