const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      FieldSchema = require('./../field'),
      fieldValidation = require('./../validation/fieldValidation');

const PostTypeAbstractSchema = new Schema({
    title: {
        type: String,
        required: [true, 'title of post type is required']
    },
    type: {
        type: String,
        required: [true, 'type of post type is required'],
        index: true
    },
    fields : {
        type: [FieldSchema],
        validate: {
            validator: (fields) => fieldValidation.validateFieldsIds(fields),
            message: 'Each field should have a different id'
        }
    },
    created: {
        type: Number
    },
    id: Number
});

module.exports = PostTypeAbstractSchema;