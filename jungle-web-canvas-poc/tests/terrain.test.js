import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import {
  sampleHeight,
  sampleNormal,
  generateTerrainMesh,
  getTerrainInfo,
  validateTerrainMesh,
} from "../src/terrain.js";
import { WaterfallWorldGeometry } from "../src/geometry.js";

test("terrain height sampling is deterministic", () => {
  const h1 = sampleHeight(700, 900);
  const h2 = sampleHeight(700, 900);
  assert.equal(h1, h2);
  const h3 = sampleHeight(1450, 330);
  const h4 = sampleHeight(1450, 330);
  assert.equal(h3, h4);
  const h5 = sampleHeight(820, 760);
  const h6 = sampleHeight(820, 760);
  assert.equal(h5, h6);
});

test("lookout height is greater than entry height", () => {
  const entryH = sampleHeight(700, 900);
  const lookoutH = sampleHeight(1450, 330);
  assert.ok(lookoutH > entryH, `lookout ${lookoutH} should be higher than entry ${entryH}`);
});

test("authored Waterfall route unchanged", () => {
  const geo = new WaterfallWorldGeometry();
  const route = geo.paths[0];
  const expected = [
    { x: 200, y: 1040 }, { x: 200, y: 900 }, { x: 700, y: 900 },
    { x: 700, y: 760 }, { x: 900, y: 760 }, { x: 900, y: 700 },
    { x: 1080, y: 700 }, { x: 1080, y: 560 }, { x: 1170, y: 560 },
    { x: 1170, y: 480 }, { x: 1020, y: 480 }, { x: 1020, y: 470 },
    { x: 1250, y: 470 }, { x: 1250, y: 330 }, { x: 1450, y: 330 },
  ];
  assert.equal(route.length, expected.length);
  for (let i = 0; i < route.length; i++) {
    assert.deepEqual(route[i], expected[i], `route point ${i} must match`);
  }
});

test("all interaction X/Y/radii unchanged", () => {
  const geo = new WaterfallWorldGeometry();
  const clearings = geo.clearings;
  assert.equal(clearings.length, 4);
  assert.deepEqual(clearings[0], { x: 200, y: 1040, r: 130, label: "Waterfall Entrance" });
  assert.deepEqual(clearings[1], { x: 700, y: 900, r: 130, label: "Stream Gate" });
  assert.deepEqual(clearings[2], { x: 1170, y: 560, r: 120, label: "Waterfall Basin" });
  assert.deepEqual(clearings[3], { x: 1450, y: 330, r: 140, label: "Waterfall Lookout" });
  assert.equal(geo.pathHalfWidth, 72);
});

test("generated terrain vertices are finite and valid", () => {
  const mesh = generateTerrainMesh(160, 108);
  const validation = validateTerrainMesh(mesh);
  assert.equal(validation.finite, true, "all vertices must be finite");
  assert.ok(validation.vertexCount > 0, "must have vertices");
  assert.ok(validation.minHeight >= 0, "min height should be >= 0");
  assert.ok(validation.maxHeight <= 3.5, "max height should be <= 3.5");
  assert.ok(Number.isFinite(validation.minHeight));
  assert.ok(Number.isFinite(validation.maxHeight));
  assert.equal(mesh.vertices.length % 3, 0);
  assert.equal(mesh.normals.length % 3, 0);
  assert.equal(mesh.uvs.length % 2, 0);
  assert.ok(mesh.indices.length > 0);
  assert.ok(mesh.indices.length % 3 === 0);
});

test("no WebGPU dependency in terrain module", () => {
  const content = fs.readFileSync(new URL("../src/terrain.js", import.meta.url), "utf-8");
  assert.ok(!content.includes("WebGPU"));
  assert.ok(!content.includes("webgpu"));
  assert.ok(!content.includes("GPUDevice"));
  assert.ok(!content.includes("GPUCanvasContext"));
});

test("no React/R3F dependency in terrain module", () => {
  const content = fs.readFileSync(new URL("../src/terrain.js", import.meta.url), "utf-8");
  assert.ok(!content.includes("react"));
  assert.ok(!content.includes("React"));
  assert.ok(!content.includes("r3f"));
  assert.ok(!content.includes("@react-three/fiber"));
  assert.ok(!content.includes("three-fiber"));
});

test("terrain normal sampler returns valid normals", () => {
  const n = sampleNormal(700, 900);
  assert.ok(Number.isFinite(n.x));
  assert.ok(Number.isFinite(n.y));
  assert.ok(Number.isFinite(n.z));
  const len = Math.hypot(n.x, n.y, n.z);
  assert.ok(Math.abs(len - 1) < 0.01, `normal should be unit length, got ${len}`);
});

test("terrain info exposes expected ranges", () => {
  const info = getTerrainInfo();
  assert.equal(info.minHeight, 0.0);
  assert.equal(info.maxHeight, 3.5);
  assert.equal(info.entryHeight, 0.15);
  assert.equal(info.lookoutHeight, 2.8);
  assert.equal(info.samplingResolution, 20);
  assert.ok(info.gridWidth > 0);
  assert.ok(info.gridHeight > 0);
  assert.equal(info.worldWidth, 1600);
  assert.equal(info.worldHeight, 1080);
});

test("terrain height at stream/stepping stone area is low", () => {
  const streamH = sampleHeight(820, 760);
  const stoneH = sampleHeight(1080, 700);
  assert.ok(streamH < 0.5, `stream area should be low, got ${streamH}`);
  assert.ok(stoneH < 0.5, `stepping stone area should be low, got ${stoneH}`);
});

test("terrain height at mist section is rising", () => {
  const mistStartH = sampleHeight(1020, 480);
  const mistEndH = sampleHeight(1250, 470);
  assert.ok(mistEndH >= mistStartH - 0.2, `mist section should not drop significantly`);
});

test("terrain does not create visual walls across walkable route", () => {
  const geo = new WaterfallWorldGeometry();
  const route = geo.paths[0];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const ha = sampleHeight(a.x, a.y);
    const hb = sampleHeight(b.x, b.y);
    const diff = Math.abs(ha - hb);
    // Allow slightly steeper transitions for mist section rise
    assert.ok(diff < 1.5, `route segment ${i} height difference ${diff} too steep`);
  }
});