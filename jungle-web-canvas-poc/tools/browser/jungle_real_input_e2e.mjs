import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8123";
const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-e2e-real-input");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });
const V = { width: 1280, height: 720 };
const R = [];
const E = [];
let N = 0;
const log = (m) => console.log(`[E2E] ${m}`);

// ─── READ-ONLY OBSERVATION ─────────────────────────────────
async function readPlayer(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniSkyRidgeGame;
    if (!g?.player) return null;
    return { x: g.player.x, y: g.player.y };
  });
}
async function readState(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniSkyRidgeGame;
    return g?.getState?.() || null;
  });
}
async function readNearest(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniSkyRidgeGame;
    const n = g?.getNearestInteractable?.();
    return n ? { id: n.id, x: n.x, y: n.y, radius: n.radius } : null;
  });
}
async function readCodex(p) {
  return p.evaluate(() => {
    const r = localStorage.getItem("eduni.jungle.birdCodex.v1");
    return r ? JSON.parse(r) : null;
  });
}
async function readModalVisible(p) {
  return p.evaluate(() => {
    const m = document.querySelector("#modal");
    return m && m.style.display !== "none";
  });
}
async function readConfirmVisible(p) {
  return p.evaluate(() => {
    const btn = document.querySelector("#modal-confirm");
    if (!btn) return false;
    const s = window.getComputedStyle(btn);
    return s.display !== "none" && s.visibility !== "hidden" && !btn.disabled;
  });
}

// ─── SCREENSHOT ────────────────────────────────────────────
async function shot(p, name) {
  N++;
  const pt = join(ART, `${String(N).padStart(2, "0")}-${name}.png`);
  await p.screenshot({ path: pt });
  R.push({ n: name, path: pt, sz: statSync(pt).size });
}

// ─── WAIT FOR GAME READY ──────────────────────────────────
async function rdy(p, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate(() => {
      const g = globalThis.__eduniJungleGame || globalThis.__eduniSkyRidgeGame;
      return g?.player && typeof g.player.x === "number";
    });
    if (ok) return true;
    await p.waitForTimeout(200);
  }
  return false;
}

// ─── REAL INPUT: MOVEMENT (keyboard arrows) ────────────────
// Speed constants from constants.js:
// SPEED_MAX=260, CRUISE_RATIO=0.75 → cruise=195 px/s
// PRECISION_RATIO=0.45, PRECISION_HOLD_MS=100, ACCELERATION_MS=400
// Effective speed ramps from ~117 to 195 over 400ms, avg ~150 px/s
const CRUISE_SPEED = 195; // px/s at cruise

async function pressDir(p, dir, holdMs) {
  const key = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" }[dir];
  const before = await readPlayer(p);
  await p.keyboard.down(key);
  await p.waitForTimeout(holdMs);
  await p.keyboard.up(key);
  await p.waitForTimeout(150);
  const after = await readPlayer(p);
  const moved = after && before ? Math.hypot(after.x - before.x, after.y - before.y) : 0;
  return { before, after, moved };
}

// Move toward target by repeated key holds.
// useX/useY: force movement on a specific axis
async function moveTo(p, tx, ty, { maxSteps = 30, label = "" } = {}) {
  let stuckCount = 0;
  for (let i = 0; i < maxSteps; i++) {
    const pos = await readPlayer(p);
    if (!pos) break;
    const dx = tx - pos.x;
    const dy = ty - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 25) return { pos, dist, steps: i };

    let dir;
    if (Math.abs(dy) >= Math.abs(dx)) {
      dir = dy > 0 ? "d" : "u";
    } else {
      dir = dx > 0 ? "r" : "l";
    }
    const holdMs = Math.min(2500, Math.max(200, (dist / CRUISE_SPEED) * 1000 + 400));
    if (i === 0) log(`    moveTo step0: pos=(${pos.x.toFixed(0)},${pos.y.toFixed(0)}) target=(${tx},${ty}) dist=${dist.toFixed(0)} dir=${dir} hold=${holdMs.toFixed(0)}ms`);
    const { after, moved } = await pressDir(p, dir, holdMs);
    if (i === 0) log(`    moveTo step0 after: pos=(${after?.x?.toFixed(0)},${after?.y?.toFixed(0)}) moved=${moved?.toFixed(0)}`);
    if (moved < 2) {
      stuckCount++;
      if (stuckCount > 5) return { pos: after, dist, steps: i };
      // Try both perpendicular directions
      const perps = Math.abs(dx) > Math.abs(dy)
        ? [dy > 0 ? "d" : "u", dy > 0 ? "u" : "d"]
        : [dx > 0 ? "r" : "l", dx > 0 ? "l" : "r"];
      for (const perp of perps) {
        const { after: pa, moved: pm } = await pressDir(p, perp, 300);
        if (pm > 2) break;
      }
    } else {
      stuckCount = 0;
    }
  }
  const final = await readPlayer(p);
  return { pos: final, dist: Math.hypot(tx - final.x, ty - final.y), steps: maxSteps };
}

