import test from "node:test";
import assert from "node:assert/strict";
import {
  WATERFALL_CLUES,
  collectWaterfallClue,
  addWaterfallQuizAnswer,
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

test("Waterfall exposes exactly one authored interaction step at a time", () => {
  let state = createWaterfallState();
  assert.deepEqual(currentId(state), ["streamGate"]);
  state = completeStreamGate(state);
  assert.deepEqual(currentId(state), ["steppingStones"]);
  state = completeSteppingStones(state);
  assert.deepEqual(currentId(state).filter(id => id !== "wetFeather"), ["echo"]);
  state = collectWaterfallClue(state, "echo");
  assert.deepEqual(currentId(state).filter(id => id !== "wetFeather"), ["mistTrail"]);
  state = collectWaterfallClue(state, "mistTrail");
  assert.deepEqual(currentId(state).filter(id => id !== "wetFeather"), ["waterDrops"]);
  state = collectWaterfallClue(state, "waterDrops");
  for (let i = 0; i < 3; i++) state = addWaterfallQuizAnswer(state, true);
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

test("Waterfall clue quiz IDs are nature-themed", () => {
  for (const clue of WATERFALL_CLUES) {
    assert.ok(clue.quizId, `clue ${clue.id} should have a quizId`);
    assert.ok(clue.quizId.startsWith("q"), `quizId should start with q: ${clue.quizId}`);
  }
});
