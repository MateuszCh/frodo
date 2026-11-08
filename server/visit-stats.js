// Visit statistics read from the `visits` collection, which the public site (geosilesia)
// writes in its visits.js – Frodo only reads it. One document per counted hit (a view):
//   { ts, day: "YYYY-MM-DD" (Polish time), path, visitor, source: "ssr" | "nav",
//     referrer, device, lang }
// (older hits also carry `entry`, no longer used; `lang` only in hits since geosilesia keeps it.)
// - "ssr": a full page load; only these carry the external referrer.
// Hits since geosilesia keeps them also carry the browser and system family.
// - "nav": a page opened inside the site, without reloading.
// Three numbers, as GA4 and Plausible count them: visitors (anyone with a hit that day),
// visits (one visitor's hits without a 30-minute gap, split here: summarizeVisits) and
// views (all hits). The visitor id is built with a salt that changes every day, so
// visitors exist per day only: their total over a period is the sum of daily visitors,
// not different people.

const COLLECTION = 'visits';
/** What a page view alone does not say: 404s, visible time, link clicks (geosilesia's visits.js). */
const EVENTS = 'visit_events';
/** Visits by the different pages they opened, and by their length in seconds. */
const DEPTHS = ['1', '2', '3-5', '6+'];
const LENGTHS = ['0-10', '10-30', '30-180', '180+'];
/** "Now on the site": visitors with a page view in the last minutes. */
const LIVE_MS = 5 * 60 * 1000;
/** The preset periods: today, the last 7, 30 or 90 days, the year to date. */
const PRESETS = ['today', '7', '30', '90', 'ytd'];
const DEFAULT_PRESET = '30';
const MAX_DAYS = 366;
const DEFAULT_TOP = 10;
const MAX_TOP = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
// A visit ends after 30 minutes without any hit – the GA/Plausible definition.
const VISIT_GAP_MS = 30 * 60 * 1000;

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

const warsawHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', hourCycle: 'h23' });

/** The hour (0–23) of a moment in Polish time. */
function hourOf(date) {
    return Number(warsawHour.format(date));
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
 * The period of a report from the query: `period` (a preset: `today`, `7`, `30` or `90`
 * days counted back from today, `ytd` from 1 January), or `from` and `to` (whole days, both
 * included, `to` cut to today). Without either: the last 30 days. Returns `{ from, to }` or
 * `{ error }`.
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
    const preset = PRESETS.includes(query.period) ? query.period : DEFAULT_PRESET;
    if (preset === 'today') return { from: today, to: today };
    if (preset === 'ytd') return { from: `${today.slice(0, 4)}-01-01`, to: today };
    return { from: addDays(today, -(Number(preset) - 1)), to: today };
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

const EMPTY_DAY = { visitors: 0, visits: 0, views: 0 };

/**
 * Every day of the period in order, with zeros for the days without hits. `visits` maps a
 * day to the visits that started on it (summarizeVisits).
 */
function fillDays(rows, from, to, visits = new Map()) {
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const days = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
        const row = byDay.get(day);
        days.push({
            day,
            visitors: row?.visitors ?? 0,
            visits: visits.get(day) ?? 0,
            views: row?.views ?? 0,
        });
    }
    return days;
}

/** Sums of the period; `visitors` is the sum of daily visitors. */
function summarize(days) {
    return days.reduce(
        (sum, day) => ({
            visitors: sum.visitors + day.visitors,
            visits: sum.visits + day.visits,
            views: sum.views + day.views,
        }),
        { ...EMPTY_DAY },
    );
}

/** Visitors (anyone with a hit) and views (all hits) per day. */
function perDayPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        { $group: { _id: '$day', visitors: { $addToSet: '$visitor' }, views: { $sum: 1 } } },
        { $project: { _id: 0, day: '$_id', visitors: { $size: '$visitors' }, views: 1 } },
    ];
}

/**
 * Every page opened in the period with its views and visitors (summed per day, as the
 * site's total: one visitor and one day count once). The visits that started on it come
 * from summarizeVisits.
 */
function pagesPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        { $group: { _id: { path: '$path', day: '$day', visitor: '$visitor' }, views: { $sum: 1 } } },
        { $group: { _id: '$_id.path', visitors: { $sum: 1 }, views: { $sum: '$views' } } },
        { $project: { _id: 0, key: '$_id', visitors: 1, views: 1 } },
        { $sort: { views: -1, key: 1 } },
    ];
}

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

/** Visitors (anyone with a hit) and views per hour of one day, in Polish time. */
function hourlyPipeline(day) {
    return [
        { $match: { day } },
        {
            $group: {
                _id: { $hour: { date: '$ts', timezone: 'Europe/Warsaw' } },
                visitors: { $addToSet: '$visitor' },
                views: { $sum: 1 },
            },
        },
        { $project: { _id: 0, hour: '$_id', visitors: { $size: '$visitors' }, views: 1 } },
    ];
}

