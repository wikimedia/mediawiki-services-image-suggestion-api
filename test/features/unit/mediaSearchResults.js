'use strict';

const MediaSearchResults = require('../../../lib/MediaSearchResults');
const { assert } = require('chai');
const mocks = require('../../utils/mocks');

describe('MediaSearch Results', function () {
	before(() => {
		mocks.mockMwApiGet();
	});

	after(() => {
		mocks.restoreAll();
	});

    it('Should return empty results', () => {
		const mediaSearchResults = new MediaSearchResults();
		const page = {
			page: 'frog'
		};
        return mediaSearchResults.getResults({ params: {} }, page, 1).then((results) => {
			assert.instanceOf(results, Array);
			assert.deepEqual(results.length, 0);
		});
	});
});
