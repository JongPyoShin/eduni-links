// Preview-specific contract: the Three.js Waterfall preview must build a
// scene rooted in the same WaterfallWorldGeometry as the Canvas version,
// and it must boot without vendor GLBs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WaterfallWorldGeometry } from "../src/geometry.js";
import { THREEJSASSETS_FREE_MODELS, THREEJSASSETS_VENDOR_ROOT, threeVendorUrl } from "../src/three_vendor_manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREVIEW_JS = resolve(__dirname, "..", "src", "three_waterfall_preview.js");
const RUNTIME_JS = resolve(__dirname, "..", "src", "three_waterfall_runtime.js");
const GAME_JS = resolve(__dirname, "..", "src", "game.js");
const HTML = resolve(__dirname, "..", "three-waterfall.html");

test("Three preview HTML is wired to the local Three runtime", () => {
  const html = readFileSync(HTML, "utf8");
  assert.ok(html.includes("three-waterfall"), "html mounts the three canvas");
  assert.ok(html.includes("startThreeWaterfallPreview"), "html imports the preview module");
  assert.ok(html.includes("importmap"), "html declares an import map for three");
  assert.ok(html.includes("./node_modules/three/build/three.module.js"), "import map references local Three core");
  assert.ok(html.includes("./node_modules/three/examples/jsm/"), "import map references local Three addons");
  assert.ok(html.includes("./src/local_draco_loader.js"), "DRACOLoader is routed through the local decoder wrapper");
  assert.ok(!html.includes("cdn.jsdelivr.net"), "preview does not depend on the jsDelivr CDN");
});

test("preview module builds on WaterfallWorldGeometry", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes("WaterfallWorldGeometry"), "preview imports the shared geometry module");
  assert.ok(src.includes("geometryContract.paths[0]"), "preview consumes the path nodes");
  assert.ok(src.includes("geometryContract.pathHalfWidth"), "preview honors the walkable half width");
});

test("preview uses GLTFLoader + DRACOLoader for vendor models", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes("GLTFLoader"), "preview imports GLTFLoader");
  assert.ok(src.includes("DRACOLoader"), "preview imports DRACOLoader");
  assert.ok(src.includes("loader.setDRACOLoader"), "preview wires DRACO into the GLTF loader");
});

test("preview uses an orthographic camera with a non-FPS angle", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes("OrthographicCamera"), "preview uses OrthographicCamera");
  assert.ok(src.includes("OrbitControls"), "preview includes OrbitControls");
  assert.ok(!/PerspectiveCamera/.test(src), "preview does not use perspective");
});

test("preview creates the required scene landmarks", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  for (const landmark of [
    "addGround",        // basin / stream
    "addRoute",         // gameplay route from geometry
    "addWaterfall",     // waterfall
    "addSteppingStones",// stepping stones
    "addGate",          // entrance gate
    "addLookout",       // lookout platform
    "fallbackObject",   // procedural fallback
    "populateVendorAssets",
  ]) {
    assert.ok(src.includes(landmark), `preview defines ${landmark}`);
  }
});

test("preview falls back to procedural low-poly when a GLB is missing", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  // The load path catches errors and substitutes fallbackObject(...).
  assert.ok(/catch\s*\{[\s\S]*fallbackObject/.test(src) || /catch[\s\S]*fallbackObject/.test(src),
    "preview catches GLB load failures and inserts a fallback");
  // Every model in the manifest has a fallback kind.
  for (const [key, config] of Object.entries(THREEJSASSETS_FREE_MODELS)) {
    assert.ok(typeof config.fallback === "string" && config.fallback.length > 0,
      `model ${key} has a fallback kind`);
  }
});

test("vendor manifest is gitignored — GLBs are never committed", () => {
  // The vendor directory is intentionally gitignored.
  const root = resolve(__dirname, "..", "..");
  const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
  assert.ok(
    gitignore.includes("jungle-web-canvas-poc/assets/vendor/threejsassets/"),
    ".gitignore excludes the vendor GLB directory"
  );
});