/**
 * The hours of one day from 0 to `last`, with zeros for the hours without hits; `visits`
 * maps an hour to the visits that started in it (summarizeVisits). An hour's visitors are
 * the different visitors of that hour, so they add up to more than the day's.
 */
function fillHours(rows, visits, last = 23) {
    const byHour = new Map(rows.map((row) => [row.hour, row]));
    return Array.from({ length: last + 1 }, (_, hour) => ({
        hour,
        visitors: byHour.get(hour)?.visitors ?? 0,
        visits: visits.get(hour) ?? 0,
        views: byHour.get(hour)?.views ?? 0,
    }));
}

/** Every hit from `from` on, in the order each visitor made them: the input of summarizeVisits. */
function hitsPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to } } },
        {
            $project: {
                _id: 0,
                day: 1,
                visitor: 1,
                ts: 1,
                path: 1,
                source: 1,
                referrer: 1,
                device: 1,
                lang: 1,
                browser: 1,
                os: 1,
            },
        },
        { $sort: { visitor: 1, ts: 1 } },
    ];
}

/** The depth bucket of a visit that opened `pages` different pages. */
function depthOf(pages) {
    return pages <= 2 ? String(pages) : pages <= 5 ? '3-5' : '6+';
}

/** The length bucket of a visit of `ms` milliseconds. */
function lengthOf(ms) {
    const seconds = ms / 1000;
    return seconds < 10 ? '0-10' : seconds < 30 ? '10-30' : seconds < 180 ? '30-180' : '180+';
}

/** A Map of buckets as `[{ key, count }]`, in the buckets' own order. */
function bucketsOf(map) {
    return [...map].map(([key, value]) => ({ key, count: value }));
}

/**
 * Visible time per page (engagement events): its milliseconds and how many visitors of a
 * day sent any, so the average is per page view of a visitor, whatever the beacons.
 */
function engagementPipeline({ from, to }) {
    return [
        { $match: { day: { $gte: from, $lte: to }, type: 'engagement' } },
        { $group: { _id: { path: '$path', day: '$day', visitor: '$visitor' }, ms: { $sum: '$ms' } } },
        { $group: { _id: '$_id.path', ms: { $sum: '$ms' }, count: { $sum: 1 } } },
        { $project: { _id: 0, key: '$_id', ms: 1, count: 1 } },
    ];
}

