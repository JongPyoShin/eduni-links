import test from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_STORAGE_KEY,
  createEmptyCodex,
  loadBirdCodex,
  saveBirdCodex,
  hasCapturedBird,
  birdCodexEntry,
  capturedBirdCount,
  captureBird,
} from "../src/content/bird_codex.js";

function mockStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    _raw(key) { return store.get(key); },
  };
}

test("createEmptyCodex returns frozen empty codex", () => {
  const codex = createEmptyCodex();
  assert.deepEqual(codex.captured, {});
  assert.equal(Object.isFrozen(codex), true);
  assert.equal(Object.isFrozen(codex.captured), true);
});

test("loadBirdCodex returns empty codex when storage is null or missing getItem", () => {
  assert.deepEqual(loadBirdCodex(null), createEmptyCodex());
  assert.deepEqual(loadBirdCodex({}), createEmptyCodex());
  assert.deepEqual(loadBirdCodex({ getItem: null }), createEmptyCodex());
});

test("loadBirdCodex returns empty codex on corrupt JSON", () => {
  const storage = { getItem: () => "NOT_JSON", setItem: () => {} };
  assert.deepEqual(loadBirdCodex(storage), createEmptyCodex());
});

test("loadBirdCodex returns empty codex on non-object JSON", () => {
  const storage = { getItem: () => '"just a string"', setItem: () => {} };
  assert.deepEqual(loadBirdCodex(storage), createEmptyCodex());
});

test("loadBirdCodex returns empty codex when captured field is missing", () => {
  const storage = { getItem: () => '{"foo":1}', setItem: () => {} };
  assert.deepEqual(loadBirdCodex(storage), createEmptyCodex());
});

test("saveBirdCodex writes JSON to storage", () => {
  const storage = mockStorage();
  const codex = createEmptyCodex();
  assert.equal(saveBirdCodex(codex, storage), true);
  const parsed = JSON.parse(storage._raw(CODEX_STORAGE_KEY));
  assert.deepEqual(parsed.captured, {});
});

test("saveBirdCodex returns false when storage is missing", () => {
  assert.equal(saveBirdCodex(createEmptyCodex(), null), false);
  assert.equal(saveBirdCodex(createEmptyCodex(), { setItem: null }), false);
});

test("hasCapturedBird returns false for empty codex", () => {
  const codex = createEmptyCodex();
  assert.equal(hasCapturedBird(codex, "bluebird"), false);
});

test("hasCapturedBird returns true after capture", () => {
  let codex = createEmptyCodex();
  codex = captureBird(codex, "bluebird", 2);
  assert.equal(hasCapturedBird(codex, "bluebird"), true);
  assert.equal(hasCapturedBird(codex, "kingfisher"), false);
});

test("birdCodexEntry returns null for uncaptured bird", () => {
  assert.equal(birdCodexEntry(createEmptyCodex(), "bluebird"), null);
});

test("birdCodexEntry returns entry after capture", () => {
  let codex = createEmptyCodex();
  codex = captureBird(codex, "bluebird", 3);
  const entry = birdCodexEntry(codex, "bluebird");
  assert.equal(entry.captured, true);
  assert.equal(entry.bestScore, 3);
  assert.equal(entry.attempts, 1);
  assert.ok(typeof entry.capturedAt === "string" && entry.capturedAt.length > 0);
});

test("captureBird increments attempts on re-capture", () => {
  let codex = createEmptyCodex();
  codex = captureBird(codex, "bluebird", 2);
  codex = captureBird(codex, "bluebird", 3);
  const entry = birdCodexEntry(codex, "bluebird");
  assert.equal(entry.bestScore, 3);
  assert.equal(entry.attempts, 2);
});

test("captureBird preserves existing capturedAt on re-capture", () => {
  let codex = createEmptyCodex();
  codex = captureBird(codex, "bluebird", 1);
  const first = birdCodexEntry(codex, "bluebird");
  codex = captureBird(codex, "bluebird", 2);
  const second = birdCodexEntry(codex, "bluebird");
  assert.equal(second.capturedAt, first.capturedAt);
});

test("capturedBirdCount counts only captured birds", () => {
  let codex = createEmptyCodex();
  assert.equal(capturedBirdCount(codex), 0);
  codex = captureBird(codex, "bluebird", 3);
  assert.equal(capturedBirdCount(codex), 1);
  codex = captureBird(codex, "kingfisher", 2);
  assert.equal(capturedBirdCount(codex), 2);
  codex = captureBird(codex, "skyHawk", 3);
  assert.equal(capturedBirdCount(codex), 3);
});

test("capturedBirdCount returns 0 for null input", () => {
  assert.equal(capturedBirdCount(null), 0);
  assert.equal(capturedBirdCount(undefined), 0);
});

test("round-trip through localStorage", () => {
  const storage = mockStorage();
  let codex = loadBirdCodex(storage);
  assert.equal(hasCapturedBird(codex, "bluebird"), false);
  codex = captureBird(codex, "bluebird", 2);
  saveBirdCodex(codex, storage);
  const reloaded = loadBirdCodex(storage);
  assert.equal(hasCapturedBird(reloaded, "bluebird"), true);
  const entry = birdCodexEntry(reloaded, "bluebird");
  assert.equal(entry.bestScore, 2);
  assert.equal(entry.attempts, 1);
  assert.equal(capturedBirdCount(reloaded), 1);
});

test("codex objects are frozen", () => {
  const codex = captureBird(createEmptyCodex(), "bluebird", 2);
  assert.equal(Object.isFrozen(codex), true);
  assert.equal(Object.isFrozen(codex.captured), true);
  assert.equal(Object.isFrozen(codex.captured.bluebird), true);
});
