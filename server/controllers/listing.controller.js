const Page = require('../models/page'),
    Post = require('../models/post'),
    PostType = require('../models/postType'),
    Component = require('../models/component'),
    {
        FAMILIES,
        parsePaging,
        buildSort,
        buildTextMatch,
        buildFilterMatch,
        parseFilters,
        rangesGroup,
        readRanges,
    } = require('../listing-query');

const MODELS = { pages: Page, components: Component, postTypes: PostType, posts: Post };

// a listing row needs only what it shows and links to, never rows, fields or post data
const LIST_PROJECTION = { _id: 1, id: 1, title: 1, type: 1, created: 1, draft: 1 };

function page(Model, match, sort, pageNumber, limit) {
    return Model.aggregate([
        { $match: match },
        {
            $facet: {
                items: [
                    { $sort: sort },
                    { $skip: (pageNumber - 1) * limit },
                    { $limit: limit },
                    { $project: LIST_PROJECTION },
                ],
                matched: [{ $count: 'count' }],
            },
        },
    ])
        // $sort inside $facet uses no index and holds whole documents: past 100 MB it needs disk
        .allowDiskUse(true)
        .then(([result]) => ({
            items: result.items,
            matched: result.matched.length ? result.matched[0].count : 0,
        }));
}

module.exports = {
    /**
     * One page of a listing: GET /api/listing/:family?page&limit&sort&q&filters
     * (posts also need postType). Search, filters and sort run over the whole collection.
     */
    async getPage(req, res, next) {
        try {
            const family = req.params.family;
            if (!FAMILIES.includes(family)) {
                return res.status(404).send({ error: `There is no ${family} listing` });
            }
            const Model = MODELS[family];
            const { page: requested, limit } = parsePaging(req.query);

            let fields = [];
            let base = {};
            if (family === 'posts') {
                const postType = await PostType.findOne({ type: String(req.query.postType ?? '') });
                if (!postType) {
                    return res.status(404).send({ error: `There is no post type with type ${req.query.postType}` });
                }
                fields = postType.fields ?? [];
                base = { type: postType.type };
            }

            const conditions = [base];
            const text = buildTextMatch(req.query.q, family);
            if (text) {
                conditions.push(text);
            }
            if (family === 'posts') {
                conditions.push(...buildFilterMatch(parseFilters(req.query.filters), fields));
            }
            const match = conditions.length > 1 ? { $and: conditions } : base;
            const sort = buildSort(req.query.sort, family, fields);

            const [total, ranges] = await Promise.all([
                Model.countDocuments(base),
                family === 'posts'
                    ? Model.aggregate([{ $match: base }, { $group: rangesGroup(fields) }]).then(([result]) =>
                          readRanges(fields, result),
                      )
                    : Promise.resolve(undefined),
            ]);

            let pageNumber = requested;
            let result = await page(Model, match, sort, pageNumber, limit);
            // past the last page (a removed item, an old link): the last page instead
            const lastPage = Math.max(1, Math.ceil(result.matched / limit));
            if (pageNumber > lastPage) {
                pageNumber = lastPage;
                result = await page(Model, match, sort, pageNumber, limit);
            }

            const body = { items: result.items, page: pageNumber, limit, matched: result.matched, total };
            if (ranges) {
                body.ranges = ranges;
            }
            return res.send(body);
        } catch (err) {
            return next(err);
        }
    },
};
