import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = readFileSync(resolve(__dirname, "..", "src", "input.js"), "utf8");

test("qa=1 creates native clickable controls for browser tools without Event/setAttribute access", () => {
  assert.match(INPUT, /qa-input-panel/);
  assert.match(INPUT, /eduni-jungle-click-input-v1/);
  for (const id of ["qa-hold-up", "qa-hold-down", "qa-hold-left", "qa-hold-right", "qa-interact", "qa-close"]) {
    assert.match(INPUT, new RegExp(id));
  }
  assert.match(INPUT, /button\.addEventListener\("click", \(\) => this\._qaPulse/);
});

test("clickable QA movement holds the same digital action state across real RAF time", () => {
  assert.match(INPUT, /this\.setDigitalAction\(action, true\)/);
  assert.match(INPUT, /window\.setTimeout\(\(\) => \{/);
  assert.match(INPUT, /this\.setDigitalAction\(action, false\)/);
  assert.match(INPUT, /action === "interact" \|\| action === "close" \? 80 : durationMs/);
  assert.match(INPUT, /el\.dataset\.source = source/);
});
