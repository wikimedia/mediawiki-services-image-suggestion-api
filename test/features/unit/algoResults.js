'use strict';

const algoResults = require('../../../lib/algoResults');
const { assert } = require('chai');
const { HTTPError } = require('../../../lib/util');

describe('Algo Results', function () {

    it('Should return rejected promise when static file does not exist', () => {
        return algoResults.getResults({ lang: 'ar', wiki: 'wikipedia' }, {}, '/bogus/path').catch((err) => {
			assert.instanceOf(err, HTTPError);
			assert.deepEqual(err.status, 404);
		});
	});

	it('Should convert tsv to json', () => {
        // Write me
	});

});
