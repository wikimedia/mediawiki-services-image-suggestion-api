'use strict';

/*
This script is invoked before all tests run.
It deletes any existing .json files in test/fixtures and generates new ones for tests to use.
*/

const algoResults = require('../../lib/algoResults');
const fs = require('fs');

const path = './test/fixtures/';
const regex = /.\.json/;

fs.readdirSync(path)
	.filter((file) => regex.test(file))
	.map((file) => fs.unlinkSync(path + file));

algoResults.initAlgoResultsSync('./test/fixtures');
