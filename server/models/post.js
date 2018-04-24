const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const PostSchema = new Schema({
   title: {
       type: String,
       required: [true, 'Title of post is required']
   },
   type: {
       type: String,
       required: [true, 'Type of post is required']
   },
   data: {
       type: Object
   },
   id: {
       type: Number
   }
},{
    toJSON: {
        virtuals: true
    }
});

PostSchema.virtual('url')
    .get(function(){
        return `/posts/${this.type}/edit/${this.id}`;
    });

PostSchema.virtual('created')
    .get(function(){
       return new Date(parseInt(this._id.toString().substring(0,8), 16) * 1000);
    });

const Post = mongoose.model('post', PostSchema);

module.exports = Post;