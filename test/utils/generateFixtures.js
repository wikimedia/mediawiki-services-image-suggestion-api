'use strict';

const algoResults = require('../../lib/algoResults');

// This script should be invoked before all the tests run.
// It generates suggestion data for tests to use.
(function () {
	algoResults.initAlgoResultsSync('./test/fixtures');
}());
