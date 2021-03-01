'use strict';

// const assert = require('../../utils/assert');
const suggestions = require('../../../lib/imageSuggestions');
const { assert } = require('chai');
const { HTTPError } = require('../../../lib/util');
const mocks = require('../../utils/mocks');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

	before(() => {
		mocks.mockMwApiGet();
	});

	after(() => {
		mocks.restoreAll();
	});

    it('Should throw an error if lang or wiki params are invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ lang: 'aar', wiki: 'wikipedia' });
        }, HTTPError);
    });

    it('Should throw an error if limit param is out of range or invalid', () => {
        assert.throws(() => {
            suggestions.validateParams('arwiki', { limit: '101' });
        }, HTTPError);
        assert.throws(() => {
            suggestions.validateParams('arwiki', { limit: 'AAA' });
        }, HTTPError);
    });

    it('Should throw an error if offset param is out of range or invalid', () => {
        assert.throws(() => {
            suggestions.validateParams('arwiki', { offset: '-3' });
        }, HTTPError);
    });

    it('Should accept limit query params', () => {
        return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: { limit: 3 } }).then((results) => {
            assert.deepEqual(results.length, 3);
        });
    });
    it('Should accept offset query params', () => {
        return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: { offset: 0 } }).then((results) => {
            assert.deepEqual(results.length, 6);
        });
    });

    it('Should accept limit and offset query params', () => {
        return suggestions.getPages(
            { params: { lang: 'ar', wiki: 'wikipedia' }, query: { limit: 2, offset: 3 }
        }).then((results) => {
            assert.deepEqual(results[0].page, 'ࢡ');
            assert.deepEqual(results.length, 2);
        });
    });

    it('Should throw a 404 if static file does not exist', () => {

    });

    it('Should have a response with the proper schema', () => {
        return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: {} }, './test/fixtures').then((response) => {
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
