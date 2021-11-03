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
	 * Generate SQL param placeholders
	 *
	 * @param {int} numCol Number of columns in the given table
	 * @param {Array} values Array of values to be inserted into the db
	 * @return {string} placeholders in the form of comma separated parenthesized question marks
	 * (e.g. (?,?,?),(?,?,?)
	 *
	 */
	generatePlaceholders(numCol, values) {
		const numRows = values.length / numCol;
		const rowPlaceholder = `(${Array(numCol).fill('?').join(',')})`;
		const allPlaceholders = `${rowPlaceholder},`.repeat(numRows);
		const placeholderString = allPlaceholders.substring(0, allPlaceholders.length - 1);
		return placeholderString;
	}

	/**
	 * Insert values from tsv into a specific database table.
	 * If constraint error encountered (e.g. duplicate primary keys)
	 * log error, and retry by ignoring the conflict.
	 *
	 * @param {string} table table name (must be 'page' or 'image')
	 * @param {int} numCol Number of columns in the given table
	 * @param {Array} values Array of values to be inserted into the db
	 */
	insert(table, numCol, values) {
		const placeholderString = this.generatePlaceholders(numCol, values);
		const insertSQL = `INSERT INTO ${table} VALUES ${placeholderString}`;
			db.run(insertSQL, values).catch((err) => {
				if (err.code === 'SQLITE_CONSTRAINT') {
					this.logger.log('error', err.message);
					this.insertOrIgnore(table, numCol, values);
				}
			});
	}

	/**
	 * Insert values from tsv into a specific database table.
	 * As opposed to insert(), this function will purposefully ignore any UNIQUE constraint
	 * conflicts (e.g. PRIMARY KEY violations). Use for inserts with
	 * expected duplicates.
	 *
	 * @param {string} table table name (must be 'page' or 'image')
	 * @param {int} numCol Number of columns in the given table
	 * @param {Array} values Array of strings that will be inserted into the db
	 */
	insertOrIgnore(table, numCol, values) {
		const placeholderString = this.generatePlaceholders(numCol, values);
		const insertSQL = `INSERT OR IGNORE INTO ${table} VALUES ${placeholderString}`;
		db.run(insertSQL, values).catch((err) => {
			this.logger.log('error', err.message);
		});
	}

	/**
	 * Execute a sql query with optional parameters.
	 *
	 * @param {string} sql SQL query to execute.
	 * Can be parameterized with any values to replace represented by '?'.
	 * @param {string[]} params Query params to insert in SQL query
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
						id TEXT,
						confidence_rating TEXT,
						source TEXT,
						dataset_id TEXT,
						insertion_ts REAL,
						found_on TEXT,
						PRIMARY KEY (id, source)
					)`
				);

				db.exec(
					`CREATE TABLE ${wikiId}_image_page(
						page_id INTEGER NOT NULL,
						image_id TEXT NOT NULL,
						image_source TEXT NOT NULL,
						PRIMARY KEY (page_id, image_id, image_source)
					)`
				);

				db.exec(
					`CREATE INDEX ${wikiId}_row_num_ima ON ${wikiId}_page ( row_num_ima );`
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
