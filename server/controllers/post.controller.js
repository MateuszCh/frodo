const Post = require('../models/post'),
    Counter = require('../models/counter'),
    fs = require('fs'),
    { writeExport } = require('../exports'),
    PostType = require('../models/postType');

module.exports = {
    create(req, res, next) {
        const postProps = req.body;
        PostType.findOne({ type: postProps.type })
            .then((postType) => {
                if (postType !== null) {
                    Counter.reserve()
                        .then((id) => {
                            postProps.id = id;
                            postProps.created = Date.now();
                            return new Post(postProps).save();
                        })
                        .then((response) =>
                            postType
                                .update({ $push: { posts: response._id } })
                                .then(() => res.send(response)),
                        )
                        .catch(next);
                } else {
                    res.status(422).send({
                        error: 'There is no ' + postProps.type + ' post type.',
                    });
                }
            })
            .catch(next);
    },
    importPosts(req, res, next) {
        const postType = req.body.postType;
        // a title and only fields of a post: an export of pages, files or post types is refused
        const postFields = Object.keys(Post.schema.paths);
        const correctPosts = req.body.posts.filter(
            (post) => post.title && Object.keys(post).every((prop) => postFields.includes(prop)),
        );
        if (correctPosts.length) {
            PostType.findOne({ type: postType })
                .then((postTypeModel) => {
                    if (postTypeModel === null) {
                        return res.status(422).send({
                            error: 'There is no ' + postType + ' post type.',
                        });
                    }
                    // into the type imported to, whichever type they were exported from; with the
                    // ids of the export where they are free, which "post" fields point to
                    return Post.saveImport(correctPosts, { type: postType }, { keepIds: true })
                        .then((posts) =>
                            postTypeModel.update({
                                $push: { posts: { $each: posts.map((post) => post._id) } },
                            }),
                        )
                        .then(() => PostType.findOne({ type: postType }).populate('posts'))
                        .then((postTypeWithPosts) => res.send(postTypeWithPosts));
                })
                .catch(next);
        } else {
            res.status(422).send({
                error: 'There is no valid posts to import',
            });
        }
    },
    exportPosts(req, res, next) {
        const postType = req.params.postType;
        Post.find({ type: postType })
            .then((posts) => {
                const formattedPosts = JSON.stringify(
                    posts.map((post) => post.toExport()),
                    null,
                    4,
                );
                // the type comes from the URL: writeExport keeps its file name inside the export folder
                writeExport(postType, formattedPosts, (err, url) =>
                    err ? next(err) : res.send(url),
                );
            })
            .catch(next);
    },
    removeTmpFile(req, res, next) {
        const postType = req.params.postType;
        fs.unlink(`${__dirname}/../${postType}.json`, (err) => {
            if (err) next();
            res.send('temporary file removed');
        });
    },
    edit(req, res, next) {
        const postProps = req.body;
        Post.findById(postProps._id)
            .then((post) => {
                post.title = postProps.title;
                post.data = postProps.data;

                post.save()
                    .then((post) => res.send(post))
                    .catch(next);
            })
            .catch(next);
    },
    getById(req, res, next) {
        if (isNaN(req.params.id)) return res.status(404).send({ error: 'Invalid post id' });
        Post.findOne({ id: req.params.id })
            .then((post) => {
                if (!post) {
                    res.status(404).send({
                        error: `There is no post with id ${req.params.id}`,
                    });
                }
                res.send(post);
            })
            .catch(next);
    },
    delete(req, res, next) {
        Post.findById(req.params.id)
            .then((postToRemove) => {
                postToRemove
                    .remove()
                    .then(() => {
                        PostType.update(
                            { type: postToRemove.type },
                            { $pull: { posts: postToRemove._id } },
                        ).then(() => res.status(200).send('Post removed successfully'));
                    })
                    .catch(next);
            })
            .catch(next);
    },
};
