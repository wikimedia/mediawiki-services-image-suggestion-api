'use strict';

const assert = require('../../utils/assert');
const suggestions = require('../../../lib/imageSuggestions');
const { HTTPError } = require('../../../lib/util');
const mocks = require('../../utils/mocks');

describe('GET image-suggestions/v0/{wiki}/{lang}/pages', function () {

	beforeEach(() => {
		mocks.mockMwApiGet();
	});

	afterEach(() => {
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

    it('Should throw an error for failing to get MediaSearch results', () => {
        mocks.restoreAll();
        mocks.mockMwApiGet(new Error());
        return assert.fails(suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0 } }), (err) => {
            assert.instanceOf(err, HTTPError);
            assert.deepEqual(err.title, 'Cannot retrieve mediasearch results');
		});
    });

    it('Should accept limit query param', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0, limit: 3 } }).then((results) => {
            assert.deepEqual(results.pages.length, 3);
        });
    });

    it('Should accept offset query params', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0, offset: 2 } }).then((results) => {
            assert.deepEqual(results.pages[0].page, 'Page Three');
        });
    });
    it('Should accept source query param (ima)', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0, source: 'ima' } }).then((results) => {
            assert.deepEqual(results.pages.length, 8);
            results.pages.forEach((page) => {
                page.suggestions.forEach((suggestion) => {
                    assert.propertyVal(suggestion.source, 'name', 'ima');
                });
            });
        });
    });
    it('Should accept source query param (ms)', () => {
        // @todo: actually return mocked ms results and confirm they are as expected.
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0, source: 'ms' } }).then((results) => {
            assert.deepEqual(results.pages.length, 10);
            results.pages.forEach((page) => {
                // For now, just confirm there are no suggestions (there won't be any ima suggestions
                // because we're only allowing ms results, and we're forcing ms results to empty).
                // @todo: improve this once we mock ms results.
                assert.lengthOf(page.suggestions, 0);
            });
        });
    });

    it('Should accept limit, offset, and source query params', () => {
        return suggestions.getPages(
            { params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0, limit: 2, offset: 3, source: 'ima' }
        }).then((results) => {
            assert.deepEqual(results.pages[0].page, 'Page Four');
            assert.lengthOf(results.pages, 2);
            results.pages.forEach((page) => {
                page.suggestions.forEach((suggestion) => {
                    assert.propertyVal(suggestion.source, 'name', 'ima');
                });
            });
        });
    });

    it('Should have a response with the proper schema', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 0 } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons'
                            }
                        }
                    }
                ]
            });
        });
    });

    it('Should accept a seed parameter and return the expected result', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 123456 } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons'
                            }
                        }
                    }
                ]
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
