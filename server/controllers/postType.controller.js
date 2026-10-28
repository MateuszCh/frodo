const PostType = require('../models/postType'),
    Component = require('../models/component'),
    mongoose = require('mongoose'),
    Counter = require('../models/counter'),
    { writeExport } = require('../exports'),
    format = require('../models/tools/format');

function postTypeReturn(req, res, postType) {
    if (!postType) {
        let message = 'There is no post type with ';
        if (req.params.id) {
            message += `id ${req.params.id}`;
        } else if (req.params.type) {
            message += `type ${req.params.type}`;
        }
        return res.status(404).send({ error: message });
    }
    return res.send(postType);
}

module.exports = {
    create(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);
        const postTypeProps = req.body;

        postTypeProps.type = format.formatId(postTypeProps.type);

        Model.findOne({ type: postTypeProps.type })
            .then((existingType) => {
                if (existingType === null) {
                    Counter.reserve()
                        .then((id) => {
                            postTypeProps.id = id;
                            postTypeProps.created = Date.now();
                            Model.create(postTypeProps)
                                .then((postType) => res.send(postType))
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({
                        error: `There already is "${postTypeProps.type}" type`,
                    });
                }
            })
            .catch(next);
    },
    edit(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);
        const postTypeProps = req.body;
        postTypeProps.type = format.formatId(postTypeProps.type);

        const id = mongoose.Types.ObjectId(postTypeProps._id);

        Model.findOne({ type: postTypeProps.type, _id: { $ne: id } })
            .then((existingType) => {
                if (existingType === null) {
                    Model.findById(postTypeProps._id)
                        .then((postType) => {
                            postType.type = postTypeProps.type;
                            postType.title = postTypeProps.title;
                            postType.fields = postTypeProps.fields;
                            postType.pluralTitle = postTypeProps.pluralTitle;

                            postType
                                .save()
                                .then((postType) => res.send(postType))
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({
                        error: `There already is "${postTypeProps.type}" type`,
                    });
                }
            })
            .catch(next);
    },
    getAll(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);
        Model.find({})
            .then((postTypes) => res.send(postTypes))
            .catch(next);
    },
    getById(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);
        Model.findOne({ id: req.params.id })
            .then((postType) => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByIdWithPosts(req, res, next) {
        PostType.findOne({ id: req.params.id })
            .populate('posts')
            .then((postType) => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByType(req, res, next) {
        PostType.findOne({ type: req.params.type })
            .then((postType) => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByTypeWithPosts(req, res, next) {
        PostType.findOne({ type: req.params.type })
            .populate('posts')
            .then((postType) => postTypeReturn(req, res, postType))
            .catch(next);
    },
    delete(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);
        Model.findById(req.params.id)
            .then((postToRemove) => {
                postToRemove
                    .remove()
                    .then((postType) =>
                        res.status(200).send(`${postType.type} type removed successfully`),
                    )
                    .catch(next);
            })
            .catch(next);
    },
    exportPostTypes(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('Components') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);

        Model.find({})
            .then((postTypes) => {
                const formattedPostTypes = JSON.stringify(
                    postTypes.map((postType) => postType.toExport()),
                    null,
                    4,
                );

                const filename = isComponent ? 'components' : 'postTypes';

                writeExport(filename, formattedPostTypes, (err, url) =>
                    err ? next(err) : res.send(url),
                );
            })
            .catch(next);
    },
    importPostTypes(req, res, next) {
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('Components') >= 0;
        isComponent ? (Model = Component) : (Model = PostType);

        const correctPostTypes = req.body.posts
            // an export of posts or files has a title and a type too, but no fields
            .filter(
                (postType) =>
                    postType.title &&
                    (postType.pluralTitle || isComponent) &&
                    postType.type &&
                    Array.isArray(postType.fields),
            )
            // a field without a type, an id or a title is left out
            .map((postType) => ({
                ...postType,
                fields: postType.fields.filter((field) => field.type && field.id && field.title),
            }));
        const postTypesTypes = correctPostTypes.map((postType) => postType.type);

        const duplicateFieldIds = correctPostTypes.some(
            (postType) =>
                new Set(postType.fields.map((field) => field.id)).size !== postType.fields.length,
        );
        if (duplicateFieldIds) {
            return res.status(422).send({ error: 'Duplicate field ids' });
        }

        if (new Set(postTypesTypes).size !== postTypesTypes.length) {
            return res.status(422).send({ error: 'Duplicate types' });
        }

        if (correctPostTypes.length) {
            Model.find({ type: { $in: postTypesTypes } })
                .then((existingPostTypes) => {
                    if (existingPostTypes.length) {
                        return res.status(422).send({
                            error: 'Some of imported post type already exists',
                        });
                    }
                    return Model.saveImport(correctPostTypes)
                        .then(() => Model.find({}))
                        .then((postTypes) => res.send(postTypes));
                })
                .catch(next);
        } else {
            res.status(422).send({
                error: 'There is no valid post types to import',
            });
        }
    },
};
