import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GAME = readFileSync(resolve(ROOT, "src", "game.js"), "utf8");
const INDEX = readFileSync(resolve(ROOT, "index.html"), "utf8");

test("base gameplay no longer statically links the optional Three Waterfall runtime", () => {
  assert.doesNotMatch(
    GAME,
    /^import\s+\{\s*startThreeWaterfallRuntime\s*\}\s+from\s+["']\.\/three_waterfall_runtime\.js["'];?$/m,
  );
  assert.match(GAME, /await import\("\.\/three_waterfall_runtime\.js"\)/);
  assert.match(GAME, /Three Waterfall runtime failed; keeping Canvas fallback/);
  assert.match(GAME, /threeMode = false/);
});

test("gameplay bridge and startup diagnostics exist before presentation awaits", () => {
  const bridgeAt = GAME.indexOf("globalThis.__eduniJungleGame = Object.freeze");
  const startupAt = GAME.indexOf("globalThis.__eduniJungleStartup = startup");
  const firstAssetAwait = GAME.indexOf("await preload([");
  assert.ok(startupAt >= 0, "startup diagnostics are exposed");
  assert.ok(bridgeAt >= 0, "gameplay bridge is exposed");
  assert.ok(firstAssetAwait >= 0, "scene preload remains explicit");
  assert.ok(startupAt < firstAssetAwait, "startup diagnostics precede asset waits");
  assert.ok(bridgeAt < firstAssetAwait, "gameplay bridge precedes asset waits");
  assert.match(GAME, /phase: "preloading-scene-assets"/);
  assert.match(GAME, /startup\.phase = "preloading-player-sprites"/);
  assert.match(GAME, /startup\.phase = "ready"/);
  assert.match(GAME, /startup\.presentationError/);
});

test("qa DOM mirror starts before start() resolves and exposes startup detail", () => {
  const mirrorAt = INDEX.indexOf("startQaDomMirror();");
  const startAt = INDEX.indexOf("await start(canvas, modalEl);");
  assert.ok(mirrorAt >= 0 && startAt >= 0 && mirrorAt < startAt, "QA mirror begins before gameplay awaits");
  assert.match(INDEX, /globalThis\.__eduniJungleStartup/);
  assert.match(INDEX, /startupDetail:/);
  assert.match(INDEX, /lastCompletedStep:/);
  assert.match(INDEX, /presentationError:/);
});
