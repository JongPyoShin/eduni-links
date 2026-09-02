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

// Method A: Directly set input state via evaluate (using game bridge)
console.log("Method A: Direct keyboard event dispatch to window");
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
});
await page.waitForTimeout(3000);
await page.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
});
await page.waitForTimeout(200);
console.log("After dispatchEvent up:", await snap());

// Method B: page.keyboard with hold
console.log("Method B: page.keyboard.down/up ArrowUp 3s");
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(3000);
await page.keyboard.up("ArrowUp");
await page.waitForTimeout(200);
console.log("After keyboard up:", await snap());

// Method C: Click on canvas first, then keyboard
console.log("Method C: Click canvas, then keyboard");
await page.click("canvas");
await page.waitForTimeout(200);
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(3000);
await page.keyboard.up("ArrowUp");
await page.waitForTimeout(200);
console.log("After canvas+keyboard:", await snap());

// Method D: Use the input command element
console.log("Method D: qa-input-command data-command");
await page.evaluate(() => {
  const el = document.getElementById("qa-input-command");
  if (el) el.dataset.command = "1:up:down";
});
await page.waitForTimeout(3000);
await page.evaluate(() => {
  const el = document.getElementById("qa-input-command");
  if (el) el.dataset.command = "2:up:up";
});
await page.waitForTimeout(200);
console.log("After command:", await snap());

await page.screenshot({ path: join(ART, "debug-all-methods.png") });
await browser.close();
