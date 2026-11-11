const mongoose = require('mongoose'),
    Page = require('../models/page'),
    {
        COLLECTION,
        EVENTS,
        LIVE_MS,
        dayOf,
        hourOf,
        legacyPeopleQueries,
        peopleMatch,
        parseRange,
        parseTop,
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
    } = require('../visit-stats');

/** A CMS page reference for a path, when there is one. */
function linkPath(byPath, path) {
    return byPath.has(path) ? { path, page: byPath.get(path) } : { path };
}

/**
 * The match of the hits and events of people in a period (visit-stats.js: confirmed ones,
 * and older ones of visitors who ran the page's script that day).
 */
async function peopleIn(db, range) {
    const queries = legacyPeopleQueries(range);
    const [navigated, scripted] = await Promise.all([
        db.collection(COLLECTION).distinct('visitor', queries.hits),
        db.collection(EVENTS).distinct('visitor', queries.events),
    ]);
    return peopleMatch([...navigated, ...scripted]);
}

/**
 * The days, totals (with the average visit and the average visible time of a page, in
 * seconds; the latter null before the site sends it) and single-page visits of a period.
 */
function period(rows, range, summary, engagement = null) {
    const days = fillDays(rows, range.from, range.to, summary.perDay);
    return {
        days,
        totals: { ...summarize(days), duration: averageDuration(summary), engagement },
        singlePage: { visits: summary.visits, single: summary.single },
    };
}

module.exports = {
    /**
     * Visit statistics of the public site: GET /api/analytics/visits?period | ?from&to, &top
     * (the length of the referrer, device, language and transition lists; the pages are
     * all listed). A period of one day also gets `hourly`: its hours, up to the current
     * one today. An empty or missing `visits` collection gives zeros, not an error.
     * Bots are left out of every number (peopleIn).
     */
    async visits(req, res, next) {
        try {
            const range = parseRange(req.query);
            if (range.error) {
                return res.status(422).send({ error: range.error });
            }
            const top = parseTop(req.query.top);
            const previous = previousRange(range);
            const visits = mongoose.connection.db.collection(COLLECTION);
            const events = mongoose.connection.db.collection(EVENTS);
            const aggregate = (pipeline) => visits.aggregate(pipeline, { allowDiskUse: true }).toArray();
            const aggregateEvents = (pipeline) => events.aggregate(pipeline, { allowDiskUse: true }).toArray();
            const people = await peopleIn(mongoose.connection.db, { from: previous.from, to: range.to });

            // the hits of both periods at once are split into visits here; a visitor id
            // lives one day, so no visit crosses the start of the period
            const oneDay = range.from === range.to;
            const [perDay, previousDays, pageRows, hours, hits, pages, perHour, engagement, previousEngagement, outbound, downloads, notFound] = await Promise.all([
                aggregate(perDayPipeline(range, people)),
                aggregate(perDayPipeline(previous, people)),
                aggregate(pagesPipeline(range, people)),
                aggregate(hoursPipeline(range, people)),
                aggregate(hitsPipeline({ from: previous.from, to: range.to }, people)),
                Page.find({}, 'id title pageUrl').lean(),
                oneDay ? aggregate(hourlyPipeline(range.from, people)) : null,
                aggregateEvents(engagementPipeline(range, people)),
                aggregateEvents(engagementPipeline(previous, people)),
                aggregateEvents(clicksPipeline(range, 'outbound', top, people)),
                aggregateEvents(clicksPipeline(range, 'download', top, people)),
                aggregateEvents(notFoundPipeline(range, top, people)),
            ]);
            const engagementByPath = new Map(engagement.map((row) => [row.key, row]));
            const current = summarizeVisits(hits.filter((hit) => hit.day >= range.from));
            const before = summarizeVisits(hits.filter((hit) => hit.day < range.from));
            const byPath = pagesByPath(pages);
            const now = new Date();
            const hourly = oneDay
                ? fillHours(perHour, current.perHour, range.to === dayOf(now) ? hourOf(now) : 23)
                : undefined;

            res.send({
                from: range.from,
                to: range.to,
                ...period(perDay, range, current, engagementSeconds(engagement)),
                hourly,
                previous: {
                    from: previous.from,
                    to: previous.to,
                    ...period(previousDays, previous, before, engagementSeconds(previousEngagement)),
                },
                // the visits that started on a page and those of them that stayed there
                pages: withPages(pageRows, pages).map((row) => {
                    const landing = current.landing.get(row.key);
                    const time = engagementByPath.get(row.key);
                    return {
                        ...row,
                        entries: landing?.visits ?? 0,
                        single: landing?.single ?? 0,
                        exits: current.exits.get(row.key) ?? 0,
                        // seconds the page was visible, on average; null until the site sends it
                        engagement: time?.count ? Math.round(time.ms / time.count / 1000) : null,
                    };
                }),
                transitions: topTransitions(current.transitions, top).map((move) => ({
                    from: linkPath(byPath, move.from),
                    to: linkPath(byPath, move.to),
                    count: move.count,
                })),
                hours,
                referrers: topOf(current.referrers, top),
                devices: topOf(current.devices, top),
                languages: topOf(current.languages, top),
                browsers: topOf(current.browsers, top),
                systems: topOf(current.systems, top),
                depth: bucketsOf(current.depth),
                lengths: bucketsOf(current.lengths),
                notFound,
                outbound,
                downloads,
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * "Now on the site": GET /api/analytics/live – the visitors with a page view in the
     * last five minutes and the pages they are on (each on the last one they opened). Only
     * people (peopleIn); a visitor of the old, unconfirmed hits shows once they ran the
     * page's script.
     */
    async live(req, res, next) {
        try {
            const visits = mongoose.connection.db.collection(COLLECTION);
            const now = new Date();
            const since = new Date(now.getTime() - LIVE_MS);
            const people = await peopleIn(mongoose.connection.db, { from: dayOf(since), to: dayOf(now) });
            const [[result], pages] = await Promise.all([
                visits.aggregate(livePipeline(since, parseTop(req.query.top), people)).toArray(),
                Page.find({}, 'id title pageUrl').lean(),
            ]);
            res.send({
                minutes: LIVE_MS / 60000,
                visitors: result?.visitors[0]?.count ?? 0,
                pages: withPages(result?.pages ?? [], pages),
            });
        } catch (err) {
            next(err);
        }
    },
};
