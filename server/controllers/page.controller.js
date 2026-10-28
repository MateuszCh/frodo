const Page = require('../models/page'),
    Counter = require('../models/counter'),
    { writeExport } = require('../exports'),
    mongoose = require('mongoose');

module.exports = {
    create(req, res, next) {
        const pageProps = req.body;
        Page.findOne({ pageUrl: pageProps.pageUrl })
            .then((existingPage) => {
                if (existingPage === null) {
                    Counter.reserve()
                        .then((id) => {
                            pageProps.id = id;
                            pageProps.created = Date.now();
                            Page.create(pageProps)
                                .then((page) => res.send(page))
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({
                        error: `There already is page with "${pageProps.pageUrl}" url.`,
                    });
                }
            })
            .catch(next);
    },
    edit(req, res, next) {
        const pageProps = req.body;
        const id = mongoose.Types.ObjectId(pageProps._id);

        Page.findOne({ pageUrl: pageProps.pageUrl, _id: { $ne: id } })
            .then((existingPage) => {
                if (existingPage === null) {
                    Page.findById(pageProps._id).then((page) => {
                        page.title = pageProps.title;
                        page.pageUrl = pageProps.pageUrl;
                        page.seoTitle = pageProps.seoTitle;
                        page.seoDescription = pageProps.seoDescription;
                        page.rows = pageProps.rows;

                        page.save()
                            .then((page) => res.send(page))
                            .catch(next);
                    });
                } else {
                    res.status(422).send({
                        error: `There already is page with "${pageProps.pageUrl}" url.`,
                    });
                }
            })
            .catch(next);
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

        if (correctPages.length) {
            Page.find({ pageUrl: { $in: pagesUrls } })
                .then((existingPages) => {
                    if (existingPages.length) {
                        return res.status(422).send({
                            error: 'One of imported pages has already used url',
                        });
                    }
                    return Page.saveImport(correctPages)
                        .then(() => Page.find({}))
                        .then((pages) => res.send(pages));
                })
                .catch(next);
        } else {
            res.status(422).send({ error: 'There is no valid page to import' });
        }
    },
};
