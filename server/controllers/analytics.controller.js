const mongoose = require('mongoose'),
    Page = require('../models/page'),
    {
        COLLECTION,
        ENTRY_MATCH,
        parseRange,
        parseTop,
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
    } = require('../visit-stats');

/** A CMS page reference for a path, when there is one. */
function linkPath(byPath, path) {
    return byPath.has(path) ? { path, page: byPath.get(path) } : { path };
}

module.exports = {
    /**
     * Visit statistics of the public site: GET /api/analytics/visits?days | ?from&to, &top
     * (the length of the referrer, device, language and transition lists; the pages are
     * all listed). An empty or missing `visits` collection gives zeros, not an error.
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
            const aggregate = (pipeline) => visits.aggregate(pipeline, { allowDiskUse: true }).toArray();

            // every page with all its counts: the page lists them by any of the metrics;
            // the hits of both periods at once are split into visits here
            const [perDay, previousDays, pageRows, referrers, devices, languages, hours, hits, pages] =
                await Promise.all([
                    aggregate(perDayPipeline(range)),
                    aggregate(perDayPipeline(previous)),
                    aggregate(pagesPipeline(range)),
                    aggregate(topPipeline(range, ENTRY_MATCH, 'referrer', top)),
                    aggregate(topPipeline(range, ENTRY_MATCH, 'device', top)),
                    aggregate(topPipeline(range, ENTRY_MATCH, 'lang', top)),
                    aggregate(hoursPipeline(range)),
                    aggregate(hitsPipeline({ from: previous.from, to: range.to })),
                    Page.find({}, 'id title pageUrl').lean(),
                ]);
            const days = fillDays(perDay, range.from, range.to);
            const current = summarizeVisits(hits.filter((hit) => hit.day >= range.from));
            const before = summarizeVisits(hits.filter((hit) => hit.day < range.from));
            const byPath = pagesByPath(pages);

            res.send({
                from: range.from,
                to: range.to,
                days,
                totals: summarize(days),
                singlePage: { visits: current.visits, single: current.single },
                previous: {
                    from: previous.from,
                    to: previous.to,
                    totals: summarize(fillDays(previousDays, previous.from, previous.to)),
                    singlePage: { visits: before.visits, single: before.single },
                },
                pages: withPages(pageRows, pages).map((row) => ({
                    ...row,
                    single: current.landing.get(row.key)?.single ?? 0,
                })),
                transitions: topTransitions(current.transitions, top).map((move) => ({
                    from: linkPath(byPath, move.from),
                    to: linkPath(byPath, move.to),
                    count: move.count,
                })),
                hours,
                referrers,
                devices,
                languages,
            });
        } catch (err) {
            next(err);
        }
    },
};
