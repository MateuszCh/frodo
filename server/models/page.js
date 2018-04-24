const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const PageSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title of page is required']
    },
    pageUrl: {
        type: String,
        required: [true, 'Url of page is required'],
        index: true
    },
    rows: {
        type: [{}]
    },
    id: {
        type: Number
    }
},{
    toJSON: {
        virtuals: true
    }
});

PageSchema.virtual('url')
    .get(function(){
        return `/pages/edit/${this.id}`;
    });

PageSchema.virtual('created')
    .get(function(){
        return new Date(parseInt(this._id.toString().substring(0,8), 16) * 1000);
    });

const Page = mongoose.model('page', PageSchema);

module.exports = Page;