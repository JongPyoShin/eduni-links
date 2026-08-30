import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(__dirname, "..", "src", "game.js");
const HUB = resolve(__dirname, "..", "jungle-hub.html");

test("Camp and Waterfall completions persist collectible badges", () => {
  const src = readFileSync(GAME, "utf8");
  assert.ok(src.includes('awardAndSaveStageReward("camp")'));
  assert.ok(src.includes('awardAndSaveStageReward("waterfall")'));
  assert.ok(src.includes('stageReward("camp")'));
  assert.ok(src.includes('stageReward("waterfall")'));
});

test("Jungle hub launches playable Three Waterfall instead of the preview", () => {
  const html = readFileSync(HUB, "utf8");
  assert.ok(html.includes("?stage=waterfall&amp;renderer=three"));
  assert.ok(!html.includes('href="./waterfall-three.html">탐험 시작'));
});
