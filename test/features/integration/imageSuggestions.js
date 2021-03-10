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
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            // assert.lengthOf(res.body, 10); // dont depend on MS results
            assert.deepEqual(res.body[0], {
                page: 'Page One',
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Page 1 Image 1.png',
                        confidence_rating: 'medium',
                        source: 'ima'
                    },
                    {
                        filename: 'Page 1 Image 2.png',
                        confidence_rating: 'high',
                        source: 'ima'
                    }
                ]
            });
        });
    });

    it('Should accept limit, offset, and source params', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/wikipedia/ar/pages?limit=4&offset=1&source=ima`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 4);
            assert.deepEqual(res.body[0].page, 'Page Two');
            res.body.forEach((page) => {
                page.suggestions.forEach((suggestion) => {
                    assert.propertyVal(suggestion, 'source', 'ima');
                });
            });
        });
    });

	it('Should return the same response for each identical request', () => {

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
