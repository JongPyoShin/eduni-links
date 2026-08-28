import test from "node:test";
import assert from "node:assert/strict";
import {
  LEAF_MATCH_ROUNDS,
  answerLeafMatchRound,
  collectWaterfallClue,
  completeKingfisher,
  completeLookout,
  completeSteppingStones,
  completeStreamGate,
  completeWaterfallReward,
  createWaterfallState,
} from "../src/content/waterfall_chapter.js";
import { nearestWaterfallInteractable, waterfallInteractables } from "../src/content/waterfall_interactables.js";

function currentId(state) {
  return waterfallInteractables(state).map((item) => item.id);
}

function advanceToLeafMatch() {
  let state = createWaterfallState();
  state = completeStreamGate(state);
  state = completeSteppingStones(state);
  state = collectWaterfallClue(state, "echo");
  state = collectWaterfallClue(state, "mistTrail");
  return state;
}

test("Waterfall exposes exactly one authored interaction step at a time", () => {
  let state = createWaterfallState();
  assert.deepEqual(currentId(state), ["streamGate"]);
  state = completeStreamGate(state);
  assert.deepEqual(currentId(state), ["steppingStones"]);
  state = completeSteppingStones(state);
  assert.deepEqual(currentId(state), ["echo"]);
  state = collectWaterfallClue(state, "echo");
  assert.deepEqual(currentId(state), ["mistTrail"]);
  state = collectWaterfallClue(state, "mistTrail");
  assert.deepEqual(currentId(state), ["leafMatch"]);
  for (const round of LEAF_MATCH_ROUNDS) state = answerLeafMatchRound(state, round.correct).state;
  assert.deepEqual(currentId(state), ["lookout"]);
  state = completeLookout(state);
  assert.deepEqual(currentId(state), ["kingfisher"]);
  state = completeKingfisher(state);
  assert.deepEqual(currentId(state), ["reward"]);
  state = completeWaterfallReward(state);
  assert.deepEqual(currentId(state), []);
});

test("nearest Waterfall interaction respects its authored radius", () => {
  const state = createWaterfallState();
  assert.equal(nearestWaterfallInteractable({ x: 700, y: 900 }, state)?.id, "streamGate");
  assert.equal(nearestWaterfallInteractable({ x: 810, y: 900 }, state)?.id, "streamGate");
  assert.equal(nearestWaterfallInteractable({ x: 811, y: 900 }, state), null);
});

test("Leaf Match choices are child-facing Korean labels", () => {
  const state = advanceToLeafMatch();
  assert.deepEqual(currentId(state), ["leafMatch"]);
  for (const round of LEAF_MATCH_ROUNDS) {
    assert.ok(round.choices.every((choice) => /[가-힣]/.test(choice)), `raw choice id leaked: ${round.choices.join(", ")}`);
  }
});
