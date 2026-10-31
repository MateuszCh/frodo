const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const PostType = require('./models/postType');
const Component = require('./models/component');
const Settings = require('./models/settings');
const PostTypeController = require('./controllers/postType.controller');
const { usesPostType, postTypeUsage } = require('./post-type-usage');

// the models are mocked: no test here reaches a database

const id = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();
const postField = (postType) => ({ title: 'Powiązane', type: 'post', id: 'powiazane', postType });
const inRepeater = (field) => ({ title: 'Lista', type: 'repeater', id: 'lista', repeaterFields: [field] });

function mockSchemas(t, { postTypes = [], components = [], pageTypes = [] } = {}) {
    t.mock.method(PostType, 'find', async () => postTypes);
    t.mock.method(Component, 'find', async () => components);
    t.mock.method(Settings, 'findSettings', async () => ({ pageTypes }));
}

/** Runs a handler to its response; a second response, or an error, fails the test. */
async function run(handler, req) {
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
    handler(req, res, (err) => (error = err));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(error, undefined);
    assert.equal(responses.length, 1, `${responses.length} responses`);
    return responses[0];
}

describe('usesPostType', () => {
    it('finds a "post" field of the key, in repeater rows too', () => {
        assert.equal(usesPostType([postField('marker')], 'marker'), true);
        assert.equal(usesPostType([inRepeater(inRepeater(postField('marker')))], 'marker'), true);
        assert.equal(usesPostType([postField('zasob')], 'marker'), false);
        assert.equal(usesPostType([{ title: 'T', type: 'text', id: 't', postType: 'marker' }], 'marker'), false);
        assert.equal(usesPostType(undefined, 'marker'), false);
    });
});

describe('postTypeUsage', () => {
    it('lists the post types, components and page types that use the key, but the one left out', async (t) => {
        mockSchemas(t, {
            postTypes: [
                { _id: id, title: 'Marker', fields: [postField('marker')] },
                { _id: otherId, title: 'Wydarzenie', fields: [inRepeater(postField('marker'))] },
            ],
            components: [
                { title: 'Hero', fields: [postField('marker')] },
                { title: 'Cytat', fields: [] },
            ],
            pageTypes: [{ title: 'Strona główna', fields: [postField('marker')] }],
        });

        assert.deepEqual(await postTypeUsage('marker', id), ['Wydarzenie', 'Hero', 'Strona główna']);
        assert.deepEqual(await postTypeUsage('zasob', id), []);
    });
});

describe('post type with "post" fields that use it', () => {
    const stored = (overrides = {}) => ({
        _id: id,
        type: 'marker',
        title: 'Marker',
        fields: [],
        save: async function () {
            return this;
        },
        remove: async function () {
            return this;
        },
        ...overrides,
    });

    it('refuses a new key while other schemas use the old one', async (t) => {
        mockSchemas(t, { components: [{ title: 'Hero', fields: [postField('marker')] }] });
        t.mock.method(PostType, 'findOne', async () => null);
        const doc = stored();
        t.mock.method(PostType, 'findById', async () => doc);

        const response = await run(PostTypeController.edit, {
            route: { path: '/api/postType/edit' },
            body: { _id: String(id), type: 'markers', title: 'Marker', pluralTitle: 'Markers', fields: [] },
        });

        assert.equal(response.status, 422);
        assert.equal(response.body.error, 'Post type "marker" is used by "post" fields in: Hero');
        assert.equal(doc.type, 'marker');
    });

    it('refuses a new key its own fields still point to the old one with', async (t) => {
        mockSchemas(t);
        t.mock.method(PostType, 'findOne', async () => null);
        t.mock.method(PostType, 'findById', async () => stored());

        const response = await run(PostTypeController.edit, {
            route: { path: '/api/postType/edit' },
            body: {
                _id: String(id),
                type: 'markers',
                title: 'Marker',
                pluralTitle: 'Markers',
                fields: [postField('marker')],
            },
        });

        assert.equal(response.status, 422);
        assert.equal(response.body.error, 'Post type "marker" is used by "post" fields in: Marker');
    });

    it('saves a new key nothing uses, and an edit that keeps the key', async (t) => {
        mockSchemas(t, { components: [{ title: 'Hero', fields: [postField('zasob')] }] });
        t.mock.method(PostType, 'findOne', async () => null);
        t.mock.method(PostType, 'findById', async () => stored());

        const renamed = await run(PostTypeController.edit, {
            route: { path: '/api/postType/edit' },
            body: { _id: String(id), type: 'markers', title: 'Marker', pluralTitle: 'Markers', fields: [] },
        });
        assert.equal(renamed.status, 200);
        assert.equal(renamed.body.type, 'markers');
    });

    it('refuses to remove a post type that "post" fields use', async (t) => {
        mockSchemas(t, { pageTypes: [{ title: 'Strona główna', fields: [inRepeater(postField('marker'))] }] });
        const doc = stored();
        const remove = t.mock.method(doc, 'remove');
        t.mock.method(PostType, 'findById', async () => doc);

        const response = await run(PostTypeController.delete, {
            route: { path: '/api/postType/:id' },
            params: { id: String(id) },
        });

        assert.equal(response.status, 422);
        assert.equal(response.body.error, 'Post type "marker" is used by "post" fields in: Strona główna');
        assert.equal(remove.mock.callCount(), 0);
    });

    it('removes a post type only its own fields use', async (t) => {
        mockSchemas(t, { postTypes: [{ _id: id, title: 'Marker', fields: [postField('marker')] }] });
        t.mock.method(PostType, 'findById', async () => stored());

        const response = await run(PostTypeController.delete, {
            route: { path: '/api/postType/:id' },
            params: { id: String(id) },
        });

        assert.equal(response.status, 200);
        assert.equal(response.body, 'marker type removed successfully');
    });
});
