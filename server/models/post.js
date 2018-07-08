const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const PostSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Title of post is required"]
        },
        type: {
            type: String,
            required: [true, "Type of post is required"]
        },
        data: {
            type: Object
        },
        created: {
            type: Number
        },
        id: {
            type: Number
        }
    },
    {
        toJSON: {
            virtuals: true
        }
    }
);

PostSchema.virtual("url").get(function() {
    return `/posts/${this.type}/edit/${this.id}`;
});

const Post = mongoose.model("post", PostSchema);

module.exports = Post;
