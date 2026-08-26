import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(join(HERE, "..", "src"));

function listSrcJs() {
  return readdirSync(SRC)
    .filter((f) => f.endsWith(".js"))
    .sort();
}

// Regression for the input.js SyntaxError that escaped unit tests.
// `node --check` performs a syntax-only parse of an ES module file
// without executing it, so missing browser globals (window, document,
// Image) do NOT mask a real syntax error. This is the smallest
// practical parse-validation step that catches the
// `dpad-left: "left"` class of bug.
test("every shipped src/*.js file parses as a valid ES module", () => {
  const files = listSrcJs();
  assert.ok(files.length > 0, "expected at least one src/*.js file");
  for (const f of files) {
    const file = join(SRC, f);
    const r = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    assert.equal(
      r.status,
      0,
      `${f} failed to parse:\n${r.stderr || r.stdout}`
    );
  }
});
