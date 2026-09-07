import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GAME = readFileSync(resolve(ROOT, "src", "game.js"), "utf8");
const CAVE = readFileSync(resolve(ROOT, "src", "cave_game.js"), "utf8");
const TREE = readFileSync(resolve(ROOT, "src", "giant_tree_game.js"), "utf8");
const SKY = readFileSync(resolve(ROOT, "src", "sky_ridge_game.js"), "utf8");
const PANEL = readFileSync(resolve(ROOT, "src", "content", "content_panel.js"), "utf8");

test("Waterfall opens its badge ceremony after kingfisher capture (score >= 2)", () => {
  assert.match(GAME, /kind === "kingfisher"[\s\S]*score >= 2[\s\S]*completeKingfisher[\s\S]*openPanel[\s\S]*kind: "reward"/);
  assert.match(GAME, /badgeIcon: reward\.icon/);
});

test("Cave opens its badge ceremony immediately after the bat encounter", () => {
  assert.match(CAVE, /kind === "bat"[\s\S]*completeCaveBat\(cave\)[\s\S]*openRewardCeremony\(\)[\s\S]*return;/);
  assert.match(CAVE, /badgeIcon: reward\.icon/);
});

test("Giant Tree opens its badge ceremony immediately after the squirrel encounter", () => {
  assert.match(TREE, /kind === "squirrel"[\s\S]*completeSquirrel\(tree\)[\s\S]*openRewardCeremony\(\)[\s\S]*return;/);
  assert.match(TREE, /badgeIcon: reward\.icon/);
});

test("Sky Ridge opens its badge ceremony after hawk capture (score >= 2)", () => {
  assert.match(SKY, /kind === "hawk"[\s\S]*score >= 2[\s\S]*completeSkyHawk[\s\S]*openPanel[\s\S]*kind: "reward"/);
  assert.match(SKY, /badgeIcon: reward\.icon/);
});

test("Shared reward panel renders the stage-specific badge icon and accessible label", () => {
  assert.match(PANEL, /if \(p\.badgeIcon\) badge\.textContent = p\.badgeIcon/);
  assert.match(PANEL, /badge\.setAttribute\("aria-label", p\.badgeLabel \|\| p\.title \|\| "탐험 배지"\)/);
  assert.match(GAME, /badgeIcon: reward\.icon/);
});
