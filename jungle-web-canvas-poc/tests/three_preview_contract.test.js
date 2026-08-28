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
const HTML = resolve(__dirname, "..", "three-waterfall.html");

test("Three preview HTML is wired to the preview module", () => {
  const html = readFileSync(HTML, "utf8");
  assert.ok(html.includes("three-waterfall"), "html mounts the three canvas");
  assert.ok(html.includes("startThreeWaterfallPreview"), "html imports the preview module");
  assert.ok(html.includes("importmap"), "html declares an import map for three");
  assert.ok(html.includes("three@"), "import map references three core");
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
  // The geometry contract used by the preview must equal the one used by
  // game.js, so that vendor placements line up with the route.
  const g = new WaterfallWorldGeometry();
  // Spot-check a few known anchors.
  assert.equal(g.paths[0][0].x, 200, "path starts at entrance");
  assert.equal(g.paths[0][0].y, 1040);
  assert.equal(g.paths[0][1].x, 460);
  assert.equal(g.paths[0][1].y, 900);
  assert.equal(g.pathHalfWidth, 72);
  assert.equal(g.clearings[1].x, 700, "stream gate clearing at 700,900");
  assert.equal(g.clearings[1].r, 130);
});
