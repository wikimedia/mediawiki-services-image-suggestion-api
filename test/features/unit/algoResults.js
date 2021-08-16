'use strict';

const AlgoResults = require('../../../lib/algoResults');
const assert = require('../../utils/assert');
const mocks = require('../../utils/mocks');

function getMockDatabase(mockResults = []) {
	const mockDB = {
		exec: () => {
			return new Promise((resolve) => {
				resolve(mockResults);
			});
		},
		insert: () => {
			return undefined;
		},
		insertOrIgnore: () => {
			return undefined;
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
		}, 'TSV headers do not match expected headers');
	});

	it('Should reject promise if tsv path does not exist', () => {
		const mockDB = getMockDatabase();
		const algoResults = new AlgoResults(mockDB);
		return assert.fails(algoResults.populateDatabase('./woo/hoo'), (err) => {
			assert.instanceOf(err, Error);
			assert.deepEqual(err.code, 'ENOENT');
		});
	});

	it('Should reject promise if no tsv files to insert', () => {
		const mockDB = getMockDatabase();
		mocks.mockFs();
		const algoResults = new AlgoResults(mockDB);
		return assert.fails(algoResults.populateDatabase('./test/fixtures'), (err) => {
			assert.deepEqual(err.message, 'No tsv files found to populate database with');
			assert.instanceOf(err, Error);
			mocks.restoreAll();
		});
	});

	it('Should successfully populate in-memory database', () => {
		const mockDB = getMockDatabase();
		const algoResults = new AlgoResults(mockDB);
		return Promise.resolve(algoResults.populateDatabase('./test/fixtures')).then((resp) => {
		}).catch((resp) => {
			throw new Error('Was not supposed to fail');
		});
	});

	it('Should return expected results', () => {
		const mockDB = getMockDatabase([
			{
				page: 'Page One',
				project: 'arwiki',
				suggestions: []
			}
		]);
		const algoResults = new AlgoResults(mockDB);
		const query = {
			limit: 1,
			offset: 0,
			source: ''
		};
		return Promise.resolve(algoResults.queryDBForPages('arwiki', query)).then((results) => {
			assert.lengthOf(results, 1);
            assert.deepEqual(results[0].page, 'Page One');
            assert.deepEqual(results[0].project, 'arwiki');
			assert.lengthOf(results[0].suggestions, 0);
		});
	});

	it('Should accept rowNum values', () => {
		const mockDB = getMockDatabase([
			{
				page: 'Page Two',
				project: 'arwiki',
				suggestions: []
			}
		]);
		const algoResults = new AlgoResults(mockDB);
		const query = {
			limit: 1,
			offset: 0,
			source: ''
		};
		const rowNums = [2];
		return Promise.resolve(algoResults.queryDBForPages(
			'arwiki', query, rowNums
		)).then((results) => {
			assert.lengthOf(results, 1);
            assert.deepEqual(results[0].page, 'Page Two');
            assert.deepEqual(results[0].project, 'arwiki');
			assert.lengthOf(results[0].suggestions, 0);
		});
	});
});
