import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX = readFileSync(resolve(__dirname, "..", "index.html"), "utf8");

test("qa=1 exposes gameplay state through a DOM mirror instead of relying only on window globals", () => {
  assert.match(INDEX, /params\.get\("qa"\) === "1"/);
  assert.match(INDEX, /qa-runtime-state/);
  assert.match(INDEX, /eduni-jungle-qa-v1/);
  assert.match(INDEX, /stageId: bridge\?\.stageId/);
  assert.match(INDEX, /player: player \? \{ x: player\.x, y: player\.y \}/);
  assert.match(INDEX, /state: bridge\?\.getState\?\.\(\)/);
  assert.match(INDEX, /el\.textContent = JSON\.stringify\(snapshot\)/);
});

test("DOM QA mirror reports Three readiness and refreshes while gameplay runs", () => {
  assert.match(INDEX, /threeReady:/);
  assert.match(INDEX, /#three-camp-runtime/);
  assert.match(INDEX, /setTimeout\(tick, 100\)/);
  assert.match(INDEX, /qaThreeReady = true/);
  assert.match(INDEX, /writeQaSnapshot\(\)/);
});
