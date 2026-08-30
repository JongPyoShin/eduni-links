import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const QA = readFileSync(resolve(ROOT, "jungle-qa.html"), "utf8");

test("Unified Jungle QA dashboard covers all five playable stage entry points", () => {
  assert.match(QA, /camp: \{ label: "Camp", url: "\.\/\?renderer=three&qa=1"/);
  assert.match(QA, /waterfall: \{ label: "Waterfall", url: "\.\/\?stage=waterfall&renderer=three&qa=1"/);
  assert.match(QA, /cave-game\.html\?qa=1/);
  assert.match(QA, /giant-tree-game\.html\?qa=1/);
  assert.match(QA, /sky-ridge-game\.html\?qa=1/);
});

test("Unified Jungle QA dashboard is read-only with respect to reward state", () => {
  assert.match(QA, /hasStageReward/);
  assert.match(QA, /loadRewardCollection/);
  assert.doesNotMatch(QA, /awardAndSaveStageReward|awardStageReward|saveRewardCollection|localStorage\.setItem/);
});

test("Unified Jungle QA dashboard exposes live physical-controller diagnostics", () => {
  assert.match(QA, /navigator\?\.getGamepads/);
  assert.match(QA, /pad\.axes\?\.\[0\]/);
  assert.match(QA, /pad\.buttons\?\.\[0\]/);
  assert.match(QA, /pad\.buttons\?\.\[1\]/);
  assert.match(QA, /pad\.buttons\?\.\[12\]/);
  assert.match(QA, /pad\.buttons\?\.\[15\]/);
});

test("Unified Jungle QA dashboard reads rich runtime state where stage bridges exist", () => {
  assert.match(QA, /__eduniCaveGame/);
  assert.match(QA, /__eduniGiantTreeGame/);
  assert.match(QA, /__eduniSkyRidgeGame/);
  assert.match(QA, /caveInteractables/);
  assert.match(QA, /giantTreeInteractables/);
  assert.match(QA, /skyRidgeInteractables/);
  assert.match(QA, /runtime\.getState/);
  assert.match(QA, /runtime\.getPhase/);
});

test("Unified Jungle QA dashboard keeps production gameplay authoritative", () => {
  assert.doesNotMatch(QA, /completeCave|completeGiant|completeSky|answerFirefly|answerTreeRing|answerStarPattern/);
  assert.match(QA, /실제 키보드\/D-pad\/물리 컨트롤러로 플레이하세요/);
});
