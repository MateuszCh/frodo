module.exports = {
    validateRepeater: function validate(fields, prop) {
        return fields.some((field) => {
            if (!field[prop]) {
                return true;
            }
            if (field.repeaterFields && field.repeaterFields.length) {
                return validate(field.repeaterFields, prop);
            }
            return false;
        });
    },
    /** Whether a "post" field, here or in repeater rows at any depth, has no post type. */
    validatePostTypes: function validate(fields) {
        return (fields || []).some(
            (field) => (field.type === 'post' && !field.postType) || validate(field.repeaterFields),
        );
    },
    validateRepeaterIds: function validate(fields) {
        if (!(fields || fields.length)) {
            return false;
        }

        const ids = [];
        const repeaterFields = [];
        fields.forEach((field) => {
            ids.push(field.id);
            repeaterFields.push(field.repeaterFields);
        });

        if (new Set(ids).size !== ids.length) {
            return true;
        }

        if (repeaterFields && repeaterFields.length) {
            return repeaterFields.some((fields) => {
                return validate(fields);
            });
        }
        return false;
    },
    validateFieldsIds(fields) {
        if (!(fields || fields.length)) {
            return true;
        }

        const ids = [];
        fields.forEach((field) => {
            ids.push(field.id);
        });
        return new Set(ids).size === ids.length;
    },
};
