const mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      fieldValidation = require('./validation/fieldValidation');

const FieldSchema = new Schema ({
    title: {
        type: String,
        required: [true, 'title of field is required']
    },
    type: {
        type: String,
        required: [true, 'type of field is required']
    },
    id: {
        type: String,
        required: [true, 'id of field is required']
    },
    selectOptions: {
        type: String
    },
    multiselectOptions: {
        type: String
    },
    repeaterFields: {
        type: [this],
        validate: [
            {
                validator: (repeaterFields) => !fieldValidation.validateRepeater(repeaterFields, 'title'),
                message: "title of field is required"
            },
            {
                validator: (repeaterFields) => !fieldValidation.validateRepeater(repeaterFields, 'type'),
                message: "type of field is required"
            },
            {
                validator: (repeaterFields) => !fieldValidation.validateRepeater(repeaterFields, 'id'),
                message: "id of field is required"
            },
            {
                validator: (repeaterFields) => !fieldValidation.validateRepeaterIds(repeaterFields),
                message: "Each field in the same level should have a different id"
            }
        ]
    }
}, {
    toJSON: {
        virtuals: true
    }
});


FieldSchema.virtual('options')
    .get(function(){
        if(!this.selectOptions){
            return null;
        }
        let selectOptions = this.selectOptions.replace(/\s*;\s*/g, ";").split(";");
        let options = [];
        selectOptions.forEach((option) => {
            if(option) options.push(option.replace(/;/g, ""));
        });

        return Array.from((new Set(options)).values());
    });

FieldSchema.virtual('multiOptions')
    .get(function(){
        if(!this.multiselectOptions){
            return null;
        }
        let multiselectOptions = this.multiselectOptions.replace(/\s*;\s*/g, ";").split(";");
        let options = [];
        multiselectOptions.forEach((option) => {
            if(option) options.push(option.replace(/;/g, ""));
        });

        return Array.from((new Set(options)).values());
    });

module.exports = FieldSchema;