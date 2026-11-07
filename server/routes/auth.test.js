const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const routes = require('./index');

// The real middleware and routes, with stub routes registered after them: a request that gets
// through the login check reaches a stub, so no controller (and no database) is ever called.
function startApp({ user } = {}) {
    const app = express();
    app.use((req, res, next) => {
        req.user = user;
        next();
    });
    routes(app);
    app.get('/api/zz-stub', (req, res) => res.send('api ok'));
    app.get('/zz-stub', (req, res) => res.send('page ok'));
    return new Promise((resolve) => {
        const server = app.listen(0, () => resolve(server));
    });
}

describe('login check', () => {
    let anonymous;
    let logged;
    before(async () => {
        anonymous = await startApp();
        logged = await startApp({ user: { id: 1 } });
    });
    after(() => {
        anonymous.close();
        logged.close();
    });

    const get = (server, path) => fetch(`http://127.0.0.1:${server.address().port}${path}`);

    for (const path of [
        '/api/listing/pages',
        '/api/page',
        '/api/page/1',
        '/api/postTypeByType/news',
        '/api/component',
        '/api/file/catalogues',
        '/api/settings',
        '/api/exportPages',
        '/api/zz-stub',
    ]) {
        it(`refuses GET ${path} without a login`, async () => {
            const res = await get(anonymous, path);
            assert.equal(res.status, 401);
            assert.deepEqual(await res.json(), { error: 'User not authenticated' });
        });
    }

    it('lets a logged-in user read', async () => {
        const res = await get(logged, '/api/zz-stub');
        assert.equal(res.status, 200);
        assert.equal(await res.text(), 'api ok');
    });

    it('leaves GETs outside /api to their routes (the app, /user/* for the login screen)', async () => {
        const res = await get(anonymous, '/zz-stub');
        assert.equal(res.status, 200);
    });
});
