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

module.exports = { EXPORTS_DIR, exportFilename, writeExport, requireUser, exportsRouter };
