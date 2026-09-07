import test from "node:test";
import assert from "node:assert/strict";
import { CaveWorldGeometry } from "../src/geometry.js";
import {
  FIREFLY_PATTERN_ROUNDS,
  answerFireflyPatternRound,
  caveObjective,
  collectCaveClue,
  completeCaveBat,
  completeCaveGate,
  completeCaveReward,
  completeCrystalBridge,
  completeGlowTrail,
  createCaveState,
} from "../src/content/cave_chapter.js";
import { CAVE_ITEMS, caveInteractables, nearestCaveInteractable } from "../src/content/cave_interactables.js";

test("Firefly Cave progression is strictly sequential from entrance to reward", () => {
  let state = createCaveState();
  assert.equal(caveInteractables(state)[0].id, "caveGate");
  assert.match(caveObjective(state), /동굴 입구/);

  state = completeCaveGate(state);
  assert.equal(caveInteractables(state)[0].id, "glowTrail");

  state = completeGlowTrail(state);
  assert.equal(caveInteractables(state)[0].id, "echoCrystal");

  state = collectCaveClue(state, "echoCrystal");
  assert.equal(caveInteractables(state)[0].id, "shadowMark");

  state = collectCaveClue(state, "shadowMark");
  assert.equal(caveInteractables(state)[0].id, "fireflyPattern");

  for (const round of FIREFLY_PATTERN_ROUNDS) {
    const answer = answerFireflyPatternRound(state, round.correct);
    assert.equal(answer.correct, true);
    state = answer.state;
  }
  assert.equal(state.fireflyPatternComplete, true);
  assert.equal(caveInteractables(state)[0].id, "crystalBridge");

  state = completeCrystalBridge(state);
  assert.equal(caveInteractables(state)[0].id, "bat");

  state = completeCaveBat(state);
  assert.equal(caveInteractables(state)[0].id, "reward");

  state = completeCaveReward(state);
  assert.equal(caveObjective(state), "탐험 완료!");
  assert.deepEqual(caveInteractables(state), []);
});

test("Wrong Firefly Pattern answers do not advance the round", () => {
  let state = createCaveState();
  state = completeCaveGate(state);
  state = completeGlowTrail(state);
  state = collectCaveClue(state, "echoCrystal");
  state = collectCaveClue(state, "shadowMark");
  const before = state.fireflyPatternRound;
  const result = answerFireflyPatternRound(state, "definitely-wrong");
  assert.equal(result.correct, false);
  assert.equal(result.state.fireflyPatternRound, before);
  assert.equal(result.state.fireflyPatternComplete, false);
});

test("Cave interactable anchors stay on the shared visible walkable geometry", () => {
  const geometry = new CaveWorldGeometry();
  for (const item of Object.values(CAVE_ITEMS)) {
    assert.equal(geometry.isWalkable(item.x, item.y), true, `${item.id} must remain on CaveWorldGeometry`);
  }
  assert.equal(geometry.paths[0][0].x, 200);
  assert.equal(geometry.paths[0][0].y, 1040);
  assert.equal(geometry.paths[0].at(-1).x, 1420);
  assert.equal(geometry.paths[0].at(-1).y, 340);
});

test("Nearest Cave interaction respects authored interaction radius", () => {
  const state = createCaveState();
  assert.equal(nearestCaveInteractable({ x: 420, y: 930 }, state)?.id, "caveGate");
  assert.equal(nearestCaveInteractable({ x: 200, y: 1040 }, state), null);
});