/** The most clicked targets of one kind of click event ("outbound", "download"). */
function clicksPipeline({ from, to }, type, limit) {
    return [
        { $match: { day: { $gte: from, $lte: to }, type } },
        { $group: { _id: '$target', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        { $project: { _id: 0, key: '$_id', count: 1 } },
    ];
}

/** Addresses that do not exist, most opened first, each with where the visitors came from. */
function notFoundPipeline({ from, to }, limit) {
    return [
        { $match: { day: { $gte: from, $lte: to }, type: 'notFound' } },
        { $group: { _id: { path: '$path', from: '$from' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        {
            $group: {
                _id: '$_id.path',
                count: { $sum: '$count' },
                sources: { $push: { key: '$_id.from', count: '$count' } },
            },
        },
        { $sort: { count: -1, _id: 1 } },
        { $limit: limit },
        { $project: { _id: 0, key: '$_id', count: 1, sources: { $slice: ['$sources', 3] } } },
    ];
}

/** Visitors with a page view since `since`, and the pages they are on. */
function livePipeline(since, limit) {
    return [
        { $match: { ts: { $gte: since } } },
        { $sort: { ts: 1 } },
        // each visitor on the last page they opened
        { $group: { _id: '$visitor', path: { $last: '$path' } } },
        {
            $facet: {
                visitors: [{ $count: 'count' }],
                pages: [
                    { $group: { _id: '$path', count: { $sum: 1 } } },
                    { $sort: { count: -1, _id: 1 } },
                    { $limit: limit },
                    { $project: { _id: 0, key: '$_id', count: 1 } },
                ],
            },
        },
    ];
}

/** The average visible time in whole seconds of the engagement rows, null without any. */
function engagementSeconds(rows) {
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    return count ? Math.round(rows.reduce((sum, row) => sum + row.ms, 0) / count / 1000) : null;
}

/** Adds one to the count of `key` in a Map. */
function count(map, key, by = 1) {
    map.set(key, (map.get(key) ?? 0) + by);
}

/**
 * Splits hits into visits and sums them up, the way GA4 and Plausible count sessions: a
 * visit is one visitor's hits with no gap of 30 minutes or more, started by the first hit
 * or the first after such a gap, a full load or a page opened inside the site alike.
 * `hits` come sorted by visitor, then time; a visitor id lives one day, so one visitor's
 * hits are one day's. (The `entry` flag geosilesia used to write is not used: it was kept
 * per process, so it overcounted.)
 * - `visits`, `perDay`, `perHour`: visits, overall, by the day and by the hour (Polish
 *   time) they started in;
 * - `single`: visits that stayed on one page (reloading it included);
 * - `durationMs`: the time from the first to the last hit, summed over the visits;
 * - `landing`: visits and single-page visits per page the visit started on;
 * - `exits`: visits per page they ended on;
 * - `depth`, `lengths`: visits by the different pages they opened (1, 2, 3-5, 6+) and by
 *   their length in seconds (0-10, 10-30, 30-180, 180+; a visit of one view is 0 s);
 * - `browsers`, `systems`: visits by the first hit's browser and system;
 * - `referrers`, `devices`, `languages`: visits by the first hit's external referrer (a
 *   full load only carries one; null is direct or unknown), device and browser language;
 * - `transitions`: moves from one page to another inside visits, as "from\nto" -> count.
 */
function summarizeVisits(hits) {
    const summary = {
        visits: 0,
        single: 0,
        durationMs: 0,
        perDay: new Map(),
        perHour: new Map(),
        exits: new Map(),
        depth: new Map(DEPTHS.map((key) => [key, 0])),
        lengths: new Map(LENGTHS.map((key) => [key, 0])),
        browsers: new Map(),
        systems: new Map(),
        landing: new Map(),
        referrers: new Map(),
        devices: new Map(),
        languages: new Map(),
        transitions: new Map(),
    };
    let visit = null;
    const close = () => {
        if (!visit) return;
        const single = visit.pages.size === 1;
        summary.visits += 1;
        if (single) summary.single += 1;
        summary.durationMs += visit.end - visit.start;
        count(summary.exits, visit.last);
        count(summary.depth, depthOf(visit.pages.size));
        count(summary.lengths, lengthOf(visit.end - visit.start));
        count(summary.perDay, visit.day);
        count(summary.perHour, hourOf(visit.start));
        const landing = summary.landing.get(visit.landing) ?? { visits: 0, single: 0 };
        landing.visits += 1;
        if (single) landing.single += 1;
        summary.landing.set(visit.landing, landing);
        visit = null;
    };
    let previous = null;
    for (const hit of hits) {
        const ts = new Date(hit.ts).getTime();
        const starts = !previous || hit.visitor !== previous.visitor || ts - previous.ts >= VISIT_GAP_MS;
        previous = { visitor: hit.visitor, ts };
        if (starts) {
            close();
            visit = { day: hit.day, landing: hit.path, last: hit.path, pages: new Set([hit.path]), start: ts, end: ts };
            count(summary.referrers, hit.source === 'ssr' ? (hit.referrer ?? null) : null);
            count(summary.devices, hit.device ?? null);
            count(summary.languages, hit.lang ?? null);
            count(summary.browsers, hit.browser ?? null);
            count(summary.systems, hit.os ?? null);
            continue;
        }
        if (hit.path !== visit.last) {
            count(summary.transitions, `${visit.last}\n${hit.path}`);
        }
        visit.last = hit.path;
        visit.pages.add(hit.path);
        visit.end = ts;
    }
    close();
    return summary;
}

/** The largest counts of a Map as `{ key, count }`, most first, then by key. */
function topOf(map, limit) {
    return [...map]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
        .slice(0, limit);
}

/** The most frequent moves between pages, as { from, to, count }. */
function topTransitions(transitions, limit) {
    return topOf(transitions, limit).map(({ key, count }) => {
        const [from, to] = key.split('\n');
        return { from, to, count };
    });
}

/** The average visit in whole seconds. */
function averageDuration(summary) {
    return summary.visits ? Math.round(summary.durationMs / summary.visits / 1000) : 0;
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
    EVENTS,
    LIVE_MS,
    PRESETS,
    MAX_DAYS,
    dayOf,
    hourOf,
    addDays,
    parseRange,
    parseTop,
    normalizePath,
    fillDays,
    summarize,
    perDayPipeline,
    pagesPipeline,
    hoursPipeline,
    hourlyPipeline,
    fillHours,
    hitsPipeline,
    previousRange,
    summarizeVisits,
    topOf,
    topTransitions,
    averageDuration,
    bucketsOf,
    engagementPipeline,
    clicksPipeline,
    notFoundPipeline,
    livePipeline,
    engagementSeconds,
    pagesByPath,
    withPages,
};
