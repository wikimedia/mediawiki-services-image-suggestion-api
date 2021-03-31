'use strict';

const sinon = require('sinon');
const apiUtil = require('../../lib/api-util');
const fs = require('fs');

function mockMwApiGet(value = false) {
	if (value instanceof Error) {
		sinon.stub(apiUtil, 'mwApiGet').throws(value);
	} else {
		sinon.stub(apiUtil, 'mwApiGet').resolves(value);
	}
}

function mockFs() {
	sinon.stub(fs, 'readdirSync').returns([]);
}

function restoreAll() {
	sinon.restore();
}

module.exports = {
    mockMwApiGet,
	mockFs,
	restoreAll
};
