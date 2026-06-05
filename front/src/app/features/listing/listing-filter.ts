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

function setRange(
    posts: Post[],
    id: string,
    dates = false,
): [number, number] | [Date, Date] | undefined {
    let values = posts
        .map((post) => post.data[id])
        .filter((v): v is number | string => v !== undefined && v !== null) as Array<
        number | string
    >;
    if (!values.length) {
        return undefined;
    }
    values = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const first = values[0];
    const last = values[values.length - 1];
    return dates
        ? [new Date(first), new Date(last)]
        : [Math.floor(Number(first)), Math.ceil(Number(last))];
}

/** Port of createFilters() from listing.factory.js. */
export function buildFilters(
    fields: Field[] | undefined,
    posts: Post[],
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
                const range = setRange(posts, field.id) as [number, number] | undefined;
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
                const range = setRange(posts, field.id, true) as [Date, Date] | undefined;
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

function textMatches(item: unknown, text: string): boolean {
    return JSON.stringify(item ?? '')
        .toLowerCase()
        .includes(text.toLowerCase());
}

/** Port of listingFilter.filter.js. */
export function applyFilters<T extends Record<string, unknown>>(
    models: T[],
    filters: Filters | undefined,
    type: string,
): T[] {
    if (!models.length || !filters) {
        return models;
    }

    let result = models;

    const text = filters.textFilter.value;
    if (text) {
        result = result.filter((m) => textMatches(m, text));
    }

    if (type !== 'posts') {
        return result;
    }

    const data = (m: T) => (m as unknown as Post).data;

    filters.checkboxes?.fields.forEach((checkbox) => {
        if (checkbox.value !== 'all') {
            result = result.filter((m) => data(m)[checkbox.id] === checkbox.value);
        }
    });

    filters.selects?.fields.forEach((select) => {
        if (select.values && select.values.length) {
            result = result.filter((m) => {
                const v = data(m)[select.id] as string;
                return !!v && select.values!.indexOf(v) > -1;
            });
        }
    });

    filters.multiselects?.fields.forEach((multiselect) => {
        if (multiselect.values && multiselect.values.length) {
            result = result.filter((m) => {
                const v = data(m)[multiselect.id] as string[] | undefined;
                if (!v || !v.length) return false;
                return v.some((opt) => multiselect.values!.indexOf(opt) > -1);
            });
        }
    });

    filters.catalogues?.fields.forEach((catalogue) => {
        if (catalogue.values && catalogue.values.length) {
            result = result.filter((m) => {
                const v = data(m)[catalogue.id] as string;
                return catalogue.values!.indexOf(v) > -1;
            });
        }
    });

    filters.numbers?.fields.forEach((number) => {
        const range = number.range as [number, number];
        if (number.minValue !== range[0] || number.maxValue !== range[1]) {
            result = result.filter((m) => {
                const v = Number(data(m)[number.id]);
                return (number.minValue as number) <= v && (number.maxValue as number) >= v;
            });
        }
    });

    filters.dates?.fields.forEach((date) => {
        const range = date.range as [Date, Date];
        if (date.minValue !== range[0] || date.maxValue !== range[1]) {
            result = result.filter((m) => {
                const raw = data(m)[date.id];
                if (!raw) return false;
                const t = new Date(raw as string).getTime();
                return (
                    (date.minValue as Date).getTime() <= t && (date.maxValue as Date).getTime() >= t
                );
            });
        }
    });

    return result;
}

/** Port of createSort() from listing.factory.js. */
export function buildSort(
    listingId: string | number,
    type: string,
    fields: Field[] | undefined,
): SortState {
    const key = 'sorting.' + listingId;
    const current = sessionStorage.getItem(key) || 'created';
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
