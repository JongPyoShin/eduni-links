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
  nextWaterfallClueId,
  canMeetKingfisher,
  retryWaterfallClueQuizzes,
  waterfallObjective,
  resetWaterfall,
} from "../src/content/waterfall_chapter.js";

function collectAllClues(state) {
  for (const clue of WATERFALL_CLUES) state = collectWaterfallClue(state, clue.id);
  return state;
}

function answerAllQuizzes(state, correct) {
  for (let i = 0; i < WATERFALL_CLUES.length; i++) state = addWaterfallQuizAnswer(state, correct);
  return state;
}

test("Waterfall progression starts at stream gate and gates stepping stones", () => {
  const initial = createWaterfallState();
  assert.equal(waterfallObjective(initial), "계곡 입구를 찾아가 보자");
  assert.equal(completeSteppingStones(initial), initial);

  const atGate = completeStreamGate(initial);
  assert.equal(waterfallObjective(atGate), "물에 빠지지 않고 징검다리를 건너가 보자");
  const crossed = completeSteppingStones(atGate);
  assert.equal(nextWaterfallClueId(crossed), "echo");
  assert.equal(waterfallObjective(crossed), "가장 가까운 물소리를 찾아보자");
});

test("Waterfall clues are authored in echo then mist then waterDrops order", () => {
  let state = completeSteppingStones(completeStreamGate(createWaterfallState()));
  assert.equal(collectWaterfallClue(state, "mistTrail"), state);

  state = collectWaterfallClue(state, "echo");
  assert.equal(nextWaterfallClueId(state), "mistTrail");

  state = collectWaterfallClue(state, "mistTrail");
  assert.equal(nextWaterfallClueId(state), "waterDrops");

  state = collectWaterfallClue(state, "waterDrops");
  assert.equal(nextWaterfallClueId(state), null);
});

test("Clue quiz score accumulates and clueQuizzesComplete sets when all clues collected", () => {
  let state = collectAllClues(completeSteppingStones(completeStreamGate(createWaterfallState())));
  assert.equal(state.adventure.clueQuizzesComplete, false);

  state = addWaterfallQuizAnswer(state, true);
  assert.equal(state.adventure.clueQuizScore, 1);

  state = addWaterfallQuizAnswer(state, false);
  assert.equal(state.adventure.clueQuizScore, 1);

  state = addWaterfallQuizAnswer(state, true);
  assert.equal(state.adventure.clueQuizScore, 2);
  assert.equal(state.adventure.clueQuizzesComplete, true);
});

test("canMeetKingfisher requires clueQuizzesComplete and lookoutComplete", () => {
  let state = createWaterfallState();
  assert.equal(canMeetKingfisher(state), false);

  state = { ...state, adventure: { ...state.adventure, clueQuizzesComplete: true } };
  state = completeLookout(state);
  assert.equal(canMeetKingfisher(state), true);

  state = completeKingfisher(state);
  assert.equal(state.adventure.birdComplete, true);
});

test("retryWaterfallClueQuizzes resets adventure state", () => {
  let state = collectAllClues(completeSteppingStones(completeStreamGate(createWaterfallState())));
  state = answerAllQuizzes(state, true);
  assert.equal(state.adventure.clueQuizScore, 3);

  state = retryWaterfallClueQuizzes(state);
  assert.equal(state.adventure.discoveredClues.length, 0);
  assert.equal(state.adventure.clueQuizScore, 0);
  assert.equal(state.adventure.clueQuizzesComplete, false);
});

test("lookout, kingfisher and reward remain sequentially gated", () => {
  let state = createWaterfallState();
  assert.equal(completeLookout(state), state);
  assert.equal(completeKingfisher(state), state);
  assert.equal(completeWaterfallReward(state), state);

  state = completeSteppingStones(completeStreamGate(state));
  state = collectAllClues(state);
  state = answerAllQuizzes(state, true);
  state = completeLookout(state);
  state = completeKingfisher(state);
  assert.equal(state.adventure.birdComplete, true);
  state = completeWaterfallReward(state);
  assert.equal(state.rewardComplete, true);
  assert.deepEqual(resetWaterfall(), createWaterfallState());
});

test("Waterfall objective reflects adventure progress", () => {
  let state = createWaterfallState();
  assert.equal(waterfallObjective(state), "계곡 입구를 찾아가 보자");

  state = completeStreamGate(state);
  assert.equal(waterfallObjective(state), "물에 빠지지 않고 징검다리를 건너가 보자");

  state = completeSteppingStones(state);
  assert.equal(waterfallObjective(state), "가장 가까운 물소리를 찾아보자");

  state = collectAllClues(state);
  state = answerAllQuizzes(state, true);
  assert.equal(waterfallObjective(state), "전망대로 올라가 보자");

  state = completeLookout(state);
  assert.equal(waterfallObjective(state), "물총새를 찾아가 보자!");

  state = completeKingfisher(state);
  assert.equal(waterfallObjective(state), "폭포 탐험 보상을 확인해 보자");

  state = completeWaterfallReward(state);
  assert.equal(waterfallObjective(state), "탐험 완료!");
});
