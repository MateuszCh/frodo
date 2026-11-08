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
    pagesPipeline,
    topPipeline,
    hoursPipeline,
    previousRange,
    summarizeVisits,
    topTransitions,
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

    it('takes the presets and ignores other lengths', () => {
        assert.deepEqual(parseRange({ days: '7' }, NOW), { from: '2026-11-02', to: '2026-11-08' });
        assert.deepEqual(parseRange({ days: '90' }, NOW), { from: '2026-08-11', to: '2026-11-08' });
        assert.deepEqual(parseRange({ days: '1000' }, NOW), parseRange({}, NOW));
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
        { day: '2026-11-03', entries: 4, unique: 3, loads: 5, nav: 7 },
        { day: '2026-11-01', entries: 1, unique: 1, loads: 1, nav: 0 },
    ];

    it('lists every day of the period in order, with zeros', () => {
        assert.deepEqual(fillDays(rows, '2026-10-31', '2026-11-03'), [
            { day: '2026-10-31', entries: 0, unique: 0, loads: 0, nav: 0 },
            { day: '2026-11-01', entries: 1, unique: 1, loads: 1, nav: 0 },
            { day: '2026-11-02', entries: 0, unique: 0, loads: 0, nav: 0 },
            { day: '2026-11-03', entries: 4, unique: 3, loads: 5, nav: 7 },
        ]);
    });

    it('sums the period', () => {
        assert.deepEqual(summarize(fillDays(rows, '2026-10-31', '2026-11-03')), {
            entries: 5,
            unique: 4,
            loads: 6,
            nav: 7,
        });
        assert.deepEqual(summarize([]), { entries: 0, unique: 0, loads: 0, nav: 0 });
    });
});

describe('topPipeline', () => {
    it('matches the period and the hits, then counts one field', () => {
        const pipeline = topPipeline({ from: '2026-11-01', to: '2026-11-07' }, { source: 'nav' }, 'path', 5);
        assert.deepEqual(pipeline[0], { $match: { day: { $gte: '2026-11-01', $lte: '2026-11-07' }, source: 'nav' } });
        assert.deepEqual(pipeline[1], { $group: { _id: '$path', count: { $sum: 1 } } });
        assert.deepEqual(pipeline[3], { $limit: 5 });
    });
});

describe('pagesPipeline', () => {
    it('counts a visitor once a day per page, then sums the days', () => {
        const [match, perVisitorDay, perPage, project] = pagesPipeline({ from: '2026-11-01', to: '2026-11-07' });
        assert.deepEqual(match, { $match: { day: { $gte: '2026-11-01', $lte: '2026-11-07' } } });
        assert.deepEqual(perVisitorDay.$group._id, { path: '$path', day: '$day', visitor: '$visitor' });
        assert.deepEqual(perPage.$group.unique, { $sum: 1 });
        assert.equal(perPage.$group._id, '$_id.path');
        assert.deepEqual(project.$project.views, { $add: ['$loads', '$nav'] });
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
    const hit = (visitor, ts, path, source = 'nav', entry = false) => ({ visitor, ts, path, source, entry });

    it('splits each visitor\'s hits into visits at the entries', () => {
        const summary = summarizeVisits([
            // a: home -> maps -> home (one visit), then a new visit on the glossary alone
            hit('a', 1, '/', 'ssr', true),
            hit('a', 2, '/maps'),
            hit('a', 3, '/'),
            hit('a', 4, '/glossary', 'ssr', true),
            // b: a hit before the first entry (a visit from before midnight) is left out;
            // reloading the landing page keeps the visit on one page
            hit('b', 1, '/maps'),
            hit('b', 2, '/maps', 'ssr', true),
            hit('b', 3, '/maps', 'ssr', false),
        ]);
        assert.equal(summary.visits, 3);
        assert.equal(summary.single, 2);
        assert.deepEqual(Object.fromEntries(summary.landing), {
            '/': { visits: 1, single: 0 },
            '/glossary': { visits: 1, single: 1 },
            '/maps': { visits: 1, single: 1 },
        });
        assert.deepEqual(Object.fromEntries(summary.transitions), { '/\n/maps': 1, '/maps\n/': 1 });
    });

    it('gives zeros without hits', () => {
        const summary = summarizeVisits([]);
        assert.equal(summary.visits, 0);
        assert.equal(summary.landing.size, 0);
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
