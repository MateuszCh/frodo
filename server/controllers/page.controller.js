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
            Promise.all([Page.findOne({ pageUrl: pageProps.pageUrl }), Settings.findSettings()]).then(
                ([existingPage, settings]) => {
                    const typeProps = pageTypeProps(pageProps, settings.pageTypes);
                    if (typeProps.error) {
                        return res.status(422).send({ error: typeProps.error });
                    }
                    if (existingPage !== null) {
                        return res.status(422).send({ error: urlTakenError(pageProps.pageUrl) });
                    }
                    return Counter.findOne({}).then((counter) => {
                        pageProps.id = counter.counter;
                        pageProps.created = Date.now();
                        pageProps.type = typeProps.type;
                        pageProps.typeData = typeProps.typeData;
                        return Page.create(pageProps).then((page) => {
                            res.send(page);
                            return Counter.update(counter, {
                                $inc: { counter: 1 },
                            }).then(() => console.log('Counter incremented'));
                        });
                    });
                },
            ),
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
                    pages.map((page) => {
                        return {
                            title: page.title,
                            pageUrl: page.pageUrl,
                            seoTitle: page.seoTitle,
                            seoDescription: page.seoDescription,
                            type: page.type,
                            typeData: page.typeData,
                            rows: page.rows,
                            created: page.created,
                        };
                    }),
                    null,
                    4,
                );

                writeExport('pages', formattedPages, (err, url) => (err ? next(err) : res.send(url)));
            })
            .catch(next);
    },
    importPages(req, res, next) {
        const pagesUrls = [];

        const correctPages = req.body.posts.filter((page) => {
            if (!page.title || !page.pageUrl) {
                return false;
            }
            pagesUrls.push(page.pageUrl);
            return {
                title: page.title,
                pageUrl: page.pageUrl,
                rows: page.rows || [],
            };
        });

        if (new Set(pagesUrls).size !== pagesUrls.length) {
            return res.status(422).send({ error: 'Duplicate urls' });
        }
        if (!correctPages.length) {
            return res.status(422).send({ error: 'There is no valid page to import' });
        }

        withPageTypeLock(() =>
            Promise.all([Counter.findOne({}), Page.find({}), Settings.findSettings()]).then(
                ([counter, pages, settings]) => {
                    const currentPagesUrls = pages.map((page) => {
                        return page.pageUrl;
                    });
                    const allPagesUrls = currentPagesUrls.concat(pagesUrls);
                    const typeProps = correctPages.map((page) => pageTypeProps(page, settings.pageTypes));
                    const typeError = typeProps.find((props) => props.error);
                    if (typeError) {
                        return res.status(422).send({ error: typeError.error });
                    }
                    if (new Set(allPagesUrls).size !== allPagesUrls.length) {
                        return res.status(422).send({
                            error: 'One of imported pages has already used url',
                        });
                    }
                    const pagesModels = correctPages.map((page, i) => {
                        const model = page;
                        if (!model.created) model.created = Date.now();
                        model.type = typeProps[i].type;
                        model.typeData = typeProps[i].typeData;
                        model.id = counter.counter + i;
                        return model;
                    });

                    return Page.create(pagesModels)
                        .then(() => Counter.update(counter, { $inc: { counter: pagesModels.length } }))
                        .then(() => {
                            console.log('Counter incremented');
                            return Page.find({});
                        })
                        .then((allPages) => res.send(allPages));
                },
            ),
        ).catch(next);
    },
};
