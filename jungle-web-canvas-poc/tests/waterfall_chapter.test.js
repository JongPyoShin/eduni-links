import test from "node:test";
import assert from "node:assert/strict";
import {
  LEAF_MATCH_ROUNDS,
  WATERFALL_CLUES,
  answerLeafMatchRound,
  canUseLeafMatch,
  collectWaterfallClue,
  completeKingfisher,
  completeLookout,
  completeSteppingStones,
  completeStreamGate,
  completeWaterfallReward,
  createWaterfallState,
  nextWaterfallClueId,
  resetWaterfall,
  waterfallObjective,
} from "../src/content/waterfall_chapter.js";

function collectAllClues(state) {
  for (const clue of WATERFALL_CLUES) state = collectWaterfallClue(state, clue.id);
  return state;
}

function finishLeafMatch(state) {
  for (const round of LEAF_MATCH_ROUNDS) state = answerLeafMatchRound(state, round.correct).state;
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

test("Waterfall clues are authored in echo then mist order", () => {
  let state = completeSteppingStones(completeStreamGate(createWaterfallState()));
  assert.equal(collectWaterfallClue(state, "mistTrail"), state);

  state = collectWaterfallClue(state, "echo");
  assert.equal(nextWaterfallClueId(state), "mistTrail");
  assert.equal(waterfallObjective(state), "젖은 바위의 흔적을 따라가 보자");

  state = collectWaterfallClue(state, "mistTrail");
  assert.equal(nextWaterfallClueId(state), null);
  assert.equal(canUseLeafMatch(state), true);
  assert.equal(waterfallObjective(state), "같은 모양의 잎을 찾아보자");
});

test("Leaf Match wrong answers do not advance and correct answers complete three rounds", () => {
  let state = collectAllClues(completeSteppingStones(completeStreamGate(createWaterfallState())));
  const wrong = answerLeafMatchRound(state, "wrong");
  assert.equal(wrong.state, state);
  assert.equal(wrong.correct, false);

  for (let index = 0; index < LEAF_MATCH_ROUNDS.length; index += 1) {
    const result = answerLeafMatchRound(state, LEAF_MATCH_ROUNDS[index].correct);
    assert.equal(result.correct, true);
    assert.equal(result.state.leafMatchRound, index + 1);
    assert.equal(result.completed, index === LEAF_MATCH_ROUNDS.length - 1);
    state = result.state;
  }
  assert.equal(state.leafMatchComplete, true);
  assert.equal(waterfallObjective(state), "전망대로 올라가 보자");
});

test("lookout, kingfisher and reward remain sequentially gated", () => {
  let state = createWaterfallState();
  assert.equal(completeLookout(state), state);
  assert.equal(completeKingfisher(state), state);
  assert.equal(completeWaterfallReward(state), state);

  state = finishLeafMatch(collectAllClues(completeSteppingStones(completeStreamGate(state))));
  state = completeLookout(state);
  assert.equal(waterfallObjective(state), "물총새의 움직임을 관찰해 보자");
  state = completeKingfisher(state);
  assert.equal(waterfallObjective(state), "폭포 탐험 보상을 확인해 보자");
  state = completeWaterfallReward(state);
  assert.equal(waterfallObjective(state), "탐험 완료!");
  assert.deepEqual(resetWaterfall(), createWaterfallState());
});
