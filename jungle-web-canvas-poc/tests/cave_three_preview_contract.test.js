import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PREVIEW = readFileSync(join(ROOT, "src", "three_cave_preview.js"), "utf8");
const HTML = readFileSync(join(ROOT, "cave-three.html"), "utf8");

test("Firefly Cave preview uses shared CaveWorldGeometry", () => {
  assert.match(PREVIEW, /CaveWorldGeometry/);
  assert.match(PREVIEW, /geometryContract\.paths\[0\]/);
  assert.match(PREVIEW, /pathHalfWidth/);
});

test("Firefly Cave preview uses real local GLBs with Draco fallback safety", () => {
  assert.match(PREVIEW, /GLTFLoader/);
  assert.match(PREVIEW, /DRACOLoader/);
  assert.match(PREVIEW, /threeVendorUrl/);
  assert.match(PREVIEW, /boulder/);
  assert.match(PREVIEW, /rockCluster/);
  assert.match(PREVIEW, /mossyBoulder/);
  assert.match(PREVIEW, /fallbackRock/);
});

test("Firefly Cave preview exposes every authored story phase", () => {
  for (const phase of ["caveGate", "glowTrail", "echoCrystal", "shadowMark", "fireflyPattern", "crystalBridge", "bat", "reward", "complete"]) {
    assert.ok(PREVIEW.includes(`\"${phase}\"`), `missing cave phase ${phase}`);
  }
  assert.match(PREVIEW, /getStageVisualPhase\("cave"/);
  assert.match(PREVIEW, /setPhase/);
});

test("Firefly Cave preview page is tablet-friendly and stage-step controllable", () => {
  assert.match(HTML, /viewport/);
  assert.match(HTML, /touch-action: none/);
  assert.match(HTML, /id="prev"/);
  assert.match(HTML, /id="next"/);
  assert.match(HTML, /startThreeCavePreview/);
});
