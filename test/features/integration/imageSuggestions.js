'use strict';

const preq   = require('preq');
const { assert } = require('chai');
const Server = require('../../utils/server.js');
const mocks = require('../../utils/mocks');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

    this.timeout(20000);

    const server = new Server();

    before(() => server.start());
    after(() => server.stop());

    beforeEach(() => mocks.mockMwApiGet());
    afterEach(() => mocks.restoreAll());

    it('Should return success', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 6);
            assert.deepEqual(res.body[0], {
                page: 'Ɀ',
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Latin_alphabet_Z_with_swash_tail.png',
                        confidence_rating: 'medium',
                        source: 'ima'
                    },
                    {
                        confidence_rating: 'low',
                        filename: 'Highway_gothic_font_letter_z_with_swash_tail.png',
                        source: 'ima'
                    }
                ]
            });
        });
    });

    it('Should accept limit and offset params', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages?limit=4&offset=1`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 4);
            assert.deepEqual(res.body[0].page, 'Ɱ');
        });
    });

	it('Should return the same response for each identical request', () => {

    });

    it('Should have an empty array of suggestions for pages without suggestions', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body[res.body.length - 1].suggestions, 0);
        });
    });

});
