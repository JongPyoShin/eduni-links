import test from "node:test";
import assert from "node:assert/strict";
import { frameDelta, MAX_FRAME_MS, DEFAULT_FRAME_MS } from "../src/loop.js";

test("first frame (no prev timestamp) yields zero delta", () => {
  assert.equal(frameDelta(null, 100), 0);
  assert.equal(frameDelta(undefined, 50), 0);
});

test("same timestamp yields zero delta", () => {
  assert.equal(frameDelta(100, 100), 0);
});

test("normal delta passes through unchanged", () => {
  assert.equal(frameDelta(100, 133), 33);
  assert.ok(Math.abs(frameDelta(500, 516.7) - 16.7) < 1e-9);
});

test("pathological long gap is clamped to MAX_FRAME_MS", () => {
  assert.equal(frameDelta(100, 99999), MAX_FRAME_MS);
});

test("negative / invalid gap falls back to DEFAULT_FRAME_MS", () => {
  assert.equal(frameDelta(100, 90), DEFAULT_FRAME_MS);
});

test("missing current timestamp falls back to DEFAULT_FRAME_MS", () => {
  assert.equal(frameDelta(100, undefined), DEFAULT_FRAME_MS);
});
