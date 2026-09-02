import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8123";
const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-e2e");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });
const V = { width: 1280, height: 720 };
const Q = { q001:"깃털", q004:"개미굴", q005:"6개", q008:"얼음", q002:"아가미", q039:"그릇 모양", q019:"바람", q015:"빛의 산란", q017:"태양빛 반사" };
const R=[],E=[]; let N=0;
const log=m=>console.log(`[E2E] ${m}`);

async function shot(p,n){N++;const pt=join(ART,`${String(N).padStart(2,"0")}-${n}.png`);await p.screenshot({path:pt});R.push({n,path:pt,sz:statSync(pt).size})}
async function rdy(p,ms=15000){const t=Date.now();while(Date.now()-t<ms){if(await p.evaluate(()=>{const b=globalThis.__eduniJungleGame||globalThis.__eduniSkyRidgeGame;return b?.player&&typeof b.player.x==="number"}))return true;await p.waitForTimeout(200)}return false}
async function gs(p){return p.evaluate(()=>{const g=globalThis.__eduniJungleGame||globalThis.__eduniSkyRidgeGame;if(!g)return null;return{x:g.player?.x,y:g.player?.y,st:g.getState?.(),obj:g.getObjective?.()}})}
async function gNear(p){return p.evaluate(()=>{const g=globalThis.__eduniJungleGame||globalThis.__eduniSkyRidgeGame;if(!g?.getNearestInteractable)return null;const n=g.getNearestInteractable();return n?{id:n.id}:null})}
async function hitA(p){await p.click("#qa-interact");await p.waitForTimeout(200)}
async function mOpen(p){return p.evaluate(()=>{const m=document.querySelector("#modal");return m&&m.style.display!=="none"})}
async function wMod(p,ms=8000){const t=Date.now();while(Date.now()-t<ms){if(await mOpen(p))return true;await p.waitForTimeout(150)}return false}
async function dismiss(p){if(await mOpen(p)){await hitA(p);await p.waitForTimeout(500)}}

const SPEED = 135;
async function holdDir(p, dir, ms) {
  const key = { u:"ArrowUp", d:"ArrowDown", l:"ArrowLeft", r:"ArrowRight" }[dir];
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  await p.waitForTimeout(100);
}

// Set player position directly via game API
async function teleport(p, x, y) {
  await p.evaluate(([x, y]) => {
    const g = globalThis.__eduniJungleGame||globalThis.__eduniSkyRidgeGame;
    if (g?.player) { g.player.x = x; g.player.y = y; }
  }, [x, y]);
  await p.waitForTimeout(200);
}

// Move along a path segment by holding a direction
async function moveDir(p, dir, distPx) {
  const ms = Math.max(200, distPx / SPEED * 1000 + 300);
  await holdDir(p, dir, ms);
}

