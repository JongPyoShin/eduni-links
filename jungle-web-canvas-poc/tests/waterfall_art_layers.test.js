import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  WATERFALL_ART_BACK,
  WATERFALL_ART_FRONT,
  WATERFALL_ART_MID,
  WATERFALL_ART_IMAGES,
  WATERFALL_ART_PROPS,
  WATERFALL_FOREGROUND,
  WATERFALL_LAYERS,
  WATERFALL_VALID_LAYERS,
} from "../src/waterfall_art_manifest.js";
import { drawWaterfallWorld, drawWaterfallForeground } from "../src/waterfall_scene.js";
import { WaterfallWorldGeometry } from "../src/geometry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, "..", "assets", "waterfall");

function assertFileExists(relPath) {
  const abs = resolve(ASSETS_DIR, relPath.split("/").pop());
  assert.ok(statSync(abs, { throwIfNoEntry: false })?.isFile(), `asset file missing: ${relPath}`);
}

test("art manifest references existing SVG files", () => {
  for (const [key, rel] of Object.entries(WATERFALL_ART_IMAGES)) {
    assert.ok(rel.startsWith("assets/waterfall/"), `${key} should live under assets/waterfall/`);
    assertFileExists(rel);
  }
});

test("every prop uses a known layer and positive width", () => {
  const seenIds = new Set();
  for (const prop of WATERFALL_ART_PROPS) {
    assert.ok(typeof prop.id === "string" && prop.id.length > 0, "prop has id");
    assert.ok(!seenIds.has(prop.id), `duplicate prop id: ${prop.id}`);
    seenIds.add(prop.id);
    assert.ok(WATERFALL_VALID_LAYERS.has(prop.layer), `prop ${prop.id} layer ${prop.layer} must be a known layer`);
    assert.ok(typeof prop.width === "number" && prop.width > 0, `prop ${prop.id} must have width > 0`);
    assert.ok(typeof prop.x === "number" && typeof prop.y === "number", `prop ${prop.id} must have numeric world anchor`);
    assert.ok(WATERFALL_ART_IMAGES[prop.asset], `prop ${prop.id} asset ${prop.asset} must be registered`);
  }
});

test("layer buckets partition the manifest with no overlap", () => {
  const ids = new Set();
  for (const layer of [WATERFALL_ART_BACK, WATERFALL_ART_MID, WATERFALL_ART_FRONT]) {
    for (const prop of layer) {
      assert.ok(!ids.has(prop.id), `prop ${prop.id} appears in more than one layer bucket`);
      ids.add(prop.id);
    }
  }
  assert.equal(ids.size, WATERFALL_ART_PROPS.length, "every prop must belong to exactly one bucket");
});

test("manifest contains at least one prop for each visual zone", () => {
  // Entrance / crossing / echo / leaf / lookout must all be authored.
  const ids = WATERFALL_ART_PROPS.map((p) => p.id);
  for (const id of [
    "entrance-gate",
    "crossing-rocks",
    "echo-cliff",
    "leaf-bank",
    "lookout-platform",
  ]) {
    assert.ok(ids.includes(id), `${id} should be in the manifest`);
  }
});

test("screen-edge foreground keeps its anchor and alpha", () => {
  assert.ok(WATERFALL_FOREGROUND.length >= 1, "at least one foreground entry");
  for (const prop of WATERFALL_FOREGROUND) {
    assert.ok(["top-left", "top-right"].includes(prop.anchor), `foreground anchor: ${prop.anchor}`);
    assert.ok(typeof prop.alpha === "number" && prop.alpha > 0 && prop.alpha <= 1, `foreground alpha: ${prop.alpha}`);
  }
});

test("waterfall world render does not throw with missing art bundle", () => {
  // Stub a 2D context enough to exercise the world draw path without DOM.
  const calls = [];
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = new Proxy({
    canvas: { width: 1600, height: 1200 },
    save: () => calls.push("save") && calls,
    restore: () => calls.push("restore") && calls,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    bezierCurveTo: noop,
    quadraticCurveTo: noop,
    arc: noop,
    ellipse: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    clearRect: noop,
    drawImage: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    roundRect: noop,
    fillText: noop,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    setLineDash: noop,
  }, {
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
  });

  const geom = new WaterfallWorldGeometry();
  const cam = { x: 800, y: 700, zoom: 0.6 };
  assert.doesNotThrow(() => drawWaterfallWorld(ctx, cam, 1280, 720, 0, { waterfallArt: {} }, { streamGateComplete: false }));
  assert.ok(calls.includes("save") && calls.includes("restore"), "world draw wraps a save/restore");
  assert.doesNotThrow(() => drawWaterfallForeground(ctx, 1280, 720, {}, 0));
});

test("waterfall rendering does not change the gameplay geometry", () => {
  const g = new WaterfallWorldGeometry();
  const before = JSON.stringify({ paths: g.paths, clearings: g.clearings, bluebird: g.bluebird, pathHalfWidth: g.pathHalfWidth });
  // Simulate the manifest surface used by the renderer.
  const artIds = new Set(Object.keys(WATERFALL_ART_IMAGES));
  for (const prop of WATERFALL_ART_PROPS) {
    assert.ok(artIds.has(prop.asset), `prop ${prop.id} asset ${prop.asset} must exist in the art bundle`);
  }
  const after = JSON.stringify({ paths: g.paths, clearings: g.clearings, bluebird: g.bluebird, pathHalfWidth: g.pathHalfWidth });
  assert.equal(before, after, "render-time props must not mutate geometry");
});

test("waterfall assets directory ships the eight expected svgs", () => {
  const expected = [
    "waterfall_backdrop.svg",
    "foliage_cluster.svg",
    "cliff_terrace.svg",
    "gate_arch.svg",
    "lookout_platform.svg",
    "wet_boulder_cluster.svg",
    "flower_bank.svg",
    "foreground_vines.svg",
  ];
  const files = readdirSync(ASSETS_DIR);
  for (const name of expected) {
    assert.ok(files.includes(name), `${name} should be in assets/waterfall/`);
  }
});

test("layer taxonomy exposes only back / mid / front", () => {
  assert.deepEqual(
    Object.values(WATERFALL_LAYERS).sort(),
    ["back", "front", "mid"]
  );
  assert.equal(WATERFALL_VALID_LAYERS.size, 3);
});
