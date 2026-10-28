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
    });
});