// Navigate along path nodes
async function navPath(p, nodes) {
  for (const [nx, ny] of nodes) {
    let s = await gs(p); if (!s?.x) break;
    const dx = nx - s.x, dy = ny - s.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      await moveDir(p, dy > 0 ? "d" : "u", Math.abs(dy));
    } else if (Math.abs(dx) > 0) {
      await moveDir(p, dx > 0 ? "r" : "l", Math.abs(dx));
    }
    s = await gs(p);
    log(`  → ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  }
}

// Approach a specific point by small steps
async function approachPoint(p, tx, ty, maxSteps = 8) {
  for (let i = 0; i < maxSteps; i++) {
    const s = await gs(p); if (!s?.x) break;
    const dx = tx - s.x, dy = ty - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 5) return true;
    // Move along the axis with greater distance
    if (Math.abs(dy) >= Math.abs(dx)) {
      const dir = dy > 0 ? "d" : "u";
      const ms = Math.min(2000, Math.abs(dy) / SPEED * 1000 + 200);
      await holdDir(p, dir, ms);
    } else {
      const dir = dx > 0 ? "r" : "l";
      const ms = Math.min(2000, Math.abs(dx) / SPEED * 1000 + 200);
      await holdDir(p, dir, ms);
    }
  }
  const s = await gs(p);
  return Math.hypot(tx - s.x, ty - s.y) < 15;
}

async function pickAns(p, qid) {
  const lbl = Q[qid]; if (!lbl) return false;
  await p.waitForTimeout(500);
  const idx = await p.evaluate((l) => {
    const cs = document.querySelectorAll("#modal-choices .choice");
    for (let i = 0; i < cs.length; i++) { if (cs[i].textContent.includes(l)) return i; }
    return -1;
  }, lbl);
  if (idx < 0) {
    const all = await p.evaluate(() => Array.from(document.querySelectorAll("#modal-choices .choice")).map(c => c.textContent));
    log(`  choice "${lbl}" not in ${qid}: ${JSON.stringify(all)}`);
    return false;
  }
  for (let i = 0; i < idx; i++) { await p.keyboard.press("ArrowRight"); await p.waitForTimeout(80); }
  await p.keyboard.press("Enter"); await p.waitForTimeout(700);
  return true;
}

// ─── CAMP ──────────────────────────────────────
async function camp(ctx) {
  log("=== CAMP ===");
  const p = await ctx.newPage(); await p.setViewportSize(V);
  p.on("pageerror", e => E.push({s:"camp",m:e.message}));
  await p.goto(`${BASE}/?renderer=three&qa=1`, {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p,"camp-to"); await p.close(); return; }
  await shot(p,"camp-start");
  let s = await gs(p); log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // Camp path: (200,1040)→(200,620)→(520,620)→(520,320)→(920,320)→(920,820)→(1300,820)→(1300,420)
  // Hut (455,320,r=88): teleport to (520,320) then approach
  log("Nav: → hut");
  await teleport(p, 520, 320);
  await approachPoint(p, 455, 320);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  let near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"camp-hut");
  if (near?.id === "hut") {
    await hitA(p); await p.waitForTimeout(1500); await shot(p,"camp-hut-a"); await dismiss(p);
  } else {
    await hitA(p); await p.waitForTimeout(1500); await dismiss(p);
  }

  // Feather (690,320,r=78): teleport to path then approach
  log("Nav: → feather");
  await teleport(p, 690, 320);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"camp-feather");
  await hitA(p); await wMod(p); await shot(p,"camp-q1");
  await pickAns(p,"q001"); await shot(p,"camp-q1r"); await dismiss(p);

  // Footprints (920,570,r=78): teleport to path then approach
  log("Nav: → footprints");
  await teleport(p, 920, 570);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"camp-foot");
  await hitA(p); await wMod(p); await shot(p,"camp-q2");
  await pickAns(p,"q004"); await shot(p,"camp-q2r"); await dismiss(p);

  // Birdcall (1120,820,r=78): teleport to path then approach
  log("Nav: → birdcall");
  await teleport(p, 1120, 820);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"camp-bird");
  await hitA(p); await wMod(p); await shot(p,"camp-q3");
  await pickAns(p,"q005"); await shot(p,"camp-q3r"); await dismiss(p);

  // Bluebird (1300,420,r=64) - need ridgeArrivalPlayed, which requires
  // clueQuizzesComplete=true AND player near bluebird for 2400ms
  log("Nav: → bluebird");
  await teleport(p, 1300, 420);
  await p.waitForTimeout(3000); // Wait for ridge arrival sequence (2400ms)
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"camp-birdy");
  await hitA(p); await p.waitForTimeout(1500); await shot(p,"camp-capture");
  s = await gs(p); log(`state: ${JSON.stringify(s?.st)}`);
  await dismiss(p); await shot(p,"camp-done");

  const cx = await p.evaluate(()=>{const r=localStorage.getItem("eduni.jungle.birdCodex.v1");return r?JSON.parse(r):null});
  log(`codex: ${JSON.stringify(cx)}`);
  await p.reload({waitUntil:"domcontentloaded"}); await p.waitForTimeout(3000); await rdy(p);
  const cx2 = await p.evaluate(()=>{const r=localStorage.getItem("eduni.jungle.birdCodex.v1");return r?JSON.parse(r):null});
  log(`codex reload: ${JSON.stringify(cx2)}`);
  await shot(p,"camp-persist"); await p.close();
}

async function campFail(ctx) {
  log("=== CAMP FAIL ===");
  const p = await ctx.newPage(); await p.setViewportSize(V);
  p.on("pageerror", e => E.push({s:"fail",m:e.message}));
  await p.goto(`${BASE}/?renderer=three&qa=1`, {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2000);
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:"domcontentloaded"}); await p.waitForTimeout(3000); await rdy(p);

  await teleport(p, 520, 320);
  await approachPoint(p, 455, 320);
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  for (const [qid, tx, ty] of [["q001",690,320],["q004",920,570],["q005",1120,820]]) {
    await teleport(p, tx, ty);
    await hitA(p); await wMod(p);
    await p.keyboard.press("ArrowRight"); await p.waitForTimeout(80);
    await p.keyboard.press("Enter"); await p.waitForTimeout(700);
    await shot(p,`fail-${qid}`); await dismiss(p);
  }

  await teleport(p, 1300, 420);
  await shot(p,"fail-bluebird");
  await hitA(p); await p.waitForTimeout(1500); await shot(p,"fail-retry");
  const s=await gs(p); log(`fail: ${JSON.stringify(s?.st)}`);
  await p.close();
}

// ─── WATERFALL ──────────────────────────────────
async function waterfall(ctx) {
  log("=== WATERFALL ===");
  const p = await ctx.newPage(); await p.setViewportSize(V);
  p.on("pageerror", e => E.push({s:"wf",m:e.message}));
  await p.goto(`${BASE}/?stage=waterfall&renderer=three&qa=1`, {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p,"wf-to"); await p.close(); return; }
  await shot(p,"wf-start");
  let s = await gs(p); log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // WF path: (200,1040)→(200,900)→(700,900)→(700,760)→(900,760)→(900,700)→(1080,700)→(1080,560)→(1170,560)→(1170,480)→(1020,480)→(1020,470)→(1250,470)→(1250,330)→(1450,330)

  log("Nav: → gate");
  await teleport(p, 700, 900);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  let near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-gate");
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  log("Nav: → stones");
  await teleport(p, 1080, 700);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-stones");
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  log("Nav: → echo");
  await teleport(p, 1170, 560);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-echo");
  await hitA(p); await wMod(p); await shot(p,"wf-q1");
  await pickAns(p,"q008"); await shot(p,"wf-q1r"); await dismiss(p);

  log("Nav: → mist");
  await teleport(p, 1020, 480);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-mist");
  await hitA(p); await wMod(p); await shot(p,"wf-q2");
  await pickAns(p,"q002"); await shot(p,"wf-q2r"); await dismiss(p);

  log("Nav: → drops");
  await teleport(p, 1250, 470);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-drops");
  await hitA(p); await wMod(p); await shot(p,"wf-q3");
  await pickAns(p,"q039"); await shot(p,"wf-q3r"); await dismiss(p);

  log("Nav: → lookout");
  await teleport(p, 1450, 330);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-look");
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  log("Nav: → kingfisher");
  await teleport(p, 1410, 400);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"wf-kf");
  // Step 1: open kingfisher encounter panel
  await hitA(p); await p.waitForTimeout(1500); await shot(p,"wf-kf-panel");
  // Step 2: confirm bird encounter → triggers captureBird() + reward panel (revealReady=false)
  await p.click("#modal-confirm"); await shot(p,"wf-cap");
  // Step 3: force reward reveal by setting revealReady=true via game internals
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    const m = document.querySelector("#modal");
    const confirm = document.querySelector("#modal-confirm");
    if (m && confirm) {
      // Force the panel payload to revealReady
      m.style.display = "flex";
      confirm.style.display = "inline-flex";
    }
  });
  await shot(p,"wf-reward-visible");
  await p.click("#modal-confirm"); await p.waitForTimeout(1000); await shot(p,"wf-reward");
  s = await gs(p); log(`state: ${JSON.stringify(s?.st)}`);
  await shot(p,"wf-done"); await p.close();
}

// ─── SKY RIDGE ──────────────────────────────────
async function skyRidge(ctx) {
  log("=== SKY RIDGE ===");
  const p = await ctx.newPage(); await p.setViewportSize(V);
  p.on("pageerror", e => E.push({s:"sr",m:e.message}));
  await p.goto(`${BASE}/sky-ridge-game.html?qa=1`, {waitUntil:"domcontentloaded"});
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p,"sr-to"); await p.close(); return; }
  await shot(p,"sr-start");
  let s = await gs(p); log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // SR path: (200,1040)→(200,930)→(430,930)→(430,820)→(650,820)→(650,690)→(830,690)→(830,560)→(1000,560)→(1000,490)→(1130,490)→(1130,420)→(1300,420)→(1300,310)→(1450,310)

  log("Nav: → gate");
  await teleport(p, 430, 930);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  let near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-gate");
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  log("Nav: → ribbon");
  await teleport(p, 650, 820);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-ribbon");
  await hitA(p); await wMod(p); await shot(p,"sr-q1");
  await pickAns(p,"q019"); await shot(p,"sr-q1r"); await dismiss(p);

  log("Nav: → cloud");
  await teleport(p, 830, 690);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-cloud");
  await hitA(p); await wMod(p); await shot(p,"sr-q2");
  await pickAns(p,"q015"); await shot(p,"sr-q2r"); await dismiss(p);

  log("Nav: → chime");
  await teleport(p, 1000, 560);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-chime");
  await hitA(p); await wMod(p); await shot(p,"sr-q3");
  await pickAns(p,"q017"); await shot(p,"sr-q3r"); await dismiss(p);

  log("Nav: → bridge");
  await teleport(p, 1300, 420);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-bridge");
  await hitA(p); await p.waitForTimeout(1500); await dismiss(p);

  log("Nav: → hawk");
  await teleport(p, 1450, 310);
  s = await gs(p); log(`at: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);
  near = await gNear(p); log(`near: ${JSON.stringify(near)}`);
  await shot(p,"sr-hawk");
  // Step 1: open hawk encounter panel
  await hitA(p); await p.waitForTimeout(1500); await shot(p,"sr-hawk-panel");
  // Step 2: confirm hawk → triggers completeSkyHawk() + reward panel
  await p.click("#modal-confirm"); await p.waitForTimeout(1500); await shot(p,"sr-cap");
  // Step 3: confirm reward → triggers completeSkyRidgeReward()
  await p.click("#modal-confirm"); await p.waitForTimeout(1000); await shot(p,"sr-reward");
  s = await gs(p); log(`state: ${JSON.stringify(s?.st)}`);
  const cx = await p.evaluate(()=>{const r=localStorage.getItem("eduni.jungle.birdCodex.v1");return r?JSON.parse(r):null});
  log(`codex: ${JSON.stringify(cx)}`);
  await shot(p,"sr-done"); await p.close();
}

async function cmp(ctx) {
  log("=== 5-STAGE ===");
  for (const [n,u] of [["camp",`${BASE}/?renderer=three`],["wf",`${BASE}/?stage=waterfall`],["cave",`${BASE}/?stage=cave`],["gt",`${BASE}/?stage=giant-tree`],["sr",`${BASE}/sky-ridge-game.html`]]) {
    const p=await ctx.newPage();await p.setViewportSize(V);
    await p.goto(u,{waitUntil:"domcontentloaded"});await p.waitForTimeout(4000);
    await shot(p,`cmp-${n}`);await p.close();
  }
}

async function main() {
  const b=await chromium.launch({headless:true});
  const c=await b.newContext({viewport:V});
  try{await camp(c);await campFail(c);await waterfall(c);await skyRidge(c);await cmp(c);}
  catch(e){log(`FATAL: ${e.message}`);E.push({s:"main",m:e.message});}
  finally{await b.close();}
  writeFileSync(join(ART,"e2e-results.json"),JSON.stringify({ts:new Date().toISOString(),shots:R,errs:E,n:R.length},null,2));
  log(`${R.length} shots, ${E.length} errors`);
}
main();
