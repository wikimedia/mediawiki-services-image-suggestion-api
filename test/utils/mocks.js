'use strict';

const sinon = require('sinon');
const apiUtil = require('../../lib/api-util');
const fs = require('fs');

function mockMwApiGet() {
	sinon.stub(apiUtil, 'mwApiGet').resolves(false);
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
