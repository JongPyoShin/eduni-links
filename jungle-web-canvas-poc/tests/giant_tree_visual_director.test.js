import test from "node:test";
import assert from "node:assert/strict";
import { GIANT_TREE_VISUALS } from "../src/content/giant_tree_visuals.js";
import { giantTreeVisualPhase, stageVisualPhase } from "../src/content/stage_visual_director.js";

function tree(overrides = {}) {
  return {
    rootGateComplete: false,
    discoveredClues: [],
    treeRingRound: 0,
    treeRingComplete: false,
    canopyStairsComplete: false,
    squirrelComplete: false,
    rewardComplete: false,
    ...overrides,
  };
}

test("Giant Tree visual director follows the authored stage arc", () => {
  assert.equal(giantTreeVisualPhase(tree()).phaseId, "rootGate");
  assert.equal(giantTreeVisualPhase(tree({ rootGateComplete: true })).phaseId, "barkPattern");
  assert.equal(giantTreeVisualPhase(tree({ discoveredClues: ["barkPattern"] })).phaseId, "seedTrail");
  assert.equal(giantTreeVisualPhase(tree({ discoveredClues: ["barkPattern", "seedTrail"] })).phaseId, "hollowEcho");
  assert.equal(giantTreeVisualPhase(tree({ discoveredClues: ["barkPattern", "seedTrail", "hollowEcho"] })).phaseId, "treeRing");
  assert.equal(giantTreeVisualPhase(tree({ treeRingComplete: true })).phaseId, "canopyStairs");
  assert.equal(giantTreeVisualPhase(tree({ canopyStairsComplete: true })).phaseId, "squirrel");
  assert.equal(giantTreeVisualPhase(tree({ squirrelComplete: true })).phaseId, "reward");
  assert.equal(giantTreeVisualPhase(tree({ rewardComplete: true })).phaseId, "complete");
});

test("Every Giant Tree visual phase provides renderer metadata", () => {
  for (const phase of Object.values(GIANT_TREE_VISUALS)) {
    assert.equal(typeof phase.palette, "string");
    assert.equal(typeof phase.fog, "number");
    assert.equal(typeof phase.warmth, "number");
    assert.equal(typeof phase.density, "number");
    assert.equal(typeof phase.cue, "string");
    assert.equal(typeof phase.ambience, "string");
    assert.equal(typeof phase.landmark, "string");
  }
});

test("Giant Tree phase results are cached and generic dispatch supports the stage", () => {
  const state = tree({ rootGateComplete: true });
  assert.strictEqual(giantTreeVisualPhase(state), giantTreeVisualPhase(state));
  assert.equal(stageVisualPhase("giantTree", tree()).phaseId, "rootGate");
});
