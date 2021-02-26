'use strict';

const wikiId = require('../../../lib/wikiId');
const { assert } = require('chai');

describe('Algo Results', function () {

    it('Should generate wiki ID', () => {
		const id = wikiId.getWikiId('ar', 'wikipedia');
		assert.deepEqual(id, 'arwiki');
    });

    it('Should return false for invalid wiki ID', () => {
		const invalidLang = wikiId.getWikiId('boop', 'wikipedia');
		const invalidWiki = wikiId.getWikiId('ar', 'shmikipedia');
		assert.isFalse(invalidLang);
		assert.isFalse(invalidWiki);
    });
});
