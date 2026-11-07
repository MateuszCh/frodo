// Pure helpers behind GET /api/listing/:family: paging, sort, search and post filters as
// MongoDB query pieces. No database here, so node:test covers them directly.

const PAGE_SIZES = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;
const FAMILIES = ['pages', 'components', 'postTypes', 'posts'];

// the field types a post listing can sort by (the same list the frontend offers)
const SORTABLE_FIELD_TYPES = ['text', 'checkbox', 'select', 'number', 'date', 'catalogue'];
const FILTER_TYPES = ['checkbox', 'select', 'multiselect', 'catalogue', 'number', 'date'];

// top-level text properties searched besides the title (posts search their data values)
const TEXT_PROPS = {
    pages: ['title', 'pageUrl', 'seoTitle', 'seoDescription'],
    components: ['title', 'type'],
    postTypes: ['title', 'type'],
};

/** A field id usable in a dotted path ("data.<id>"); others are skipped, never queried. */
function safeId(id) {
    return typeof id === 'string' && id !== '' && !/[.$]/.test(id);
}

function parsePaging(query = {}) {
    const page = Number.parseInt(query.page, 10);
    const limit = Number.parseInt(query.limit, 10);
    return {
        page: Number.isInteger(page) && page >= 1 ? page : 1,
        limit: PAGE_SIZES.includes(limit) ? limit : DEFAULT_PAGE_SIZE,
    };
}

/** `$sort` for "created" | "-title" | "data_<id>"…; anything unknown sorts by "created". */
function buildSort(sortParam, family, fields = []) {
    const value = typeof sortParam === 'string' ? sortParam : '';
    const desc = value.startsWith('-');
    const name = desc ? value.slice(1) : value;
    let path = 'created';
    let direction = 1;

    if (name === 'created' || name === 'title') {
        path = name;
        direction = desc ? -1 : 1;
    } else if (family === 'posts' && name.startsWith('data_')) {
        const id = name.slice('data_'.length);
        const field = fields.find((f) => f.id === id);
        if (field && safeId(id) && SORTABLE_FIELD_TYPES.includes(field.type)) {
            path = `data.${id}`;
            direction = desc ? -1 : 1;
        }
    }
    // _id keeps equal values in one order, so no item shows on two pages or none
    return { [path]: direction, _id: 1 };
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `$match` for the search box, or null without a search. */
function buildTextMatch(q, family) {
    const text = typeof q === 'string' ? q.trim() : '';
    if (!text) {
        return null;
    }
    const pattern = escapeRegex(text);
    const regex = new RegExp(pattern, 'i');

    if (family !== 'posts') {
        return { $or: TEXT_PROPS[family].map((prop) => ({ [prop]: regex })) };
    }
    // the title, or any text value at the first level of the post's data
    return {
        $or: [
            { title: regex },
            {
                $expr: {
                    $anyElementTrue: [
                        {
                            $map: {
                                input: { $objectToArray: { $ifNull: ['$data', {}] } },
                                as: 'kv',
                                in: {
                                    $cond: [
                                        { $eq: [{ $type: '$$kv.v' }, 'string'] },
                                        { $regexMatch: { input: '$$kv.v', regex: pattern, options: 'i' } },
                                        false,
                                    ],
                                },
                            },
                        },
                    ],
                },
            },
        ],
    };
}

/** Stored values are numbers, numeric strings, dates or date strings: compare them converted. */
function converted(id, to) {
    return { $convert: { input: `$data.${id}`, to, onError: null, onNull: null } };
}

function rangeExpr(id, to, min, max) {
    return {
        $expr: {
            $let: {
                vars: { v: converted(id, to) },
                in: { $and: [{ $ne: ['$$v', null] }, { $gte: ['$$v', min] }, { $lte: ['$$v', max] }] },
            },
        },
    };
}

function toDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Conditions for the active post filters, sent as
 * `{ checkbox: { id: bool }, select|multiselect|catalogue: { id: [values] },
 *    number: { id: [min, max] }, date: { id: [isoMin, isoMax] } }`.
 * An id that is not a field of that type in the post type is ignored.
 */
function buildFilterMatch(filters, fields = []) {
    if (!filters || typeof filters !== 'object') {
        return [];
    }
    const conditions = [];
    const fieldOf = (id, type) => safeId(id) && fields.some((f) => f.id === id && f.type === type);

    FILTER_TYPES.forEach((type) => {
        const group = filters[type];
        if (!group || typeof group !== 'object' || Array.isArray(group)) {
            return;
        }
        Object.entries(group).forEach(([id, value]) => {
            if (!fieldOf(id, type)) {
                return;
            }
            switch (type) {
                case 'checkbox':
                    if (typeof value === 'boolean') {
                        conditions.push({ [`data.${id}`]: value });
                    }
                    break;
                case 'select':
                case 'multiselect':
                case 'catalogue': {
                    const values = Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
                    if (values.length) {
                        // on an array (multiselect) $in matches when any of its values is chosen
                        conditions.push({ [`data.${id}`]: { $in: values } });
                    }
                    break;
                }
                case 'number': {
                    const [min, max] = Array.isArray(value) ? value.map(Number) : [];
                    if (Number.isFinite(min) && Number.isFinite(max)) {
                        conditions.push(rangeExpr(id, 'double', min, max));
                    }
                    break;
                }
                case 'date': {
                    const [min, max] = Array.isArray(value) ? value.map(toDate) : [];
                    if (min && max) {
                        conditions.push(rangeExpr(id, 'date', min, max));
                    }
                    break;
                }
            }
        });
    });
    return conditions;
}

/** Parses the `filters` query parameter (JSON); anything unreadable means no filters. */
function parseFilters(raw) {
    if (typeof raw !== 'string' || !raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/** The number and date fields whose ranges the filter panel needs. */
function rangeFields(fields = []) {
    return fields.filter((f) => (f.type === 'number' || f.type === 'date') && safeId(f.id));
}

/** `$group` with the smallest and the largest value of each range field (keys by index). */
function rangesGroup(fields = []) {
    const group = { _id: null };
    rangeFields(fields).forEach((field, i) => {
        const value = converted(field.id, field.type === 'number' ? 'double' : 'date');
        group[`min${i}`] = { $min: value };
        group[`max${i}`] = { $max: value };
    });
    return group;
}

/** `{ fieldId: [min, max] }` from the `$group` result; numbers widen to whole numbers. */
function readRanges(fields = [], result) {
    const ranges = {};
    if (!result) {
        return ranges;
    }
    rangeFields(fields).forEach((field, i) => {
        const min = result[`min${i}`];
        const max = result[`max${i}`];
        if (min == null || max == null) {
            return;
        }
        ranges[field.id] = field.type === 'number' ? [Math.floor(min), Math.ceil(max)] : [min, max];
    });
    return ranges;
}

module.exports = {
    PAGE_SIZES,
    DEFAULT_PAGE_SIZE,
    FAMILIES,
    parsePaging,
    buildSort,
    escapeRegex,
    buildTextMatch,
    buildFilterMatch,
    parseFilters,
    rangesGroup,
    readRanges,
};
