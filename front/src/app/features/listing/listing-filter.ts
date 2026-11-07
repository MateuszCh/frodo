import { Field, Post } from '../../models/models';

export interface FilterField {
    id: string;
    title: string;
    value?: boolean | 'all';
    range?: [number, number] | [Date, Date];
    minValue?: number | Date;
    maxValue?: number | Date;
    options?: string[] | null;
    multiOptions?: string[] | null;
    values?: string[];
}

export interface FilterGroup {
    type: string;
    fields: FilterField[];
}

export interface Filters {
    textFilter: { type: 'text'; value?: string };
    checkboxes?: FilterGroup;
    numbers?: FilterGroup;
    selects?: FilterGroup;
    multiselects?: FilterGroup;
    dates?: FilterGroup;
    catalogues?: FilterGroup;
}

export interface SortType {
    name: string;
    varName: string;
}

export interface SortState {
    current: string;
    types: SortType[];
}

const FILTERABLE = ['checkbox', 'number', 'select', 'multiselect', 'date', 'catalogue'];

export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

/** `{ fieldId: [min, max] }` from the server; dates come as ISO strings. */
export type FilterRanges = Record<string, [number, number] | [string, string]>;

/** The filters sent to the server: only the active ones, by field type and id. */
export interface ActiveFilters {
    checkbox?: Record<string, boolean>;
    select?: Record<string, string[]>;
    multiselect?: Record<string, string[]>;
    catalogue?: Record<string, string[]>;
    number?: Record<string, [number, number]>;
    date?: Record<string, [string, string]>;
}

/** Port of createFilters() from listing.factory.js. */
export function buildFilters(
    fields: Field[] | undefined,
    ranges: FilterRanges,
    family: string,
    catalogues: string[],
): Filters | undefined {
    if (family !== 'posts') {
        return { textFilter: { type: 'text', value: undefined } };
    }
    if (!fields || !fields.length) {
        return undefined;
    }

    const checkboxes: FilterGroup = { type: 'checkbox', fields: [] };
    const numbers: FilterGroup = { type: 'number', fields: [] };
    const selects: FilterGroup = { type: 'select', fields: [] };
    const multiselects: FilterGroup = { type: 'multiselect', fields: [] };
    const dates: FilterGroup = { type: 'date', fields: [] };
    const cataloguesGroup: FilterGroup = { type: 'catalogue', fields: [] };

    fields.forEach((field) => {
        if (FILTERABLE.indexOf(field.type) === -1) {
            return;
        }
        const filterField: FilterField = { id: field.id, title: field.title };
        switch (field.type) {
            case 'checkbox':
                filterField.value = 'all';
                checkboxes.fields.push(filterField);
                break;
            case 'number': {
                const raw = ranges[field.id];
                const range = raw ? ([Number(raw[0]), Number(raw[1])] as [number, number]) : undefined;
                if (range) {
                    filterField.range = range;
                    filterField.minValue = range[0];
                    filterField.maxValue = range[1];
                    numbers.fields.push(filterField);
                }
                break;
            }
            case 'select':
                filterField.options = field.options ?? [];
                filterField.values = [];
                selects.fields.push(filterField);
                break;
            case 'multiselect':
                filterField.multiOptions = field.multiOptions ?? [];
                filterField.values = [];
                multiselects.fields.push(filterField);
                break;
            case 'date': {
                const raw = ranges[field.id];
                const range = raw ? ([new Date(raw[0]), new Date(raw[1])] as [Date, Date]) : undefined;
                if (range) {
                    filterField.range = range;
                    filterField.minValue = range[0];
                    filterField.maxValue = range[1];
                    dates.fields.push(filterField);
                }
                break;
            }
            case 'catalogue':
                filterField.options = catalogues;
                filterField.values = [];
                cataloguesGroup.fields.push(filterField);
                break;
        }
    });

    return {
        textFilter: { type: 'text', value: undefined },
        checkboxes,
        numbers,
        selects,
        multiselects,
        dates,
        catalogues: cataloguesGroup,
    };
}

/** Port of resetFilters() from listing.factory.js. */
export function resetFilters(filters: Filters, type: string): void {
    filters.textFilter.value = undefined;
    if (type !== 'posts') {
        return;
    }
    filters.checkboxes?.fields.forEach((f) => (f.value = 'all'));
    filters.numbers?.fields.forEach((f) => {
        f.minValue = (f.range as [number, number])[0];
        f.maxValue = (f.range as [number, number])[1];
    });
    filters.selects?.fields.forEach((f) => (f.values = []));
    filters.multiselects?.fields.forEach((f) => (f.values = []));
    filters.dates?.fields.forEach((f) => {
        f.minValue = (f.range as [Date, Date])[0];
        f.maxValue = (f.range as [Date, Date])[1];
    });
    filters.catalogues?.fields.forEach((f) => (f.values = []));
}

