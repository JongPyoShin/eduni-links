import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CampWorldGeometry } from "../src/geometry.js";
import { CLUES, LANDMARKS } from "../src/content/camp_chapter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const RUNTIME = readFileSync(resolve(ROOT, "src", "three_camp_runtime.js"), "utf8");
const ALIGNMENT = readFileSync(resolve(ROOT, "src", "three_camp_alignment.js"), "utf8");
const INDEX = readFileSync(resolve(ROOT, "index.html"), "utf8");
const HUB = readFileSync(resolve(ROOT, "jungle-hub.html"), "utf8");

function walkable(geometry, point) {
  return geometry.isWalkable(point.x, point.y);
}

test("Three Camp renderer derives its visible route from shared CampWorldGeometry", () => {
  assert.match(RUNTIME, /new CampWorldGeometry\(\)/);
  assert.match(RUNTIME, /geometryContract\.paths\[0\]/);
  assert.match(RUNTIME, /geometryContract\.pathHalfWidth/);
  const geometry = new CampWorldGeometry();
  assert.equal(walkable(geometry, LANDMARKS.hut), true);
  assert.equal(walkable(geometry, LANDMARKS.firePit), true);
  assert.equal(walkable(geometry, LANDMARKS.bluebird), true);
  for (const clue of CLUES) assert.equal(walkable(geometry, clue), true, `${clue.id} stays walkable`);
});

test("Three Camp presentation stays subordinate to the existing gameplay bridge", () => {
  assert.match(RUNTIME, /bridge\.stageId !== "camp"/);
  assert.match(RUNTIME, /bridge\.getState\(\)/);
  assert.match(RUNTIME, /bridge\.getPhase\(\)/);
  assert.match(RUNTIME, /bridge\.getTarget\?\.\(\)/);
  assert.doesNotMatch(RUNTIME, /startQuest\(|collectClue\(|answerFirePitRound\(|completeBluebird\(/);
});

test("Camp default presentation mounts local Three.js with Canvas fallback", () => {
  assert.match(INDEX, /node_modules\/three\/build\/three\.module\.js/);
  assert.match(INDEX, /local_draco_loader\.js/);
  assert.match(INDEX, /three_camp_runtime\.js/);
  assert.match(INDEX, /three_camp_alignment\.js/);
  assert.match(INDEX, /params\.get\("renderer"\) !== "canvas"/);
  assert.match(INDEX, /Three Camp startup failed; keeping Canvas fallback/);
  assert.doesNotMatch(INDEX, /cdn\.jsdelivr\.net|gstatic\.com/);
});

test("Camp Three renderer contains authored stage landmarks and phase-driven atmosphere", () => {
  for (const marker of [
    "addLearningHut", "addClueCues", "addFirePit", "addRidge", "addBluebird",
    "featherLight", "footprints", "birdcall", "rewardSparkles", "getStageVisualPhase",
  ]) {
    assert.match(RUNTIME, new RegExp(marker));
  }
  assert.match(RUNTIME, /phaseId === "bluebird" \|\| phaseId === "reward"/);
  assert.match(RUNTIME, /phaseId === "reward"/);
});

test("Camp Three authored cues snap to authoritative interaction coordinates", () => {
  assert.match(ALIGNMENT, /import \{ CLUES, LANDMARKS \}/);
  assert.match(ALIGNMENT, /LANDMARKS\.hut/);
  assert.match(ALIGNMENT, /LANDMARKS\.firePit/);
  assert.match(ALIGNMENT, /clue\("footprints"\)/);
  assert.match(ALIGNMENT, /clue\("birdcall"\)/);
  assert.match(ALIGNMENT, /campLandmarkAlignment/);
  assert.match(INDEX, /alignCampLandmarks\(runtime\)/);
});

test("Jungle hub launches Camp through the upgraded Three.js presentation", () => {
  assert.match(HUB, /href="\.\/\?renderer=three"/);
  assert.match(HUB, /숲속 탐험 캠프/);
});
