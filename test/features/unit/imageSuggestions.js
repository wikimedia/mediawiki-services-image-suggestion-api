'use strict';

// const assert = require('../../utils/assert');
const suggestions = require('../../../lib/imageSuggestions');
const { assert } = require('chai');
const { HTTPError } = require('../../../lib/util');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

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

    it('Should accept limit and offset query params', () => {
        // TODO: Implement offset
        return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: { limit: 3 } }).then((results) => {
            assert.deepEqual(results.length, 3);
        });
    });

    it('Should throw a 404 if static file does not exist', () => {
         // TODO: Implement offset
         return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: { limit: 3 } }).then((results) => {
            assert.deepEqual(results.length, 3);
        });
    });

    it('Should have a response with the proper schema', () => {
        return suggestions.getPages({ params: { lang: 'ar', wiki: 'wikipedia' }, query: {} }, './test/fixtures').then((response) => {
            assert.isArray(response);
            assert.deepEqual(response[0], {
                project: 'arwiki',
                page: 'تأثير_وودوارد',
                suggestions: [{
                    filename: 'Macheffect.png',
                    source: 'ima',
                    confidence_rating: 'medium'
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
