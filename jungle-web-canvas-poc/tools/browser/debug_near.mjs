import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
await p.setViewportSize({ width: 1280, height: 720 });

// CAMP
console.log("=== CAMP ===");
await p.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(5000);

let s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  if (!g) return { error: "no game" };
  const acts = typeof g.getInteractables === "function" ? g.getInteractables() : "no getInteractables";
  const near = typeof g.getNearestInteractable === "function" ? g.getNearestInteractable() : "no getNearest";
  return { x: g.player?.x, y: g.player?.y, state: g.getState?.(), acts, near };
});
console.log("Initial:", JSON.stringify(s, null, 2));

// Move to tent clearing
const SPEED = 48;
async function holdDir(dir, ms) {
  const code = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" }[dir];
  await p.evaluate((c) => window.dispatchEvent(new KeyboardEvent("keydown", { code: c, key: c, bubbles: true })), code);
  await p.waitForTimeout(ms);
  await p.evaluate((c) => window.dispatchEvent(new KeyboardEvent("keyup", { code: c, key: c, bubbles: true })), code);
  await p.waitForTimeout(200);
}

// Move up to y~620
await holdDir("up", 8750); // 420px / 48px/s = 8.75s
s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return { x: g.player?.x, y: g.player?.y, near: g.getNearestInteractable?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("After up:", JSON.stringify(s, null, 2));

// Move right to tent
await holdDir("right", 6670); // 320px / 48px/s
s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return { x: g.player?.x, y: g.player?.y, near: g.getNearestInteractable?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("After right:", JSON.stringify(s, null, 2));

// Move up to tent clearing center
await holdDir("up", 6250); // 300px / 48px/s
s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return { x: g.player?.x, y: g.player?.y, near: g.getNearestInteractable?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("After up2:", JSON.stringify(s, null, 2));

// Move left to hut
await holdDir("left", 2000);
s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return { x: g.player?.x, y: g.player?.y, near: g.getNearestInteractable?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("Near hut:", JSON.stringify(s, null, 2));

// Check hint element
const hint = await p.evaluate(() => {
  const el = document.querySelector("#context-hint");
  return { text: el?.textContent, visible: el?.classList.contains("visible") };
});
console.log("Hint:", JSON.stringify(hint));

// WATERFALL
console.log("\n=== WATERFALL ===");
await p.goto("http://localhost:8124/?stage=waterfall&renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(5000);

s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  if (!g) return { error: "no game" };
  return { x: g.player?.x, y: g.player?.y, state: g.getState?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("WF Initial:", JSON.stringify(s, null, 2));

// Move to gate (700,900)
await holdDir("down", 2917); // 140px
await holdDir("right", 10417); // 500px
s = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  return { x: g.player?.x, y: g.player?.y, near: g.getNearestInteractable?.(), acts: g.getInteractables?.()?.map(a => ({id:a.id, x:a.x, y:a.y, r:a.radius})) };
});
console.log("WF near gate:", JSON.stringify(s, null, 2));

// Check hint
const hint2 = await p.evaluate(() => {
  const el = document.querySelector("#context-hint");
  return { text: el?.textContent, visible: el?.classList.contains("visible") };
});
console.log("WF Hint:", JSON.stringify(hint2));

await p.close();
await b.close();
