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

const Counter = mongoose.model('counter', CounterSchema);

module.exports = Counter;
