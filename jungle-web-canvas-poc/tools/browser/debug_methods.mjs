import { chromium } from "playwright";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-e2e");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const snap = async () => page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("Start:", await snap());

// Method 1: page.click on QA button
console.log("Method 1: page.click qa-hold-up");
await page.click("#qa-hold-up");
await page.waitForTimeout(1200);
console.log("After click:", await snap());

// Method 2: evaluate to dispatch pointerdown then wait, then pointerup
console.log("Method 2: evaluate pointerdown/pointerup");
await page.evaluate(() => {
  const btn = document.getElementById("qa-hold-up");
  btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
});
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const btn = document.getElementById("qa-hold-up");
  btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
});
await page.waitForTimeout(200);
console.log("After eval hold:", await snap());

// Method 3: keyboard down/up directly
console.log("Method 3: keyboard down/up");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(2000);
await page.keyboard.up("ArrowUp");
await page.waitForTimeout(200);
console.log("After keyboard:", await snap());

// Method 4: click then immediate interact
console.log("Method 4: click hut-area then interact");
// First get to a known position
for (let i = 0; i < 5; i++) {
  await page.click("#qa-hold-up");
  await page.waitForTimeout(1200);
}
console.log("After 5x up:", await snap());

// Try interact
await page.click("#qa-interact");
await page.waitForTimeout(500);
const m = await page.evaluate(() => {
  const modal = document.querySelector("#modal");
  return { display: modal?.style?.display, title: modal?.querySelector("#modal-title")?.textContent };
});
console.log("Modal:", m);

await page.screenshot({ path: join(ART, "debug-methods.png") });
await browser.close();
