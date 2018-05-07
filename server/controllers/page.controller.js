const Page = require('../models/page'),
      Counter = require('../models/counter'),
      fs = require('fs'),
      mongoose = require('mongoose');

module.exports = {
    create(req, res, next){
        const pageProps = req.body;
        Page.findOne({pageUrl: pageProps.pageUrl})
            .then(existingPage => {
                if(existingPage === null){
                    Counter.findOne({})
                        .then(counter => {
                            pageProps.id = counter.counter;
                            pageProps.created = Date.now();
                            Page.create(pageProps)
                                .then(page => {
                                    res.send(page);
                                    Counter.update(counter, {$inc: {counter: 1}})
                                        .then(() => console.log("Counter incremented"))
                                        .catch(next);
                                })
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({error: `There already is page with "${pageProps.pageUrl}" url.`})
                }
            })
            .catch(next);
    },
    edit(req, res, next){
        const pageProps = req.body;
        const id = mongoose.Types.ObjectId(pageProps._id);

        Page.findOne({pageUrl: pageProps.pageUrl, _id : {$ne: id}})
            .then(existingPage => {
                if(existingPage === null){
                    Page.findById(pageProps._id)
                        .then(page => {
                            page.title = pageProps.title;
                            page.pageUrl = pageProps.pageUrl;
                            page.rows = pageProps.rows;

                            page.save()
                                .then(page => res.send(page))
                                .catch(next);
                        })
                } else {
                    res.status(422).send({error: `There already is page with "${pageProps.pageUrl}" url.`});
                }
            })
            .catch(next);
    },
    getAll(req, res, next){
        Page.find({})
            .then(pages => res.send(pages))
            .catch(next);
    },
    getById(req, res, next){
        if(isNaN(req.params.id)) return res.status(404).send({error: 'Invalid page id'});
        Page.findOne({id: req.params.id})
            .then(page => {
                if(!page){
                    res.status(404).send({error: `There is no page with id ${req.params.id}`})
                }
                res.send(page);
            })
            .catch(next);
    },
    delete(req, res, next){
        Page.findByIdAndRemove(req.params.id)
            .then(() => res.status(200).send("Page removed successfully"))
            .catch(next);

    },
    exportPages(req, res, next){
        Page.find({})
            .then(pages => {
                const formattedPages = JSON.stringify(pages.map(page => {
                    return {
                        title: page.title,
                        pageUrl: page.pageUrl,
                        rows: page.rows,
                        created: page.created
                    }
                }), null, 4);

                fs.writeFile(`${__dirname}/../../pages.json`, formattedPages, err =>{
                    if(err) next();
                    res.send("/export/pages.json");
                })
            })
            .catch(next);
    },
    importPages(req, res, next){
        const pagesUrls = [];

        const correctPages = req.body.posts.filter(page =>{
            if(!page.title || !page.pageUrl){
                return false;
            }
            pagesUrls.push(page.pageUrl);
            return {
                title: page.title,
                pageUrl: page.pageUrl,
                rows: page.rows || []
            }
        });

        if((new Set(pagesUrls)).size !== pagesUrls.length){
            res.status(422).send({error: 'Duplicate urls'});
        }

        if(correctPages.length){
            Promise.all([Counter.findOne({}), Page.find({})])
                .then(response => {
                    const counter = response[0];
                    const currentPagesUrls = response[1].map(page => {
                        return page.pageUrl;
                    });
                    const allPagesUrls = currentPagesUrls.concat(pagesUrls);
                    if((new Set(allPagesUrls)).size !== allPagesUrls.length){
                        res.status(422).send({error: "One of imported pages has already used url"})
                    } else {
                        const pagesModels = [];
                        correctPages.forEach((page, i) => {
                            const model = page;
                            if(!model.created) model.created = Date.now();
                            model.id = counter.counter + i;
                            pagesModels.push(model);
                        });

                        Page.create(pagesModels)
                            .then(pages => {
                                Counter.update(counter, {$inc: {counter: pagesModels.length}})
                                    .then(() => {
                                        console.log("Counter incremented");
                                        Page.find({})
                                            .then(pages => res.send(pages))
                                            .catch(next);
                                    })
                                    .catch(next);
                            })
                            .catch(next);
                    }
                })
                .catch(next);
        } else {
            res.status(422).send({error: "There is no valid page to import"});
        }

    }
};
