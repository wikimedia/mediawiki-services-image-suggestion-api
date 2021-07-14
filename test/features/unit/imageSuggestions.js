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
        return assert.fails(suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0' } }), (err) => {
            assert.instanceOf(err, HTTPError);
            assert.deepEqual(err.title, 'Cannot retrieve mediasearch results');
		});
    });

    it('Should throw an error if id param is invalid', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { id: 'foo' }, 0);
        }, HTTPError);
    });

    it('Should throw an error if id and seed params are both supplied', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { id: '1', seed: '2' });
        }, HTTPError);
    });

    it('Should throw an error if id and limit params are both supplied', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { id: '1', limit: '2' }, 0);
        }, HTTPError);
    });

    it('Should throw an error if id and offset params are both supplied', () => {
        assert.throws(() => {
            suggestions.validateParams({ wiki: 'wikipedia', lang: 'ar' }, { id: '1', offset: '2' }, 0);
        }, HTTPError);
    });

    it('Should accept limit query param', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', limit: '3' } }).then((results) => {
            assert.deepEqual(results.pages.length, 3);
        });
    });

    it('Should accept offset query params', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', offset: '2' } }).then((results) => {
            assert.deepEqual(results.pages[0].page, 'Page Three');
        });
    });
    it('Should accept source query param (ima)', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', source: 'ima' } }).then((results) => {
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
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', source: 'ms' } }).then((results) => {
            // There won't be any ima suggestions because we're only allowing ms results, and
            // there won't be any ms results because we've mocked them to empty. So just check
            // return code and response structure.
            // @todo: improve this once we mock ms results.
            assert.deepEqual(results.seed, 0);
            assert.deepEqual(results.pages.length, 0);
        });
    });

    it('Should accept limit, offset, and source query params', () => {
        return suggestions.getPages(
            { params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', limit: '2', offset: '3', source: 'ima' }
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

    it('Should accept nofilter query param', () => {
        // @todo: actually return mocked ms results and confirm they are as expected.
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0', source: 'ms', noFilter: 'true' } }).then((results) => {
            // There won't be any ima suggestions because we're only allowing ms results, and
            // there won't be any ms results because we've mocked them to empty. So just check
            // return code and response structure.
            // @todo: improve this once we mock ms results.
            assert.deepEqual(results.seed, 0);
            assert.deepEqual(results.pages.length, 10);
        });
    });

    it('Should have a response with the proper schema', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '0' } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                page_id: 1,
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia',
                                found_on: 'ruwiki',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons',
                                found_on: '',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    }
                ]
            });
        });
    });

    it('Should accept a seed parameter and return the expected result', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '123456' } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                page_id: 1,
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia',
                                found_on: 'ruwiki',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons',
                                found_on: '',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    }
                ]
            });
        });
    });

    it('Should accept an id parameter representing one page and return the expected result', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { id: '1' } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                page_id: 1,
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia',
                                found_on: 'ruwiki',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons',
                                found_on: '',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    }
                ]
            });
        });
    });

    it('Should accept an id parameter representing multiple pages and return the expected result', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { id: '1,2' } }, './test/fixtures').then((response) => {
            assert.isObject(response);
            assert.isArray(response.pages);
            assert.deepEqual(response.pages[0], {
                project: 'arwiki',
                page: 'Page One',
                page_id: 1,
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia',
                                found_on: 'ruwiki',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons',
                                found_on: '',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    }
                ]
            });
            assert.deepEqual(response.pages[1], {
                page: 'Page Two',
                page_id: 2,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page 2 or 3 Image 1.svg',
                        confidence_rating: 'high',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'commons',
                                found_on: 'NULL',
                                dataset_id: '8488c8bd-9746-4eff-acea-ee495865cc05'
                            }
                        }
                    }
                ]
            });
        });
    });

    it('Should filter out pages with no suggestions (ima)', () => {
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: '101', source: 'ima', offset: 0, limit: 5 } }).then((results) => {
            assert.deepEqual(results.pages.length, 5);
            results.pages.forEach((page) => {
                assert.isAbove(page.suggestions.length, 0);
                page.suggestions.forEach((suggestion) => {
                    assert.propertyVal(suggestion.source, 'name', 'ima');
                });
            });
        });
    });

    it('Should return limit number of row numbers when limit > row count', () => {
        const limit = 10;
        const randomNums = suggestions.getPseudoRandomRowNums(5, 2, limit, 2);
        assert.lengthOf(randomNums, limit);
    });

    it('Should return limit number of row numbers if limit === row count', () => {
        const limit = 5;
        const randomNums = suggestions.getPseudoRandomRowNums(5, 2, limit, 2);
        assert.lengthOf(randomNums, limit);
    });

    it('Should return limit number of row numbers when limit < row count', () => {
        const limit = 5;
        const randomNums = suggestions.getPseudoRandomRowNums(10, 2, limit, 2);
        assert.lengthOf(randomNums, limit);
    });

    // Maybe have a test file with the same image for 2 under-illustrated articles
    it('Should return unique suggestions per under-illustrated page', () => {
    });

    it('Should be capable of returning the same suggestion for two related pages', () => {
        const commonFilename =  'Page 2 or 3 Image 1.svg';
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { seed: 2 } }).then((results) => {
            const pageTwo = results.pages[1].suggestions;
            const pageThree = results.pages[2].suggestions;
            const foundCommonImg = pageTwo.findIndex((sugg) =>  sugg.filename === commonFilename);
            const foundCommonImgAgain = pageThree.findIndex((sugg) =>  sugg.filename === commonFilename);
            assert.lengthOf(pageTwo, 1);
            assert.lengthOf(pageThree, 1);
            assert.isAbove(foundCommonImg, -1);
            assert.isAbove(foundCommonImgAgain, -1);
        });
    });

    it('Should be capable of returning the same suggestion for two related pages (ima)', () => {
        const commonFilename =  'Page 2 or 3 Image 1.svg';
        return suggestions.getPages({ params: { wiki: 'wikipedia', lang: 'ar' }, query: { source: 'ima' } }).then((results) => {
            const pageTwo = results.pages[1].suggestions;
            const pageThree = results.pages[2].suggestions;
            const foundCommonImg = pageTwo.findIndex((sugg) =>  sugg.filename === commonFilename);
            const foundCommonImgAgain = pageThree.findIndex((sugg) =>  sugg.filename === commonFilename);
            assert.lengthOf(pageTwo, 1);
            assert.lengthOf(pageThree, 1);
            assert.isAbove(foundCommonImg, -1);
            assert.isAbove(foundCommonImgAgain, -1);
        });
    });

    it('Should paginate in increments received from query parameter', () => {
    });

    it('Should have each page\'s suggestions sorted by confidence rating', () => {
    });

});
