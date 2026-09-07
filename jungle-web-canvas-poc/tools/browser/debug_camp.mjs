import { chromium } from "playwright";

const BASE = "http://localhost:8124";
const V = { width: 1280, height: 720 };
const SPEED = 48;

async function sn(p) {
  return p.evaluate(() => {
    const b = globalThis.__eduniJungleGame;
    if (!b?.player) return null;
    const s = b.getState?.() ?? {};
    const obj = b.getObjective?.() ?? "";
    const acts = typeof b.getInteractables === "function" ? b.getInteractables() : [];
    return {
      x: b.player.x, y: b.player.y,
      state: s, objective: obj,
      interactables: acts.map(a => ({
        id: a.id, x: a.x, y: a.y, r: a.radius ?? a.r,
        dist: Math.hypot(a.x - b.player.x, a.y - b.player.y),
        inRange: Math.hypot(a.x - b.player.x, a.y - b.player.y) < (a.radius ?? a.r ?? 80)
      }))
    };
  });
}

async function holdDir(p, dir, ms) {
  const code = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" }[dir];
  await p.evaluate((c) => window.dispatchEvent(new KeyboardEvent("keydown", { code: c, key: c, bubbles: true })), code);
  await p.waitForTimeout(ms);
  await p.evaluate((c) => window.dispatchEvent(new KeyboardEvent("keyup", { code: c, key: c, bubbles: true })), code);
  await p.waitForTimeout(200);
}

async function holdDist(p, dir, distPx) {
  const ms = Math.min(10000, Math.max(300, distPx / SPEED * 1000 + 300));
  await holdDir(p, dir, ms);
}

async function navPath(p, waypoints) {
  for (const [wx, wy] of waypoints) {
    let s = await sn(p); if (!s) break;
    const dx = wx - s.x, dy = wy - s.y;
    if (Math.abs(dy) > 10) await holdDist(p, dy > 0 ? "down" : "up", Math.abs(dy));
    if (Math.abs(dx) > 10) await holdDist(p, dx > 0 ? "right" : "left", Math.abs(dx));
    s = await sn(p);
    const nearAct = s?.interactables?.filter(a => a.inRange);
    console.log(`  WP(${wx},${wy}) → at ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)} acts:${nearAct?.map(a=>a.id).join(",")||"none"}`);
  }
}

async function main() {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: V });
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", e => console.log(`ERR: ${e.message}`));
  p.on("console", m => { if (m.type() === "error") console.log(`CONSOLE ERR: ${m.text()}`); });

  // ── CAMP ──
  console.log("=== CAMP DEBUG ===");
  await p.goto(`${BASE}/?renderer=three&qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(5000); // Wait longer for Three.js init

  let s = await sn(p);
  console.log(`Initial: ${JSON.stringify({x:s?.x, y:s?.y, state:s?.state})}`);

  // Check if getInteractables exists
  const hasGI = await p.evaluate(() => typeof globalThis.__eduniJungleGame?.getInteractables);
  console.log(`getInteractables type: ${hasGI}`);

  // Check walkable check
  const walkCheck = await p.evaluate(() => {
    const b = globalThis.__eduniJungleGame;
    if (!b) return "no game";
    if (typeof b.isWalkable !== "function") return "no isWalkable";
    return {
      at200_1040: b.isWalkable(200, 1040),
      at200_900: b.isWalkable(200, 900),
      at200_620: b.isWalkable(200, 620),
      at520_620: b.isWalkable(520, 620),
      at520_320: b.isWalkable(520, 320),
      at455_320: b.isWalkable(455, 320), // hut
    };
  });
  console.log(`Walkable: ${JSON.stringify(walkCheck)}`);

  // Check movement state
  const mvCheck = await p.evaluate(() => {
    const b = globalThis.__eduniJungleGame;
    if (!b?.input) return "no input";
    const gs = b.input.getDigitalState?.();
    return { digitalState: gs, keys: b.input._keys ? Object.keys(b.input._keys) : "none" };
  });
  console.log(`Input: ${JSON.stringify(mvCheck)}`);

  // Try keyboard dispatch manually
  console.log("\n--- Manual movement test ---");
  await holdDir(p, "up", 1000);
  s = await sn(p);
  console.log(`After 1s up: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  await holdDir(p, "up", 1000);
  s = await sn(p);
  console.log(`After 2s up: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  await holdDir(p, "up", 3000);
  s = await sn(p);
  console.log(`After 5s up: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)} acts:${s?.interactables?.filter(a=>a.inRange)?.map(a=>a.id).join(",")||"none"}`);

  await holdDir(p, "up", 5000);
  s = await sn(p);
  console.log(`After 10s up: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)} acts:${s?.interactables?.filter(a=>a.inRange)?.map(a=>a.id).join(",")||"none"}`);

  // Check if player can reach tent clearing
  await holdDir(p, "right", 5000);
  s = await sn(p);
  console.log(`After 5s right: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)} acts:${s?.interactables?.filter(a=>a.inRange)?.map(a=>a.id).join(",")||"none"}`);

  // Check what interactables exist
  const acts = await p.evaluate(() => {
    const b = globalThis.__eduniJungleGame;
    if (typeof b.getInteractables !== "function") return "no getInteractables";
    const list = b.getInteractables();
    return list.map(a => ({ id:a.id, x:a.x, y:a.y, r:a.radius??a.r }));
  });
  console.log(`All acts: ${JSON.stringify(acts)}`);

  await p.close();
  await b.close();
}
main();
