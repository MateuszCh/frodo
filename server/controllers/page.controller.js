const Page = require('../models/page'),
    Counter = require('../models/counter'),
    Settings = require('../models/settings'),
    { pageTypeProps, withPageTypeLock } = require('../page-types'),
    { writeExport } = require('../exports'),
    mongoose = require('mongoose');

function urlTakenError(pageUrl) {
    return `There already is page with "${pageUrl}" url.`;
}

module.exports = {
    create(req, res, next) {
        const pageProps = req.body;
        // queued with settings saves, so the type cannot be removed between the check and the write
        withPageTypeLock(() =>
            Promise.all([
                Page.findOne({ pageUrl: pageProps.pageUrl }),
                Settings.findSettings(),
            ]).then(([existingPage, settings]) => {
                const typeProps = pageTypeProps(pageProps, settings.pageTypes);
                if (typeProps.error) {
                    return res.status(422).send({ error: typeProps.error });
                }
                if (existingPage !== null) {
                    return res.status(422).send({ error: urlTakenError(pageProps.pageUrl) });
                }
                return Counter.reserve().then((id) => {
                    pageProps.id = id;
                    pageProps.created = Date.now();
                    pageProps.type = typeProps.type;
                    pageProps.typeData = typeProps.typeData;
                    return Page.create(pageProps).then((page) => res.send(page));
                });
            }),
        ).catch(next);
    },
    edit(req, res, next) {
        const pageProps = req.body;
        const id = mongoose.Types.ObjectId(pageProps._id);

        withPageTypeLock(() =>
            Promise.all([
                Page.findOne({ pageUrl: pageProps.pageUrl, _id: { $ne: id } }),
                Settings.findSettings(),
                Page.findById(id),
            ]).then(([existingPage, settings, page]) => {
                const typeProps = pageTypeProps(pageProps, settings.pageTypes);
                if (typeProps.error) {
                    return res.status(422).send({ error: typeProps.error });
                }
                if (existingPage !== null) {
                    return res.status(422).send({ error: urlTakenError(pageProps.pageUrl) });
                }
                // removed in the meantime (another tab, a stale editor)
                if (!page) {
                    return res.status(404).send({ error: `There is no page with id ${pageProps.id ?? pageProps._id}` });
                }
                page.title = pageProps.title;
                page.pageUrl = pageProps.pageUrl;
                page.seoTitle = pageProps.seoTitle;
                page.seoDescription = pageProps.seoDescription;
                page.type = typeProps.type;
                page.typeData = typeProps.typeData;
                page.rows = pageProps.rows;

                return page.save().then((saved) => res.send(saved));
            }),
        ).catch(next);
    },
    getAll(req, res, next) {
        Page.find({})
            .then((pages) => res.send(pages))
            .catch(next);
    },
    getById(req, res, next) {
        if (isNaN(req.params.id)) return res.status(404).send({ error: 'Invalid page id' });
        Page.findOne({ id: req.params.id })
            .then((page) => {
                if (!page) {
                    res.status(404).send({
                        error: `There is no page with id ${req.params.id}`,
                    });
                }
                res.send(page);
            })
            .catch(next);
    },
    delete(req, res, next) {
        Page.findByIdAndRemove(req.params.id)
            .then(() => res.status(200).send('Page removed successfully'))
            .catch(next);
    },
    exportPages(req, res, next) {
        Page.find({})
            .then((pages) => {
                const formattedPages = JSON.stringify(
                    pages.map((page) => page.toExport()),
                    null,
                    4,
                );

                writeExport('pages', formattedPages, (err, url) =>
                    err ? next(err) : res.send(url),
                );
            })
            .catch(next);
    },
    importPages(req, res, next) {
        const correctPages = req.body.posts.filter((page) => page.title && page.pageUrl);
        const pagesUrls = correctPages.map((page) => page.pageUrl);

        if (new Set(pagesUrls).size !== pagesUrls.length) {
            return res.status(422).send({ error: 'Duplicate urls' });
        }
        if (!correctPages.length) {
            return res.status(422).send({ error: 'There is no valid page to import' });
        }

        withPageTypeLock(() =>
            Promise.all([Page.find({ pageUrl: { $in: pagesUrls } }), Settings.findSettings()]).then(
                ([existingPages, settings]) => {
                    const typeProps = correctPages.map((page) =>
                        pageTypeProps(page, settings.pageTypes),
                    );
                    const typeError = typeProps.find((props) => props.error);
                    if (typeError) {
                        return res.status(422).send({ error: typeError.error });
                    }
                    if (existingPages.length) {
                        return res.status(422).send({
                            error: 'One of imported pages has already used url',
                        });
                    }
                    const pages = correctPages.map((page, i) => ({
                        ...page,
                        type: typeProps[i].type,
                        typeData: typeProps[i].typeData,
                    }));

                    return Page.saveImport(pages)
                        .then(() => Page.find({}))
                        .then((allPages) => res.send(allPages));
                },
            ),
        ).catch(next);
    },
};
