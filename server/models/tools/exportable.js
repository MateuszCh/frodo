const Counter = require('../counter');

/**
 * Export and import of a model: an export holds every stored value of a document but the ones
 * it should not – MongoDB's own `_id` and `__v`, of subdocuments too, and the `omit`ted fields –
 * so a field added to the schema is exported without a change here.
 */
module.exports = function exportable(schema, { omit = [] } = {}) {
    const notExported = ['_id', '__v', ...omit];

    schema.methods.toExport = function () {
        // the transform runs for every subdocument too; values of a Mixed field stay as they are
        const values = this.toObject({
            transform: (doc, ret) => {
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        });
        omit.forEach((field) => delete values[field]);
        return values;
    };

    /**
     * The values of an export a new document takes: all but `id`, which comes from the counter,
     * and `updated`, which the timestamps plugin sets on save, as it sets `created` when the
     * export has none.
     */
    schema.statics.fromExport = function (values) {
        const model = { ...values };
        [...notExported, 'id', 'updated'].forEach((field) => delete model[field]);
        return model;
    };

    /**
     * Saves the documents of an import, with `overrides` and new ids. All are validated before any
     * is saved – Model.create would save the valid ones and fail on the rest – and only then take
     * their ids. Resolves to the documents, rejects with the first validation error.
     */
    schema.statics.saveImport = function (values, overrides = {}) {
        const models = values.map((value) => ({ ...this.fromExport(value), ...overrides }));
        const invalid = models.map((model) => new this(model).validateSync()).find(Boolean);
        if (invalid) {
            return Promise.reject(invalid);
        }
        return Counter.reserve(models.length).then((firstId) =>
            this.create(models.map((model, i) => ({ ...model, id: firstId + i }))),
        );
    };
};
