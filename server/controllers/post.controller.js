const Post = require('../models/post'),
      Counter = require('../models/counter'),
      fs = require('fs'),
      PostType = require('../models/postType');

module.exports = {
    create(req, res, next){
        const postProps = req.body;
        Promise.all([Counter.findOne({}), PostType.findOne({type: postProps.type})])
            .then(response => {
                const counter = response[0];
                postProps.id = counter.counter;
                postProps.created = Date.now();
                const postType = response[1];
                if(postType !== null){
                    const newPost = new Post(postProps);
                    newPost.save()
                        .then(response => {
                            postType.update({$push: {posts: response._id}})
                                .then(() => {
                                    res.send(response);
                                    Counter.update(counter, { $inc: {counter: 1}})
                                        .then(() => console.log("Counter incremented"))
                                        .catch(next)
                                })
                                .catch(next);
                        })
                        .catch(next);
                } else {
                    res.status(422).send({error: "There is no " + postProps.type + " post type."});
                }
            })
            .catch(next);
    },
    importPosts(req, res, next){
        const postType = req.body.postType;
        const correctPosts = req.body.posts.filter(post => {
           const props = Object.keys(post);
           if(props.length === 1 && post.title){
               return true;
           } else if (props.length === 2 && post.title && post.data){
               return true;
           } else {
               return false;
           }
        });
        if(correctPosts.length){
            Promise.all([Counter.findOne({}), PostType.findOne({type: postType}).populate('posts')])
                .then(response =>{
                    const counter = response[0];
                    const postTypeModel = response[1];

                    const postModels = [];

                    correctPosts.forEach((post, i) => {
                       const model = {
                           title: post.title,
                           data: post.data,
                           type: postType,
                           id: counter.counter + i
                       };
                       model.created = post.created || Date.now();
                       postModels.push(model);
                    });

                    Post.create(postModels)
                        .then(posts => {
                            const ids = [];
                            posts.forEach(post => {
                                ids.push(post._id);
                            });

                            postTypeModel.update({$push: {posts: {$each: ids}}})
                                .then(() =>{
                                    Promise.all([Counter.update(counter, {$inc: {counter: posts.length}}), PostType.findOne({type: postType}).populate('posts')])
                                        .then(response => {
                                            console.log("Counter incremented");
                                            res.send(response[1]);
                                        })
                                        .catch(next);
                                })
                                .catch(next);
                        })
                        .catch(next);

                })
                .catch(next);
        } else{
            res.status(422).send({error: "There is no valid posts to import"});
        }
    },
    exportPosts(req, res, next){
        const postType = req.params.postType;
        Post.find({type: postType})
            .then(posts => {
                const formattedPosts = JSON.stringify(posts.map(post => {
                    return {
                        title: post.title,
                        data: post.data,
                        created: post.created
                    }
                }), null, 4);
                fs.writeFile(`${__dirname}/../../${postType}.json`, formattedPosts, err => {
                    if(err) next();
                    res.send(`/export/${postType}.json`);
                })
            })
            .catch(next);
    },
    removeTmpFile(req, res, next){
        const postType = req.params.postType;
        fs.unlink(`${__dirname}/../${postType}.json`, (err) => {
            if(err) next();
            res.send('temporary file removed');
        });
    },
    edit(req, res, next){
        const postProps = req.body;
        Post.findById(postProps._id)
            .then(post => {
                post.title = postProps.title;
                post.data = postProps.data;

                post.save()
                    .then(post => res.send(post))
                    .catch(next);
            })
            .catch(next);
    },
    getById(req, res, next){
        if(isNaN(req.params.id)) return res.status(404).send({error: 'Invalid post id'});
        Post.findOne({id: req.params.id})
            .then(post => {
                if(!post){
                    res.status(404).send({error: `There is no post with id ${req.params.id}`})
                }
                res.send(post);
            })
            .catch(next);
    },
    delete(req, res, next){
        Post.findById(req.params.id)
            .then(postToRemove => {
                postToRemove.remove()
                    .then(() => {
                        PostType.update({type: postToRemove.type}, {$pull: {posts: postToRemove._id}})
                                .then(() => res.status(200).send("Post removed successfully"))
                    })
                    .catch(next);
            })
            .catch(next);
    }
};