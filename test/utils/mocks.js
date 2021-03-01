'use strict';

const sinon = require('sinon');
const apiUtil = require('../../lib/api-util');

function mockMwApiGet() {
	sinon.stub(apiUtil, 'mwApiGet').resolves(false);
}

function restoreAll() {
	sinon.restore();
}

module.exports = {
    mockMwApiGet,
	restoreAll
};
