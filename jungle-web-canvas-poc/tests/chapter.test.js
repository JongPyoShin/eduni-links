import test from "node:test";
import assert from "node:assert/strict";
import { InputController } from "../src/input.js";
import { ContentPanelController } from "../src/content/content_panel.js";
import { createChapterState, resetChapter } from "../src/content/chapter_state.js";
import { CLUES, LANDMARKS, canMeetBluebird, chapterObjective, collectClue, completeBluebird, nextClueId, startQuest, addClueQuizScore } from "../src/content/camp_chapter.js";
import { buildInteractables } from "../src/content/interactables.js";
import { INTRO_DURATION_MS, REWARD_REVEAL_MS, RIDGE_DURATION_MS, activeDirection, advanceSequences, beginIntro, beginRewardReveal, beginRidgeArrival, createSequenceState } from "../src/content/sequence_controller.js";

function collectAllWithScore(state, score) {
  let s = state;
  for (const clue of CLUES) {
    s = collectClue(s, clue.id);
    s = addClueQuizScore(s, score > 0);
    if (score > 0) score--;
  }
  return s;
}

test("chapter begins at the learning-hut objective with dormant clues", () => {
  const state = createChapterState();
  assert.deepEqual(state, { questStarted: false, discoveredClues: [], clueQuizScore: 0, clueQuizzesComplete: false, bluebirdComplete: false });
  assert.equal(chapterObjective(state), "학습 오두막을 찾아가 보자");
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["hut"]);
});

test("quest start enables the authored clue sequence one step at a time", () => {
  let state = startQuest(createChapterState());
  assert.equal(nextClueId(state), "feather");
  assert.equal(chapterObjective(state), "흔적 0 / 3 · 빛나는 깃털을 찾아보자");
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["feather"]);

  state = collectClue(state, "feather");
  assert.equal(nextClueId(state), "footprints");
  assert.equal(chapterObjective(state), "흔적 1 / 3 · 발자국을 따라가 보자");
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["footprints"]);

  state = collectClue(state, "footprints");
  assert.equal(nextClueId(state), "birdcall");
  assert.equal(chapterObjective(state), "흔적 2 / 3 · 새소리에 귀 기울여 보자");
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["birdcall"]);
});

test("clues cannot be collected before quest start, out of order, or twice", () => {
  const dormant = createChapterState();
  assert.equal(collectClue(dormant, "feather"), dormant);
  const started = startQuest(dormant);
  assert.equal(collectClue(started, "footprints"), started);
  const once = collectClue(started, "feather");
  assert.equal(collectClue(once, "feather"), once);
});

test("objectives progress through authored clue beats then point to bird", () => {
  let state = startQuest(createChapterState());
  const expected = [
    "흔적 1 / 3 · 발자국을 따라가 보자",
    "흔적 2 / 3 · 새소리에 귀 기울여 보자",
    "파랑새를 찾아가 보자!",
  ];
  for (let i = 0; i < CLUES.length; i++) {
    state = collectClue(state, CLUES[i].id);
    state = addClueQuizScore(state, true);
    assert.equal(chapterObjective(state), expected[i]);
  }
  assert.equal(nextClueId(state), null);
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["bluebird"]);
});

test("clue quiz score accumulates correctly", () => {
  let state = startQuest(createChapterState());
  state = collectClue(state, "feather");
  state = addClueQuizScore(state, true);
  assert.equal(state.clueQuizScore, 1);
  state = collectClue(state, "footprints");
  state = addClueQuizScore(state, false);
  assert.equal(state.clueQuizScore, 1);
  state = collectClue(state, "birdcall");
  state = addClueQuizScore(state, true);
  assert.equal(state.clueQuizScore, 2);
  assert.equal(state.clueQuizzesComplete, true);
});

test("canMeetBluebird requires all clue quizzes complete", () => {
  let state = startQuest(createChapterState());
  assert.equal(canMeetBluebird(state), false);
  state = collectAllWithScore(state, 3);
  assert.equal(canMeetBluebird(state), true);
});

test("bluebird completion sets bluebirdComplete", () => {
  let state = collectAllWithScore(startQuest(createChapterState()), 3);
  state = completeBluebird(state);
  assert.equal(state.bluebirdComplete, true);
  assert.equal(chapterObjective(state), "탐험 완료!");
});

test("Bluebird remains gated until all clue quizzes complete", () => {
  let state = startQuest(createChapterState());
  state = collectClue(state, "feather");
  state = addClueQuizScore(state, true);
  assert.equal(canMeetBluebird(state), false);
  state = collectClue(state, "footprints");
  state = addClueQuizScore(state, true);
  assert.equal(canMeetBluebird(state), false);
  state = collectClue(state, "birdcall");
  state = addClueQuizScore(state, true);
  assert.equal(canMeetBluebird(state), true);
});

test("all four keyboard directions move panel focus consistently", () => {
  const input = new InputController();
  const event = (code) => ({ code, preventDefault() {} });
  for (const code of ["ArrowLeft", "ArrowUp"]) { input._onKey(event(code), true); assert.equal(input.consumeNavigate(), -1); }
  for (const code of ["ArrowRight", "ArrowDown"]) { input._onKey(event(code), true); assert.equal(input.consumeNavigate(), 1); }
});

test("content panel blocks movement and wraps focus in either direction", () => {
  const panel = new ContentPanelController();
  panel.openPanel({ kind: "clueQuiz", choiceMode: "single", choices: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }] });
  assert.equal(panel.blocksMovement(), true);
  panel.moveChoice(-1);
  assert.equal(panel.focusIndex, 2);
  panel.moveChoice(1);
  assert.equal(panel.focusIndex, 0);
  assert.equal(panel.activate().choice.id, "a");
  panel.closePanel();
  assert.equal(panel.blocksMovement(), false);
});

test("intro, ridge, and reward sequences are one-time and resettable", () => {
  let sequence = beginIntro(createSequenceState(), 100);
  assert.equal(activeDirection(sequence, 200).type, "intro");
  sequence = advanceSequences(sequence, 100 + INTRO_DURATION_MS);
  assert.equal(sequence.introPlayed, true);
  assert.equal(beginIntro(sequence, 1000), sequence);

  const allScored = collectAllWithScore(startQuest(createChapterState()), 3);
  sequence = beginRidgeArrival(sequence, allScored, { x: 1300, y: 420 }, 2000);
  assert.equal(activeDirection(sequence, 2100).type, "ridge");
  sequence = advanceSequences(sequence, 2000 + RIDGE_DURATION_MS);
  assert.equal(sequence.ridgeArrivalPlayed, true);
  assert.equal(beginRidgeArrival(sequence, allScored, { x: 1300, y: 420 }, 6000), sequence);

  sequence = beginRewardReveal(sequence, 7000);
  sequence = advanceSequences(sequence, 7000 + REWARD_REVEAL_MS);
  assert.equal(sequence.rewardShown, true);
  assert.deepEqual(createSequenceState(), { introStartedAt: null, introPlayed: false, ridgeArrivalStartedAt: null, ridgeArrivalPlayed: false, rewardStartedAt: null, rewardShown: false });
  assert.deepEqual(resetChapter(), createChapterState());
});
