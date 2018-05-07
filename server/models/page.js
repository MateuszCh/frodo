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
    created: {
        type: Number
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

const Page = mongoose.model('page', PageSchema);

module.exports = Page;