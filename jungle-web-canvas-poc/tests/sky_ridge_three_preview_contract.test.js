import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SkyRidgeWorldGeometry } from "../src/geometry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREVIEW = resolve(__dirname, "..", "src", "three_sky_ridge_preview.js");
const PREVIEW_HTML = resolve(__dirname, "..", "sky-ridge-three.html");
const GAME_HTML = resolve(__dirname, "..", "sky-ridge-game.html");

test("Sky Ridge Three preview consumes shared walkable geometry", () => {
  const src = readFileSync(PREVIEW, "utf8");
  assert.ok(src.includes("SkyRidgeWorldGeometry"));
  assert.ok(src.includes("geometryContract.paths[0]"));
  assert.ok(src.includes("geometryContract.pathHalfWidth"));
  const geometry = new SkyRidgeWorldGeometry();
  assert.equal(geometry.paths[0][0].x, 200);
  assert.equal(geometry.paths[0].at(-1).x, 1450);
});

test("Sky Ridge preview contains authored final-stage landmarks", () => {
  const src = readFileSync(PREVIEW, "utf8");
  for (const landmark of ["ribbons", "shadow", "chime", "stars", "bridge", "hawk", "reward"]) {
    assert.ok(src.includes(landmark), `preview contains ${landmark}`);
  }
  assert.ok(src.includes("OrthographicCamera"));
  assert.ok(src.includes("OrbitControls"));
});

test("Sky Ridge pages use project-local Three.js import maps", () => {
  for (const file of [PREVIEW_HTML, GAME_HTML]) {
    const html = readFileSync(file, "utf8");
    assert.ok(html.includes("./node_modules/three/build/three.module.js"));
    assert.ok(html.includes("./node_modules/three/examples/jsm/"));
    assert.ok(!html.includes("cdn.jsdelivr.net"));
  }
});

test("Sky Ridge preview exposes all nine visual phases", () => {
  const src = readFileSync(PREVIEW, "utf8");
  for (const phase of ["skyGate","windRibbon","cloudShadow","windChime","starPattern","summitBridge","hawk","reward","complete"]) {
    assert.ok(src.includes(`\"${phase}\"`), `preview contains ${phase}`);
  }
  assert.ok(src.includes("globalThis.__eduniThreeSkyRidge"));
});
