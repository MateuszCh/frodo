const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const CounterSchema = new Schema({
    counter: Number,
});

/**
 * Takes `count` ids at once and resolves to the first of them. A single atomic $inc, so two
 * writes at the same time never get the same ids, as they could reading the counter first.
 */
CounterSchema.statics.reserve = function (count = 1) {
    return this.findOneAndUpdate({}, { $inc: { counter: count } }).then(
        (counter) => counter.counter,
    );
};

/**
 * Moves the counter past `id`, an id a document kept (an import), so no id it hands out later
 * is that one again. A counter already past it stays as it is.
 */
CounterSchema.statics.passId = function (id) {
    return this.updateOne({ counter: { $lte: id } }, { $set: { counter: id + 1 } });
};

const Counter = mongoose.model('counter', CounterSchema);

module.exports = Counter;
