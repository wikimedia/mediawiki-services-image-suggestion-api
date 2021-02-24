'use strict';

const preq   = require('preq');
const { assert } = require('chai');
const Server = require('../../utils/server.js');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

    this.timeout(20000);

    const server = new Server();

    before(() => server.start());

    after(() => server.stop());

    it('Should return success', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 8);
            assert.deepEqual(res.body[0], {
                page: 'تأثير_وودوارد',
                project: 'arwiki',
                suggestions: [
                    {
                        filename: 'Macheffect.png',
                        confidence_rating: 'medium',
                        source: 'ima'
                    }
                ]
            });
        });
    });

    it('Should accept limit and offset params', () => {
        // TODO Implement offset
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages?limit=3`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 3);
        });
    });

    it('Should return the same response for each identical request', () => {
    });

	it('Should return the same response for each identical request', () => {
    });

});
