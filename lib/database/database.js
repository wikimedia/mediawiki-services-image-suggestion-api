'use strict';

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
let db;

/**
 * Insert values from tsv into a specific database table.
 *
 * @param {string} table table name (must be 'page' or 'image')
 * @param {int} numCol Number of columns in the given table
 * @param {string} values Array of values to insert as a row
 */
function insert(table, numCol, values) {
	const placeholders = Array(numCol).fill('?');
	const rowPlaceholders = `(${placeholders.join(',')})`;
	const allPlaceholders = values.map((elem) => rowPlaceholders).join(',');
	const insertSQL = `INSERT OR IGNORE INTO ${table} VALUES ${allPlaceholders}`;
	db.serialize(() => {
		db.run(insertSQL, values, (err) => {
			if (err) {
				return console.error(err.message); // TODO: what do we do if insert fails
			}
		});
	});
}

/**
 * Execute a sql query with optional parameters.
 *
 * @param {string} sql SQL query to execute.
 * Can be parameterized with any values to replace represented by '?'.
 * @param {string[]} params Query params to insert into SQL query in order they appear in the query
 * @return {Promise} Resolves with rows returned, rejects with any errors during execution
 */
function exec(sql, params = []) {
	return new Promise(function (resolve, reject) {
		db.all(sql, params, (err, rows) => {
			if (err) {
				reject(err);
			}
			resolve(rows);
		});
	});
}

/**
 * Create initial 'page' and 'image' tables in sqlite database
 *
 * @param {string[]} files Array of relative paths to tsv files to import
 */
function createTables(files) {
	files.forEach((tsvFile) => {
		const id = tsvFile.match(/(.{2,3}wiki)\.tsv/)[1];
		// serialize() means statements will execute in order
		db.serialize(() => {
			db.exec(
				`CREATE TABLE ${id}_page(
					id INTEGER NOT NULL PRIMARY KEY,
					title TEXT NOT NULL
				)`
			);
			db.exec(
				`CREATE TABLE ${id}_image(
					fk_page INTEGER NOT NULL,
					id TEXT PRIMARY KEY,
					confidence_rating TEXT,
					source TEXT,
					dataset_id TEXT,
					insertion_ts REAL,
					wiki TEXT,
					FOREIGN KEY(fk_page) REFERENCES ${id}_page(id)
				)`
			);
			db.exec(
				`CREATE INDEX ${id}_image_fk_page
				ON ${id}_image(fk_page);`
			);
		});
	});
}

/**
 * Start up in-memory sqlite database and create a set of 'image' and 'page' tables per tsv
 * project's tsv directory
 *
 * @param {string} tsvDir relative directory to look for all tsv files to import
 */
function init(tsvDir = './static') {
	db = new sqlite3.Database(':memory:', (err) => {
		if (err) {
			return console.error(err.message);
		}
		db.exec('PRAGMA foreign_keys = ON;', (error) => {
			if (error) {
				console.error('Pragma statement did not work.');
			}
		});
		const files = fs.readdirSync(tsvDir).filter((c) => c.split('.').pop() === 'tsv');
		// todo: benchmark how long this takes for all csvs
		createTables(files);
	});
}

module.exports = { createTables, insert, exec, init };
