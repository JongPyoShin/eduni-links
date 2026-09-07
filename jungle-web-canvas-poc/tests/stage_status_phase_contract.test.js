import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const [name, file] of [
  ["Cave", "three_cave_preview.js"],
  ["Giant Tree", "three_giant_tree_preview.js"],
]) {
  test(`${name} status uses the authoritative phase array`, () => {
    const source = readFileSync(join(ROOT, "src", file), "utf8");
    assert.match(source, /PHASES\[phaseIndex\]/);
    assert.doesNotMatch(source, /setStatus\([^\n]*currentPhase\.phaseId/);
  });
}
