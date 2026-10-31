const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const File = require('../file');
const Page = require('../page');
const Post = require('../post');
const PostType = require('../postType');
const Component = require('../component');
const Counter = require('../counter');

const _id = '5b41b3f0c2a1f40014a1b2c3';
// every field holds repeaterFields, as in the database: the schema gives it an empty list
const fields = [
    { title: 'Opis', type: 'textarea', id: 'opis', repeaterFields: [] },
    {
        title: 'Galeria',
        type: 'repeater',
        id: 'galeria',
        repeaterFields: [{ title: 'Zdjęcie', type: 'file', id: 'zdjecie', repeaterFields: [] }],
    },
];

// a value for every field of each schema, as a document read from the database holds them
const stored = {
    file: {
        title: 'Panorama',
        filename: 'panorama.png',
        src: '/uploads/panorama.png',
        description: 'Wapienna jaskinia',
        author: 'M. Bednarek',
        place: 'Rogoźnik',
        type: 'image/png',
        size: 2048,
        catalogues: ['jaskinie', 'top50'],
        id: 11252,
        position: 3,
        created: 1793211857980,
        updated: 1793211857990,
    },
    page: {
        title: 'O nas',
        pageUrl: '/o-nas',
        seoTitle: 'O nas – GeoSilesia',
        seoDescription: 'Kim jesteśmy',
        type: 'region',
        typeData: { area: 12 },
        rows: [{ type: 'text', title: 'Wstęp', data: { text: 'Cześć' } }],
        id: 12,
        created: 1793211857980,
        updated: 1793211857990,
    },
    post: {
        title: 'Jaskinia Szachownica',
        type: 'marker',
        data: { opis: 'Rezerwat', galeria: [{ zdjecie: '/uploads/panorama.png' }] },
        id: 13,
        created: 1793211857980,
        updated: 1793211857990,
    },
    postType: {
        title: 'Marker',
        pluralTitle: 'Markers',
        type: 'marker',
        fields,
        id: 14,
        created: 1793211857980,
        updated: 1793211857990,
    },
    component: {
        title: 'Tekst',
        type: 'text',
        fields,
        id: 15,
        created: 1793211857980,
        updated: 1793211857990,
    },
};

const models = [
    ['File', File, stored.file],
    ['Page', Page, stored.page],
    ['Post', Post, stored.post],
    ['PostType', PostType, stored.postType],
    ['Component', Component, stored.component],
];

