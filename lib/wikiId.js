'use strict';

const propertyMap = {
	wikipedia: 'wiki'
};

const recognizedLanguages = [
	'ar',
	'ceb',
	'en',
	'pt',
	'he',
	'ru',
	'tr',
	'bn',
	'de',
	'uk',
	'cs',
	'fr',
	'vi'
	// 'arz',
	// 'es',
	// 'eu',
	// 'fa',
	// 'hu',
	// 'hy',
	// 'ko',
	// 'pl',
	// 'ru',
	// 'tr'
];

/**
 * Converts a property/language pair (ex. "wikipedia" and "en") to a wiki db name (ex. "enwiki")
 *
 * @param {string} wiki the property of interest (wikipedia, wiktionary, etc.)
 * @param {string} lang the language of interest (en, fr, etc.)
 * @return {string|boolen} the wiki id, or false if one could not be found
 */
function getWikiId(wiki, lang) {
	// @todo something classier. Is there an appropriate config file we can load/copy
	//   or a service/api we can call (and cache the response?)
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

/**
 * Returns whether or not a language is supported by the API
 *
 * @param {string} file filename to process (e.g. arwiki)
 * @return {boolen} True if language is supported, false if not.
 */
function isRecognizedLanguage(file) {
	const filename = file.match(/(.{2,3})(wi[A-Za-z]{2,3})/);
	const lang = filename[1];
	return recognizedLanguages.includes(lang);
}

module.exports = {
	getWikiId,
	isRecognizedLanguage
};
