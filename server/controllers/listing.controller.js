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

/**
 * The family's model and the match of its whole listing (posts: one post type), or the
 * status and error to answer with.
 */
async function listingBase(family, postTypeKey) {
    if (!FAMILIES.includes(family)) {
        return { status: 404, error: `There is no ${family} listing` };
    }
    if (family !== 'posts') {
        return { Model: MODELS[family], fields: [], base: {} };
    }
    const postType = await PostType.findOne({ type: String(postTypeKey ?? '') });
    if (!postType) {
        return { status: 404, error: `There is no post type with type ${postTypeKey}` };
    }
    return { Model: Post, fields: postType.fields ?? [], base: { type: postType.type } };
}

module.exports = {
    /**
     * One page of a listing: GET /api/listing/:family?page&limit&sort&q&filters
     * (posts also need postType). Search, filters and sort run over the whole collection.
     */
    async getPage(req, res, next) {
        try {
            const family = req.params.family;
            const { Model, fields, base, status, error } = await listingBase(family, req.query.postType);
            if (error) {
                return res.status(status).send({ error });
            }
            const { page: requested, limit } = parsePaging(req.query);

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

    /**
     * Every row of a listing, unpaged and in the given sort: GET /api/listing/:family/all?sort
     * (posts also need postType). Only what a row shows, for choosing the items to export.
     */
    async getAll(req, res, next) {
        try {
            const family = req.params.family;
            const { Model, fields, base, status, error } = await listingBase(family, req.query.postType);
            if (error) {
                return res.status(status).send({ error });
            }
            const items = await Model.aggregate([
                { $match: base },
                { $sort: buildSort(req.query.sort, family, fields) },
                { $project: LIST_PROJECTION },
            ]).allowDiskUse(true);
            return res.send({ items });
        } catch (err) {
            return next(err);
        }
    },
};
