'use strict';

const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
sqlite3.verbose();
const fs = require('fs');
let db;

class Database {

	constructor(logger) {
		this.logger = logger;
	}

	/**
	 * Insert values from tsv into a specific database table.
	 *
	 * @param {string} table table name (must be 'page' or 'image')
	 * @param {int} numCol Number of columns in the given table
	 * @param {string} values Array of values to insert as a row
	 */
	insert(table, numCol, values) {
		const placeholders = Array(numCol).fill('?');
		const rowPlaceholders = `(${placeholders.join(',')})`;
		const allPlaceholders = values.map((elem) => rowPlaceholders).join(',');
		const insertSQL = `INSERT OR IGNORE INTO ${table} VALUES ${allPlaceholders}`;
		db.run(insertSQL, values, (err) => {
			if (err) {
				const msg = `${err.message}. table: ${table}, numCol: ${numCol}, values.length: ${values.length}`;
				return console.error(new Error(msg).stack);
			}
		});
	}

	/**
	 * Execute a sql query with optional parameters.
	 *
	 * @param {string} sql SQL query to execute.
	 * Can be parameterized with any values to replace represented by '?'.
	 * @param {string[]} params Query params to insert into SQL query
	 * @return {Promise} Resolves with rows returned, rejects with any errors during execution
	 */
	async exec(sql, params = []) {
		const rows = await db.all(sql, params);
		return rows;
	}

	/**
	 * Create initial 'page' and 'image' tables in sqlite database
	 *
	 * @param {string[]} files Array of relative paths to tsv files to import
	 */
	createTables(files) {
		files.forEach((tsvFile) => {
			const wikiId = tsvFile.match(/(.{2,3}wiki)\.tsv/)[1];
			// serialize() means statements will execute in order
			db.getDatabaseInstance().serialize(() => {
				// The row_num field is needed for selecting "random" rows.
				// Because we select by it a LOT, we make it our primary key.
				// We don't use autoincrement (or sqlite rowid) because, while those
				// are usually consecutive with no gaps, that is not guaranteed.
				db.exec(
					`CREATE TABLE ${wikiId}_page(
						row_num INTEGER NOT NULL PRIMARY KEY,
						row_num_ima INTEGER NOT NULL,
						id INTEGER NOT NULL UNIQUE,
						title TEXT NOT NULL
					)`
				);

				db.exec(
					`CREATE TABLE ${wikiId}_image(
						id TEXT PRIMARY KEY,
						confidence_rating TEXT,
						source TEXT,
						dataset_id TEXT,
						insertion_ts REAL,
						found_on TEXT
					)`
				);

				db.exec(
					`CREATE TABLE ${wikiId}_image_page(
						page_id INTEGER NOT NULL,
						image_id TEXT NOT NULL
					)`
				);

				db.exec(
					`CREATE INDEX ${wikiId}_pageID
					ON ${wikiId}_image_page(page_id);`
				);

				db.exec(
					`CREATE INDEX ${wikiId}_imageID
					ON ${wikiId}_image_page(image_id);`
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
	init(tsvDir = './static') {
		const files = fs.readdirSync(tsvDir).filter((c) => c.split('.').pop() === 'tsv');
		this.createTables(files);
	}

	async start(dbFile) {
		db = await open({
			filename: dbFile,
			driver: sqlite3.Database
		});
		db.exec('PRAGMA foreign_keys = ON;', (error) => {
			if (error) {
				console.error('Pragma statement did not work.');
			}
		});
	}

	exists(dbFile) {
		return fs.existsSync(dbFile);
	}

}
module.exports = Database;
