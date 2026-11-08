// Visit statistics read from the `visits` collection, which the public site (geosilesia)
// writes in its visits.js – Frodo only reads it. One document per counted hit:
//   { ts, day: "YYYY-MM-DD" (Polish time), path, visitor, source: "ssr" | "nav",
//     referrer, device, lang, entry }
// (`lang`, the browser's first language code, only in hits recorded since geosilesia keeps it.)
// - "ssr": a full page load. The only basis for entries (visits that start after 30 minutes
//   without a hit), unique visitors per day and landing pages.
// - "nav": a page opened inside the app, without reloading.
// The visitor id is built with a salt that changes every day, so unique visitors exist per
// day only: their total over a period is the sum of daily uniques, not different people.

const COLLECTION = 'visits';
const PRESETS = [7, 30, 90];
const DEFAULT_DAYS = 30;
const MAX_DAYS = 366;
const DEFAULT_TOP = 10;
const MAX_TOP = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

// the same day boundaries as geosilesia's visits.js
const warsawDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

/** "2026-11-07" in Polish time – the day a hit belongs to. */
function dayOf(date) {
    return warsawDay.format(date);
}

/** A "YYYY-MM-DD" day as a UTC midnight timestamp, or NaN when it is no real date. */
function dayTime(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NaN;
    const time = Date.parse(`${day}T00:00:00Z`);
    // Date.parse rolls "2026-02-30" over to March: such a day is not real
    return Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== day ? NaN : time;
}

function addDays(day, count) {
    return new Date(dayTime(day) + count * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The period of a report from the query: `days` (7, 30 or 90, counted back from today), or
 * `from` and `to` (whole days, both included, `to` cut to today). Without either: the last
 * 30 days. Returns `{ from, to }` or `{ error }`.
 */
function parseRange(query = {}, now = new Date()) {
    const today = dayOf(now);
    if (query.from !== undefined || query.to !== undefined) {
        const fromTime = dayTime(query.from);
        const toTime = dayTime(query.to);
        if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
            return { error: 'The period needs two dates in the YYYY-MM-DD format' };
        }
        if (fromTime > toTime) {
            return { error: 'The start of the period is after its end' };
        }
        if (fromTime > dayTime(today)) {
            return { error: 'The period starts in the future' };
        }
        const to = toTime > dayTime(today) ? today : query.to;
        if ((dayTime(to) - fromTime) / DAY_MS + 1 > MAX_DAYS) {
            return { error: `The period can be at most ${MAX_DAYS} days long` };
        }
        return { from: query.from, to };
    }
    const days = Number(query.days);
    const length = PRESETS.includes(days) ? days : DEFAULT_DAYS;
    return { from: addDays(today, -(length - 1)), to: today };
}

/** How many rows a top list shows: `top` from 1 to 50, 10 by default. */
function parseTop(value) {
    const top = Number(value);
    return Number.isInteger(top) && top >= 1 ? Math.min(top, MAX_TOP) : DEFAULT_TOP;
}

/**
 * The canonical form of a page address, as geosilesia stores `path` (shared/seo-meta.js):
 * leading slash, no trailing one (except "/" itself).
 */
function normalizePath(pageUrl) {
    if (!pageUrl) return '/';
    const withSlash = pageUrl.charAt(0) === '/' ? pageUrl : '/' + pageUrl;
    const collapsed = withSlash.replace(/^\/+/, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

const EMPTY_DAY = { entries: 0, unique: 0, loads: 0, nav: 0 };

/** Every day of the period in order, with zeros for the days without hits. */
function fillDays(rows, from, to) {
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        const row = byDay.get(day);
        days.push({
            day,
            entries: row?.entries ?? 0,
            unique: row?.unique ?? 0,
            loads: row?.loads ?? 0,
            nav: row?.nav ?? 0,
        });
    }
    return days;
}

/** Sums of the period; `unique` is the sum of daily uniques. */
function summarize(days) {
    return days.reduce(
        (sum, day) => ({
            entries: sum.entries + day.entries,
            unique: sum.unique + day.unique,
            loads: sum.loads + day.loads,
            nav: sum.nav + day.nav,
        }),
        { ...EMPTY_DAY },
    );
}

/** Entries, full loads, in-app transitions and unique visitors per day (as geosilesia's scripts/stats.js). */
function perDayPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        {
            $group: {
                _id: '$day',
                entries: { $sum: { $cond: [{ $and: [{ $eq: ['$source', 'ssr'] }, '$entry'] }, 1, 0] } },
                loads: { $sum: { $cond: [{ $eq: ['$source', 'ssr'] }, 1, 0] } },
                nav: { $sum: { $cond: [{ $eq: ['$source', 'nav'] }, 1, 0] } },
                visitors: { $addToSet: { $cond: [{ $eq: ['$source', 'ssr'] }, '$visitor', null] } },
            },
        },
        {
            $project: {
                _id: 0,
                day: '$_id',
                entries: 1,
                loads: 1,
                nav: 1,
                unique: { $size: { $setDifference: ['$visitors', [null]] } },
            },
        },
    ];
}

