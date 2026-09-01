import test from "node:test";
import assert from "node:assert/strict";
import { SkyRidgeWorldGeometry } from "../src/geometry.js";
import {
  SKY_RIDGE_CLUES,
  collectSkyRidgeClue,
  addSkyRidgeQuizAnswer,
  completeSkyGate,
  completeSkyHawk,
  completeSkyRidgeReward,
  completeSummitBridge,
  createSkyRidgeState,
  skyRidgeObjective,
} from "../src/content/sky_ridge_chapter.js";
import { SKY_RIDGE_ITEMS, skyRidgeInteractables, nearestSkyRidgeInteractable } from "../src/content/sky_ridge_interactables.js";
import { getSkyRidgeVisualPhase } from "../src/content/sky_ridge_visuals.js";
import { stageReward } from "../src/content/stage_rewards.js";

function collectAllClues(state) {
  for (const clue of SKY_RIDGE_CLUES) state = collectSkyRidgeClue(state, clue.id);
  return state;
}

function answerAllQuizzes(state, correct) {
  for (let i = 0; i < SKY_RIDGE_CLUES.length; i++) state = addSkyRidgeQuizAnswer(state, correct);
  return state;
}

test("Sky Ridge progression is strictly sequential from gate to reward", () => {
  let state = createSkyRidgeState();
  assert.equal(skyRidgeInteractables(state)[0].id, "skyGate");
  state = completeSkyGate(state);
  assert.equal(skyRidgeInteractables(state).find(i => i.id !== "windFeather")?.id, "windRibbon");
  state = collectSkyRidgeClue(state, "windRibbon");
  assert.equal(skyRidgeInteractables(state).find(i => i.id !== "windFeather")?.id, "cloudShadow");
  state = collectSkyRidgeClue(state, "cloudShadow");
  assert.equal(skyRidgeInteractables(state).find(i => i.id !== "windFeather")?.id, "windChime");
  state = collectSkyRidgeClue(state, "windChime");
  state = answerAllQuizzes(state, true);
  assert.equal(state.adventure.clueQuizzesComplete, true);
  assert.equal(skyRidgeInteractables(state)[0].id, "summitBridge");
  state = completeSummitBridge(state);
  assert.equal(skyRidgeInteractables(state)[0].id, "hawk");
  state = completeSkyHawk(state);
  assert.equal(skyRidgeInteractables(state)[0].id, "reward");
  state = completeSkyRidgeReward(state);
  assert.equal(skyRidgeObjective(state), "탐험 완료!");
  assert.deepEqual(skyRidgeInteractables(state), []);
});

test("Sky Ridge interactables stay on shared visible walkable geometry", () => {
  const geometry = new SkyRidgeWorldGeometry();
  for (const item of Object.values(SKY_RIDGE_ITEMS)) {
    assert.equal(geometry.isWalkable(item.x, item.y), true, `${item.id} must remain on SkyRidgeWorldGeometry`);
  }
  assert.deepEqual(geometry.paths[0][0], { x: 200, y: 1040 });
  assert.deepEqual(geometry.paths[0].at(-1), { x: 1450, y: 310 });
});

test("Sky Ridge interaction radius, visuals, and final badge are defined", () => {
  const state = createSkyRidgeState();
  assert.equal(nearestSkyRidgeInteractable({ x: 430, y: 930 }, state)?.id, "skyGate");
  assert.equal(nearestSkyRidgeInteractable({ x: 200, y: 1040 }, state), null);
  for (const phaseId of ["skyGate", "windRibbon", "cloudShadow", "windChime", "summitBridge", "hawk", "reward", "complete"]) {
    assert.ok(getSkyRidgeVisualPhase(phaseId), `visual phase ${phaseId} must exist`);
  }
  assert.equal(stageReward("skyRidge").name, "하늘별 배지");
  assert.equal(stageReward("skyRidge").icon, "⭐");
});
