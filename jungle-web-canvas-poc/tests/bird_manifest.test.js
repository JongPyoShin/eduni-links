import test from "node:test";
import assert from "node:assert/strict";
import { BIRD_MANIFEST, BIRD_IDS, getBirdData } from "../src/content/bird_manifest.js";

test("birdManifest contains all three birds", () => {
  assert.deepEqual(BIRD_IDS, ["bluebird", "kingfisher", "skyHawk"]);
});

test("birdManifest entries have required fields", () => {
  for (const id of BIRD_IDS) {
    const bird = getBirdData(id);
    assert.ok(bird, `getBirdData(${id}) returns truthy`);
    assert.equal(bird.id, id);
    assert.ok(typeof bird.name === "string" && bird.name.length > 0, `bird.name is non-empty`);
    assert.ok(typeof bird.stageId === "string" && bird.stageId.length > 0, `bird.stageId is non-empty`);
    assert.ok(typeof bird.habitat === "string" && bird.habitat.length > 0, `bird.habitat is non-empty`);
    assert.ok(typeof bird.description === "string" && bird.description.length > 0, `bird.description is non-empty`);
  }
});

test("getBirdData returns null for unknown id", () => {
  assert.equal(getBirdData("unknown"), null);
  assert.equal(getBirdData(""), null);
  assert.equal(getBirdData(null), null);
});

test("bird stageId maps to valid stage", () => {
  const validStages = new Set(["camp", "waterfall", "cave", "giantTree", "skyRidge"]);
  for (const id of BIRD_IDS) {
    const bird = getBirdData(id);
    assert.ok(validStages.has(bird.stageId), `bird ${id} stageId '${bird.stageId}' is valid`);
  }
});

test("birdManifest objects are frozen", () => {
  assert.equal(Object.isFrozen(BIRD_MANIFEST), true);
  assert.equal(Object.isFrozen(BIRD_IDS), true);
  for (const id of BIRD_IDS) {
    const bird = getBirdData(id);
    assert.equal(Object.isFrozen(bird), true);
  }
});
