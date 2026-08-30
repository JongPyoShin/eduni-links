import test from "node:test";
import assert from "node:assert/strict";
import { GiantTreeWorldGeometry } from "../src/geometry.js";
import {
  TREE_RING_ROUNDS,
  answerTreeRingRound,
  collectGiantTreeClue,
  completeCanopyStairs,
  completeGiantTreeReward,
  completeRootGate,
  completeSquirrel,
  createGiantTreeState,
  giantTreeObjective,
} from "../src/content/giant_tree_chapter.js";
import { GIANT_TREE_ITEMS, giantTreeInteractables } from "../src/content/giant_tree_interactables.js";
import { stageReward } from "../src/content/stage_rewards.js";

test("Giant Tree progression is sequential from root gate to seed badge", () => {
  let state = createGiantTreeState();
  assert.equal(giantTreeInteractables(state)[0].id, "rootGate");
  state = completeRootGate(state);
  for (const clueId of ["barkPattern", "seedTrail", "hollowEcho"]) {
    assert.equal(giantTreeInteractables(state)[0].id, clueId);
    state = collectGiantTreeClue(state, clueId);
  }
  assert.equal(giantTreeInteractables(state)[0].id, "treeRing");
  for (const round of TREE_RING_ROUNDS) state = answerTreeRingRound(state, round.correct).state;
  assert.equal(state.treeRingComplete, true);
  state = completeCanopyStairs(state);
  assert.equal(giantTreeInteractables(state)[0].id, "squirrel");
  state = completeSquirrel(state);
  assert.equal(giantTreeInteractables(state)[0].id, "reward");
  state = completeGiantTreeReward(state);
  assert.equal(giantTreeObjective(state), "탐험 완료!");
  assert.deepEqual(giantTreeInteractables(state), []);
});

test("Wrong tree-ring answers stay on the same round", () => {
  let state = completeRootGate(createGiantTreeState());
  for (const clueId of ["barkPattern", "seedTrail", "hollowEcho"]) state = collectGiantTreeClue(state, clueId);
  const result = answerTreeRingRound(state, "999");
  assert.equal(result.correct, false);
  assert.equal(result.state.treeRingRound, 0);
  assert.equal(result.state.treeRingComplete, false);
});

test("Giant Tree interactables remain on shared visible walkable geometry", () => {
  const geometry = new GiantTreeWorldGeometry();
  for (const item of Object.values(GIANT_TREE_ITEMS)) {
    assert.equal(geometry.isWalkable(item.x, item.y), true, `${item.id} must stay on GiantTreeWorldGeometry`);
  }
  assert.deepEqual(geometry.paths[0][0], { x: 200, y: 1040 });
  assert.deepEqual(geometry.paths[0].at(-1), { x: 1440, y: 320 });
});

test("Giant Tree reward is the authored seed badge", () => {
  const reward = stageReward("giantTree");
  assert.equal(reward.name, "고목 씨앗 배지");
  assert.equal(reward.icon, "🌰");
  assert.match(reward.message, /고목 씨앗 배지/);
});
