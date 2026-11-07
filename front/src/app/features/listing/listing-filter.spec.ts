import { makeField, makePost } from '../../testing/test-helpers';
import {
    applySort,
    buildFilters,
    buildSort,
    listingKey,
    persistPageSize,
    persistSort,
    readPageSize,
    readSort,
    resetFilters,
    serializeFilters,
} from './listing-filter';
import type { Filters } from './listing-filter';
import type { Post } from '../../models/models';

afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
});

// ---------------------------------------------------------------------------
// buildFilters
// ---------------------------------------------------------------------------

describe('buildFilters', () => {
    it('returns a text-only filter when family is not "posts"', () => {
        const result = buildFilters([], {}, 'pages', []);
        expect(result).toEqual({ textFilter: { type: 'text', value: undefined } });
    });

    it('returns undefined when family is "posts" and fields is empty', () => {
        expect(buildFilters([], {}, 'posts', [])).toBeUndefined();
        expect(buildFilters(undefined, {}, 'posts', [])).toBeUndefined();
    });

    it('adds a checkbox group with value "all"', () => {
        const fields = [makeField('checkbox', 'active', 'Active')];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.checkboxes!.fields).toHaveLength(1);
        expect(result.checkboxes!.fields[0].value).toBe('all');
    });

    it('adds a number group with the range from the server', () => {
        const fields = [makeField('number', 'price', 'Price')];
        const result = buildFilters(fields, { price: [10, 50] }, 'posts', [])!;
        expect(result.numbers!.fields).toHaveLength(1);
        const f = result.numbers!.fields[0];
        expect(f.range).toEqual([10, 50]);
        expect(f.minValue).toBe(10);
        expect(f.maxValue).toBe(50);
    });

    it('omits number field when the server has no range for it', () => {
        const fields = [makeField('number', 'price', 'Price')];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.numbers!.fields).toHaveLength(0);
    });

    it('adds a select group with options', () => {
        const fields = [makeField('select', 'status', 'Status', { options: ['a', 'b'] })];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.selects!.fields).toHaveLength(1);
        expect(result.selects!.fields[0].options).toEqual(['a', 'b']);
        expect(result.selects!.fields[0].values).toEqual([]);
    });

    it('select field without options falls back to []', () => {
        const fields = [makeField('select', 'status', 'Status')]; // no options
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.selects!.fields[0].options).toEqual([]);
    });

    it('adds a multiselect group with multiOptions', () => {
        const fields = [makeField('multiselect', 'tags', 'Tags', { multiOptions: ['x', 'y'] })];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.multiselects!.fields).toHaveLength(1);
        expect(result.multiselects!.fields[0].multiOptions).toEqual(['x', 'y']);
        expect(result.multiselects!.fields[0].values).toEqual([]);
    });

    it('multiselect field without multiOptions falls back to []', () => {
        const fields = [makeField('multiselect', 'tags', 'Tags')]; // no multiOptions
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.multiselects!.fields[0].multiOptions).toEqual([]);
    });

    it('adds a date group with a Date range from the ISO strings of the server', () => {
        const fields = [makeField('date', 'published', 'Published')];
        const ranges = { published: ['2024-01-01T00:00:00.000Z', '2024-12-31T00:00:00.000Z'] as [string, string] };
        const result = buildFilters(fields, ranges, 'posts', [])!;
        expect(result.dates!.fields).toHaveLength(1);
        const [min, max] = result.dates!.fields[0].range as [Date, Date];
        expect(min).toBeInstanceOf(Date);
        expect(max).toBeInstanceOf(Date);
        expect(min < max).toBe(true);
    });

    it('date field with no valid date values: date group stays empty', () => {
        const fields = [makeField('date', 'published', 'Published')];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.dates!.fields).toHaveLength(0);
    });

    it('adds a catalogue group with the passed catalogues', () => {
        const fields = [makeField('catalogue', 'cat', 'Category')];
        const catalogues = ['nature', 'tech'];
        const result = buildFilters(fields, {}, 'posts', catalogues)!;
        expect(result.catalogues!.fields).toHaveLength(1);
        expect(result.catalogues!.fields[0].options).toEqual(catalogues);
    });

    it('ignores non-filterable field types (text, textarea, file, repeater)', () => {
        const fields = [
            makeField('text', 'body', 'Body'),
            makeField('textarea', 'desc', 'Desc'),
            makeField('file', 'img', 'Image'),
            makeField('repeater', 'items', 'Items'),
        ];
        const result = buildFilters(fields, {}, 'posts', [])!;
        expect(result.checkboxes!.fields).toHaveLength(0);
        expect(result.numbers!.fields).toHaveLength(0);
        expect(result.selects!.fields).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// resetFilters
// ---------------------------------------------------------------------------

describe('resetFilters', () => {
    it('clears textFilter.value for any family', () => {
        const filters: Filters = { textFilter: { type: 'text', value: 'hello' } };
        resetFilters(filters, 'pages');
        expect(filters.textFilter.value).toBeUndefined();
    });

    it('does not touch field groups when family is not "posts"', () => {
        const filters: Filters = {
            textFilter: { type: 'text', value: 'x' },
            checkboxes: { type: 'checkbox', fields: [{ id: 'a', title: 'A', value: false }] },
        };
        resetFilters(filters, 'pages');
        expect(filters.checkboxes!.fields[0].value).toBe(false); // unchanged
    });

    it('resets checkbox values to "all" for family "posts"', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            checkboxes: { type: 'checkbox', fields: [{ id: 'a', title: 'A', value: false }] },
        };
        resetFilters(filters, 'posts');
        expect(filters.checkboxes!.fields[0].value).toBe('all');
    });

    it('resets number min/max to range bounds for family "posts"', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            numbers: {
                type: 'number',
                fields: [{ id: 'n', title: 'N', range: [0, 100], minValue: 20, maxValue: 80 }],
            },
        };
        resetFilters(filters, 'posts');
        expect(filters.numbers!.fields[0].minValue).toBe(0);
        expect(filters.numbers!.fields[0].maxValue).toBe(100);
    });

    it('resets select and multiselect values to [] for family "posts"', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            selects: { type: 'select', fields: [{ id: 's', title: 'S', values: ['x'] }] },
            multiselects: { type: 'multiselect', fields: [{ id: 'm', title: 'M', values: ['y'] }] },
        };
        resetFilters(filters, 'posts');
        expect(filters.selects!.fields[0].values).toEqual([]);
        expect(filters.multiselects!.fields[0].values).toEqual([]);
    });

    it('resets date min/max to range bounds for family "posts"', () => {
        const d1 = new Date('2024-01-01');
        const d2 = new Date('2024-12-31');
        const filters: Filters = {
            textFilter: { type: 'text' },
            dates: {
                type: 'date',
                fields: [{ id: 'd', title: 'D', range: [d1, d2], minValue: new Date('2024-06-01'), maxValue: new Date('2024-07-01') }],
            },
        };
        resetFilters(filters, 'posts');
        expect(filters.dates!.fields[0].minValue).toBe(d1);
        expect(filters.dates!.fields[0].maxValue).toBe(d2);
    });

    it('resets catalogue values to [] for family "posts" (line 160 forEach callback)', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            catalogues: { type: 'catalogue', fields: [{ id: 'photo', title: 'Photo', options: ['nature'], values: ['nature'] }] },
        };
        resetFilters(filters, 'posts');
        expect(filters.catalogues!.fields[0].values).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// serializeFilters
