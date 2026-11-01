"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../portal_app/playfactory_static/engine.js");

function reveal(s, values) {
  return values.map(value => {
    const chip = s.chips.find(c => c.value === value && !c.up && c.owner === null);
    assert.ok(chip);
    assert.equal(E.tenFlip(s, chip.id), true);
    return chip.id;
  });
}

test("Ten-Twenty allows four chips for 4+6+0+0 and 9+7+2+2", () => {
  for (const [values, sum] of [[[4, 6, 0, 0], 10], [[9, 7, 2, 2], 20]]) {
    const s = E.newTen(E.rng(sum));
    const ids = reveal(s, values);
    assert.equal(E.tenRing(s, 0), true);
    ids.forEach(id => assert.equal(E.tenSelect(s, id), true));
    assert.equal(s.selected.length, 4);
    assert.equal(E.tenJudge(s), true);
    assert.equal(s.piles[0].length, 4);
    assert.ok(s.message.includes("= " + sum));
  }
});

test("Ten-Twenty rejects a fifth selected chip", () => {
  const s = E.newTen(E.rng(24));
  const ids = reveal(s, [1, 1, 1, 1, 1]);
  assert.equal(E.tenRing(s, 1), true);
  ids.slice(0, 4).forEach(id => assert.equal(E.tenSelect(s, id), true));
  assert.equal(E.tenSelect(s, ids[4]), false);
  assert.equal(s.selected.length, 4);
  assert.match(s.message, /최대 4개/);
});