// ─── REAL INPUT: INTERACTIONS ──────────────────────────────
// Use down/up with delay so game loop processes the interact edge
async function pressA(p) {
  await p.keyboard.down("a");
  await p.waitForTimeout(80);
  await p.keyboard.up("a");
  await p.waitForTimeout(300);
}
async function pressB(p) {
  await p.keyboard.down("b");
  await p.waitForTimeout(80);
  await p.keyboard.up("b");
  await p.waitForTimeout(300);
}
async function wMod(p, ms = 5000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await readModalVisible(p)) return true;
    await p.waitForTimeout(100);
  }
  return false;
}
// All correct quiz answers are at index 0 → just press A
async function pickAnswer0(p) {
  await p.waitForTimeout(300);
  await pressA(p);
  await p.waitForTimeout(600);
}
async function dismissPanel(p) {
  await pressA(p);
  await p.waitForTimeout(400);
}
// For non-quiz interactions: open panel then confirm (2 A presses)
async function interactAndConfirm(p, { maxAttempts = 5, waitMs = 500 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    await pressA(p);
    await p.waitForTimeout(waitMs);
    const modal = await readModalVisible(p);
    if (!modal) return true; // panel opened and closed = confirmed
  }
  return false;
}
async function waitForConfirm(p, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await readConfirmVisible(p)) return true;
    await p.waitForTimeout(100);
  }
  return false;
}

