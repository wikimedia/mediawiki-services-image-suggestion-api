'use strict';

const sUtil = require('../lib/util');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * GET /image-suggestions/v0/{lang}/{wiki}/pages/{title}
 * Gets image suggestions for an individual page
 */
router.get('/:lang/:wiki/pages/:title', (req, res, next) => {
    res.json({ woot: 'woot' });
});

/**
 * GET /image-suggestions/v0/{lang}/{wiki}/pages
 * Gets under-illustrated pages and their image suggestions
 */
router.get('/:lang/:wiki/pages', (req, res, next) => {
    res.json({ woo: 'hoo' });
});

module.exports = (appObj) => {
    // TODO: Remove once routes are implemented
    // eslint-disable-next-line no-unused-vars
    app = appObj;

    // the returned object mounts the routes on
    // /{domain}/vX/mount/path
    return {
        // TODO: Put v0 in api_version instead and define a domain?
        path: '/image-suggestions/v0',
        // api_version: 1,
        skip_domain: true,
        router
    };

};
