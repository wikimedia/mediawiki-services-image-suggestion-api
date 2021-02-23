'use strict';

const preq   = require('preq');
const { assert } = require('chai');
const Server = require('../../utils/server.js');
const algoResults = require('../../../lib/algoResults');

describe('GET image-suggestions/v0/{lang}/{wiki}/pages', function () {

    this.timeout(20000);

    const server = new Server();

    before(() => {
        algoResults.initAlgoResultsSync();
        return server.start();
    });

    after(() => server.stop());

    /* integration */
    it('Should return success', () => {
        return preq.get({
            uri: `${server.config.uri}image-suggestions/v0/ar/wikipedia/pages`
        }).then((res) => {
            assert.deepEqual(res.status, 200);
            assert.lengthOf(res.body, 10);
            assert.deepEqual(res.body[0], {
                filename: 'Macheffect.png',
                source: 'wikipedia',
                confidence_rating: 'medium'
            });
        });
    });

    it('Should return the same response for each identical request', () => {
    });

	it('Should return the same response for each identical request', () => {
    });

});
