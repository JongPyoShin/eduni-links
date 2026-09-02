import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const snap = async () => page.evaluate(() => { const b = globalThis.__eduniJungleGame; return { x: b?.player?.x, y: b?.player?.y }; });
console.log("Start:", await snap());

// Single long hold: ArrowUp for 10 seconds
console.log("Holding ArrowUp for 10s via page.keyboard...");
const t0 = Date.now();
await page.keyboard.down("ArrowUp");
await page.waitForTimeout(10000);
await page.keyboard.up("ArrowUp");
const t1 = Date.now();
console.log(`Time: ${t1-t0}ms`);
console.log("After 10s up:", await snap());

// Now try dispatchEvent for 10s
console.log("\nResetting, then dispatchEvent up for 10s...");
// Reload to reset position
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
console.log("After reload:", await snap());

await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp", bubbles: true })));
const t2 = Date.now();
await page.waitForTimeout(10000);
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp", bubbles: true })));
const t3 = Date.now();
console.log(`Time: ${t3-t2}ms`);
console.log("After dispatchEvent 10s:", await snap());

await browser.close();
