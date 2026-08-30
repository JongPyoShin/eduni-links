import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GiantTreeWorldGeometry } from "../src/geometry.js";
import { GIANT_TREE_ITEMS } from "../src/content/giant_tree_interactables.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PREVIEW = readFileSync(resolve(ROOT, "src", "three_giant_tree_preview.js"), "utf8");
const GAME = readFileSync(resolve(ROOT, "src", "giant_tree_game.js"), "utf8");
const PREVIEW_HTML = readFileSync(resolve(ROOT, "giant-tree-three.html"), "utf8");
const GAME_HTML = readFileSync(resolve(ROOT, "giant-tree-game.html"), "utf8");
const HUB_HTML = readFileSync(resolve(ROOT, "jungle-hub.html"), "utf8");

test("Giant Tree Three renderer uses the shared walkable geometry", () => {
  assert.match(PREVIEW, /GiantTreeWorldGeometry/);
  assert.match(PREVIEW, /geometryContract\.paths\[0\]/);
  assert.match(PREVIEW, /geometryContract\.pathHalfWidth/);
  const geometry = new GiantTreeWorldGeometry();
  for (const item of Object.values(GIANT_TREE_ITEMS)) {
    assert.equal(geometry.isWalkable(item.x, item.y), true, `${item.id} stays on visible walkable geometry`);
  }
});

test("Giant Tree Three pages are local-only and avoid CDN runtime dependencies", () => {
  for (const html of [PREVIEW_HTML, GAME_HTML]) {
    assert.match(html, /node_modules\/three\/build\/three\.module\.js/);
    assert.match(html, /local_draco_loader\.js/);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net|gstatic\.com/);
  }
  assert.match(PREVIEW, /\.\/node_modules\/three\/examples\/jsm\/libs\/draco\//);
});

test("Giant Tree game preserves real input, movement, progression and reward collection", () => {
  assert.match(GAME, /new InputController/);
  assert.match(GAME, /new MovementController/);
  assert.match(GAME, /geometry\.isWalkable/);
  assert.match(GAME, /nearestGiantTreeInteractable/);
  assert.match(GAME, /answerTreeRingRound/);
  assert.match(GAME, /awardAndSaveStageReward\("giantTree"\)/);
  assert.match(GAME_HTML, /startGiantTreeGame/);
  assert.match(GAME_HTML, /고목 씨앗 배지/);
});

test("Jungle hub unlocks Giant Tree after the first three stage badges", () => {
  assert.match(HUB_HTML, /giant-tree-game\.html/);
  assert.match(HUB_HTML, /unlockStages = \["camp","waterfall","cave"\]/);
  assert.match(HUB_HTML, /giantTreeUnlocked/);
});
