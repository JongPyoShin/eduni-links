import test from "node:test";
import assert from "node:assert/strict";
import { isInRange, canInteract } from "../src/bluebird.js";
import { BLUEBIRD } from "../src/constants.js";

test("bluebird interaction range inside/outside", () => {
  const bird = { x: 1300, y: 420 };
  assert.equal(isInRange(1300, 420, bird), true);
  assert.equal(isInRange(1300 + BLUEBIRD.INTERACT_RADIUS - 1, 420, bird), true);
  assert.equal(isInRange(1300 + BLUEBIRD.INTERACT_RADIUS + 1, 420, bird), false);
});

test("canInteract blocked while modal open", () => {
  const bird = { x: 1300, y: 420 };
  assert.equal(canInteract(1300, 420, bird, false), true);
  assert.equal(canInteract(1300, 420, bird, true), false);
  assert.equal(canInteract(200, 200, bird, false), false);
});
