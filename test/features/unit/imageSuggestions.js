'use strict';

// const assert = require('../../utils/assert');
const suggestions = require('../../../lib/imageSuggestions');
const { assert } = require('chai');
const { HTTPError } = require('../../../lib/util');
const mocks = require('../../utils/mocks');

describe('GET image-suggestions/v0/{wiki}/{lang}/pages', function () {

	before(() => {
		mocks.mockMwApiGet();
	});

	after(() => {
		mocks.restoreAll();
	});

    it('Should throw an error if lang or wiki params are invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'aar' });
        }, HTTPError);
    });

    it('Should throw an error if limit param is out of range or invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { limit: '101' });
        }, HTTPError);
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { limit: 'AAA' });
        }, HTTPError);
    });

    it('Should throw an error if offset param is out of range or invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { offset: '-3' });
        }, HTTPError);
    });

    it('Should throw an error if source param is invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { source: 'foo' });
        }, HTTPError);
    });

    it('Should accept limit query param', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { limit: 3 } }).then((results) => {
            assert.deepEqual(results.length, 3);
        });
    });
    it('Should accept offset query param', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { offset: 0 } }).then((results) => {
            assert.deepEqual(results.length, 6);
        });
    });
    it('Should accept source query param (ima)', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { source: 'ima' } }).then((results) => {
            assert.deepEqual(results.length, 6);
            assert.deepEqual(results[0].suggestions.length, 2);
            assert.deepEqual(results[0].suggestions[0].source, 'ima');
        });
    });
    it('Should accept source query param (ms)', () => {
        // @todo: actually return mocked ms results and confirm they are as expected.
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { source: 'ms' } }).then((results) => {
            assert.deepEqual(results.length, 6);
            assert.deepEqual(results[0].suggestions.length, 0);
        });
    });

    it('Should accept limit, offset, and source query params', () => {
        return suggestions.getPages(
            { params: { wiki: 'wikipedia', lang: 'ar' }, query: { limit: 2, offset: 3, source: 'ima' }
        }).then((results) => {
            assert.deepEqual(results[0].page, 'ࢡ');
            assert.deepEqual(results.length, 2);
        });
    });

    it('Should throw a 404 if static file does not exist', () => {

    });

    it('Should have a response with the proper schema', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: {} }, './test/fixtures').then((response) => {
            assert.isArray(response);
            assert.deepEqual(response[0], {
                project: 'arwiki',
                page: 'Ɀ',
                suggestions: [{
                    filename: 'Latin_alphabet_Z_with_swash_tail.png',
                    source: 'ima',
                    confidence_rating: 'medium'
                },
                {
                   confidence_rating: 'low',
                   filename: 'Highway_gothic_font_letter_z_with_swash_tail.png',
                   source: 'ima'
                }]
            });
        });
    });

    // Maybe have a test file with the same image for 2 under-illustrated articles
    it('Should return unique suggestions per under-illustrated page', () => {
    });

    it('Should be capable of returning the same suggestion for two related pages', () => {
    });

    it('Should paginate in increments received from query parameter', () => {
    });

    it('Should have each page\'s suggestions sorted by confidence rating', () => {
    });

});
