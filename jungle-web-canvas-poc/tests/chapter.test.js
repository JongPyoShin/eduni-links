import test from "node:test";
import assert from "node:assert/strict";
import { ContentPanelController } from "../src/content/content_panel.js";
import { createChapterState, resetChapter } from "../src/content/chapter_state.js";
import { CLUES, canMeetBluebird, canUseFirePit, chapterObjective, collectClue, completeBluebird, completeFirePit, startQuest } from "../src/content/camp_chapter.js";
import { buildInteractables } from "../src/content/interactables.js";

function collectAll(state) {
  return CLUES.reduce((current, clue) => collectClue(current, clue.id), state);
}

test("chapter begins at the learning-hut objective with dormant clues", () => {
  const state = createChapterState();
  assert.deepEqual(state, { questStarted: false, discoveredClues: [], firePitComplete: false, bluebirdComplete: false });
  assert.equal(chapterObjective(state), "학습 오두막을 찾아가 보자");
  assert.deepEqual(buildInteractables(state).map((item) => item.id), ["hut"]);
});

test("quest start enables all three data-driven clues", () => {
  const state = startQuest(createChapterState());
  assert.equal(chapterObjective(state), "파랑새의 흔적 0 / 3");
  assert.deepEqual(buildInteractables(state).filter((item) => CLUES.some((clue) => clue.id === item.id)).map((item) => item.id), CLUES.map((clue) => clue.id));
});

test("clues cannot be collected before quest start and collect idempotently", () => {
  const dormant = createChapterState();
  assert.equal(collectClue(dormant, "feather"), dormant);
  const started = startQuest(dormant);
  const once = collectClue(started, "feather");
  const twice = collectClue(once, "feather");
  assert.deepEqual(once.discoveredClues, ["feather"]);
  assert.equal(twice, once);
});

test("objectives progress 0 through 3 then point to the fire pit", () => {
  let state = startQuest(createChapterState());
  assert.equal(chapterObjective(state), "파랑새의 흔적 0 / 3");
  for (let i = 0; i < CLUES.length; i++) {
    state = collectClue(state, CLUES[i].id);
    const expected = i === 2 ? "모닥불로 가 보자!" : `파랑새의 흔적 ${i + 1} / 3`;
    assert.equal(chapterObjective(state), expected);
  }
});

test("fire pit is locked before all clues and completes only after selecting every clue", () => {
  let state = startQuest(createChapterState());
  assert.equal(canUseFirePit(state), false);
  state = collectAll(state);
  assert.equal(canUseFirePit(state), true);
  assert.equal(completeFirePit(state, ["feather", "footprints"]), state);
  state = completeFirePit(state, CLUES.map((clue) => clue.id));
  assert.equal(state.firePitComplete, true);
  assert.equal(chapterObjective(state), "전망대로 가 보자!");
});

test("bluebird finale remains gated until fire-pit learning is complete", () => {
  let state = collectAll(startQuest(createChapterState()));
  assert.equal(canMeetBluebird(state), false);
  assert.equal(completeBluebird(state), state);
  state = completeFirePit(state, CLUES.map((clue) => clue.id));
  assert.equal(canMeetBluebird(state), true);
  state = completeBluebird(state);
  assert.equal(state.bluebirdComplete, true);
  assert.equal(chapterObjective(state), "탐험 완료!");
});

test("developer reset returns every chapter field and objective to initial values", () => {
  const complete = completeBluebird(completeFirePit(collectAll(startQuest(createChapterState())), CLUES.map((clue) => clue.id)));
  assert.equal(complete.bluebirdComplete, true);
  assert.deepEqual(resetChapter(), createChapterState());
  assert.equal(chapterObjective(resetChapter()), "학습 오두막을 찾아가 보자");
});

test("content panels block movement and provide focused multi-select choices", () => {
  const panel = new ContentPanelController();
  assert.equal(panel.blocksMovement(), false);
  panel.openPanel({ kind: "firePit", choices: CLUES.map((clue) => ({ id: clue.id, label: clue.title })) });
  assert.equal(panel.blocksMovement(), true);
  panel.moveChoice(1);
  assert.equal(panel.focusIndex, 1);
  const result = panel.activate();
  assert.equal(result.choice.id, "footprints");
  assert.equal(result.complete, false);
  panel.closePanel();
  assert.equal(panel.blocksMovement(), false);
});
