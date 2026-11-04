const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {openDraft} = require('../src/watch');
const worker = code => () => {
  const child = new EventEmitter();
  setImmediate(() => child.emit('close', code));
  return child;
};
test('only a confirmed successful save completes the worker', async () => {
  await openDraft('unused.json', worker(0));
  await assert.rejects(openDraft('unused.json', worker(1)), /remains pending/);
  await assert.rejects(openDraft('unused.json', worker(null)), /remains pending/);
});
