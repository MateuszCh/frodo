const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    dayOf,
    addDays,
    parseRange,
    parseTop,
    normalizePath,
    fillDays,
    summarize,
    perDayPipeline,
    pagesPipeline,
    hoursPipeline,
    previousRange,
    summarizeVisits,
    hourOf,
    hourlyPipeline,
    fillHours,
    topOf,
    topTransitions,
    averageDuration,
    bucketsOf,
    engagementPipeline,
    clicksPipeline,
    notFoundPipeline,
    livePipeline,
    engagementSeconds,
    withPages,
} = require('./visit-stats');

// 23:30 UTC on 7 November is already 8 November in Poland
const NOW = new Date('2026-11-07T23:30:00Z');

describe('dayOf', () => {
    it('counts days in Polish time', () => {
        assert.equal(dayOf(NOW), '2026-11-08');
        assert.equal(dayOf(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
        assert.equal(dayOf(new Date('2026-07-01T22:00:00Z')), '2026-07-02');
    });
});

describe('addDays', () => {
    it('crosses months, years and the time change', () => {
        assert.equal(addDays('2026-10-31', 1), '2026-11-01');
        assert.equal(addDays('2026-01-01', -1), '2025-12-31');
        assert.equal(addDays('2026-10-24', 2), '2026-10-26');
    });
});

describe('parseRange', () => {
    it('defaults to the last 30 days, today included', () => {
        assert.deepEqual(parseRange({}, NOW), { from: '2026-10-10', to: '2026-11-08' });
    });

    it('takes the presets and ignores other periods', () => {
        assert.deepEqual(parseRange({ period: 'today' }, NOW), { from: '2026-11-08', to: '2026-11-08' });
        assert.deepEqual(parseRange({ period: '7' }, NOW), { from: '2026-11-02', to: '2026-11-08' });
        assert.deepEqual(parseRange({ period: '90' }, NOW), { from: '2026-08-11', to: '2026-11-08' });
        assert.deepEqual(parseRange({ period: 'ytd' }, NOW), { from: '2026-01-01', to: '2026-11-08' });
        assert.deepEqual(parseRange({ period: '1000' }, NOW), parseRange({}, NOW));
        assert.deepEqual(parseRange({ period: ['7', '90'] }, NOW), parseRange({}, NOW));
    });

    it('starts the year to date in the Polish new year', () => {
        // 1 January, 00:30 in Poland, still 31 December in UTC
        assert.deepEqual(parseRange({ period: 'ytd' }, new Date('2026-12-31T23:30:00Z')), {
            from: '2027-01-01',
            to: '2027-01-01',
        });
    });

    it('takes a period of its own and cuts its end to today', () => {
        assert.deepEqual(parseRange({ from: '2026-10-01', to: '2026-10-31' }, NOW), {
            from: '2026-10-01',
            to: '2026-10-31',
        });
        assert.deepEqual(parseRange({ from: '2026-11-01', to: '2026-12-31' }, NOW), {
            from: '2026-11-01',
            to: '2026-11-08',
        });
        assert.deepEqual(parseRange({ from: '2026-11-08', to: '2026-11-08' }, NOW), {
            from: '2026-11-08',
            to: '2026-11-08',
        });
    });

    it('rejects dates that are missing, malformed or not real', () => {
        assert.ok(parseRange({ from: '2026-10-01' }, NOW).error);
        assert.ok(parseRange({ from: '1.10.2026', to: '2026-10-31' }, NOW).error);
        assert.ok(parseRange({ from: '2026-02-30', to: '2026-03-31' }, NOW).error);
        assert.ok(parseRange({ from: ['2026-10-01'], to: '2026-10-31' }, NOW).error);
    });

    it('rejects a reversed, future or too long period', () => {
        assert.ok(parseRange({ from: '2026-10-31', to: '2026-10-01' }, NOW).error);
        assert.ok(parseRange({ from: '2026-11-09', to: '2026-11-20' }, NOW).error);
        assert.ok(parseRange({ from: '2025-01-01', to: '2026-10-31' }, NOW).error);
        assert.ok(!parseRange({ from: '2025-11-08', to: '2026-11-08' }, NOW).error);
    });
});

describe('parseTop', () => {
    it('keeps 1 to 50 rows, 10 by default', () => {
        assert.equal(parseTop(undefined), 10);
        assert.equal(parseTop('5'), 5);
        assert.equal(parseTop('500'), 50);
        assert.equal(parseTop('0'), 10);
        assert.equal(parseTop('abc'), 10);
    });
});

describe('normalizePath', () => {
    it('gives the form geosilesia stores', () => {
        assert.equal(normalizePath('/'), '/');
        assert.equal(normalizePath(''), '/');
        assert.equal(normalizePath('slownik'), '/slownik');
        assert.equal(normalizePath('slownik/'), '/slownik');
        assert.equal(normalizePath('//slownik'), '/slownik');
        assert.equal(normalizePath('/mapy/zabytki'), '/mapy/zabytki');
    });
});

describe('fillDays and summarize', () => {
    const rows = [
        { day: '2026-11-03', visitors: 3, views: 12 },
        { day: '2026-11-01', visitors: 1, views: 1 },
    ];
    const visits = new Map([
        ['2026-11-03', 4],
        ['2026-11-01', 1],
    ]);

    it('lists every day of the period in order, with zeros', () => {
        assert.deepEqual(fillDays(rows, '2026-10-31', '2026-11-03', visits), [
            { day: '2026-10-31', visitors: 0, visits: 0, views: 0 },
            { day: '2026-11-01', visitors: 1, visits: 1, views: 1 },
            { day: '2026-11-02', visitors: 0, visits: 0, views: 0 },
            { day: '2026-11-03', visitors: 3, visits: 4, views: 12 },
        ]);
    });

    it('sums the period', () => {
        assert.deepEqual(summarize(fillDays(rows, '2026-10-31', '2026-11-03', visits)), {
            visitors: 4,
            visits: 5,
            views: 13,
        });
        assert.deepEqual(summarize([]), { visitors: 0, visits: 0, views: 0 });
    });
});

describe('perDayPipeline', () => {
    it('counts the visitors of any hit and every hit as a view', () => {
        const [match, group, project] = perDayPipeline({ from: '2026-11-01', to: '2026-11-07' });
        assert.deepEqual(match, { $match: { day: { $gte: '2026-11-01', $lte: '2026-11-07' } } });
        assert.deepEqual(group.$group, { _id: '$day', visitors: { $addToSet: '$visitor' }, views: { $sum: 1 } });
        assert.deepEqual(project.$project.visitors, { $size: '$visitors' });
    });
});

describe('pagesPipeline', () => {
    it('counts a visitor once a day per page, then sums the days', () => {
        const [match, perVisitorDay, perPage] = pagesPipeline({ from: '2026-11-01', to: '2026-11-07' });
        assert.deepEqual(match, { $match: { day: { $gte: '2026-11-01', $lte: '2026-11-07' } } });
        assert.deepEqual(perVisitorDay.$group._id, { path: '$path', day: '$day', visitor: '$visitor' });
        assert.deepEqual(perPage.$group, { _id: '$_id.path', visitors: { $sum: 1 }, views: { $sum: '$views' } });
    });
});

describe('withPages', () => {
    it('adds the CMS page of each path, matching stored urls in any form', () => {
        const pages = [
            { id: 1, title: 'Start', pageUrl: '/' },
            { id: 2, title: 'Słownik', pageUrl: 'slownik/' },
        ];
        const rows = [
            { key: '/', count: 3 },
            { key: '/slownik', count: 2 },
            { key: '/usunieta', count: 1 },
        ];
        assert.deepEqual(withPages(rows, pages), [
            { key: '/', count: 3, page: { id: 1, title: 'Start' } },
            { key: '/slownik', count: 2, page: { id: 2, title: 'Słownik' } },
            { key: '/usunieta', count: 1 },
        ]);
    });
});

describe('previousRange', () => {
    it('is the same number of days just before', () => {
        assert.deepEqual(previousRange({ from: '2026-11-02', to: '2026-11-08' }), { from: '2026-10-26', to: '2026-11-01' });
        assert.deepEqual(previousRange({ from: '2026-03-01', to: '2026-03-01' }), { from: '2026-02-28', to: '2026-02-28' });
    });
});

describe('hoursPipeline', () => {
    it('groups the hits by weekday and hour in Polish time', () => {
        const [, group] = hoursPipeline({ from: '2026-11-01', to: '2026-11-07' });
        const at = { date: '$ts', timezone: 'Europe/Warsaw' };
        assert.deepEqual(group.$group._id, { weekday: { $isoDayOfWeek: at }, hour: { $hour: at } });
    });
});

describe('summarizeVisits', () => {
    const MIN = 60 * 1000;
    const at = (minutes) => new Date(Date.UTC(2026, 10, 7, 8) + minutes * MIN);
    const hit = (visitor, minutes, path, extra = {}) => ({
        visitor,
        day: '2026-11-07',
        ts: at(minutes),
        path,
        source: 'nav',
        device: 'desktop',
        lang: 'pl',
        referrer: null,
        ...extra,
    });

    it('splits each visitor\'s hits into visits at gaps of 30 minutes', () => {
        const summary = summarizeVisits([
            // a: home -> maps -> home in 10 minutes, then after 45 minutes a click in the
            // open tab starts a new visit, though it is not a full load
            hit('a', 0, '/', { source: 'ssr', referrer: 'google.com' }),
            hit('a', 4, '/maps'),
            hit('a', 10, '/'),
            hit('a', 55, '/glossary'),
            // b: reloading the landing page keeps the visit on one page; 29 minutes is no gap
            hit('b', 0, '/maps', { source: 'ssr', device: 'mobile', lang: 'en' }),
            hit('b', 29, '/maps', { source: 'ssr' }),
        ]);
        assert.equal(summary.visits, 3);
        assert.equal(summary.single, 2);
        assert.deepEqual(Object.fromEntries(summary.perDay), { '2026-11-07': 3 });
        // 10 + 0 + 29 minutes
        assert.equal(summary.durationMs, 39 * MIN);
        assert.equal(averageDuration(summary), 13 * 60);
        assert.deepEqual(Object.fromEntries(summary.landing), {
            '/': { visits: 1, single: 0 },
            '/glossary': { visits: 1, single: 1 },
            '/maps': { visits: 1, single: 1 },
        });
        assert.deepEqual(Object.fromEntries(summary.transitions), { '/\n/maps': 1, '/maps\n/': 1 });
        // the referrer of a visit is its first hit's, and only a full load carries one
        assert.deepEqual(Object.fromEntries(summary.referrers), { 'google.com': 1, null: 2 });
        assert.deepEqual(Object.fromEntries(summary.devices), { desktop: 2, mobile: 1 });
        assert.deepEqual(Object.fromEntries(summary.languages), { pl: 2, en: 1 });
    });

    it('starts a visit with every new visitor and ignores the old entry flag', () => {
        const summary = summarizeVisits([
            hit('a', 0, '/', { entry: true }),
            hit('a', 1, '/maps', { source: 'ssr', entry: true }),
            hit('b', 2, '/maps'),
        ]);
        assert.equal(summary.visits, 2);
        assert.deepEqual(Object.fromEntries(summary.transitions), { '/\n/maps': 1 });
    });

    it('gives zeros without hits', () => {
        const summary = summarizeVisits([]);
        assert.equal(summary.visits, 0);
        assert.equal(summary.landing.size, 0);
        assert.equal(averageDuration(summary), 0);
    });
});

describe('hours of one day', () => {
    it('takes the hour in Polish time', () => {
        // 23:30 UTC on 7 November is 00:30 on 8 November in Poland; 12:00 UTC in summer is 14:00
        assert.equal(hourOf(new Date('2026-11-07T23:30:00Z')), 0);
        assert.equal(hourOf(new Date('2026-07-01T12:00:00Z')), 14);
    });

    it('groups one day by the hour in Polish time', () => {
        const [match, group] = hourlyPipeline('2026-11-08');
        assert.deepEqual(match, { $match: { day: '2026-11-08' } });
        assert.deepEqual(group.$group._id, { $hour: { date: '$ts', timezone: 'Europe/Warsaw' } });
    });

    it('lists the hours up to the last one, with zeros and the visits started in each', () => {
        const hours = fillHours([{ hour: 1, visitors: 2, views: 5 }], new Map([[1, 3]]), 2);
        assert.deepEqual(hours, [
            { hour: 0, visitors: 0, visits: 0, views: 0 },
            { hour: 1, visitors: 2, visits: 3, views: 5 },
            { hour: 2, visitors: 0, visits: 0, views: 0 },
        ]);
        assert.equal(fillHours([], new Map()).length, 24);
    });

    it('counts the visits by the hour they started in', () => {
        const at = (iso, visitor) => ({ visitor, day: '2026-11-08', ts: new Date(iso), path: '/', source: 'ssr' });
        // 08:10 and 08:50 in Poland (UTC+1): two visits, 40 minutes apart; another visitor at 09:05
        const summary = summarizeVisits([
            at('2026-11-08T07:10:00Z', 'a'),
            at('2026-11-08T07:50:00Z', 'a'),
            at('2026-11-08T08:05:00Z', 'b'),
        ]);
        assert.deepEqual(Object.fromEntries(summary.perHour), { 8: 2, 9: 1 });
    });
});

describe('exits, depth, lengths and the browser of visits', () => {
    const MIN = 60 * 1000;
    const hit = (visitor, minutes, path, extra = {}) => ({
        visitor,
        day: '2026-11-08',
        ts: new Date(Date.UTC(2026, 10, 8, 8) + minutes * MIN),
        path,
        source: 'nav',
        ...extra,
    });

    it('counts where visits end, how many pages and how long they took', () => {
        const summary = summarizeVisits([
            // a: 4 pages in 12 minutes, ending on /c
            hit('a', 0, '/', { source: 'ssr', browser: 'chrome', os: 'android' }),
            hit('a', 2, '/a'),
            hit('a', 5, '/b'),
            hit('a', 12, '/c'),
            // b: one page, 0 s
            hit('b', 0, '/', { source: 'ssr', browser: 'safari', os: 'ios' }),
            // c: two pages in 20 s, an old hit without browser facts
            hit('c', 0, '/', { source: 'ssr' }),
            { ...hit('c', 0, '/a'), ts: new Date(Date.UTC(2026, 10, 8, 8, 0, 20)) },
        ]);
        assert.deepEqual(Object.fromEntries(summary.exits), { '/c': 1, '/': 1, '/a': 1 });
        assert.deepEqual(bucketsOf(summary.depth), [
            { key: '1', count: 1 },
            { key: '2', count: 1 },
            { key: '3-5', count: 1 },
            { key: '6+', count: 0 },
        ]);
        assert.deepEqual(bucketsOf(summary.lengths), [
            { key: '0-10', count: 1 },
            { key: '10-30', count: 1 },
            { key: '30-180', count: 0 },
            { key: '180+', count: 1 },
        ]);
        assert.deepEqual(Object.fromEntries(summary.browsers), { chrome: 1, safari: 1, null: 1 });
        assert.deepEqual(Object.fromEntries(summary.systems), { android: 1, ios: 1, null: 1 });
    });
});

describe('events', () => {
    const range = { from: '2026-11-01', to: '2026-11-08' };

    it('averages the visible time per page view of a visitor', () => {
        const [match, perVisitor, perPage] = engagementPipeline(range);
        assert.deepEqual(match.$match, { day: { $gte: '2026-11-01', $lte: '2026-11-08' }, type: 'engagement' });
        assert.deepEqual(perVisitor.$group._id, { path: '$path', day: '$day', visitor: '$visitor' });
        assert.deepEqual(perPage.$group.count, { $sum: 1 });
        assert.equal(engagementSeconds([{ ms: 30000, count: 2 }, { ms: 10000, count: 2 }]), 10);
        assert.equal(engagementSeconds([]), null);
    });

    it('counts the clicks of one kind and the missing addresses with their sources', () => {
        assert.deepEqual(clicksPipeline(range, 'download', 5)[0].$match.type, 'download');
        const notFound = notFoundPipeline(range, 5);
        assert.deepEqual(notFound[0].$match.type, 'notFound');
        assert.deepEqual(notFound[notFound.length - 1].$project.sources, { $slice: ['$sources', 3] });
    });

    it('finds who is on the site now, each on their last page', () => {
        const since = new Date('2026-11-08T09:55:00Z');
        const [match, sort, group] = livePipeline(since, 5);
        assert.deepEqual(match, { $match: { ts: { $gte: since } } });
        assert.deepEqual(sort, { $sort: { ts: 1 } });
        assert.deepEqual(group.$group, { _id: '$visitor', path: { $last: '$path' } });
    });
});

describe('topOf', () => {
    it('lists the largest counts first, then by key, null included', () => {
        const counts = new Map([
            ['pl', 2],
            [null, 5],
            ['en', 2],
        ]);
        assert.deepEqual(topOf(counts, 2), [
            { key: null, count: 5 },
            { key: 'en', count: 2 },
        ]);
    });
});

describe('topTransitions', () => {
    it('lists the most frequent moves first', () => {
        const transitions = new Map([
            ['/\n/maps', 2],
            ['/maps\n/', 5],
            ['/\n/glossary', 2],
        ]);
        assert.deepEqual(topTransitions(transitions, 2), [
            { from: '/maps', to: '/', count: 5 },
            { from: '/', to: '/glossary', count: 2 },
        ]);
    });
});
