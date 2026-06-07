import { makeField, makePost, makePostType } from '../../testing/test-helpers';
import {
    applyFilters,
    applySort,
    buildFilters,
    buildSort,
    persistSort,
    resetFilters,
} from './listing-filter';
import type { Filters } from './listing-filter';
import type { Post } from '../../models/models';

afterEach(() => sessionStorage.clear());

// ---------------------------------------------------------------------------
// buildFilters
// ---------------------------------------------------------------------------

describe('buildFilters', () => {
    it('returns a text-only filter when family is not "posts"', () => {
        const result = buildFilters([], [], 'pages', []);
        expect(result).toEqual({ textFilter: { type: 'text', value: undefined } });
    });

    it('returns undefined when family is "posts" and fields is empty', () => {
        expect(buildFilters([], [], 'posts', [])).toBeUndefined();
        expect(buildFilters(undefined, [], 'posts', [])).toBeUndefined();
    });

    it('adds a checkbox group with value "all"', () => {
        const fields = [makeField('checkbox', 'active', 'Active')];
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.checkboxes!.fields).toHaveLength(1);
        expect(result.checkboxes!.fields[0].value).toBe('all');
    });

    it('adds a number group with range when posts have numeric data', () => {
        // Three posts with one duplicate to cover all branches of the sort comparator in setRange:
        // a < b (ascending), a > b (descending), and a === b (equal → returns 0)
        const posts = [
            makePost({ data: { price: 50 } }),
            makePost({ data: { price: 10 } }),
            makePost({ data: { price: 10 } }), // duplicate covers a===b → returns 0
        ];
        const fields = [makeField('number', 'price', 'Price')];
        const result = buildFilters(fields, posts, 'posts', [])!;
        expect(result.numbers!.fields).toHaveLength(1);
        const f = result.numbers!.fields[0];
        expect(f.range).toEqual([10, 50]);
        expect(f.minValue).toBe(10);
        expect(f.maxValue).toBe(50);
    });

    it('omits number field when no posts have that data', () => {
        const posts = [makePost({ data: {} })];
        const fields = [makeField('number', 'price', 'Price')];
        const result = buildFilters(fields, posts, 'posts', [])!;
        expect(result.numbers!.fields).toHaveLength(0);
    });

    it('adds a select group with options', () => {
        const fields = [makeField('select', 'status', 'Status', { options: ['a', 'b'] })];
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.selects!.fields).toHaveLength(1);
        expect(result.selects!.fields[0].options).toEqual(['a', 'b']);
        expect(result.selects!.fields[0].values).toEqual([]);
    });

    it('select field without options falls back to [] (line 105 ?? branch)', () => {
        // field.options is undefined → field.options ?? [] returns []
        const fields = [makeField('select', 'status', 'Status')]; // no options
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.selects!.fields[0].options).toEqual([]);
    });

    it('adds a multiselect group with multiOptions', () => {
        const fields = [makeField('multiselect', 'tags', 'Tags', { multiOptions: ['x', 'y'] })];
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.multiselects!.fields).toHaveLength(1);
        expect(result.multiselects!.fields[0].multiOptions).toEqual(['x', 'y']);
        expect(result.multiselects!.fields[0].values).toEqual([]);
    });

    it('multiselect field without multiOptions falls back to [] (line 110 ?? branch)', () => {
        // field.multiOptions is undefined → field.multiOptions ?? [] returns []
        const fields = [makeField('multiselect', 'tags', 'Tags')]; // no multiOptions
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.multiselects!.fields[0].multiOptions).toEqual([]);
    });

    it('adds a date group with Date range when posts have date strings', () => {
        const posts = [
            makePost({ data: { published: '2024-01-01' } }),
            makePost({ data: { published: '2024-12-31' } }),
        ];
        const fields = [makeField('date', 'published', 'Published')];
        const result = buildFilters(fields, posts, 'posts', [])!;
        expect(result.dates!.fields).toHaveLength(1);
        const [min, max] = result.dates!.fields[0].range as [Date, Date];
        expect(min).toBeInstanceOf(Date);
        expect(max).toBeInstanceOf(Date);
        expect(min < max).toBe(true);
    });

    it('date field with no valid date values: date group stays empty (line 116 false branch)', () => {
        const fields = [makeField('date', 'published', 'Published')];
        // No posts → setRange returns undefined → if(range) is false → dates.fields stays empty
        const result = buildFilters(fields, [], 'posts', [])!;
        expect(result.dates!.fields).toHaveLength(0);
    });

    it('adds a catalogue group with the passed catalogues', () => {
        const fields = [makeField('catalogue', 'cat', 'Category')];
        const catalogues = ['nature', 'tech'];
        const result = buildFilters(fields, [], 'posts', catalogues)!;
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
        const result = buildFilters(fields, [], 'posts', [])!;
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
// applyFilters
// ---------------------------------------------------------------------------

describe('applyFilters', () => {
    const posts: Post[] = [
        makePost({ title: 'Alpha', data: { active: true, status: 'open', tags: ['a', 'b'], score: 5, cat: 'nature' } }),
        makePost({ title: 'Beta', data: { active: false, status: 'closed', tags: ['b', 'c'], score: 15, cat: 'tech' } }),
        makePost({ title: 'Gamma', data: { active: true, status: 'open', tags: ['c'], score: 25, cat: 'nature' } }),
    ];

    it('returns models unchanged when filters is undefined', () => {
        expect(applyFilters(posts as unknown as Record<string, unknown>[], undefined, 'posts')).toBe(posts);
    });

    it('returns empty array unchanged', () => {
        const filters: Filters = { textFilter: { type: 'text' } };
        expect(applyFilters([], filters, 'posts')).toHaveLength(0);
    });

    it('filters by text (case-insensitive JSON match)', () => {
        const filters: Filters = { textFilter: { type: 'text', value: 'gamma' } };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(1);
        expect((result[0] as unknown as Post).title).toBe('Gamma');
    });

    it('passes all models when text filter is empty', () => {
        const filters: Filters = { textFilter: { type: 'text', value: '' } };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(3);
    });

    it('null item in models uses empty string fallback in textMatches (line 164 ?? branch)', () => {
        const filters: Filters = { textFilter: { type: 'text', value: 'hello' } };
        const items = [null as unknown as Record<string, unknown>, { title: 'hello world' } as Record<string, unknown>];
        const result = applyFilters(items, filters, 'pages');
        expect(result).toHaveLength(1);
        expect((result[0] as any).title).toBe('hello world');
    });

    it('filters checkboxes when value is not "all"', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            checkboxes: { type: 'checkbox', fields: [{ id: 'active', title: 'Active', value: true as unknown as 'all' }] },
        };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(2);
    });

    it('passes all through when checkbox value is "all"', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            checkboxes: { type: 'checkbox', fields: [{ id: 'active', title: 'Active', value: 'all' }] },
        };
        expect(applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts')).toHaveLength(3);
    });

    it('filters by select values', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            selects: { type: 'select', fields: [{ id: 'status', title: 'Status', values: ['open'] }] },
        };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(2);
    });

    it('filters by multiselect values (any match)', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            multiselects: { type: 'multiselect', fields: [{ id: 'tags', title: 'Tags', values: ['a'] }] },
        };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(1);
        expect((result[0] as unknown as Post).title).toBe('Alpha');
    });

    it('filters by number range when range is narrowed', () => {
        const filters: Filters = {
            textFilter: { type: 'text' },
            numbers: {
                type: 'number',
                fields: [{ id: 'score', title: 'Score', range: [5, 25], minValue: 10, maxValue: 20 }],
            },
        };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(1);
        expect((result[0] as unknown as Post).title).toBe('Beta');
    });

    it('multiselect filter excludes post whose field is an empty array (line 211 return false)', () => {
        const postsWithEmpty: Post[] = [
            makePost({ data: { tags: [] } }),         // empty → excluded
            makePost({ data: { tags: ['red'] } }),    // matches → included
        ];
        const filters: Filters = {
            textFilter: { type: 'text' },
            multiselects: {
                type: 'multiselect',
                fields: [{ id: 'tags', title: 'Tags', multiOptions: ['red', 'blue'], values: ['red'] }],
            },
        };
        const result = applyFilters(postsWithEmpty as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(1);
    });

    it('ANDs multiple active filters', () => {
        // text 'gamma' matches only Gamma; checkbox active===true also matches Gamma → intersection = [Gamma]
        const filters: Filters = {
            textFilter: { type: 'text', value: 'gamma' },
            checkboxes: { type: 'checkbox', fields: [{ id: 'active', title: 'Active', value: false as unknown as 'all' }] },
        };
        const result = applyFilters(posts as unknown as Record<string, unknown>[], filters, 'posts');
        // Gamma matches text but active=true, not false → intersection is empty
        expect(result).toHaveLength(0);
    });

    it('applies only text filter when family is not "posts"', () => {
        const pages = [{ title: 'Home', pageUrl: '/' }, { title: 'About', pageUrl: '/about' }];
        const filters: Filters = {
            textFilter: { type: 'text', value: 'home' },
        };
        const result = applyFilters(pages as unknown as Record<string, unknown>[], filters, 'pages');
        expect(result).toHaveLength(1);
    });

    it('filters by date range when range is narrowed', () => {
        const d1 = new Date('2024-01-01');
        const d2 = new Date('2024-12-31');
        const mid = new Date('2024-06-15');
        const postsWithDates: Post[] = [
            makePost({ data: { pub: '2024-01-01' } }),
            makePost({ data: { pub: '2024-06-15' } }),
            makePost({ data: { pub: '2024-12-31' } }),
        ];
        const filters: Filters = {
            textFilter: { type: 'text' },
            dates: {
                type: 'date',
                fields: [{ id: 'pub', title: 'Published', range: [d1, d2], minValue: mid, maxValue: d2 }],
            },
        };
        const result = applyFilters(postsWithDates as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(2); // mid and d2 pass; d1 is before mid
    });

    it('excludes posts with missing date values from date filter', () => {
        const d1 = new Date('2024-01-01');
        const d2 = new Date('2024-12-31');
        const postsWithDates: Post[] = [
            makePost({ data: {} }),                    // no date value
            makePost({ data: { pub: '2024-06-01' } }),
        ];
        const filters: Filters = {
            textFilter: { type: 'text' },
            dates: {
                type: 'date',
                fields: [{ id: 'pub', title: 'Published', range: [d1, d2], minValue: d1, maxValue: d2 }],
            },
        };
        // Range not narrowed (minValue === range[0]), so filter is inactive — all pass
        const resultUnnarrowed = applyFilters(postsWithDates as unknown as Record<string, unknown>[], filters, 'posts');
        expect(resultUnnarrowed).toHaveLength(2);

        // Narrow the range to trigger filtering
        const narrowed = { ...filters, dates: { type: 'date', fields: [{ ...filters.dates!.fields[0], minValue: new Date('2024-05-01') }] } } as Filters;
        const resultNarrowed = applyFilters(postsWithDates as unknown as Record<string, unknown>[], narrowed, 'posts');
        expect(resultNarrowed).toHaveLength(1); // post without date is excluded
    });

    it('filters by catalogue values', () => {
        const postsWithCat: Post[] = [
            makePost({ data: { cat: 'nature' } }),
            makePost({ data: { cat: 'tech' } }),
            makePost({ data: { cat: 'nature' } }),
        ];
        const filters: Filters = {
            textFilter: { type: 'text' },
            catalogues: { type: 'catalogue', fields: [{ id: 'cat', title: 'Category', values: ['tech'] }] },
        };
        const result = applyFilters(postsWithCat as unknown as Record<string, unknown>[], filters, 'posts');
        expect(result).toHaveLength(1);
        expect((result[0] as unknown as Post).data['cat']).toBe('tech');
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

    it('both values null sorts them as equal (line 302)', () => {
        const bothNull: Record<string, unknown>[] = [
            { title: undefined, created: undefined },
            { title: undefined, created: undefined },
        ];
        const sorted = applySort(bothNull, 'title');
        expect(sorted).toHaveLength(2); // no crash, both null treated as equal
    });

    it('three-item array with one null covers bv==null branch (line 304)', () => {
        // Three items force compareFn to be called in both directions (A vs null AND null vs A)
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

    it('equal values leave cmp at 0 — covers else path of av > bv (line 306)', () => {
        // When av == bv, neither av < bv nor av > bv is true → cmp stays 0
        const withEqual: Record<string, unknown>[] = [
            { title: 'A', id: 1 },
            { title: 'A', id: 2 },
            { title: 'B', id: 3 },
        ];
        const sorted = applySort(withEqual, 'title');
        // Both 'A' items come first (order between them is stable), then 'B'
        expect(sorted[2]['title']).toBe('B');
    });

    it('sorts by data_ field when post.data is undefined (line 293 ?? {} branch)', () => {
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
