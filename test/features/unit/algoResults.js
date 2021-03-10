'use strict';

const AlgoResults = require('../../../lib/algoResults');
const assert = require('../../utils/assert');
const mocks = require('../../utils/mocks');

function getMockDatabase() {
	const mockDB = {
		exec: () => {
			return new Promise((resolve) => {
				resolve([{ woop: 'woop' }]); // Make me return what is needed for tests
			});
		},
		insert: () => {
			return true;
		}
	};
	return mockDB;
}

describe('Algo Results', function () {

    it('Should throw error if headers do not match expected headers', () => {
		const headers = ['image_id', 'source'];
		const headersMissingValue = ['source' ];
		const expectedHeaders = ['source', 'image_id'];
		const mockDB = getMockDatabase();
		const algoResults = new AlgoResults(mockDB);
		assert.throws(() => {
			algoResults.validateHeaders(headers, expectedHeaders);
		}, 'Expected image_id to equal source');
		assert.throws(() => {
			algoResults.validateHeaders(headersMissingValue, expectedHeaders);
		}, 'TSV headers to not match expected headers');
	});

	it('Should reject promise if tsv path does not exist', () => {
		const mockDB = getMockDatabase();
		const algoResults = new AlgoResults(mockDB);
		assert.fails(algoResults.populateDatabase('./woo/hoo'), (err) => {
			assert.instanceOf(err, Error);
			assert.deepEqual(err.code, 'ENOENT');
		});
	});

	it('Should reject promise if no tsv files to insert', () => {
		const mockDB = getMockDatabase();
		mocks.mockFs();
		const algoResults = new AlgoResults(mockDB);
		assert.fails(algoResults.populateDatabase('./test/fixtures'), (err) => {
			assert.deepEqual(err.message, 'No tsv files found to populate database with');
			assert.instanceOf(err, Error);
		});
		mocks.restoreAll();
	});

	it('Should successfully populate in-memory database', () => {
		const mockDB = getMockDatabase();
		const algoResults = new AlgoResults(mockDB);
		return Promise.resolve(algoResults.populateDatabase('./test/fixtures')).then((resp) => {
		}).catch((resp) => {
			throw new Error('Was not supposed to fail');
		});
	});
});