/** The active post filters in the shape the server reads; null when none is active. */
export function serializeFilters(filters: Filters | undefined): ActiveFilters | null {
    if (!filters) {
        return null;
    }
    const active: ActiveFilters = {};
    const put = <K extends keyof ActiveFilters>(type: K, id: string, value: unknown) => {
        const group = (active[type] ?? {}) as Record<string, unknown>;
        group[id] = value;
        active[type] = group as ActiveFilters[K];
    };

    filters.checkboxes?.fields.forEach((f) => {
        if (typeof f.value === 'boolean') {
            put('checkbox', f.id, f.value);
        }
    });
    filters.selects?.fields.forEach((f) => f.values?.length && put('select', f.id, [...f.values]));
    filters.multiselects?.fields.forEach(
        (f) => f.values?.length && put('multiselect', f.id, [...f.values]),
    );
    filters.catalogues?.fields.forEach((f) => f.values?.length && put('catalogue', f.id, [...f.values]));
    filters.numbers?.fields.forEach((f) => {
        const range = f.range as [number, number];
        const [min, max] = [f.minValue, f.maxValue];
        // a cleared box is no bound, not a bound at 0
        if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
            return;
        }
        if (min !== range[0] || max !== range[1]) {
            put('number', f.id, [min, max]);
        }
    });
    filters.dates?.fields.forEach((f) => {
        const range = f.range as [Date, Date];
        const [min, max] = [f.minValue, f.maxValue];
        if (!(min instanceof Date) || !(max instanceof Date) || isNaN(min.getTime()) || isNaN(max.getTime())) {
            return;
        }
        if (min.getTime() !== range[0].getTime() || max.getTime() !== range[1].getTime()) {
            put('date', f.id, [min.toISOString(), max.toISOString()]);
        }
    });
    return Object.keys(active).length ? active : null;
}

/** Port of createSort() from listing.factory.js. */
/**
 * Key of the sort and page size kept per listing: the family, or "posts.<type>" for the
 * posts of a type (known from the URL, so the route resolver can read them too).
 */
export function listingKey(family: string, postType?: string): string {
    return family === 'posts' && postType ? `posts.${postType}` : family;
}

/** The sort chosen for a listing in this session, or "created". */
export function readSort(listingId: string | number): string {
    try {
        return sessionStorage.getItem('sorting.' + listingId) || 'created';
    } catch {
        return 'created';
    }
}

export function buildSort(
    listingId: string | number,
    type: string,
    fields: Field[] | undefined,
): SortState {
    const current = readSort(listingId);
    const types: SortType[] = [
        { name: 'newest', varName: '-created' },
        { name: 'oldest', varName: 'created' },
        { name: 'title', varName: 'title' },
    ];

    if (type === 'posts' && fields) {
        const sortingFields = ['text', 'checkbox', 'select', 'number', 'date', 'catalogue'];
        fields.forEach((field) => {
            if (sortingFields.indexOf(field.type) > -1) {
                const negative = field.type === 'checkbox' ? '-' : '';
                types.push({ name: field.title, varName: negative + 'data_' + field.id });
            }
        });
    }

    return { current, types };
}

export function persistSort(listingId: string | number, varName: string): void {
    sessionStorage.setItem('sorting.' + listingId, varName);
}

/** The page size chosen for a listing (localStorage), or the default. */
export function readPageSize(listingId: string | number): number {
    try {
        const size = Number(localStorage.getItem('listing.pageSize.' + listingId));
        return (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE;
    } catch {
        return DEFAULT_PAGE_SIZE;
    }
}

export function persistPageSize(listingId: string | number, size: number): void {
    try {
        localStorage.setItem('listing.pageSize.' + listingId, String(size));
    } catch {
        // storage blocked: the size holds until the listing is left
    }
}

/** Sort comparator for a varName like "-created" | "title" | "data_<id>". */
export function applySort<T extends Record<string, unknown>>(models: T[], varName: string): T[] {
    const desc = varName.startsWith('-');
    const field = desc ? varName.slice(1) : varName;
    const getValue = (m: T): unknown => {
        if (field === 'created') return (m as Record<string, unknown>)['created'];
        if (field === 'title') return (m as Record<string, unknown>)['title'];
        if (field.startsWith('data_')) {
            const id = field.slice('data_'.length);
            return ((m as unknown as Post).data ?? {})[id];
        }
        return (m as Record<string, unknown>)[field];
    };

    return [...models].sort((a, b) => {
        const av = getValue(a);
        const bv = getValue(b);
        let cmp = 0;
        if (av == null && bv == null) cmp = 0;
        else if (av == null) cmp = -1;
        else if (bv == null) cmp = 1;
        else if (av < bv) cmp = -1;
        else if (av > bv) cmp = 1;
        return desc ? -cmp : cmp;
    });
}
