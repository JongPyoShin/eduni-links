import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("Three.js runtime is pinned as a project-local dependency", async () => {
  const pkg = JSON.parse(await text("package.json"));
  assert.equal(pkg.dependencies?.three, "0.180.0");
});

test("all Three.js entry pages use local import maps", async () => {
  for (const file of ["index.html", "three-waterfall.html", "cave-three.html"]) {
    const html = await text(file);
    assert.match(html, /\.\/node_modules\/three\/build\/three\.module\.js/);
    assert.match(html, /\.\/node_modules\/three\/examples\/jsm\//);
    assert.match(html, /\.\/src\/local_draco_loader\.js/);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net/);
  }
});

test("Draco decoder is forced to the local Three.js package", async () => {
  const source = await text("src/local_draco_loader.js");
  assert.match(source, /three\/addons-local\/loaders\/DRACOLoader\.js/);
  assert.match(source, /\.\/node_modules\/three\/examples\/jsm\/libs\/draco\//);
  assert.match(source, /setDecoderPath\(_path\)/);
});

test("dev server serves WebAssembly and GLB assets with explicit MIME types", async () => {
  const server = await text("server.mjs");
  assert.match(server, /"\.wasm": "application\/wasm"/);
  assert.match(server, /"\.glb": "model\/gltf-binary"/);
});
