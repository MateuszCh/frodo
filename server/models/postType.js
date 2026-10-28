const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    PostTypeAbstractSchema = require('./abstract-schemas/postTypeAbstractSchema'),
    Post = require('./post'),
    format = require('./tools/format'),
    timestamps = require('./tools/timestamps'),
    exportable = require('./tools/exportable'),
    extend = require('mongoose-extend-schema');

const PostTypeSchema = extend(
    PostTypeAbstractSchema,
    {
        pluralTitle: {
            type: String,
            required: [true, 'plural title of post type is required'],
        },
        posts: [
            {
                type: Schema.Types.ObjectId,
                ref: 'post',
            },
        ],
    },
    {
        toJSON: {
            virtuals: true,
        },
    },
);

PostTypeSchema.virtual('url').get(function () {
    return `/post-types/edit/${this.id}`;
});

PostTypeSchema.pre('remove', function (next) {
    const Post = mongoose.model('post');
    Post.remove({ _id: { $in: this.posts } }).then(() => next());
});

PostTypeSchema.pre('save', function (next) {
    let PostType = this;
    format.formatFieldsIds(PostType.fields);
    next();
});

PostTypeSchema.post('save', function (postType, next) {
    Post.update(
        { _id: { $in: postType.posts } },
        { $set: { type: postType.type } },
        { multi: true },
    )
        .then(() => next())
        .catch(next);
});

PostTypeSchema.plugin(timestamps);
// `posts` holds the _ids of this database: an import of the posts links them anew
PostTypeSchema.plugin(exportable, { omit: ['posts'] });

const PostType = mongoose.model('post_type', PostTypeSchema);

module.exports = PostType;
