const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Settings = require('./settings');
const Page = require('./page');

// Schema validation only: no database connection is needed.

function validationMessage(pageTypes) {
    return new Settings({ _id: 'settings', pageTypes }).validate().then(
        () => null,
        (err) => err.message,
    );
}

describe('Settings model', () => {
    it('accepts page types with fields', async () => {
        const message = await validationMessage([
            { title: 'Mapa', type: 'map', fields: [{ title: 'Zoom', type: 'number', id: 'zoom' }] },
            { title: 'Galeria', type: 'gallery' },
        ]);
        assert.equal(message, null);
    });

    it('requires a title and a key', async () => {
        const message = await validationMessage([{ fields: [] }]);
        assert.match(message, /Title of page type is required/);
        assert.match(message, /Key of page type is required/);
    });

    it('rejects two page types with the same key', async () => {
        const message = await validationMessage([
            { title: 'Mapa', type: 'map' },
            { title: 'Mapa 2', type: 'map' },
        ]);
        assert.match(message, /Each page type should have a different key/);
    });

    it('rejects two fields with the same id in a page type', async () => {
        const message = await validationMessage([
            {
                title: 'Mapa',
                type: 'map',
                fields: [
                    { title: 'A', type: 'text', id: 'a' },
                    { title: 'B', type: 'text', id: 'a' },
                ],
            },
        ]);
        assert.match(message, /Each field should have a different id/);
    });

    it('exports every stored value of the page types, without the database ids', () => {
        const field = { title: 'Zoom', type: 'select', id: 'zoom', selectOptions: '1;2', repeaterFields: [] };
        const settings = Settings.hydrate({
            _id: 'settings',
            __v: 3,
            pageTypes: [{ title: 'Mapa', type: 'map', fields: [{ _id: '5b41b3f0c2a1f40014a1b2c3', ...field }] }],
        });

        // no `options`: computed from selectOptions, not stored
        assert.deepEqual(settings.toExport(), {
            pageTypes: [{ title: 'Mapa', type: 'map', fields: [field] }],
        });
    });
});

describe('Page model', () => {
    it('stores the page type key and its values', () => {
        const page = new Page({ title: 'Mapa', pageUrl: 'mapa', type: 'map', typeData: { zoom: 7 } });
        assert.equal(Page.schema.path('type').instance, 'String');
        assert.equal(page.type, 'map');
        assert.deepEqual(page.typeData, { zoom: 7 });
    });
});
