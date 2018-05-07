const PostType = require('../models/postType'),
      Component = require('../models/component'),
      mongoose = require('mongoose'),
      Counter = require('../models/counter'),
      fs = require('fs'),
      format = require('../models/tools/format');

function postTypeReturn(req, res, postType){
    if(!postType){
        let message = 'There is no post type with ';
        if(req.params.id){
            message += `id ${req.params.id}`;
        } else if (req.params.type){
            message += `type ${req.params.type}`;
        }
        return res.status(404).send({error: message});
    }
    return res.send(postType);
}

module.exports = {
    create(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? Model = Component : Model = PostType;
        const postTypeProps = req.body;

        postTypeProps.type = format.formatId(postTypeProps.type);

        Model.findOne({type: postTypeProps.type})
            .then(existingType => {
                if(existingType === null){
                    Counter.findOne({})
                        .then(counter => {
                            postTypeProps.id = counter.counter;
                            postTypeProps.created = Date.now();
                            Model.create(postTypeProps)
                                .then(postType => {
                                    res.send(postType);
                                    Counter.update(counter, { $inc: {counter: 1}})
                                        .then(() => console.log("Counter incremented"))
                                        .catch(next)
                                })
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({error: `There already is "${postTypeProps.type}" type`})
                }
            })
            .catch(next);
    },
    edit(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? Model = Component : Model = PostType;
        const postTypeProps = req.body;
        postTypeProps.type = format.formatId(postTypeProps.type);

        const id = mongoose.Types.ObjectId(postTypeProps._id);

        Model.findOne({type: postTypeProps.type, _id : {$ne: id}})
            .then(existingType => {
                if(existingType === null){
                    Model.findById(postTypeProps._id)
                        .then((postType) => {
                            postType.type = postTypeProps.type;
                            postType.title = postTypeProps.title;
                            postType.fields = postTypeProps.fields;
                            postType.pluralTitle = postTypeProps.pluralTitle;

                            postType.save()
                                .then(postType => res.send(postType))
                                .catch(next)
                        })
                        .catch(next);
                } else {
                    res.status(422).send({error: `There already is "${postTypeProps.type}" type`});
                }
            })
            .catch(next)
    },
    getAll(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? Model = Component : Model = PostType;
        Model.find({})
            .then(postTypes => res.send(postTypes))
            .catch(next);
    },
    getById(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? Model = Component : Model = PostType;
        Model.findOne({id: req.params.id})
            .then(postType => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByIdWithPosts(req, res, next){
        PostType.findOne({id: req.params.id})
            .populate('posts')
            .then(postType => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByType(req, res, next){
        PostType.findOne({type: req.params.type})
            .then(postType => postTypeReturn(req, res, postType))
            .catch(next);
    },
    getByTypeWithPosts(req, res, next){
        PostType.findOne({type: req.params.type})
            .populate('posts')
            .then(postType => postTypeReturn(req, res, postType))
            .catch(next);
    },
    delete(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('component') >= 0;
        isComponent ? Model = Component : Model = PostType;
        Model.findById(req.params.id)
            .then(postToRemove => {
                postToRemove.remove()
                    .then(postType => res.status(200).send(`${postType.type} type removed successfully`))
                    .catch(next);
            })
            .catch(next);
    },
    exportPostTypes(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('Components') >= 0;
        isComponent ? Model = Component : Model = PostType;

        Model.find({})
            .then(postTypes => {

                const formattedPostTypes = JSON.stringify(postTypes.map(postType => {
                    let fields = postType.fields.map(field => {
                        const newField = {
                            type: field.type,
                            title: field.title,
                            id: field.id,
                            repeaterFields: field.repeaterFields
                        };

                        if(field.selectOptions) newField.selectOptions = field.selectOptions;
                        if(field.multiselectOptions) newField.multiselectOptions = field.multiselectOptions;
                        return newField;
                    });

                    return {
                        title: postType.title,
                        pluralTitle: postType.pluralTitle,
                        type: postType.type,
                        fields: fields,
                        created: postType.created
                    }
                }), null, 4);

                const filename = isComponent ? 'components' : 'postTypes';


                fs.writeFile(`${__dirname}/../../${filename}.json`, formattedPostTypes, err =>{
                   if(err) next();
                   res.send(`/export/${filename}.json`);
                });


            })
            .catch(next);

    },
    importPostTypes(req, res, next){
        const path = req.route.path;
        let Model;
        const isComponent = path.indexOf('Components') >= 0;
        isComponent ? Model = Component : Model = PostType;

        const postTypesTypes = [];

        const correctPostTypes = req.body.posts.filter(postType => {
            if(!(postType.title && (postType.pluralTitle || isComponent) && postType.type)){
                return false;
            }

            const fieldsIds = [];

            const correctFields = postType.fields.filter(field => {
                if(!(field.type && field.id && field.title)){
                   return false;
                }
                const newField = {
                   type: field.type,
                   title: field.title,
                   id: field.id,
                   repeaterFields: field.repeaterFields
                };
                fieldsIds.push(field.id);
                if(field.selectOptions) newField.selectOptions = field.selectOptions;
                if(field.multiselectOptions)newField.multiselectOptions = field.multiselectOptions;
                return newField;
            });

            if((new Set(fieldsIds)).size !== fieldsIds.length){
                res.status(422).send({error: "Duplicate field ids"});
            }

            postTypesTypes.push(postType.type);


            const model = {
                title: postType.title,
                type: postType.type,
                fields: correctFields,
                created: postType.created || Date.now()
            };

            if(!isComponent) model.pluralTitle = postType.pluralTitle;

            return model;

        });

        if((new Set(postTypesTypes)).size !== postTypesTypes.length){
            res.status(422).send({error: 'Duplicate types'});
        }

        if(correctPostTypes.length){
            Promise.all([Counter.findOne({}), Model.find({})])
                .then(response => {
                    const counter = response[0];
                    const currentPostTypes = response[1].map(postType => {
                        return postType.type;
                    });
                    const allPostTypes = currentPostTypes.concat(postTypesTypes);
                    if((new Set(allPostTypes)).size !== allPostTypes.length){
                        res.status(422).send({error: 'Some of imported post type already exists'});
                    }

                    const postTypeModels = [];
                    correctPostTypes.forEach((postType, i) =>{
                       const model = postType;
                       model.id = counter.counter + i;
                       postTypeModels.push(model);
                    });

                    Model.create(postTypeModels)
                        .then(postTypes => {
                            Counter.update(counter, {$inc: {counter: postTypeModels.length}})
                                .then(() =>{
                                    console.log("Counter incremented");
                                    Model.find({})
                                        .then(postTypes => {
                                            res.send(postTypes);
                                        })
                                        .catch(next);
                                })
                                .catch(next);
                        })
                        .catch(next);
                })
                .catch(next);
        } else {
            res.status(422).send({error: "There is no valid post types to import"});
        }
    }
};
