import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const WATERFALL = readFileSync(resolve(ROOT, "src", "three_waterfall_runtime.js"), "utf8");
const CAVE = readFileSync(resolve(ROOT, "src", "cave_game.js"), "utf8");
const GIANT_TREE = readFileSync(resolve(ROOT, "src", "giant_tree_game.js"), "utf8");
const SKY_RIDGE = readFileSync(resolve(ROOT, "src", "sky_ridge_game.js"), "utf8");

function assertCardinalGameCamera(source, y) {
  assert.match(source, /const targetZ = THREE\.MathUtils\.clamp\(p\.z, -3\.0, 3\.0\)/);
  assert.match(source, /runtime\.camera\.position\.x = runtime\.controls\.target\.x/);
  assert.match(source, /runtime\.camera\.position\.z = runtime\.controls\.target\.z \+ 8\.2/);
  assert.match(source, new RegExp(`runtime\\.camera\\.position\\.y = ${String(y).replace(".", "\\.")}`));
  assert.doesNotMatch(source, /p\.z \* 0\.62/);
  assert.doesNotMatch(source, /runtime\.controls\.target\.x \+ 8\.0/);
}

test("Waterfall production renderer overrides its preview camera with cardinal gameplay axes", () => {
  assert.match(WATERFALL, /installCardinalGameplayCamera/);
  assert.match(WATERFALL, /runtime\.camera\.position\.set\(runtime\.controls\.target\.x, 11\.5, runtime\.controls\.target\.z \+ 8\.2\)/);
  assert.doesNotMatch(WATERFALL, /requestAnimationFrame/);
});

test("Cave gameplay camera keeps D-pad arrows screen-aligned", () => {
  assertCardinalGameCamera(CAVE, 11.5);
});

test("Giant Tree gameplay camera keeps D-pad arrows screen-aligned", () => {
  assertCardinalGameCamera(GIANT_TREE, 12.0);
});

test("Sky Ridge gameplay camera keeps D-pad arrows screen-aligned", () => {
  assertCardinalGameCamera(SKY_RIDGE, 12.0);
});
