/**
 * Utility module for working with .tsv files. Allows things like:
 *  - converting .tsv files to equivalent .json files
 *  - creating an in-memory JSON object from an in-memory .tsv string
 *
 * @module tsvToJson
 */

'use strict';

const fs = require('fs');

/**
 * Determines if "file one" is newer than "file two".
 *
 * @param {string} pathAndFileOne file one
 * @param {string} pathAndFileTwo file two
 * @return {boolean} true if file one is newer than file two, false otherwise.
 */
function isFileNewer(pathAndFileOne, pathAndFileTwo) {
    return fs.statSync(pathAndFileOne).mtimeMs > fs.statSync(pathAndFileTwo).mtimeMs;
}

/**
 * Determines if the input path and file represents a "new" .tsv file
 *
 * @param {string} dataPath path to the directory containing tsv/json files
 * @param {string} tsvFile tsv file name (without path)
 * @param {string} jsonFile json file name (without path)
 * @return {boolean} true if this is a "new" .tsv file, false otherwise
 */
function checkForNewTsv(dataPath, tsvFile, jsonFile) {
	const tsvPathAndFile = dataPath + '/' + tsvFile;
	const jsonPathAndFile = dataPath + '/' + jsonFile;

	return !fs.existsSync(jsonPathAndFile) || isFileNewer(tsvPathAndFile, jsonPathAndFile);
}

/**
 * Finds .tsv files that are newer than the associated .json files,
 * or which have no associated .json file.
 *
 * @param {string} dataPath path to the directory containing tsv/json files
 * @return {Object[]} an array of objects, each with fields "tsvFile" and "jsonFile"
 */
function getNewTsvFilesSync(dataPath) {
	if (!fs.existsSync(dataPath)) {
		throw new Error(`static data path ${dataPath} does not exist`);
	}

	const tsvFiles = fs.readdirSync(dataPath).filter((c) => c.split('.').pop() === 'tsv');
	const newTsvFiles = [];
	tsvFiles.forEach((tsvFile) => {
		const jsonFile = tsvFile.split('.').shift() + '.json';
		if (checkForNewTsv(dataPath, tsvFile, jsonFile)) {
			newTsvFiles.push({ tsvFile, jsonFile });
		}
	});
	return newTsvFiles;
}

/**
 * Converts a string in tsv format to an equivalent json object
 *
 * @param {string} tsv a string in tsv format, likely from a tsv file, one row per line
 * @param {string[]} [headers] column names. Omit if the first line of the .tsv is headers
 * @param {Function|boolean} callback function to cutomize translation, or falsey if none
 * @return {Object[]} array of equivalent json objects
 */
function tsvToJson(tsv, headers, callback) {
    const lines = tsv.split('\n');

    if (!headers || !headers.length) {
        headers = lines.shift().split('\t');
    }

	const json = [];
	lines.forEach((line) => {
		// @todo: an actual parsing library would be more reliable. Should we use one?
		const data = line.split('\t');
		const newObj = headers.reduce((obj, nextKey, index) => {
			obj[ nextKey ] = data[ index ];
			return obj;
		}, {});
		// If a callback is provided, use it. If not, do a field-by-field translation
		// based on column headers.
		if (callback) {
			callback(json, newObj);
		} else {
			json.push(newObj);
		}
	});
	return json;
}

/**
 * Creates/overwrites a .json file based on the contents of its associated .tsv file
 *
 * @param {string} dataPath path to the directory containing tsv/json files
 * @param {string} tsvFile tsv file name (without path)
 * @param {string} jsonFile json file name (without path)
 * @param {string[]} headers column names, or falsey if the first line is headers
 * @param {Function|boolean} callback function to cutomize translation, or falsey if none
 */
function tsvFileToJsonFileSync(dataPath, tsvFile, jsonFile, headers = false, callback = false) {
	const tsvPathAndFile = dataPath + '/' + tsvFile;
	const jsonPathAndFile = dataPath + '/' + jsonFile;

	const tsv = fs.readFileSync(tsvPathAndFile, 'utf8');
	const json = tsvToJson(tsv, headers, callback);
	try {
		const fd = fs.openSync(jsonPathAndFile, 'w+');
		fs.writeSync(fd, '[\n' + json.map((entry) => JSON.stringify(entry)).join(',\n') + '\n]');
		fs.closeSync(fd);
	} catch (err) {
		console.log(`Unable to open ${jsonPathAndFile} for writing: ${err.code} (${err.errno})`);
	}
}

module.exports = {
	getNewTsvFilesSync,
	tsvFileToJsonFileSync,
	tsvToJson // for testing
};
