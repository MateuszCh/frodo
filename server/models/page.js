const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    timestamps = require('./tools/timestamps'),
    exportable = require('./tools/exportable');

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
        // key of a page type from the settings
        type: {
            type: String,
        },
        // values of the fields of the page type
        typeData: {
            type: Object,
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
PageSchema.plugin(exportable);

const Page = mongoose.model('page', PageSchema);

module.exports = Page;
