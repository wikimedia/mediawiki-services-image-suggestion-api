'use strict';

const sUtil = require('../lib/util');
const suggestions = require('../lib/imageSuggestions');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * The main application object reported when this module is require()d
 */
let app;

/**
 * TODO: Implement
 * GET /image-suggestions/v0/{wiki}/{lang}/pages/{title}
 * Gets image suggestions for an individual page
 */

/**
 * GET /image-suggestions/v0/{wiki}/{lang}/pages
 * Gets under-illustrated pages and their image suggestions
 */
router.get('/:wiki/:lang/pages', async (req, res, next) => {
    try {
        const response = await suggestions.getPages(req);
        res.json(response);
    } catch (err) {
        res.status(err.status).json(err);
    }
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
