import test from "node:test";
import assert from "node:assert/strict";
import { InputController } from "../src/input.js";
import { ContentPanelController } from "../src/content/content_panel.js";
import { createChapterState, resetChapter } from "../src/content/chapter_state.js";
import { CLUES, FIRE_PIT_ROUNDS, LANDMARKS, answerFirePitRound, canMeetBluebird, canUseFirePit, chapterObjective, collectClue, completeBluebird, nextClueId, startQuest } from "../src/content/camp_chapter.js";
import { buildInteractables } from "../src/content/interactables.js";
import { INTRO_DURATION_MS, REWARD_REVEAL_MS, RIDGE_DURATION_MS, activeDirection, advanceSequences, beginIntro, beginRewardReveal, beginRidgeArrival, createSequenceState } from "../src/content/sequence_controller.js";

function collectAll(state) {
  return CLUES.reduce((current, clue) => collectClue(current, clue.id), state);
}

function finishFirePit(state) {
  for (const round of FIRE_PIT_ROUNDS) state = answerFirePitRound(state, round.correct).state;
  return state;
}

test("chapter begins at the learning-hut objective with dormant clues", () => {
  const state = createChapterState();
  assert.deepEqual(state, { questStarted: false, discoveredClues: [], firePitRound: 0, firePitComplete: false, bluebirdComplete: false });
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

test("objectives progress through authored clue beats then point to the fire pit", () => {
  let state = startQuest(createChapterState());
  const expected = [
    "흔적 1 / 3 · 발자국을 따라가 보자",
    "흔적 2 / 3 · 새소리에 귀 기울여 보자",
    "모닥불로 가 보자!",
  ];
  for (let i = 0; i < CLUES.length; i++) {
    state = collectClue(state, CLUES[i].id);
    assert.equal(chapterObjective(state), expected[i]);
  }
  assert.equal(nextClueId(state), null);
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["firePit"]);
});

test("Fire Pit interaction anchor is aligned with the rendered campfire zone", () => {
  assert.equal(LANDMARKS.firePit.x, 990);
  assert.equal(LANDMARKS.firePit.y, 900);
  assert.ok(LANDMARKS.firePit.radius >= 110);
});

test("fire pit wrong answer stays on the same round without punishment", () => {
  const state = collectAll(startQuest(createChapterState()));
  const answer = answerFirePitRound(state, "feather");
  assert.equal(canUseFirePit(state), true);
  assert.equal(answer.correct, false);
  assert.equal(answer.state, state);
  assert.equal(answer.state.firePitRound, 0);
});

test("each correct Fire Pit answer advances exactly one of three rounds", () => {
  let state = collectAll(startQuest(createChapterState()));
  for (let index = 0; index < FIRE_PIT_ROUNDS.length; index++) {
    const answer = answerFirePitRound(state, FIRE_PIT_ROUNDS[index].correct);
    assert.equal(answer.correct, true);
    assert.equal(answer.state.firePitRound, index + 1);
    assert.equal(answer.completed, index === FIRE_PIT_ROUNDS.length - 1);
    state = answer.state;
  }
  assert.equal(state.firePitComplete, true);
  assert.equal(chapterObjective(state), "전망대로 가 보자!");
});

test("Fire Pit cannot complete twice and Bluebird remains gated until it does", () => {
  let state = collectAll(startQuest(createChapterState()));
  assert.equal(canMeetBluebird(state), false);
  assert.equal(completeBluebird(state), state);
  state = finishFirePit(state);
  const duplicate = answerFirePitRound(state, "feather");
  assert.equal(duplicate.state, state);
  assert.equal(duplicate.correct, false);
  assert.equal(canMeetBluebird(state), true);
  state = completeBluebird(state);
  assert.equal(chapterObjective(state), "탐험 완료!");
});

test("all four keyboard directions move panel focus consistently", () => {
  const input = new InputController();
  const event = (code) => ({ code, preventDefault() {} });
  for (const code of ["ArrowLeft", "ArrowUp"]) { input._onKey(event(code), true); assert.equal(input.consumeNavigate(), -1); }
  for (const code of ["ArrowRight", "ArrowDown"]) { input._onKey(event(code), true); assert.equal(input.consumeNavigate(), 1); }
});

test("content panel blocks movement and wraps focus in either direction", () => {
  const panel = new ContentPanelController();
  panel.openPanel({ kind: "firePit", choiceMode: "single", choices: FIRE_PIT_ROUNDS[0].choices.map((id) => ({ id, label: id })) });
  assert.equal(panel.blocksMovement(), true);
  panel.moveChoice(-1);
  assert.equal(panel.focusIndex, 2);
  panel.moveChoice(1);
  assert.equal(panel.focusIndex, 0);
  assert.equal(panel.activate().choice.id, "feather");
  panel.closePanel();
  assert.equal(panel.blocksMovement(), false);
});

test("intro, ridge, and reward sequences are one-time and resettable", () => {
  let sequence = beginIntro(createSequenceState(), 100);
  assert.equal(activeDirection(sequence, 200).type, "intro");
  sequence = advanceSequences(sequence, 100 + INTRO_DURATION_MS);
  assert.equal(sequence.introPlayed, true);
  assert.equal(beginIntro(sequence, 1000), sequence);

  const fireComplete = finishFirePit(collectAll(startQuest(createChapterState())));
  sequence = beginRidgeArrival(sequence, fireComplete, { x: 1300, y: 420 }, 2000);
  assert.equal(activeDirection(sequence, 2100).type, "ridge");
  sequence = advanceSequences(sequence, 2000 + RIDGE_DURATION_MS);
  assert.equal(sequence.ridgeArrivalPlayed, true);
  assert.equal(beginRidgeArrival(sequence, fireComplete, { x: 1300, y: 420 }, 6000), sequence);

  sequence = beginRewardReveal(sequence, 7000);
  sequence = advanceSequences(sequence, 7000 + REWARD_REVEAL_MS);
  assert.equal(sequence.rewardShown, true);
  assert.deepEqual(createSequenceState(), { introStartedAt: null, introPlayed: false, ridgeArrivalStartedAt: null, ridgeArrivalPlayed: false, rewardStartedAt: null, rewardShown: false });
  assert.deepEqual(resetChapter(), createChapterState());
});
