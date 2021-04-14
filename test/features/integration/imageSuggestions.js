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

    it('Should return success', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?seed=0`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.deepEqual(res.body.seed, 0);
            // assert.lengthOf(res.body, 10); // dont depend on MS results
            assert.deepEqual(res.body.pages[0], {
                page: 'Page One',
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: {
                            name: 'ima',
                            details: {
                                from: 'wikipedia',
                                found_on: 'ruwiki'
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
                                found_on: ''
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
            assert.deepEqual(res.body.pages[0].page, 'Page Two');
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
            const sharedImage = 'Page 2 or 3 Image 1.svg';
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
