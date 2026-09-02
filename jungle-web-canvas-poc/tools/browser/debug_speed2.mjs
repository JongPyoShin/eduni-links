import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
await p.setViewportSize({ width: 1280, height: 720 });
await p.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);

const gs = () => p.evaluate(() => { const g = globalThis.__eduniJungleGame; return g?.player ? { x:g.player.x, y:g.player.y } : null; });

let s = await gs();
console.log(`Start: ${s.x},${s.y}`);

// Hold ArrowUp for exactly 1s, check position
await p.keyboard.down("ArrowUp");
await p.waitForTimeout(1000);
await p.keyboard.up("ArrowUp");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 1s up: ${s.x},${s.y} (moved ${1040-s.y}px)`);

// Hold ArrowUp for 2 more seconds
await p.keyboard.down("ArrowUp");
await p.waitForTimeout(2000);
await p.keyboard.up("ArrowUp");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 3s up: ${s.x},${s.y}`);

// Hold ArrowRight for 1s
await p.keyboard.down("ArrowRight");
await p.waitForTimeout(1000);
await p.keyboard.up("ArrowRight");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 1s right: ${s.x},${s.y}`);

// Hold ArrowRight for 2s
await p.keyboard.down("ArrowRight");
await p.waitForTimeout(2000);
await p.keyboard.up("ArrowRight");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 3s right: ${s.x},${s.y}`);

// Hold ArrowRight for 3s more
await p.keyboard.down("ArrowRight");
await p.waitForTimeout(3000);
await p.keyboard.up("ArrowRight");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 6s right: ${s.x},${s.y}`);

// Hold ArrowUp for 5s
await p.keyboard.down("ArrowUp");
await p.waitForTimeout(5000);
await p.keyboard.up("ArrowUp");
await p.waitForTimeout(200);
s = await gs();
console.log(`After 5s up: ${s.x},${s.y}`);

// Check if we're near hut
const near = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return g?.getNearestInteractable?.()?.id || null;
});
console.log(`Near: ${near}`);

await p.close();
await b.close();