test("vendor GLB filenames are placeholders when assets are not present", () => {
  for (const [key, config] of Object.entries(THREEJSASSETS_FREE_MODELS)) {
    const target = resolve(__dirname, "..", "assets", "vendor", "threejsassets", config.file);
    const present = existsSync(target);
    if (!present) {
      assert.ok(config.file.endsWith(".glb"), `model ${key} would be a .glb when present`);
    }
  }
  // The vendor root constant still points at the gitignored directory.
  assert.ok(THREEJSASSETS_VENDOR_ROOT.endsWith("assets/vendor/threejsassets/"),
    "vendor root constant points at the gitignored directory");
  assert.ok(threeVendorUrl({ file: "x.glb" }).endsWith("assets/vendor/threejsassets/x.glb"),
    "threeVendorUrl joins root + filename");
});

test("preview geometry derives the same world anchors as the Canvas renderer", () => {
  // The preview and gameplay both consume WaterfallWorldGeometry. Do not pin a
  // semantic landmark to a path-array index because the orthogonal route adds
  // explicit right-angle corner nodes between authored progression anchors.
  const g = new WaterfallWorldGeometry();
  const route = g.paths[0];
  assert.deepEqual(route[0], { x: 200, y: 1040 }, "path starts at entrance");
  assert.ok(route.some((node) => node.x === 700 && node.y === 900), "route includes the stream gate anchor");
  assert.ok(route.some((node) => node.x === 1080 && node.y === 700), "route includes the stepping-stones anchor");
  assert.ok(route.some((node) => node.x === 1450 && node.y === 330), "route includes the lookout anchor");
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i];
    const b = route[i + 1];
    assert.ok(a.x === b.x || a.y === b.y, `route segment ${i} stays horizontal/vertical`);
  }
  assert.equal(g.pathHalfWidth, 72);
  assert.equal(g.clearings[1].x, 700, "stream gate clearing at 700,900");
  assert.equal(g.clearings[1].y, 900);
  assert.equal(g.clearings[1].r, 130);
});

test("Three runtime is selected only by the waterfall renderer query", () => {
  const src = readFileSync(GAME_JS, "utf8");
  assert.ok(src.includes('get("renderer") === "three"'), "renderer=three is opt-in");
  assert.ok(src.includes("startThreeWaterfallRuntime"), "game mounts the production bridge");
  assert.ok(src.includes('get("stage") === "waterfall"'), "Three mode is scoped to Waterfall");
});

test("Three runtime consumes existing Waterfall state and geometry", () => {
  const src = readFileSync(RUNTIME_JS, "utf8");
  const preview = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes("getState"), "runtime receives read-only state");
  assert.ok(src.includes("logicalToThree"), "runtime exposes coordinate bridge");
  assert.ok(preview.includes("WaterfallWorldGeometry"), "renderer uses shared geometry");
  assert.ok(!src.includes("createWaterfallState"), "runtime does not define progression");
});

test("Canvas remains the default renderer and Three controls are debug-only", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes('get("threeDebug") === "1"'), "OrbitControls require explicit debug query");
  assert.ok(src.includes("controls.enabled = debugControls"), "controls are disabled in normal mode");
  assert.ok(src.includes("export function logicalToThree"), "logical-to-Three bridge is explicit");
});

test("Three mode skips the Canvas draw path while preserving gameplay updates", () => {
  const src = readFileSync(GAME_JS, "utf8");
  assert.ok(src.includes("if (!threeMode)"), "Canvas draw branch is gated in Three mode");
  assert.ok(src.includes("playerSprite.update"), "player animation update remains in gameplay loop");
  assert.ok(src.includes("nearestWaterfallInteractable"), "interaction lookup remains active");
});

test("renderer query tolerates escaped ampersands from copied links", () => {
  const src = readFileSync(GAME_JS, "utf8");
  assert.ok(src.includes('replaceAll("\\\\&", "&")'), "escaped query separators are normalized");
  assert.ok(src.includes('params.get("renderer") === "three"'), "normalized renderer query selects Three");
});

test("Three player visual caches textures and links halo lifecycle", () => {
  const src = readFileSync(PREVIEW_JS, "utf8");
  assert.ok(src.includes("textureCache = new Map"), "player textures are cached");
  assert.ok(src.includes("cacheTexture"), "frame swaps use cache lookup");
  assert.ok(src.includes("disposeTextures"), "cached textures have disposal path");
  assert.ok(src.includes("player.glow.position.set"), "halo follows player");
});
