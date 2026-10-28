const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pageTypeProps, normalizePageTypes, pagesByType, withPageTypeLock } = require('./page-types');

const PAGE_TYPES = [
    { title: 'Mapa', type: 'map', fields: [{ id: 'zoom' }, { id: 'center' }] },
    { title: 'Galeria', type: 'gallery', fields: [] },
];

describe('pageTypeProps', () => {
    it('keeps no type values for a page without a type', () => {
        assert.deepEqual(pageTypeProps({ type: '', typeData: { zoom: 7 } }, PAGE_TYPES), {
            type: undefined,
            typeData: {},
        });
        assert.deepEqual(pageTypeProps({ typeData: { zoom: 7 } }, PAGE_TYPES), { type: undefined, typeData: {} });
    });

    it('rejects a key the settings do not have', () => {
        assert.deepEqual(pageTypeProps({ type: 'old' }, PAGE_TYPES), { error: 'There is no "old" page type' });
    });

    it('keeps only the values of the fields of the page type', () => {
        const props = pageTypeProps({ type: 'map', typeData: { zoom: 7, caption: 'gallery', center: null } }, PAGE_TYPES);
        assert.deepEqual(props, { type: 'map', typeData: { zoom: 7, center: null } });
    });

    it('ignores type values that are not an object and inherited keys', () => {
        assert.deepEqual(pageTypeProps({ type: 'map', typeData: 'zoom' }, PAGE_TYPES).typeData, {});
        const withConstructor = [{ title: 'X', type: 'x', fields: [{ id: 'constructor' }] }];
        assert.deepEqual(pageTypeProps({ type: 'x', typeData: {} }, withConstructor).typeData, {});
    });
});

describe('normalizePageTypes', () => {
    it('formats keys as the editor does and defaults the fields', () => {
        assert.deepEqual(normalizePageTypes([{ title: 'Mapa', type: 'Big Map' }, null]), [
            { title: 'Mapa', type: 'big_map', fields: [] },
            { type: undefined, fields: [] },
        ]);
    });

    it('keeps every other value of a page type, for the schema to keep or drop', () => {
        assert.deepEqual(normalizePageTypes([{ title: 'Mapa', type: 'map', icon: 'pin' }]), [
            { title: 'Mapa', type: 'map', icon: 'pin', fields: [] },
        ]);
    });
});

describe('pagesByType', () => {
    it('lists the titles of the pages of each type', () => {
        const usage = pagesByType([
            { title: 'Mapa', type: 'map' },
            { title: 'Mapa 2', type: 'map' },
            { title: 'Bez typu', type: '' },
            { title: 'Konstruktor', type: 'constructor' },
        ]);
        assert.deepEqual({ ...usage }, { map: ['Mapa', 'Mapa 2'], constructor: ['Konstruktor'] });
    });
});

describe('withPageTypeLock', () => {
    it('runs a task only after the tasks queued before it', async () => {
        const order = [];
        let release;
        const first = withPageTypeLock(
            () =>
                new Promise((resolve) => {
                    order.push('first start');
                    release = () => {
                        order.push('first end');
                        resolve();
                    };
                }),
        );
        const second = withPageTypeLock(async () => order.push('second'));
        await new Promise((resolve) => setImmediate(resolve));
        assert.deepEqual(order, ['first start']);
        release();
        await Promise.all([first, second]);
        assert.deepEqual(order, ['first start', 'first end', 'second']);
    });

    it('keeps going after a task fails and passes the failure to its caller', async () => {
        await assert.rejects(
            withPageTypeLock(() => Promise.reject(new Error('save failed'))),
            /save failed/,
        );
        assert.equal(await withPageTypeLock(async () => 'next'), 'next');
    });
});
