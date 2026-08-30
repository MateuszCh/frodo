const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    timestamps = require('./tools/timestamps');

const PageSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Title of page is required'],
        },
        pageUrl: {
            type: String,
            required: [true, 'Url of page is required'],
            index: true,
        },
        seoTitle: {
            type: String,
        },
        seoDescription: {
            type: String,
        },
        rows: {
            type: [{}],
        },
        id: {
            type: Number,
        },
    },
    {
        toJSON: {
            virtuals: true,
        },
    },
);

PageSchema.virtual('url').get(function () {
    return `/pages/edit/${this.id}`;
});

PageSchema.plugin(timestamps);

const Page = mongoose.model('page', PageSchema);

module.exports = Page;
