import test from "node:test";
import assert from "node:assert/strict";
import { STAGES, getStageVisualPhase } from "../src/content/stage_manifest.js";
import { campVisualPhase, waterfallVisualPhase, stageVisualPhase } from "../src/content/stage_visual_director.js";

function camp(overrides = {}) {
  return {
    questStarted: false,
    discoveredClues: [],
    firePitRound: 0,
    firePitComplete: false,
    bluebirdComplete: false,
    ...overrides,
  };
}

function waterfall(overrides = {}) {
  return {
    streamGateComplete: false,
    steppingStonesComplete: false,
    discoveredClues: [],
    leafMatchRound: 0,
    leafMatchComplete: false,
    lookoutComplete: false,
    kingfisherComplete: false,
    rewardComplete: false,
    ...overrides,
  };
}

test("Camp visual director follows the authored story arc", () => {
  assert.equal(campVisualPhase(camp()).phaseId, "hut");
  assert.equal(campVisualPhase(camp({ questStarted: true })).phaseId, "feather");
  assert.equal(campVisualPhase(camp({ questStarted: true, discoveredClues: ["feather"] })).phaseId, "footprints");
  assert.equal(campVisualPhase(camp({ questStarted: true, discoveredClues: ["feather", "footprints"] })).phaseId, "birdcall");
  assert.equal(campVisualPhase(camp({ questStarted: true, discoveredClues: ["feather", "footprints", "birdcall"] })).phaseId, "firePit");
  assert.equal(campVisualPhase(camp({ firePitComplete: true }), { ridgeArrivalPlayed: false }).phaseId, "ridge");
  assert.equal(campVisualPhase(camp({ firePitComplete: true }), { ridgeArrivalPlayed: true }).phaseId, "bluebird");
  assert.equal(campVisualPhase(camp({ bluebirdComplete: true }), { ridgeArrivalPlayed: true }).phaseId, "reward");
});

test("Waterfall visual director follows the gameplay progression", () => {
  assert.equal(waterfallVisualPhase(waterfall()).phaseId, "streamGate");
  assert.equal(waterfallVisualPhase(waterfall({ streamGateComplete: true })).phaseId, "steppingStones");
  assert.equal(waterfallVisualPhase(waterfall({ streamGateComplete: true, steppingStonesComplete: true })).phaseId, "echo");
  assert.equal(waterfallVisualPhase(waterfall({ discoveredClues: ["echo"] })).phaseId, "mistTrail");
  assert.equal(waterfallVisualPhase(waterfall({ discoveredClues: ["echo", "mistTrail"] })).phaseId, "leafMatch");
  assert.equal(waterfallVisualPhase(waterfall({ leafMatchComplete: true })).phaseId, "lookout");
  assert.equal(waterfallVisualPhase(waterfall({ lookoutComplete: true })).phaseId, "kingfisher");
  assert.equal(waterfallVisualPhase(waterfall({ kingfisherComplete: true })).phaseId, "reward");
  assert.equal(waterfallVisualPhase(waterfall({ rewardComplete: true })).phaseId, "complete");
});

test("Every selected phase resolves to manifest visual metadata", () => {
  for (const [stageId, stage] of Object.entries(STAGES)) {
    assert.equal(stage.renderPolicy.walkableGeometry, "shared");
    assert.equal(stage.renderPolicy.collision, "unchanged");
    assert.ok(stage.gamePattern.length >= 8);
    for (const phaseId of Object.keys(stage.visualPhases)) {
      const visual = getStageVisualPhase(stageId, phaseId);
      assert.equal(typeof visual.palette, "string");
      assert.equal(typeof visual.fog, "number");
      assert.equal(typeof visual.warmth, "number");
      assert.equal(typeof visual.density, "number");
      assert.equal(typeof visual.cue, "string");
      assert.equal(typeof visual.ambience, "string");
      assert.equal(typeof visual.landmark, "string");
    }
  }
});

test("Resolved phase objects are cached instead of reallocated per render tick", () => {
  const state = camp({ questStarted: true });
  assert.strictEqual(campVisualPhase(state), campVisualPhase(state));
  const waterfallState = waterfall({ streamGateComplete: true });
  assert.strictEqual(waterfallVisualPhase(waterfallState), waterfallVisualPhase(waterfallState));
});

test("Generic stageVisualPhase dispatches and rejects unknown stages", () => {
  assert.equal(stageVisualPhase("camp", camp()).phaseId, "hut");
  assert.equal(stageVisualPhase("waterfall", waterfall()).phaseId, "streamGate");
  assert.throws(() => stageVisualPhase("cave", {}), /Unknown stage visual director/);
});
