const { after, before, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { EXPORTS_DIR, exportFilename, writeExport, exportsRouter } = require('./exports');

describe('exportFilename', () => {
    it('keeps a plain name', () => {
        assert.equal(exportFilename('pages'), 'pages.json');
        assert.equal(exportFilename('post_types-2'), 'post_types-2.json');
    });

    it('keeps a name from a URL inside the export folder', () => {
        assert.equal(exportFilename('../../config'), '______config.json');
        assert.equal(exportFilename('a b/c\\d'), 'a_b_c_d.json');
    });
});

describe('/export', () => {
    const name = `test-export-${process.pid}`;
    let server;
    let base;

    before(async () => {
        await new Promise((resolve, reject) =>
            writeExport(name, '[1]', (err, url) => {
                if (err) return reject(err);
                assert.equal(url, `/export/${name}.json`);
                resolve();
            }),
        );
        const app = express();
        // stands in for the Passport session: "x-user" marks a logged-in request
        app.use((req, res, next) => {
            req.user = req.headers['x-user'] ? { username: 'admin' } : undefined;
            next();
        });
        app.use('/export', exportsRouter());
        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        base = `http://127.0.0.1:${server.address().port}`;
    });

    after(() => {
        server.close();
        fs.rmSync(path.join(EXPORTS_DIR, `${name}.json`), { force: true });
    });

    const get = (url, user = true) => fetch(base + url, { headers: user ? { 'x-user': '1' } : {} });

    it('writes exports into the export folder', () => {
        assert.equal(fs.readFileSync(path.join(EXPORTS_DIR, `${name}.json`), 'utf8'), '[1]');
    });

    it('serves an export to a logged-in user', async () => {
        const res = await get(`/export/${name}.json`);
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), [1]);
    });

    it('refuses an export without a login', async () => {
        assert.equal((await get(`/export/${name}.json`, false)).status, 401);
    });

    it('never serves the project root', async () => {
        for (const url of ['/export/config.json', '/export/package.json', '/export/..%2Fconfig.json', '/export/server/exports.js', '/export/']) {
            const res = await get(url);
            assert.equal(res.status, 404, url);
            assert.doesNotMatch(await res.text(), /mongoUrl|sessionSecret/, url);
        }
    });
});
