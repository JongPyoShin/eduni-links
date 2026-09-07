import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GAME = resolve(__dirname, "..", "src", "sky_ridge_game.js");
const HUB = resolve(__dirname, "..", "jungle-hub.html");

test("Sky Ridge game keeps movement and interaction on shared geometry", () => {
  const src = readFileSync(GAME, "utf8");
  assert.ok(src.includes("new SkyRidgeWorldGeometry"));
  assert.ok(src.includes("geometry.isWalkable(nx, player.y)"));
  assert.ok(src.includes("geometry.isWalkable(player.x, ny)"));
  assert.ok(src.includes("nearestSkyRidgeInteractable"));
});

test("Sky Ridge game supports keyboard touch and physical gamepad through InputController", () => {
  const src = readFileSync(GAME, "utf8");
  assert.ok(src.includes("new InputController"));
  assert.ok(src.includes("input.pollGamepad"));
  assert.ok(src.includes("input.consumeInteract"));
  assert.ok(src.includes("input.consumeNavigate"));
});

test("Sky Ridge final reward is persisted as the fifth collectible", () => {
  const src = readFileSync(GAME, "utf8");
  assert.ok(src.includes('stageReward("skyRidge")'));
  assert.ok(src.includes('awardAndSaveStageReward("skyRidge")'));
  assert.ok(src.includes("rewardFanfare"));
});

test("Jungle hub unlocks Sky Ridge after the Giant Tree reward", () => {
  const html = readFileSync(HUB, "utf8");
  assert.ok(html.includes("sky-ridge-game.html"));
  assert.ok(html.includes('hasStageReward(collection, "giantTree")'));
  assert.ok(html.includes('hasStageReward(collection, "skyRidge")'));
  assert.ok(html.includes("정글 탐험 완주!"));
});
