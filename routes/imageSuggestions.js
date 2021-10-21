'use strict';

const sUtil = require('../lib/util');
const suggestions = require('../lib/imageSuggestions');

/**
 * The main router object
 */
const router = sUtil.router();

/**
 * GET /image-suggestions/v0/{wiki}/{lang}/pages
 *
 * Gets under-illustrated pages and their image suggestions
 * If page ids are provided, suggestions for those pages are
 * returned. If page ids are not provided, suggestions are
 * returned for a random set of pages.
 */
router.get('/:wiki/:lang/pages', async (req, res, next) => {
    try {
        const response = await suggestions.getPages(req);
        res.json(response);
    } catch (err) {
        res.status(err.status).json(err);
    }
});

router.get('/:wiki/:lang/pages/:title', async (req, res, next) => {
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