/** The most frequent values of `field` among the hits that match. */
function topPipeline({ from, to }, match, field, limit) {
    return [
        { $match: { day: { $gte: from, $lte: to }, ...match } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        { $project: { _id: 0, key: '$_id', count: 1 } },
    ];
}

/**
 * Every page opened in the period with all its counts: entries (visits that started on
 * it), unique visitors (summed per day, as the site's total: one visitor and one day
 * count once, whether the page came from a full load or from inside the site), full
 * loads, in-site transitions and views (loads and transitions together).
 */
function pagesPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        {
            $group: {
                _id: { path: '$path', day: '$day', visitor: '$visitor' },
                entries: { $sum: { $cond: [{ $and: [{ $eq: ['$source', 'ssr'] }, '$entry'] }, 1, 0] } },
                loads: { $sum: { $cond: [{ $eq: ['$source', 'ssr'] }, 1, 0] } },
                nav: { $sum: { $cond: [{ $eq: ['$source', 'nav'] }, 1, 0] } },
            },
        },
        {
            $group: {
                _id: '$_id.path',
                entries: { $sum: '$entries' },
                unique: { $sum: 1 },
                loads: { $sum: '$loads' },
                nav: { $sum: '$nav' },
            },
        },
        {
            $project: {
                _id: 0,
                key: '$_id',
                entries: 1,
                unique: 1,
                loads: 1,
                nav: 1,
                views: { $add: ['$loads', '$nav'] },
            },
        },
        { $sort: { views: -1, key: 1 } },
    ];
}

const ENTRY_MATCH = { source: 'ssr', entry: true };

/** The period just before this one, of the same length: what the totals are compared with. */
function previousRange({ from, to }) {
    const length = (dayTime(to) - dayTime(from)) / DAY_MS + 1;
    return { from: addDays(from, -length), to: addDays(from, -1) };
}

/** Views (all hits) per weekday (1 = Monday … 7 = Sunday) and hour, in Polish time. */
function hoursPipeline({ from, to }) {
    const at = { date: '$ts', timezone: 'Europe/Warsaw' };
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        { $group: { _id: { weekday: { $isoDayOfWeek: at }, hour: { $hour: at } }, count: { $sum: 1 } } },
        { $project: { _id: 0, weekday: '$_id.weekday', hour: '$_id.hour', count: 1 } },
        { $sort: { weekday: 1, hour: 1 } },
    ];
}

/** Every hit from `from` on, in the order each visitor made them: the input of summarizeVisits. */
function hitsPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        { $project: { _id: 0, day: 1, visitor: 1, ts: 1, path: 1, source: 1, entry: 1 } },
        { $sort: { visitor: 1, ts: 1 } },
    ];
}

/**
 * Splits hits into visits and sums them up. `hits` come sorted by visitor, then time (a
 * visitor id lives one day, so one visitor's hits are one day's). An entry (a full load
 * after 30 minutes without a hit) starts a visit, and every later hit of the visitor
 * belongs to it until the next entry; hits before a visitor's first entry (a visit that
 * crossed midnight) belong to none.
 * - `visits`, `single`: visits, and those that stayed on one page (reloading it included);
 * - `landing`: the same per page the visit started on;
 * - `transitions`: moves from one page to another inside visits, as "from\nto" -> count.
 */
function summarizeVisits(hits) {
    const summary = { visits: 0, single: 0, landing: new Map(), transitions: new Map() };
    let visitor = null;
    let visit = null;
    const close = () => {
        if (!visit) return;
        const single = visit.pages.size === 1;
        summary.visits += 1;
        if (single) summary.single += 1;
        const landing = summary.landing.get(visit.landing) ?? { visits: 0, single: 0 };
        landing.visits += 1;
        if (single) landing.single += 1;
        summary.landing.set(visit.landing, landing);
        visit = null;
    };
    for (const hit of hits) {
        if (hit.visitor !== visitor) {
            close();
            visitor = hit.visitor;
        }
        if (hit.source === 'ssr' && hit.entry) {
            close();
            visit = { landing: hit.path, last: hit.path, pages: new Set([hit.path]) };
        } else if (visit) {
            if (hit.path !== visit.last) {
                const key = `${visit.last}\n${hit.path}`;
                summary.transitions.set(key, (summary.transitions.get(key) ?? 0) + 1);
            }
            visit.last = hit.path;
            visit.pages.add(hit.path);
        }
    }
    close();
    return summary;
}

/** The most frequent moves between pages, as { from, to, count }. */
function topTransitions(transitions, limit) {
    return [...transitions]
        .map(([key, count]) => {
            const [from, to] = key.split('\n');
            return { from, to, count };
        })
        .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
        .slice(0, limit);
}

/** The CMS pages by their path, as `{ id, title }`. */
function pagesByPath(pages) {
    const byPath = new Map();
    pages.forEach((page) => {
        const path = normalizePath(page.pageUrl);
        if (!byPath.has(path)) byPath.set(path, { id: page.id, title: page.title });
    });
    return byPath;
}

/** Adds `{ id, title }` of the CMS page each row's path belongs to, when there is one. */
function withPages(rows, pages) {
    const byPath = pagesByPath(pages);
    return rows.map((row) => (byPath.has(row.key) ? { ...row, page: byPath.get(row.key) } : row));
}

module.exports = {
    COLLECTION,
    ENTRY_MATCH,
    PRESETS,
    MAX_DAYS,
    dayOf,
    addDays,
    parseRange,
    parseTop,
    normalizePath,
    fillDays,
    summarize,
    perDayPipeline,
    pagesPipeline,
    topPipeline,
    hoursPipeline,
    hitsPipeline,
    previousRange,
    summarizeVisits,
    topTransitions,
    pagesByPath,
    withPages,
};
