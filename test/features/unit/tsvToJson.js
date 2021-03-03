'use strict';

const tsvToJson = require('../../../lib/tsvToJson');
const { assert } = require('chai');
const fs = require('fs');

describe('TSV to JSON conversion', function () {
	const testTSV = 'arwiki.tsv';

    it('Should generate json objects based on tsv headers if no callback supplied', () => {
		const tsv = fs.readFileSync(`${__dirname}/../../fixtures/${testTSV}`, 'utf8');
		const results = tsvToJson.tsvToJson(tsv, false, false);
		const expectedObj = {
			page_id: '1728781',
			page_title: 'Ɀ',
			image_id: 'Latin_alphabet_Z_with_swash_tail.png',
			confidence_rating: 'medium',
			source: 'wikipedia',
			dataset_id: 'be49d19a-a81e-4286-9ae3-3bcd8f2b9145',
			insertion_ts: '1.61481587E9',
			wiki: 'arwiki'
		};
		assert.lengthOf(results, 10);
		assert.deepEqual(results[0], expectedObj);
    });

	it('Should generate json objects based on callback specification', () => {
    });

	it('Should have empty array of suggestions for records with no image ID', () => {
    });

});
