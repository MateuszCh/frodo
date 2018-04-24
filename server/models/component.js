const mongoose = require('mongoose'),
      PostTypeAbstractSchema = require('./abstract-schemas/postTypeAbstractSchema'),
      format = require('./tools/format'),
      extend = require('mongoose-extend-schema');

const ComponentSchema = extend(PostTypeAbstractSchema, {}, {
    toJSON: {
        virtuals: true
    }
});

ComponentSchema.virtual('url')
    .get(function(){
        return `/components/edit/${this.id}`;
    });

ComponentSchema.virtual('created')
    .get(function(){
        return new Date(parseInt(this._id.toString().substring(0,8), 16) * 1000);
    });

ComponentSchema.pre('save', function(next){
    let PostType = this;
    format.formatFieldsIds(PostType.fields);
    next();
});

const Component = mongoose.model('component', ComponentSchema);

module.exports = Component;