// ---------------------------------------------------------------------------

describe('serializeFilters', () => {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-12-31T00:00:00.000Z');

    function fullFilters(): Filters {
        return buildFilters(
            [
                makeField('checkbox', 'active', 'Active'),
                makeField('select', 'status', 'Status', { options: ['open', 'closed'] }),
                makeField('multiselect', 'tags', 'Tags', { multiOptions: ['a', 'b'] }),
                makeField('catalogue', 'cat', 'Category'),
                makeField('number', 'score', 'Score'),
                makeField('date', 'pub', 'Published'),
            ],
            { score: [0, 100], pub: [d1.toISOString(), d2.toISOString()] },
            'posts',
            ['nature', 'tech'],
        )!;
    }

    it('is null without filters or without an active one', () => {
        expect(serializeFilters(undefined)).toBeNull();
        expect(serializeFilters(fullFilters())).toBeNull();
        expect(serializeFilters({ textFilter: { type: 'text', value: 'x' } })).toBeNull();
    });

    it('sends only the active filters, by type and field id', () => {
        const f = fullFilters();
        f.checkboxes!.fields[0].value = false;
        f.selects!.fields[0].values = ['open'];
        f.multiselects!.fields[0].values = ['a', 'b'];
        f.catalogues!.fields[0].values = ['tech'];
        f.numbers!.fields[0].minValue = 10;
        f.dates!.fields[0].maxValue = new Date('2024-06-30T00:00:00.000Z');
        expect(serializeFilters(f)).toEqual({
            checkbox: { active: false },
            select: { status: ['open'] },
            multiselect: { tags: ['a', 'b'] },
            catalogue: { cat: ['tech'] },
            number: { score: [10, 100] },
            date: { pub: [d1.toISOString(), '2024-06-30T00:00:00.000Z'] },
        });
    });

    it('treats a date equal to the range bound as inactive, even as another Date object', () => {
        const f = fullFilters();
        f.dates!.fields[0].minValue = new Date(d1.getTime());
        expect(serializeFilters(f)).toBeNull();
    });

    it('leaves out a range with a cleared or invalid bound', () => {
        const f = fullFilters();
        f.numbers!.fields[0].minValue = null as unknown as number;
        f.dates!.fields[0].minValue = new Date('nope');
        expect(serializeFilters(f)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// page size
// ---------------------------------------------------------------------------

describe('readPageSize / persistPageSize', () => {
    it('defaults to 20', () => {
        expect(readPageSize('pages')).toBe(20);
    });

    it('keeps the size per listing in localStorage', () => {
        persistPageSize('pages', 50);
        persistPageSize(12, 100);
        expect(localStorage.getItem('listing.pageSize.pages')).toBe('50');
        expect(readPageSize('pages')).toBe(50);
        expect(readPageSize(12)).toBe(100);
        expect(readPageSize('components')).toBe(20);
    });

    it('ignores a size that is not offered', () => {
        localStorage.setItem('listing.pageSize.pages', '30');
        expect(readPageSize('pages')).toBe(20);
    });

    it('falls back to the default when storage throws', () => {
        const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readPageSize('pages')).toBe(20);
        spy.mockRestore();
        const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => persistPageSize('pages', 50)).not.toThrow();
        setSpy.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// buildSort
// ---------------------------------------------------------------------------

describe('buildSort', () => {
    it('always includes newest, oldest, and title entries', () => {
        const { types } = buildSort('listing1', 'pages', undefined);
        const names = types.map((t) => t.name);
        expect(names).toContain('newest');
        expect(names).toContain('oldest');
        expect(names).toContain('title');
    });

    it('does not add extra entries when family is not "posts"', () => {
        const { types } = buildSort('listing1', 'pages', []);
        expect(types).toHaveLength(3);
    });

    it('adds sortable field entries for "posts" family', () => {
        const fields = [
            makeField('text', 'name', 'Name'),
            makeField('checkbox', 'active', 'Active'),
            makeField('file', 'img', 'Image'), // non-sortable
        ];
        const { types } = buildSort('listing1', 'posts', fields);
        expect(types.length).toBeGreaterThan(3);
        const textEntry = types.find((t) => t.name === 'Name');
        expect(textEntry?.varName).toBe('data_name');
        const checkboxEntry = types.find((t) => t.name === 'Active');
        expect(checkboxEntry?.varName).toBe('-data_active'); // checkbox gets '-' prefix
        expect(types.find((t) => t.name === 'Image')).toBeUndefined();
    });

    it('defaults current to "created" when sessionStorage has no entry', () => {
        const { current } = buildSort('no-entry', 'posts', []);
        expect(current).toBe('created');
    });

    it('reads current from sessionStorage when set', () => {
        sessionStorage.setItem('sorting.myList', '-title');
        const { current } = buildSort('myList', 'posts', []);
        expect(current).toBe('-title');
    });
});

// ---------------------------------------------------------------------------
// persistSort
// ---------------------------------------------------------------------------

describe('persistSort', () => {
    it('writes the varName to sessionStorage', () => {
        persistSort('myList', '-created');
        expect(sessionStorage.getItem('sorting.myList')).toBe('-created');
    });
});

// ---------------------------------------------------------------------------
// applySort
// ---------------------------------------------------------------------------

describe('applySort', () => {
    const items: Post[] = [
        makePost({ title: 'Zebra', created: 1000, data: { score: 30 } }),
        makePost({ title: 'Apple', created: 3000, data: { score: 10 } }),
        makePost({ title: 'Mango', created: 2000, data: { score: 20 } }),
    ];

    it('sorts ascending by title', () => {
        const sorted = applySort(items as unknown as Record<string, unknown>[], 'title') as unknown as Post[];
        expect(sorted.map((p) => p.title)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('sorts descending by -title', () => {
        const sorted = applySort(items as unknown as Record<string, unknown>[], '-title') as unknown as Post[];
        expect(sorted.map((p) => p.title)).toEqual(['Zebra', 'Mango', 'Apple']);
    });

    it('sorts ascending by created (oldest first)', () => {
        const sorted = applySort(items as unknown as Record<string, unknown>[], 'created') as unknown as Post[];
        expect(sorted.map((p) => p.title)).toEqual(['Zebra', 'Mango', 'Apple']);
    });

    it('sorts descending by -created (newest first)', () => {
        const sorted = applySort(items as unknown as Record<string, unknown>[], '-created') as unknown as Post[];
        expect(sorted.map((p) => p.title)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('sorts by a nested data_ field', () => {
        const sorted = applySort(items as unknown as Record<string, unknown>[], 'data_score') as unknown as Post[];
        expect(sorted.map((p) => p.data['score'])).toEqual([10, 20, 30]);
    });

    it('sorts nulls before any value (ascending)', () => {
        const withNull: Post[] = [
            makePost({ title: 'B', created: 2000 }),
            makePost({ title: undefined as unknown as string, created: undefined }),
        ];
        const sorted = applySort(withNull as unknown as Record<string, unknown>[], 'title') as unknown as Post[];
        expect(sorted[0].title).toBeUndefined();
    });

    it('does not mutate the original array', () => {
        const copy = [...items];
        applySort(items as unknown as Record<string, unknown>[], '-title');
        expect(items).toEqual(copy);
    });

    it('both values null sorts them as equal', () => {
        const bothNull: Record<string, unknown>[] = [
            { title: undefined, created: undefined },
            { title: undefined, created: undefined },
        ];
        const sorted = applySort(bothNull, 'title');
        expect(sorted).toHaveLength(2); // no crash, both null treated as equal
    });

    it('three-item array with one null: null is always sorted first', () => {
        const withNull: Record<string, unknown>[] = [
            { title: 'A' },
            { title: undefined },
            { title: 'C' },
        ];
        const sorted = applySort(withNull, 'title');
        expect(sorted[0]['title']).toBeUndefined(); // null sorts first
        expect(sorted[1]['title']).toBe('A');
        expect(sorted[2]['title']).toBe('C');
    });

    it('equal values produce stable sort order', () => {
        const withEqual: Record<string, unknown>[] = [
            { title: 'A', id: 1 },
            { title: 'A', id: 2 },
            { title: 'B', id: 3 },
        ];
        const sorted = applySort(withEqual, 'title');
        // Both 'A' items come first (order between them is stable), then 'B'
        expect(sorted[2]['title']).toBe('B');
    });

    it('sorts by data_ field when post.data is undefined', () => {
        const withMissingData = [
            { ...makePost(), title: 'B', data: { score: 5 } },
            { ...makePost(), title: 'A', data: undefined as any },
        ];
        const sorted = applySort(withMissingData as unknown as Record<string, unknown>[], 'data_score') as typeof withMissingData;
        // undefined data → getValue returns undefined → sorts as null (first)
        expect(sorted[0].data).toBeUndefined();
    });

    it('sorts by a top-level field other than "title" or "created" (fallback branch)', () => {
        const pages = [
            { pageUrl: '/z', title: 'Z' },
            { pageUrl: '/a', title: 'A' },
            { pageUrl: '/m', title: 'M' },
        ];
        const sorted = applySort(pages as unknown as Record<string, unknown>[], 'pageUrl') as typeof pages;
        expect(sorted.map((p) => p.pageUrl)).toEqual(['/a', '/m', '/z']);
    });
});

describe('listingKey / readSort', () => {
    it('keys a family by name and posts by their type', () => {
        expect(listingKey('pages')).toBe('pages');
        expect(listingKey('pages', 'news')).toBe('pages');
        expect(listingKey('posts', 'news')).toBe('posts.news');
        expect(listingKey('posts')).toBe('posts');
    });

    it('reads the kept sort or falls back to created', () => {
        expect(readSort('posts.news')).toBe('created');
        persistSort('posts.news', '-title');
        expect(readSort('posts.news')).toBe('-title');
    });
});
