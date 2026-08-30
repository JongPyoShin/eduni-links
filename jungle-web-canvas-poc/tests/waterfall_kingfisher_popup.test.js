import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GAME = readFileSync(resolve(ROOT, "src", "game.js"), "utf8");

test("Waterfall lookout immediately surfaces the kingfisher encounter popup", () => {
  assert.match(GAME, /function openKingfisherEncounter\(\)/);
  assert.match(GAME, /title: "물총새를 만났어!"/);
  assert.match(
    GAME,
    /kind === "lookout"[\s\S]*completeLookout\(waterfall\)[\s\S]*openKingfisherEncounter\(\)[\s\S]*return;/
  );
});

test("Waterfall kingfisher confirmation immediately opens the badge ceremony", () => {
  assert.match(
    GAME,
    /kind === "kingfisher"[\s\S]*completeKingfisher\(waterfall\)[\s\S]*openWaterfallRewardCeremony\(ts\)[\s\S]*return;/
  );
});

test("Waterfall kingfisher can still be reopened from its interaction target", () => {
  assert.match(
    GAME,
    /item\.type === "kingfisher"[\s\S]*openKingfisherEncounter\(\)[\s\S]*return;/
  );
});
