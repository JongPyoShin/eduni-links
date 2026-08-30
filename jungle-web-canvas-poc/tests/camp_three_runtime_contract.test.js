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
  assert.equal(walkable(geometry, LANDMARKS.hut), false, "hut body is solid");
  assert.equal(walkable(geometry, { x: LANDMARKS.hut.x, y: LANDMARKS.hut.y + 80 }), true, "hut interaction edge stays reachable");
  assert.equal(walkable(geometry, LANDMARKS.firePit), false, "fire pit center is solid");
  assert.equal(walkable(geometry, { x: LANDMARKS.firePit.x, y: 820 }), true, "fire pit interaction edge stays reachable");
  assert.equal(walkable(geometry, LANDMARKS.bluebird), true);
  for (const clue of CLUES) assert.equal(walkable(geometry, clue), true, `${clue.id} stays walkable`);
});

test("Camp shared geometry blocks visible solid props instead of letting the player walk through", () => {
  const geometry = new CampWorldGeometry();
  assert.ok(geometry.blockers.length >= 6);
  for (const blocker of geometry.blockers) {
    assert.equal(geometry.isWalkable(blocker.x, blocker.y), false, `${blocker.label} is solid`);
  }
  assert.match(readFileSync(resolve(ROOT, "src", "geometry.js"), "utf8"), /insideWalkableShape && !this\.isBlocked/);
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

test("Camp Three walk animation uses milliseconds and cardinal camera keeps arrows screen-aligned", () => {
  assert.match(RUNTIME, /playerSprite\.update\(dtSeconds \* 1000, moving, direction\)/);
  assert.match(RUNTIME, /camera\.position\.set\(focusX, 11\.5, focusZ \+ 8\.2\)/);
  assert.match(RUNTIME, /camera\.lookAt\(focusX, 0\.25, focusZ\)/);
  assert.doesNotMatch(RUNTIME, /focusX \+ 8\.1/);
});

test("Camp Three vendor assets are grounded from their actual bounding boxes", () => {
  assert.match(RUNTIME, /function groundVendorObject/);
  assert.match(RUNTIME, /new THREE\.Box3\(\)\.setFromObject\(object\)/);
  assert.match(RUNTIME, /desiredBaseY - box\.min\.y/);
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
