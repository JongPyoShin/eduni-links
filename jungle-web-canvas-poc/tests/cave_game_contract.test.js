import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CaveWorldGeometry } from "../src/geometry.js";
import { createCaveState, caveObjective } from "../src/content/cave_chapter.js";
import { caveInteractables } from "../src/content/cave_interactables.js";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Cave gameplay entry uses local Three.js and tablet controls", async () => {
  const html = await source("cave-game.html");
  assert.match(html, /node_modules\/three\/build\/three\.module\.js/);
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net|gstatic\.com/);
  for (const id of ["dpad-up", "dpad-down", "dpad-left", "dpad-right", "dpad-a", "dpad-b"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /반딧불 수정 배지/);
});

test("Cave game keeps gameplay state authoritative outside the renderer", async () => {
  const game = await source("src/cave_game.js");
  assert.match(game, /new CaveWorldGeometry\(\)/);
  assert.match(game, /geometry\.isWalkable/);
  assert.match(game, /nearestCaveInteractable\(player, cave\)/);
  assert.match(game, /startThreeCavePreview/);
  assert.match(game, /caveVisualPhase\(cave\)/);
  assert.match(game, /awardAndSaveStageReward\("cave"\)/);
  assert.doesNotMatch(game, /player\.x\s*=\s*item\.x|player\.y\s*=\s*item\.y/);
});

test("Cave route remains the same source for movement and stage objectives", () => {
  const geometry = new CaveWorldGeometry();
  const route = geometry.paths[0];
  assert.deepEqual(route[0], { x: 200, y: 1040 });
  assert.deepEqual(route.at(-1), { x: 1420, y: 340 });
  assert.equal(geometry.isWalkable(420, 930), true);
  const state = createCaveState();
  assert.equal(caveObjective(state), "반딧불이 모여 있는 동굴 입구를 찾아가 보자");
  assert.deepEqual(caveInteractables(state).map((item) => item.id), ["caveGate"]);
});
