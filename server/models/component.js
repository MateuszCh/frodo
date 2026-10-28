const mongoose = require('mongoose'),
    PostTypeAbstractSchema = require('./abstract-schemas/postTypeAbstractSchema'),
    format = require('./tools/format'),
    timestamps = require('./tools/timestamps'),
    exportable = require('./tools/exportable'),
    extend = require('mongoose-extend-schema');

const ComponentSchema = extend(
    PostTypeAbstractSchema,
    {},
    {
        toJSON: {
            virtuals: true,
        },
    },
);

ComponentSchema.virtual('url').get(function () {
    return `/components/edit/${this.id}`;
});

ComponentSchema.pre('save', function (next) {
    let PostType = this;
    format.formatFieldsIds(PostType.fields);
    next();
});

ComponentSchema.plugin(timestamps);
ComponentSchema.plugin(exportable);

const Component = mongoose.model('component', ComponentSchema);

module.exports = Component;
