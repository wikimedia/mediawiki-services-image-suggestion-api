'use strict';

// const assert = require('../../utils/assert');
const suggestions = require('../../../lib/imageSuggestions');
const { assert } = require('chai');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

    it('Should throw an error if lang or wiki params are invalid', () => {
        const invalidLang = 'aar';
        const msg = `Unable to find a wikiId for language ${invalidLang} and property wikipedia`;
        suggestions.getPages({ lang: 'aar', wiki: 'wikipedia' }).catch((err) => {
            assert.deepEqual(err.status, 500);
            assert.deepEqual(err.detail, msg);
        });
    });

    it('Should throw a 404 if static file does not exist', () => {
    });

    it('Should throw a 400 for bad input data', () => {
    });

    it('Should have a response with the proper schema', () => {
        suggestions.getPages({ lang: 'ar', wiki: 'wikipedia' }, './test/fixtures').then((response) => {
            assert.isArray(response);
            assert.deepEqual(response[0], {
                filename: 'Macheffect.png',
                source: 'wikipedia',
                confidence_rating: 'medium'
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
