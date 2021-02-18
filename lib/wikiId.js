'use strict';

const propertyMap = {
	wikipedia: 'wiki'
};

const recognizedLanguages = [
	'ar',
	'cs',
	'fr',
	'vi',
	'ko',
	'test' // @todo remove this temporary entry, which is only for initial internal testing
];

/**
 * Converts a language/property pair (ex. "en" and "wikipedia") to a wiki db name (ex. "enwiki")
 *
 * @param {string} lang the language of interest (en, fr, etc.)
 * @param {string} wiki the property of interest (wikipedia, wiktionary, etc.)
 * @return {string|boolen} the wiki id, or false if one could not be found
 */
function getWikiId(lang, wiki) {
	// @todo something classier. Is there an appropriate config file we can load/copy
	//   or a service/api we can call (and cache the response?)
	// @todo would we prefer to throw an exception if the wikiId can't be found?
	let wikiId = false;

	// Don't test in a way that would pick up properties from the prototype.
	// This is executed against on user input, which could include unexpected
	// things like "constructor".
	if ({}.hasOwnProperty.call(propertyMap, wiki)) {
		if (recognizedLanguages.includes(lang)) {
			wikiId = lang + propertyMap[wiki];
		}
	}

	return wikiId;
}

module.exports = {
	getWikiId
};
