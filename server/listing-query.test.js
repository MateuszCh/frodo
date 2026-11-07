const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    parsePaging,
    buildSort,
    escapeRegex,
    buildTextMatch,
    buildFilterMatch,
    parseFilters,
    rangesGroup,
    readRanges,
} = require('./listing-query');

const FIELDS = [
    { id: 'name', type: 'text' },
    { id: 'done', type: 'checkbox' },
    { id: 'color', type: 'select' },
    { id: 'tags', type: 'multiselect' },
    { id: 'price', type: 'number' },
    { id: 'when', type: 'date' },
    { id: 'gallery', type: 'catalogue' },
    { id: 'body', type: 'wysiwyg' },
];

describe('parsePaging', () => {
    it('defaults to the first page of 20', () => {
        assert.deepEqual(parsePaging({}), { page: 1, limit: 20 });
        assert.deepEqual(parsePaging(), { page: 1, limit: 20 });
    });

    it('takes a page from 1 up and only the offered sizes', () => {
        assert.deepEqual(parsePaging({ page: '3', limit: '50' }), { page: 3, limit: 50 });
        assert.deepEqual(parsePaging({ page: '0', limit: '30' }), { page: 1, limit: 20 });
        assert.deepEqual(parsePaging({ page: 'abc', limit: '1000' }), { page: 1, limit: 20 });
        assert.deepEqual(parsePaging({ page: '-2', limit: '10' }), { page: 1, limit: 10 });
    });
});

describe('buildSort', () => {
    it('sorts by the fixed sorts with _id as a tie-breaker', () => {
        assert.deepEqual(buildSort('created', 'pages'), { created: 1, _id: 1 });
        assert.deepEqual(buildSort('-created', 'pages'), { created: -1, _id: 1 });
        assert.deepEqual(buildSort('title', 'components'), { title: 1, _id: 1 });
        assert.deepEqual(buildSort('-title', 'postTypes'), { title: -1, _id: 1 });
    });

    it('sorts posts by a sortable field of their type', () => {
        assert.deepEqual(buildSort('data_price', 'posts', FIELDS), { 'data.price': 1, _id: 1 });
        assert.deepEqual(buildSort('-data_done', 'posts', FIELDS), { 'data.done': -1, _id: 1 });
    });

    it('falls back to created for anything else', () => {
        assert.deepEqual(buildSort('data_body', 'posts', FIELDS), { created: 1, _id: 1 });
        assert.deepEqual(buildSort('data_missing', 'posts', FIELDS), { created: 1, _id: 1 });
        assert.deepEqual(buildSort('data_price', 'pages', FIELDS), { created: 1, _id: 1 });
        assert.deepEqual(buildSort('rows', 'pages'), { created: 1, _id: 1 });
        assert.deepEqual(buildSort(undefined, 'pages'), { created: 1, _id: 1 });
        assert.deepEqual(buildSort(['title'], 'pages'), { created: 1, _id: 1 });
    });
});

describe('buildTextMatch', () => {
    it('is null without a search', () => {
        assert.equal(buildTextMatch('', 'pages'), null);
        assert.equal(buildTextMatch('   ', 'pages'), null);
        assert.equal(buildTextMatch(undefined, 'posts'), null);
    });

    it('searches the text properties of pages and types case-insensitively', () => {
        const match = buildTextMatch('Home', 'pages');
        assert.deepEqual(
            match.$or.map((c) => Object.keys(c)[0]),
            ['title', 'pageUrl', 'seoTitle', 'seoDescription'],
        );
        assert.ok(match.$or[0].title.test('my homepage'));
        assert.deepEqual(
            buildTextMatch('x', 'postTypes').$or.map((c) => Object.keys(c)[0]),
            ['title', 'type'],
        );
    });

    it('escapes regex characters', () => {
        assert.equal(escapeRegex('a.b*(c)'), 'a\\.b\\*\\(c\\)');
        const match = buildTextMatch('a.b', 'components');
        assert.ok(match.$or[0].title.test('a.b'));
        assert.ok(!match.$or[0].title.test('axb'));
    });

    it('searches the title and the data text values of posts', () => {
        const match = buildTextMatch('rose', 'posts');
        assert.ok(match.$or[0].title instanceof RegExp);
        assert.ok(match.$or[1].$expr.$anyElementTrue);
        assert.ok(JSON.stringify(match.$or[1]).includes('"regex":"rose"'));
    });
});

describe('buildFilterMatch', () => {
    it('builds a condition for each active filter', () => {
        const conditions = buildFilterMatch(
            {
                checkbox: { done: false },
                select: { color: ['red'] },
                multiselect: { tags: ['a', 'b'] },
                catalogue: { gallery: ['trips'] },
                number: { price: [1, 10] },
                date: { when: ['2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z'] },
            },
            FIELDS,
        );
        assert.deepEqual(conditions.slice(0, 4), [
            { 'data.done': false },
            { 'data.color': { $in: ['red'] } },
            { 'data.tags': { $in: ['a', 'b'] } },
            { 'data.gallery': { $in: ['trips'] } },
        ]);
        const number = conditions[4].$expr.$let;
        assert.equal(number.vars.v.$convert.to, 'double');
        assert.deepEqual(number.in.$and.slice(1), [{ $gte: ['$$v', 1] }, { $lte: ['$$v', 10] }]);
        const date = conditions[5].$expr.$let;
        assert.equal(date.vars.v.$convert.to, 'date');
        assert.ok(date.in.$and[1].$gte[1] instanceof Date);
    });

    it('ignores ids that are not fields of that type, and empty or broken values', () => {
        assert.deepEqual(
            buildFilterMatch(
                {
                    checkbox: { color: true, done: 'yes' },
                    select: { color: [], missing: ['x'] },
                    number: { price: ['a', 3], when: [1, 2] },
                    date: { when: ['nope', '2026-01-01'] },
                    'data.$where': { x: 1 },
                },
                FIELDS,
            ),
            [],
        );
        assert.deepEqual(buildFilterMatch(null, FIELDS), []);
        assert.deepEqual(buildFilterMatch({ select: ['red'] }, FIELDS), []);
    });

    it('never queries an id that would change the path', () => {
        const fields = [{ id: 'a.b', type: 'checkbox' }];
        assert.deepEqual(buildFilterMatch({ checkbox: { 'a.b': true } }, fields), []);
    });
});

describe('parseFilters', () => {
    it('reads JSON and treats anything else as no filters', () => {
        assert.deepEqual(parseFilters('{"checkbox":{"done":true}}'), { checkbox: { done: true } });
        assert.equal(parseFilters('{nope'), null);
        assert.equal(parseFilters(''), null);
        assert.equal(parseFilters(undefined), null);
    });
});

describe('ranges', () => {
    it('groups the minimum and maximum of number and date fields', () => {
        const group = rangesGroup(FIELDS);
        assert.deepEqual(Object.keys(group), ['_id', 'min0', 'max0', 'min1', 'max1']);
        assert.equal(group.min0.$min.$convert.input, '$data.price');
        assert.equal(group.max1.$max.$convert.to, 'date');
    });

    it('reads them per field id, widening numbers and leaving out fields without values', () => {
        const from = new Date('2026-01-01');
        const to = new Date('2026-02-01');
        assert.deepEqual(readRanges(FIELDS, { min0: 1.5, max0: 9.2, min1: from, max1: to }), {
            price: [1, 10],
            when: [from, to],
        });
        assert.deepEqual(readRanges(FIELDS, { min0: null, max0: null, min1: from, max1: to }), {
            when: [from, to],
        });
        assert.deepEqual(readRanges(FIELDS, undefined), {});
    });
});
