import { chromium } from "playwright";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const ARTIFACTS = join(import.meta.dirname, "..", "..", "artifacts", "jungle-e2e");
if (!existsSync(ARTIFACTS)) mkdirSync(ARTIFACTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

await page.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

// Check game ready
const ready = await page.evaluate(() => {
  const b = globalThis.__eduniJungleGame;
  return { hasBridge: !!b, hasPlayer: !!b?.player, px: b?.player?.x, py: b?.player?.y };
});
console.log("Game ready:", JSON.stringify(ready));

// Check if QA panel exists
const qaPanel = await page.evaluate(() => {
  const panel = document.getElementById("qa-input-panel");
  return { exists: !!panel, childCount: panel?.children?.length };
});
console.log("QA panel:", JSON.stringify(qaPanel));

// Check if qa=1 was recognized
const qaState = await page.evaluate(() => {
  const el = document.getElementById("qa-runtime-state");
  return { exists: !!el, data: el?.dataset };
});
console.log("QA state:", JSON.stringify(qaState));

// Try keyboard input
console.log("Pressing ArrowRight...");
await page.keyboard.down("ArrowRight");
await page.waitForTimeout(500);
await page.keyboard.up("ArrowRight");
await page.waitForTimeout(200);

const afterMove = await page.evaluate(() => {
  const b = globalThis.__eduniJungleGame;
  return { px: b?.player?.x, py: b?.player?.y };
});
console.log("After ArrowRight:", JSON.stringify(afterMove));

// Try clicking QA button
console.log("Clicking qa-hold-right...");
const btnExists = await page.evaluate(() => !!document.getElementById("qa-hold-right"));
console.log("qa-hold-right exists:", btnExists);

if (btnExists) {
  await page.click("#qa-hold-right");
  await page.waitForTimeout(1200);
  const afterBtn = await page.evaluate(() => {
    const b = globalThis.__eduniJungleGame;
    return { px: b?.player?.x, py: b?.player?.y };
  });
  console.log("After QA button:", JSON.stringify(afterBtn));
}

// Try keyboard Enter for interact
console.log("Pressing Enter...");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);

const modalOpen = await page.evaluate(() => {
  const m = document.querySelector("#modal");
  return { display: m?.style?.display, text: m?.querySelector("#modal-title")?.textContent };
});
console.log("Modal:", JSON.stringify(modalOpen));

await page.screenshot({ path: join(ARTIFACTS, "debug-input.png") });
console.log("Debug screenshot saved");

await browser.close();