// ─── CAMP REAL INPUT E2E ──────────────────────────────────
async function camp(ctx) {
  log("=== CAMP (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "camp", m: e.message }));

  await p.goto(`${BASE}/?renderer=three&qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p, "camp-timeout"); await p.close(); return; }
  await shot(p, "camp-start");

  let s = await readPlayer(p);
  log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // Camp path: (200,1040)→up→(200,620)→right→(520,620)→up→(520,320)→right→(920,320)→down→(920,820)→right→(1300,820)→up→(1300,420)

  // ── Move to hut area ──
  log("move → hut area");
  let r = await moveTo(p, 200, 620);
  log(`  seg1: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  r = await moveTo(p, 520, 620);
  log(`  seg2: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  r = await moveTo(p, 520, 320);
  log(`  seg3: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  await shot(p, "camp-near-hut");

  let near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  // If not near hut, try approaching from path
  if (!near || near.id !== "hut") {
    log("not near hut — adjusting position");
    // Move left along path toward hut
    await pressDir(p, "l", 800);
    near = await readNearest(p);
    log(`near after adjust: ${JSON.stringify(near)}`);
  }

  // Start quest — may need multiple A presses (open panel + confirm)
  log("press A → start quest");
  let st;
  for (let attempt = 0; attempt < 5; attempt++) {
    await pressA(p);
    await p.waitForTimeout(500);
    st = await readState(p);
    if (st?.questStarted) {
      log(`quest started after ${attempt + 1} A press(es)`);
      break;
    }
    log(`  attempt ${attempt + 1}: questStarted=${st?.questStarted}, modal=${await readModalVisible(p)}`);
  }
  await shot(p, "camp-quest-started");

  // ── Move to feather (690,320) ──
  log("move → feather (690,320)");
  // First go back right to path center, then approach feather
  r = await moveTo(p, 690, 320);
  log(`  at ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  if (!near || near.id !== "feather") {
    // Try fine-tuning
    await pressDir(p, "r", 400);
    near = await readNearest(p);
    log(`near adjust: ${JSON.stringify(near)}`);
  }
  await shot(p, "camp-near-feather");

  log("press A → feather quiz");
  await pressA(p);
  await wMod(p);
  await shot(p, "camp-q1");
  await pickAnswer0(p);
  await shot(p, "camp-q1-answer");
  await dismissPanel(p);
  st = await readState(p);
  log(`clues: ${JSON.stringify(st?.discoveredClues)} score: ${st?.clueQuizScore}`);

  // ── Move to footprints (920,570) ──
  log("move → footprints (920,570)");
  r = await moveTo(p, 920, 320);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 920, 570);
  log(`  down: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  if (!near || near.id !== "footprints") {
    await pressDir(p, "u", 300);
    near = await readNearest(p);
    log(`near adjust: ${JSON.stringify(near)}`);
  }
  await shot(p, "camp-near-footprints");

  log("press A → footprints quiz");
  await pressA(p);
  await wMod(p);
  await shot(p, "camp-q2");
  await pickAnswer0(p);
  await shot(p, "camp-q2-answer");
  await dismissPanel(p);
  st = await readState(p);
  log(`clues: ${JSON.stringify(st?.discoveredClues)} score: ${st?.clueQuizScore}`);

  // ── Move to birdcall (1120,820) ──
  log("move → birdcall (1120,820)");
  r = await moveTo(p, 920, 820);
  log(`  down: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1120, 820);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  if (!near || near.id !== "birdcall") {
    await pressDir(p, "r", 400);
    near = await readNearest(p);
    log(`near adjust: ${JSON.stringify(near)}`);
  }
  await shot(p, "camp-near-birdcall");

  log("press A → birdcall quiz");
  await pressA(p);
  await wMod(p);
  await shot(p, "camp-q3");
  await pickAnswer0(p);
  await shot(p, "camp-q3-answer");
  await dismissPanel(p);
  st = await readState(p);
  log(`clues: ${JSON.stringify(st?.discoveredClues)} score: ${st?.clueQuizScore} complete: ${st?.clueQuizzesComplete}`);

  // ── Move to bluebird (1300,420) ──
  log("move → bluebird (1300,420)");
  r = await moveTo(p, 1300, 820);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1300, 420);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);

  // Wait for ridgeArrival sequence (2400ms)
  await p.waitForTimeout(3000);
  near = await readNearest(p);
  log(`near after ridge wait: ${JSON.stringify(near)}`);
  await shot(p, "camp-near-bluebird");

  log("press A → bluebird capture");
  await pressA(p);
  await p.waitForTimeout(1500);
  await shot(p, "camp-capture");

  // Wait for reward reveal
  const revealStart = Date.now();
  const revealed = await waitForConfirm(p, 8000);
  log(`reward reveal: ${revealed ? "visible" : "timeout"} (${Date.now() - revealStart}ms)`);
  await shot(p, "camp-reward-visible");

  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "camp-reward-done");

  st = await readState(p);
  log(`state: ${JSON.stringify(st)}`);
  let cx = await readCodex(p);
  log(`codex: ${JSON.stringify(cx)}`);

  // Reload verify
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await rdy(p);
  cx = await readCodex(p);
  log(`codex reload: ${JSON.stringify(cx)}`);
  await shot(p, "camp-persist");
  await p.close();
}

// ─── CAMP FAIL REAL INPUT E2E ─────────────────────────────
async function campFail(ctx) {
  log("=== CAMP FAIL (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "fail", m: e.message }));

  await p.goto(`${BASE}/?renderer=three&qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { await shot(p, "fail-timeout"); await p.close(); return; }

  // Move to hut
  await moveTo(p, 200, 620);
  await moveTo(p, 520, 620);
  await moveTo(p, 520, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "hut") await pressDir(p, "l", 800);
  log(`fail at hut area`);

  // Start quest — may need multiple A presses (open panel + confirm)
  for (let attempt = 0; attempt < 5; attempt++) {
    await pressA(p);
    await p.waitForTimeout(500);
    let st = await readState(p);
    if (st?.questStarted) {
      log(`quest started after ${attempt + 1} A press(es)`);
      break;
    }
  }
  await p.waitForTimeout(300);

  // Wrong answers for each clue — use path waypoints to avoid blockers
  // Camp path: (200,1040)→(200,620)→(520,620)→(520,320)→(920,320)→(920,820)→(1300,820)→(1300,420)
  // Clue positions: feather(690,320) on path 520→920, footprints(920,570) on path 920 down, birdcall(1120,820) on path 920→1300
  const wrongs = [
    ["q001", [[690, 320]]],           // feather: right along path
    ["q004", [[920, 570]]],           // footprints: down from (920,320)
    ["q005", [[920, 320], [1120, 320], [1120, 820]]], // birdcall: up to path y=320, right, down
  ];
  for (const [qid, waypoints] of wrongs) {
    for (const [wx, wy] of waypoints) {
      await moveTo(p, wx, wy);
    }
    near = await readNearest(p);
    log(`  near ${qid}: ${JSON.stringify(near)}`);
    if (!near) {
      await pressDir(p, "r", 300);
      near = await readNearest(p);
    }
    await pressA(p);
    await wMod(p);
    // Choose wrong answer: arrow right (index 1) then A
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(100);
    await pressA(p);
    await p.waitForTimeout(600);
    await shot(p, `fail-${qid}`);
    await dismissPanel(p);
  }

  // Move to bluebird via path: (1120,820)→(1300,820)→(1300,420)
  await moveTo(p, 1300, 820);
  await moveTo(p, 1300, 420);
  await p.waitForTimeout(3000);
  near = await readNearest(p);
  log(`fail near bluebird: ${JSON.stringify(near)}`);
  await shot(p, "fail-near-bluebird");

  await pressA(p);
  await p.waitForTimeout(1500);
  await shot(p, "fail-retry");

  const st = await readState(p);
  log(`fail state: ${JSON.stringify(st)}`);
  await p.close();
}

// ─── WATERFALL REAL INPUT E2E ──────────────────────────────
async function waterfall(ctx) {
  log("=== WATERFALL (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "wf", m: e.message }));

  await p.goto(`${BASE}/?stage=waterfall&renderer=three&qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p, "wf-timeout"); await p.close(); return; }
  await shot(p, "wf-start");

  let s = await readPlayer(p);
  log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // WF path: (200,1040)→(200,900)→(700,900)→(700,760)→(900,760)→(900,700)→(1080,700)→(1080,560)→(1170,560)→(1170,480)→(1020,480)→(1020,470)→(1250,470)→(1250,330)→(1450,330)

  // ── stream gate (700,900) ──
  log("move → stream gate");
  let r = await moveTo(p, 200, 900);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 700, 900);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  let near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "wf-near-gate");

  log("press A → stream gate confirm");
  await interactAndConfirm(p);
  let st = await readState(p);
  log(`streamGateComplete: ${st?.streamGateComplete}`);
  await shot(p, "wf-gate-done");

  // ── stepping stones (1080,700) ──
  log("move → stepping stones");
  // Verify game state after stream gate
  let dbg = await p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    const st = g?.getState?.();
    return {
      stageId: g?.stageId,
      modalDisplay: document.querySelector("#modal")?.style.display,
      streamGateComplete: st?.streamGateComplete,
      playerPos: g?.player ? { x: g.player.x, y: g.player.y } : null,
    };
  });
  log(`  post-gate state: ${JSON.stringify(dbg)}`);
  r = await moveTo(p, 700, 760);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 900, 760);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 900, 700);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1080, 700);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "wf-near-stones");

  log("press A → stepping stones confirm");
  await interactAndConfirm(p);
  st = await readState(p);
  log(`steppingStonesComplete: ${st?.steppingStonesComplete}`);
  await shot(p, "wf-stones-done");

  // ── echo (1170,560) ──
  log("move → echo");
  r = await moveTo(p, 1080, 560);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1170, 560);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "wf-near-echo");

  await pressA(p);
  await wMod(p);
  await shot(p, "wf-q1");
  await pickAnswer0(p);
  await shot(p, "wf-q1-answer");
  await dismissPanel(p);

  // ── mistTrail (1020,480) ──
  log("move → mistTrail");
  r = await moveTo(p, 1020, 480);
  log(`  at: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  if (!near || near.id !== "mistTrail") {
    await pressDir(p, "l", 400);
    near = await readNearest(p);
    log(`near adj: ${JSON.stringify(near)}`);
  }
  await shot(p, "wf-near-mist");

  await pressA(p);
  await wMod(p);
  await shot(p, "wf-q2");
  await pickAnswer0(p);
  await shot(p, "wf-q2-answer");
  await dismissPanel(p);

  // ── waterDrops (1250,470) ──
  log("move → waterDrops");
  r = await moveTo(p, 1250, 470);
  log(`  at: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "wf-near-drops");

  await pressA(p);
  await wMod(p);
  await shot(p, "wf-q3");
  await pickAnswer0(p);
  await shot(p, "wf-q3-answer");
  await dismissPanel(p);

  // ── lookout (1450,330) ──
  log("move → lookout");
  r = await moveTo(p, 1250, 330);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1450, 330);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "wf-near-lookout");

  log("press A → lookout confirm");
  await pressA(p);
  await p.waitForTimeout(800);
  st = await readState(p);
  log(`lookoutComplete: ${st?.lookoutComplete}, clueQuizzesComplete: ${st?.adventure?.clueQuizzesComplete}, discoveredClues: ${st?.adventure?.discoveredClues?.length}, clueQuizScore: ${st?.adventure?.clueQuizScore}`);
  await shot(p, "wf-lookout-done");

  // Lookout confirmation auto-opens kingfisher encounter panel — confirm it too
  await p.waitForTimeout(500); // let encounter panel open
  const kfPanel = await readModalVisible(p);
  log(`kingfisher encounter panel visible: ${kfPanel}`);
  if (kfPanel) {
    log("press A → confirm kingfisher encounter");
    await pressA(p);
    await p.waitForTimeout(800);
    await shot(p, "kf-encounter-confirmed");
  }

  // Kingfisher encounter confirmation auto-opens reward panel — wait for reveal then confirm
  await p.waitForTimeout(500);
  const rewardPanel = await readModalVisible(p);
  log(`reward panel visible after capture: ${rewardPanel}`);

  // ── kingfisher reward reveal ──
  log("waiting for reward reveal...");
  const revealStart = Date.now();
  const revealed = await waitForConfirm(p, 8000);
  const revealMs = Date.now() - revealStart;
  log(`reward reveal: ${revealed ? "VISIBLE" : "TIMEOUT"} after ${revealMs}ms`);
  await shot(p, "wf-reward-visible");

  if (!revealed) {
    log("FAIL: waterfall reward reveal did not complete naturally");
    E.push({ s: "wf", m: "reward reveal timeout" });
    await p.close();
    return;
  }

  // Step 4: Confirm reward
  await pressA(p);
  await p.waitForTimeout(1000);
  await shot(p, "wf-reward-done");

  const wfSt = await readState(p);
  log(`state: ${JSON.stringify(wfSt)}`);
  await p.close();
}

// ─── SKY RIDGE REAL INPUT E2E ──────────────────────────────
async function skyRidge(ctx) {
  log("=== SKY RIDGE (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "sr", m: e.message }));

  await p.goto(`${BASE}/sky-ridge-game.html?qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p, "sr-timeout"); await p.close(); return; }
  await shot(p, "sr-start");

  let s = await readPlayer(p);
  log(`start: ${s?.x?.toFixed(0)},${s?.y?.toFixed(0)}`);

  // SR path: (200,1040)→(200,930)→(430,930)→(430,820)→(650,820)→(650,690)→(830,690)→(830,560)→(1000,560)→(1000,490)→(1130,490)→(1130,420)→(1300,420)→(1300,310)→(1450,310)

  // ── sky gate (430,930) ──
  log("move → sky gate");
  let r = await moveTo(p, 200, 930);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 430, 930);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  let near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-gate");

  log("press A → sky gate confirm");
  await interactAndConfirm(p);
  await shot(p, "sr-gate-done");

  // ── windRibbon (650,820) ──
  log("move → windRibbon");
  r = await moveTo(p, 430, 820);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 650, 820);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-ribbon");

  await pressA(p);
  await wMod(p);
  await shot(p, "sr-q1");
  await pickAnswer0(p);
  await shot(p, "sr-q1-answer");
  await dismissPanel(p);

  // ── cloudShadow (830,690) ──
  log("move → cloudShadow");
  r = await moveTo(p, 650, 690);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 830, 690);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-cloud");

  await pressA(p);
  await wMod(p);
  await shot(p, "sr-q2");
  await pickAnswer0(p);
  await shot(p, "sr-q2-answer");
  await dismissPanel(p);

  // ── windChime (1000,560) ──
  log("move → windChime");
  r = await moveTo(p, 830, 560);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1000, 560);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-chime");

  await pressA(p);
  await wMod(p);
  await shot(p, "sr-q3");
  await pickAnswer0(p);
  await shot(p, "sr-q3-answer");
  await dismissPanel(p);

  // ── summitBridge (1300,420) ──
  log("move → summitBridge");
  r = await moveTo(p, 1000, 490);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1130, 490);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1130, 420);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1300, 420);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-bridge");

  log("press A → summit bridge confirm");
  await interactAndConfirm(p);
  await shot(p, "sr-bridge-done");

  // ── hawk (1450,310) ──
  log("move → hawk");
  r = await moveTo(p, 1300, 310);
  log(`  up: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}`);
  r = await moveTo(p, 1450, 310);
  log(`  right: ${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)} d=${r.dist?.toFixed(0)}`);
  near = await readNearest(p);
  log(`near: ${JSON.stringify(near)}`);
  await shot(p, "sr-near-hawk");

  // Open hawk encounter + confirm + reward confirm
  log("press A → hawk encounter");
  await pressA(p);
  await p.waitForTimeout(800);
  await shot(p, "sr-hawk-panel");

  log("press A → confirm hawk");
  await pressA(p);
  await p.waitForTimeout(800);
  await shot(p, "sr-capture");

  await waitForConfirm(p, 5000);
  await shot(p, "sr-reward-visible");

  await pressA(p);
  await p.waitForTimeout(1000);
  await shot(p, "sr-reward-done");

  const st = await readState(p);
  log(`state: ${JSON.stringify(st)}`);
  const cx = await readCodex(p);
  log(`codex: ${JSON.stringify(cx)}`);
  await p.close();
}

// ─── 5-STAGE COMPARISON ────────────────────────────────────
async function cmp(ctx) {
  log("=== 5-STAGE COMPARISON ===");
  for (const [n, u] of [
    ["camp", `${BASE}/?renderer=three`],
    ["wf", `${BASE}/?stage=waterfall`],
    ["cave", `${BASE}/?stage=cave`],
    ["gt", `${BASE}/?stage=giant-tree`],
    ["sr", `${BASE}/sky-ridge-game.html`],
  ]) {
    const p = await ctx.newPage();
    await p.setViewportSize(V);
    await p.goto(u, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(4000);
    await shot(p, `cmp-${n}`);
    await p.close();
  }
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: V });
  try {
    await camp(c);
    await campFail(c);
    await waterfall(c);
    await skyRidge(c);
    await cmp(c);
  } catch (e) {
    log(`FATAL: ${e.message}`);
    E.push({ s: "main", m: e.message });
  } finally {
    await b.close();
  }
  writeFileSync(
    join(ART, "e2e-results.json"),
    JSON.stringify({ ts: new Date().toISOString(), shots: R, errs: E, n: R.length }, null, 2)
  );
  log(`${R.length} shots, ${E.length} errors`);
}
main();
