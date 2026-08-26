import test from "node:test";
import assert from "node:assert/strict";
import { speedRatio, MovementController } from "../src/movement.js";
import { MOVEMENT } from "../src/constants.js";

test("acceleration ramp matches contract values", () => {
  assert.equal(speedRatio(0), MOVEMENT.PRECISION_RATIO);
  assert.equal(speedRatio(100), MOVEMENT.PRECISION_RATIO);
  const mid = speedRatio(300);
  assert.ok(Math.abs(mid - 0.6) < 1e-9, `expected ~0.6 got ${mid}`);
  assert.equal(speedRatio(500), MOVEMENT.CRUISE_RATIO);
  assert.equal(speedRatio(2000), MOVEMENT.CRUISE_RATIO);
});

test("cruise speed = SPEED_MAX * CRUISE_RATIO", () => {
  const mc = new MovementController();
  for (let i = 0; i < 40; i++) mc.update(16.7, { x: 1, y: 0 });
  assert.ok(Math.abs(mc.vx - MOVEMENT.SPEED_MAX * MOVEMENT.CRUISE_RATIO) < 1e-6);
});

test("release produces immediate zero", () => {
  const mc = new MovementController();
  mc.update(16.7, { x: 1, y: 0 });
  const d = mc.update(16.7, { x: 0, y: 0 });
  assert.equal(d.x, 0);
  assert.equal(d.y, 0);
  assert.equal(mc.vx, 0);
  assert.equal(mc.vy, 0);
  assert.equal(mc.heldMs, 0);
});

test("reversal resets ramp (ratio drops back toward precision)", () => {
  const mc = new MovementController();
  for (let i = 0; i < 20; i++) mc.update(16.7, { x: 1, y: 0 });
  const before = mc.ratio;
  mc.update(16.7, { x: -1, y: 0 });
  assert.ok(mc.ratio < before, `ratio should drop after reversal (${before} -> ${mc.ratio})`);
  assert.ok(Math.abs(mc.ratio - MOVEMENT.PRECISION_RATIO) < 0.05);
  assert.equal(mc.vx < 0, true);
});

test("continuing same direction keeps ramp accumulating", () => {
  const mc = new MovementController();
  mc.update(16.7, { x: 1, y: 0 });
  const r1 = mc.ratio;
  mc.update(16.7, { x: 1, y: 0 });
  assert.ok(mc.ratio >= r1);
});
