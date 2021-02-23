// Image Suggestion Generation
'use strict';
const { HTTPError } = require('../lib/util.js');
const algoResults = require('../lib/algoResults');

const getPages = (params) => {
	const dataPath = process.env.TEST_MODE ? './test/fixtures' : './static';
	return algoResults.getAlgoResults(params, dataPath).then((results) => {
		const suggestions = results.map((result) => {
			const { imageFile: filename, source, confidenceRating: confidence_rating } = result;
			return { filename, source, confidence_rating };
		});
		return suggestions;
	}).catch((err) => {
		throw new HTTPError({
			status: 500,
			type: 'error',
			title: 'Cannot retrieve algorithm results',
			detail: err
		});
	});
};

module.exports = {
    getPages
};
