'use strict';

const preq   = require('preq');
const { assert } = require('chai');
const Server = require('../../utils/server.js');
const mocks = require('../../utils/mocks');

describe('GET image-suggestions/v0/{wiki}/{lang}/pages', function () {
    this.timeout(20000);

    const server = new Server();

    before(() => server.start());
    after(() => server.stop());

    beforeEach(() => mocks.mockMwApiGet());
    afterEach(() => mocks.restoreAll());

    it('Should return success for a set of pseudorandom pages', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?seed=0`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.seed, 0);
            // assert.lengthOf(res.body, 10); // dont depend on MS results
            assert.deepEqual(res.body.pages[0], {
                page: 'Page_One',
                page_id: 1,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page_1_Image_1.png',
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
                        filename: 'Page_1_Image_2.png',
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

    it('Should return success for a specific page', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?id=1`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.pages[0], {
                page: 'Page_One',
                page_id: 1,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page_1_Image_1.png',
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
                        filename: 'Page_1_Image_2.png',
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

    it('Should return success for a set of specific pages', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?id=1,2`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.pages[0], {
                page: 'Page_One',
                page_id: 1,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page_1_Image_1.png',
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
                        filename: 'Page_1_Image_2.png',
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
            assert.deepEqual(res.body.pages[1], {
                page: 'Page_Two',
                page_id: 2,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page_2_or_3_Image_1.svg',
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

    it('Should accept seed, limit, offset, and source params', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?seed=0&limit=4&offset=1&source=ima`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.seed, 0);
            assert.lengthOf(res.body.pages, 4);
            assert.deepEqual(res.body.pages[0].page, 'Page_Two');
            res.body.pages.forEach((page) => {
                page.suggestions.forEach((suggestion) => {
                    assert.propertyVal(suggestion.source, 'name', 'ima');
                });
            });
        });
    });

    it('Should have the same image returned for 2 different pages', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?seed=0&source=ima`
        }).then((res) => {
            const pageTwoResults = res.body.pages[1];
            const pageThreeResults = res.body.pages[2];
            const sharedImage = 'Page_2_or_3_Image_1.svg';
            assert.include(pageTwoResults.suggestions[0], { filename: sharedImage });
            assert.include(pageThreeResults.suggestions[0], { filename: sharedImage });
        });
    });

    it('Should not require any parameters', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages`
        }).then((res) => {
            // Without parameters, we get truly random pages, so we are limited in
            // what we can check.
            // @todo: maybe do additional mocking so we have more to check?
            assert.deepEqual(res.status, 200);
            assert.isObject(res);
            assert.property(res.body, 'seed');
            assert.property(res.body, 'pages');
        });
    });

    it('Should have an empty array of suggestions for pages without suggestions', () => {
        // return preq.get({
        //     uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages`
        // }).then((res) => {
        //     assert.deepEqual(res.status, 200);
        //     assert.lengthOf(res.body[res.body.length - 1].suggestions, 0);
        // });
    });

});

describe('GET image-suggestions/v0/{wiki}/{lang}/pages/{title}', function () {
    this.timeout(20000);

    const server = new Server();

    before(() => server.start());
    after(() => server.stop());

    beforeEach(() => mocks.mockMwApiGet());
    afterEach(() => mocks.restoreAll());

    it('Should return success for a specific page', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages/Page One`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.pages[0], {
                page: 'Page_One',
                page_id: 1,
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page_1_Image_1.png',
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
                        filename: 'Page_1_Image_2.png',
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

    it('Should have an empty array of suggestions for pages without suggestions', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages/No_Such_Page`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.pages, []);
        });
    });

});
