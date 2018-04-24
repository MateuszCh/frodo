const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      PostTypeAbstractSchema = require('./abstract-schemas/postTypeAbstractSchema'),
      Post = require('./post'),
      format = require('./tools/format'),
      extend = require('mongoose-extend-schema');

const PostTypeSchema = extend(PostTypeAbstractSchema, {
    pluralTitle: {
        type: String,
        required: [true, 'plural title of post type is required']
    },
    posts : [{
        type: Schema.Types.ObjectId,
        ref: 'post'
    }]
},
{
    toJSON: {
        virtuals: true
    }
});

PostTypeSchema.virtual('url')
    .get(function(){
        return `/post-types/edit/${this.id}`;
    });

PostTypeSchema.pre('remove', function(next){
    const Post = mongoose.model('post');
    Post.remove({_id: {$in: this.posts}})
        .then(() => next());
});

PostTypeSchema.virtual('created')
    .get(function(){
        return new Date(parseInt(this._id.toString().substring(0,8), 16) * 1000);
    });

PostTypeSchema.pre('save', function(next){
    let PostType = this;
    format.formatFieldsIds(PostType.fields);
    next();
});

PostTypeSchema.post('save', function(postType, next){
    Post.update({_id: {$in: postType.posts}}, {$set: {type: postType.type}}, {"multi": true})
        .then(() => next())
        .catch(next);
});

const PostType = mongoose.model('post_type', PostTypeSchema);

module.exports = PostType;