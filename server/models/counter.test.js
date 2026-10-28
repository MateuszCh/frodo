const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Counter = require('./counter');

describe('Counter.reserve', () => {
    it('takes the ids with one atomic $inc and resolves to the first of them', async (t) => {
        const findOneAndUpdate = t.mock.method(Counter, 'findOneAndUpdate', async () => ({
            counter: 100,
        }));

        assert.equal(await Counter.reserve(3), 100);
        assert.deepEqual(findOneAndUpdate.mock.calls[0].arguments, [{}, { $inc: { counter: 3 } }]);
    });

    it('takes one id by default', async (t) => {
        const findOneAndUpdate = t.mock.method(Counter, 'findOneAndUpdate', async () => ({
            counter: 7,
        }));

        assert.equal(await Counter.reserve(), 7);
        assert.deepEqual(findOneAndUpdate.mock.calls[0].arguments[1], { $inc: { counter: 1 } });
    });
});
