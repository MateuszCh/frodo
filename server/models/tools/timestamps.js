/**
 * Adds `created` / `updated` millisecond timestamps.
 * On creation both hold the same value; every later save bumps `updated`.
 */
module.exports = function timestamps(schema) {
    schema.add({
        created: {
            type: Number,
        },
        updated: {
            type: Number,
        },
    });

    schema.pre('save', function (next) {
        const now = Date.now();
        if (!this.created) {
            this.created = now;
        }
        this.updated = now;
        next();
    });
};
