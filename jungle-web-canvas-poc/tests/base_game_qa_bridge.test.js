import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GAME = readFileSync(resolve(ROOT, "src", "game.js"), "utf8");
const QA = readFileSync(resolve(ROOT, "jungle-qa.html"), "utf8");

test("Base Camp and Waterfall gameplay expose one read-only QA runtime bridge", () => {
  assert.match(GAME, /globalThis\.__eduniJungleGame = Object\.freeze/);
  assert.match(GAME, /stageId: waterfallStage \? "waterfall" : "camp"/);
  assert.match(GAME, /getState: \(\) => waterfallStage \? waterfall : chapter/);
  assert.match(GAME, /getPhase: qaPhase/);
  assert.match(GAME, /getTarget: qaTarget/);
  assert.match(GAME, /getObjective:/);
  assert.doesNotMatch(GAME, /__eduniJungleGame[\s\S]{0,500}setState/);
});

test("Base QA bridge derives targets from authored stage interactables and phases", () => {
  assert.match(GAME, /buildInteractables/);
  assert.match(GAME, /waterfallInteractables/);
  assert.match(GAME, /campVisualPhase/);
  assert.match(GAME, /waterfallVisualPhase/);
  assert.match(GAME, /bluebirdReady: sequences\.ridgeArrivalPlayed/);
});

test("Unified Jungle QA uses rich runtime data for all five stages", () => {
  assert.match(QA, /camp: \{ label: "Camp", url: "\.\/\?qa=1", globalName: "__eduniJungleGame"/);
  assert.match(QA, /waterfall: \{ label: "Waterfall", url: "\.\/\?stage=waterfall&renderer=three&qa=1", globalName: "__eduniJungleGame"/);
  assert.match(QA, /runtime\.getTarget\?\.\(\)/);
  assert.match(QA, /runtime\?\.stageId && runtime\.stageId !== currentStage/);
  assert.match(QA, /runtime\?\.player \|\| runtime\?\.getPlayer\?\.\(\)/);
});
