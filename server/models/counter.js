const mongoose = require('mongoose'),
      Schema = mongoose.Schema;

const CounterSchema = new Schema ({
   counter: Number
});

const Counter = mongoose.model('counter', CounterSchema);

module.exports = Counter;