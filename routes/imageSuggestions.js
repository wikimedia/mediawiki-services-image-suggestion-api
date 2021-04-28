'use strict';

const sUtil = require('../lib/util');
const suggestions = require('../lib/imageSuggestions');

/**
 * The main router object
 */
const router = sUtil.router();

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

module.exports = () => {
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
