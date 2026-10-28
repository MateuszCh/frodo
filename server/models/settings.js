const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    FieldSchema = require('./field'),
    fieldValidation = require('./validation/fieldValidation'),
    format = require('./tools/format'),
    exportable = require('./tools/exportable');

// Site-wide configuration of the CMS, kept in one document.
const SETTINGS_ID = 'settings';

// A kind of page. A page stores the key (`type`) and fills in the fields of its type.
const PageTypeSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Title of page type is required'],
        },
        type: {
            type: String,
            required: [true, 'Key of page type is required'],
        },
        fields: {
            type: [FieldSchema],
            validate: {
                validator: (fields) => fieldValidation.validateFieldsIds(fields),
                message: 'Each field should have a different id',
            },
        },
    },
    {
        _id: false,
        id: false,
    },
);

const SettingsSchema = new Schema(
    {
        _id: {
            type: String,
        },
        pageTypes: {
            type: [PageTypeSchema],
            validate: {
                validator: (pageTypes) =>
                    new Set(pageTypes.map((pageType) => pageType.type)).size === pageTypes.length,
                message: 'Each page type should have a different key',
            },
        },
    },
    {
        toJSON: {
            virtuals: true,
        },
    },
);

SettingsSchema.pre('save', function (next) {
    this.pageTypes.forEach((pageType) => format.formatFieldsIds(pageType.fields));
    next();
});

// for its export only: the editor imports page types into its form, and the save checks them
SettingsSchema.plugin(exportable);

/** The settings document; an unsaved one with no page types before the first save. */
SettingsSchema.statics.findSettings = function () {
    return this.findById(SETTINGS_ID).then((settings) => settings || new this({ _id: SETTINGS_ID }));
};

const Settings = mongoose.model('setting', SettingsSchema);

module.exports = Settings;
