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
     *
     * With `keepIds` a document keeps the id of its export when no document of this model has
     * it (nor an earlier one of the import): values that point to it by id ("post" fields hold
     * post ids) still do after an import into another site. The counter moves past kept ids.
     */
    schema.statics.saveImport = function (values, overrides = {}, { keepIds = false } = {}) {
        const models = values.map((value) => ({ ...this.fromExport(value), ...overrides }));
        const invalid = models.map((model) => new this(model).validateSync()).find(Boolean);
        if (invalid) {
            return Promise.reject(invalid);
        }
        const wanted = values.map((value) =>
            keepIds && Number.isInteger(value.id) && value.id > 0 ? value.id : null,
        );
        const candidates = wanted.filter((id) => id !== null);
        const taken = candidates.length
            ? this.find({ id: { $in: candidates } }, 'id').then((docs) => docs.map((doc) => doc.id))
            : Promise.resolve([]);
        return taken.then((takenIds) => {
            const used = new Set(takenIds);
            const ids = wanted.map((id) => {
                if (id === null || used.has(id)) {
                    return null;
                }
                used.add(id);
                return id;
            });
            const kept = ids.filter((id) => id !== null);
            const missing = ids.length - kept.length;
            // past the kept ids first, so the new ids cannot be one of them
            return Promise.resolve(kept.length ? Counter.passId(Math.max(...kept)) : null)
                .then(() => (missing ? Counter.reserve(missing) : null))
                .then((firstId) => {
                    let next = firstId;
                    return this.create(
                        models.map((model, i) => ({ ...model, id: ids[i] !== null ? ids[i] : next++ })),
                    );
                });
        });
    };
};
