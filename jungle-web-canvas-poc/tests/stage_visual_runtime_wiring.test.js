import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEEDBACK_JS = resolve(__dirname, "..", "src", "content", "feedback.js");
const THREE_RUNTIME_JS = resolve(__dirname, "..", "src", "three_waterfall_runtime.js");

test("Camp renderer consumes the shared stage visual director", () => {
  const src = readFileSync(FEEDBACK_JS, "utf8");
  assert.ok(src.includes('import { campVisualPhase } from "./stage_visual_director.js"'));
  assert.ok(src.includes("const visualPhase = campVisualPhase(state)"));
  assert.ok(src.includes("drawCampStageAtmosphere"));
  assert.ok(src.includes('phaseId === "firePit"'));
  assert.ok(src.includes('phase?.reveal === "open-sky"'));
});

test("Three Waterfall runtime consumes the shared stage visual director", () => {
  const src = readFileSync(THREE_RUNTIME_JS, "utf8");
  assert.ok(src.includes('import { waterfallVisualPhase } from "./content/stage_visual_director.js"'));
  assert.ok(src.includes("waterfallVisualPhase(bridge.getState())"));
  assert.ok(src.includes("runtime.scene.fog.density"));
  assert.ok(src.includes("runtime.renderer.toneMappingExposure"));
  assert.ok(src.includes("clearInterval"), "visual phase sync has a dispose path");
});

test("Stage-wide Three atmosphere sync does not add another render RAF", () => {
  const src = readFileSync(THREE_RUNTIME_JS, "utf8");
  assert.equal(src.includes("requestAnimationFrame"), false);
  assert.ok(src.includes("setInterval"));
});
