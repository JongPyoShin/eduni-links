import { chromium } from "playwright";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-e2e");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

// Verify game ready
const s0 = await page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("Start:", s0);

// Use page.evaluate to call the InputController directly through the game's QA bridge
// This is READ ONLY - we're reading the bridge, not mutating state
// But we need to dispatch events through the DOM

// Try dispatchEvent approach for QA buttons
async function qaHold(dir, ms = 1000) {
  await page.evaluate(({ dir, ms }) => {
    const btn = document.getElementById(`qa-hold-${dir}`);
    if (!btn) return;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    setTimeout(() => btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })), ms);
  }, { dir, ms });
  await page.waitForTimeout(ms + 200);
}

async function qaInteract() {
  await page.evaluate(() => {
    const btn = document.getElementById("qa-interact");
    if (!btn) return;
    btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    setTimeout(() => btn.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })), 80);
  });
  await page.waitForTimeout(200);
}

// Move up for 3 seconds
console.log("Holding up for 3s via dispatchEvent...");
await qaHold("up", 3000);
const s1 = await page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("After 3s up:", s1, `(moved ${s0.y - s1.y} px)`);

// Move up again
await qaHold("up", 3000);
const s2 = await page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("After 6s up:", s2, `(total ${s0.y - s2.y} px)`);

// Try right
await qaHold("right", 2000);
const s3 = await page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("After right:", s3);

// Try interact
await qaInteract();
const modal = await page.evaluate(() => {
  const m = document.querySelector("#modal");
  return { display: m?.style?.display, title: m?.querySelector("#modal-title")?.textContent };
});
console.log("Modal after interact:", modal);

await page.screenshot({ path: join(ART, "debug-qa-hold.png") });
await browser.close();
