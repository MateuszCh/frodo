const express = require('express'),
    fs = require('fs'),
    path = require('path');

// Export files (pages.json, the posts of a type, …) live in a folder of their own, and only
// that folder is served at /export, to logged-in users. The project root, with config.json
// and the source, must never be reachable from there.
const EXPORTS_DIR = path.join(__dirname, '..', 'exports');

/** Letters, digits, "_" and "-" only: a name taken from a URL cannot leave the folder. */
function exportFilename(name) {
    return `${String(name).replace(/[^\w-]/g, '_')}.json`;
}

/** Writes an export; the callback gets an error or the URL to download it from. */
function writeExport(name, content, callback) {
    const filename = exportFilename(name);
    fs.mkdir(EXPORTS_DIR, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
            return callback(mkdirErr);
        }
        fs.writeFile(path.join(EXPORTS_DIR, filename), content, (err) => callback(err, `/export/${filename}`));
    });
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * The items an export asks for: `{ ids }` in the body, ObjectId strings of the chosen items.
 * Gives `{ ids: null }` without `ids` (everything, as before), `{ ids }` for a valid list and
 * `{ error }` for anything else, an empty list included: there would be nothing to export.
 */
function parseExportIds(body) {
    const ids = body?.ids;
    if (ids === undefined || ids === null) {
        return { ids: null };
    }
    if (!Array.isArray(ids) || !ids.length) {
        return { error: 'Choose at least one item to export' };
    }
    if (!ids.every((id) => typeof id === 'string' && OBJECT_ID.test(id))) {
        return { error: 'Invalid ids to export' };
    }
    return { ids: [...new Set(ids)] };
}

/** `filter` narrowed to the chosen items, or as it is when everything is exported. */
function exportFilter(filter, ids) {
    return ids ? { ...filter, _id: { $in: ids } } : filter;
}

function requireUser(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.status(401).send({ error: 'User not authenticated' });
    }
}

/** The /export route: files of the export folder for a logged-in user, 404 for anything else. */
function exportsRouter() {
    const router = express.Router();
    router.use(requireUser);
    router.use(express.static(EXPORTS_DIR, { index: false, dotfiles: 'deny' }));
    router.use((req, res) => res.status(404).send({ error: 'Export not found' }));
    return router;
}

module.exports = {
    EXPORTS_DIR,
    exportFilename,
    writeExport,
    parseExportIds,
    exportFilter,
    requireUser,
    exportsRouter,
};
