const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const PageController = require('./page.controller');
const PostController = require('./post.controller');
const PostTypeController = require('./postType.controller');
const Page = require('../models/page');
const Post = require('../models/post');
const PostType = require('../models/postType');
const Settings = require('../models/settings');

// the models are mocked: no test here reaches a database

/** Runs an import handler to its response; a second response, or an error, fails the test. */
async function run(handler, body, path) {
    const responses = [];
    const res = {
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(sent) {
            responses.push({ status: this.statusCode || 200, body: sent });
            return this;
        },
    };
    let error;
    handler({ body, route: { path } }, res, (err) => (error = err));
    // let the handler finish whatever it still does after its response
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(error, undefined);
    assert.equal(responses.length, 1, `${responses.length} responses`);
    return responses[0];
}

const fields = [
    { title: 'Opis', type: 'textarea', id: 'opis' },
    { title: 'Galeria', type: 'repeater', id: 'galeria' },
];
const marker = { title: 'Marker', pluralTitle: 'Markers', type: 'marker', fields };

describe('import of post types', () => {
    const importPostTypes = (posts) =>
        run(PostTypeController.importPostTypes, { posts }, '/api/importPostTypes');

    it('refuses a type that already exists, and saves nothing', async (t) => {
        t.mock.method(PostType, 'find', async () => [{ type: 'marker' }]);
        const saveImport = t.mock.method(PostType, 'saveImport', async () => []);

        const response = await importPostTypes([marker, { ...marker, type: 'zasob' }]);

        assert.equal(response.status, 422);
        assert.equal(response.body.error, 'Some of imported post type already exists');
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('leaves out a field without a type, an id or a title', async (t) => {
        t.mock.method(PostType, 'find', async () => []);
        const saveImport = t.mock.method(PostType, 'saveImport', async () => []);

        const response = await importPostTypes([
            { ...marker, fields: [...fields, { title: 'Bez id', type: 'text' }] },
        ]);

        assert.equal(response.status, 200);
        assert.deepEqual(saveImport.mock.calls[0].arguments[0][0].fields, fields);
    });

    it('refuses duplicate field ids, and saves nothing', async (t) => {
        const saveImport = t.mock.method(PostType, 'saveImport', async () => []);

        const response = await importPostTypes([{ ...marker, fields: [fields[0], fields[0]] }]);

        assert.deepEqual(response, { status: 422, body: { error: 'Duplicate field ids' } });
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('refuses duplicate types, and saves nothing', async (t) => {
        const saveImport = t.mock.method(PostType, 'saveImport', async () => []);

        const response = await importPostTypes([marker, marker]);

        assert.deepEqual(response, { status: 422, body: { error: 'Duplicate types' } });
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('refuses an export of posts', async () => {
        const response = await importPostTypes([{ title: 'Jaskinia', type: 'marker', data: {} }]);

        assert.equal(response.status, 422);
    });
});

describe('import of posts', () => {
    it('refuses a post type that does not exist, and saves nothing', async (t) => {
        t.mock.method(PostType, 'findOne', async () => null);
        const saveImport = t.mock.method(Post, 'saveImport', async () => []);

        const response = await run(PostController.importPosts, {
            postType: 'zasob',
            posts: [{ title: 'Jaskinia' }],
        });

        assert.deepEqual(response, {
            status: 422,
            body: { error: 'There is no zasob post type.' },
        });
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('refuses an export of pages', async () => {
        const response = await run(PostController.importPosts, {
            postType: 'zasob',
            posts: [{ title: 'O nas', pageUrl: '/o-nas', rows: [] }],
        });

        assert.equal(response.status, 422);
    });
});

describe('import of pages', () => {
    const page = { title: 'O nas', pageUrl: '/o-nas', rows: [] };

    it('refuses duplicate urls with a single response', async (t) => {
        const find = t.mock.method(Page, 'find', async () => []);

        const response = await run(PageController.importPages, { posts: [page, page] });

        assert.deepEqual(response, { status: 422, body: { error: 'Duplicate urls' } });
        assert.equal(find.mock.callCount(), 0);
    });

    const pageTypes = [{ type: 'region', fields: [{ id: 'area' }] }];

    it('refuses a url already in use, and saves nothing', async (t) => {
        t.mock.method(Page, 'find', async () => [{ pageUrl: '/o-nas' }]);
        t.mock.method(Settings, 'findSettings', async () => ({ pageTypes }));
        const saveImport = t.mock.method(Page, 'saveImport', async () => []);

        const response = await run(PageController.importPages, { posts: [page] });

        assert.equal(response.status, 422);
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('refuses a page type the settings do not have, and saves nothing', async (t) => {
        t.mock.method(Page, 'find', async () => []);
        t.mock.method(Settings, 'findSettings', async () => ({ pageTypes }));
        const saveImport = t.mock.method(Page, 'saveImport', async () => []);

        const response = await run(PageController.importPages, {
            posts: [{ ...page, type: 'city' }],
        });

        assert.deepEqual(response, {
            status: 422,
            body: { error: 'There is no "city" page type' },
        });
        assert.equal(saveImport.mock.callCount(), 0);
    });

    it('imports only the values of the fields of the page type', async (t) => {
        t.mock.method(Page, 'find', async () => []);
        t.mock.method(Settings, 'findSettings', async () => ({ pageTypes }));
        const saveImport = t.mock.method(Page, 'saveImport', async () => []);

        const response = await run(PageController.importPages, {
            posts: [{ ...page, type: 'region', typeData: { area: 12, removed: 'x' } }],
        });

        assert.equal(response.status, 200);
        const [imported] = saveImport.mock.calls[0].arguments[0];
        assert.deepEqual([imported.type, imported.typeData], ['region', { area: 12 }]);
    });
});