describe('exportable', () => {
    for (const [name, Model, values] of models) {
        describe(name, () => {
            const doc = Model.hydrate({ _id, __v: 0, ...values });

            it('the test sets every field of the schema', () => {
                const schemaFields = Object.keys(Model.schema.paths).filter(
                    (field) => !['_id', '__v', 'posts'].includes(field),
                );
                assert.deepEqual(Object.keys(values).sort(), schemaFields.sort());
            });

            it('exports every stored value but _id and __v', () => {
                assert.deepEqual(doc.toExport(), values);
            });

            it('imports every exported value but id and updated', () => {
                const { id, updated, ...imported } = values;
                assert.deepEqual(Model.fromExport(doc.toExport()), imported);
            });

            it('imports into a valid document', () => {
                // the message only: a failed assertion on the error would print the whole document
                const error = new Model(Model.fromExport(doc.toExport())).validateSync();
                assert.equal(error && error.message, undefined);
            });
        });
    }

    it('leaves out the _id of subdocuments but keeps values of a Mixed field as they are', () => {
        const page = Page.hydrate({
            ...stored.page,
            rows: [{ type: 'link', data: { _id: 'mine' } }],
        });
        const postType = PostType.hydrate({ ...stored.postType, fields: [{ _id, ...fields[1] }] });
        assert.deepEqual(page.toExport().rows, [{ type: 'link', data: { _id: 'mine' } }]);
        assert.deepEqual(postType.toExport().fields, [fields[1]]);
    });

    it('exports a value stored outside the schema too', () => {
        assert.deepEqual(Page.hydrate({ ...stored.page, legacy: { a: 1 } }).toExport().legacy, {
            a: 1,
        });
    });

    it('leaves out the posts of a post type, which belong to its database', () => {
        const postType = PostType.hydrate({ ...stored.postType, posts: [_id] });
        assert.equal('posts' in postType.toExport(), false);
        assert.equal('posts' in PostType.fromExport({ ...stored.postType, posts: [_id] }), false);
    });

    it('keeps a value of 0', () => {
        assert.equal(File.hydrate({ ...stored.file, position: 0 }).toExport().position, 0);
        assert.equal(File.fromExport({ filename: 'a.png', position: 0 }).position, 0);
    });

    it('imports an export from before every field was exported', () => {
        const old = { title: 'Jaskinia', data: { opis: 'Rezerwat' }, created: 1530000000000 };
        assert.deepEqual(Post.fromExport(old), old);
    });

    it('a post export holds only fields of a post, as the import of posts asks', () => {
        const postFields = Object.keys(Post.schema.paths);
        const exported = Object.keys(Post.hydrate(stored.post).toExport());
        assert.deepEqual(
            exported.filter((field) => !postFields.includes(field)),
            [],
        );
    });

    describe('saveImport', () => {
        it('saves every document, with ids the counter gives all at once', async (t) => {
            const reserve = t.mock.method(Counter, 'reserve', async () => 500);
            t.mock.method(Post, 'create', async (models) => models);
            const exported = [Post.hydrate({ _id, ...stored.post }).toExport(), { title: 'Drugi' }];

            const saved = await Post.saveImport(exported, { type: 'zasob' });

            assert.deepEqual(
                reserve.mock.calls.map((call) => call.arguments),
                [[2]],
            );
            assert.deepEqual(
                saved.map((post) => [post.title, post.id, post.type]),
                [
                    ['Jaskinia Szachownica', 500, 'zasob'],
                    ['Drugi', 501, 'zasob'],
                ],
            );
        });

        it('saves nothing and takes no ids when one document is not valid', async (t) => {
            const reserve = t.mock.method(Counter, 'reserve', async () => 500);
            const create = t.mock.method(Page, 'create', async (models) => models);

            await assert.rejects(
                Page.saveImport([stored.page, { title: 'Bez adresu' }]),
                /Url of page is required/,
            );
            assert.equal(reserve.mock.callCount(), 0);
            assert.equal(create.mock.callCount(), 0);
        });

        it('with keepIds keeps the ids of the export that are free, and moves the counter past them', async (t) => {
            const calls = [];
            t.mock.method(Post, 'find', async (query) => {
                calls.push(['find', query.id.$in]);
                return [{ id: 7 }];
            });
            t.mock.method(Counter, 'passId', async (id) => calls.push(['passId', id]));
            t.mock.method(Counter, 'reserve', async (count) => {
                calls.push(['reserve', count]);
                return 500;
            });
            t.mock.method(Post, 'create', async (models) => models);

            const saved = await Post.saveImport(
                [
                    { title: 'Wolne', id: 42 },
                    { title: 'Zajęte', id: 7 },
                    { title: 'Powtórzone', id: 42 },
                    { title: 'Bez id' },
                    { title: 'Wolne dalej', id: 300 },
                ],
                { type: 'zasob' },
                { keepIds: true },
            );

            assert.deepEqual(
                saved.map((post) => [post.title, post.id]),
                [
                    ['Wolne', 42],
                    ['Zajęte', 500],
                    ['Powtórzone', 501],
                    ['Bez id', 502],
                    ['Wolne dalej', 300],
                ],
            );
            // past the kept ids before the counter hands out new ones
            assert.deepEqual(calls, [
                ['find', [42, 7, 42, 300]],
                ['passId', 300],
                ['reserve', 3],
            ]);
        });

        it('with keepIds and every id free takes no new ids', async (t) => {
            t.mock.method(Post, 'find', async () => []);
            const passId = t.mock.method(Counter, 'passId', async () => {});
            const reserve = t.mock.method(Counter, 'reserve', async () => 500);
            t.mock.method(Post, 'create', async (models) => models);

            const saved = await Post.saveImport([{ title: 'A', id: 3 }], { type: 'zasob' }, { keepIds: true });

            assert.equal(saved[0].id, 3);
            assert.deepEqual(passId.mock.calls[0].arguments, [3]);
            assert.equal(reserve.mock.callCount(), 0);
        });
    });

    it('keeps the post type of a "post" field, in repeater rows too', () => {
        const postType = PostType.hydrate({
            _id,
            ...stored.postType,
            fields: [
                { title: 'Powiązane', type: 'post', id: 'powiazane', postType: 'marker', repeaterFields: [] },
                {
                    title: 'Lista',
                    type: 'repeater',
                    id: 'lista',
                    repeaterFields: [
                        { title: 'Wpis', type: 'post', id: 'wpis', postType: 'zasob', repeaterFields: [] },
                    ],
                },
            ],
        });
        const imported = PostType.fromExport(JSON.parse(JSON.stringify(postType.toExport())));

        assert.equal(imported.fields[0].postType, 'marker');
        assert.equal(imported.fields[1].repeaterFields[0].postType, 'zasob');
        assert.equal(new PostType(imported).validateSync(), undefined);
    });

    it('does not take a "post" field without a post type', () => {
        const error = new PostType({
            ...stored.postType,
            fields: [{ title: 'Powiązane', type: 'post', id: 'powiazane', repeaterFields: [] }],
        }).validateSync();
        assert.match(error.message, /post type of field is required/);

        const nested = new PostType({
            ...stored.postType,
            fields: [
                {
                    title: 'Lista',
                    type: 'repeater',
                    id: 'lista',
                    repeaterFields: [{ title: 'Wpis', type: 'post', id: 'wpis', repeaterFields: [] }],
                },
            ],
        }).validateSync();
        assert.match(nested.message, /post type of field is required/);
    });
});
