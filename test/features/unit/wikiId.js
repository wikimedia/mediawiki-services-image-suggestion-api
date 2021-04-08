'use strict';

const wikiId = require('../../../lib/wikiId');
const { assert } = require('chai');

describe('Algo Results', function () {

    it('Should generate wiki ID', () => {
		const id = wikiId.getWikiId('wikipedia', 'ar');
		assert.deepEqual(id, 'arwiki');
    });

    it('Should return false for invalid wiki ID', () => {
		const invalidLang = wikiId.getWikiId('wikipedia', 'boop');
		const invalidWiki = wikiId.getWikiId('shmikipedia', 'ar');
		assert.isFalse(invalidLang);
		assert.isFalse(invalidWiki);
    });

	it('Should return if language is recognized', () => {
		const invalidLang = wikiId.isRecognizedLanguage('babawiki');
		const validLang = wikiId.isRecognizedLanguage('arwiki');
		assert.isFalse(invalidLang);
		assert.isTrue(validLang);
    });
});
