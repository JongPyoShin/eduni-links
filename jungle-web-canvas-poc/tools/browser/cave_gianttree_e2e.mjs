import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8123";
const ART = join(import.meta.dirname, "..", "..", "artifacts", "cave-gianttree-e2e");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });
const V = { width: 1280, height: 720 };
const R = [];
const E = [];
let N = 0;
const log = (m) => console.log(`[E2E] ${m}`);

// ─── HELPERS ───────────────────────────────────────────────
async function readPlayer(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniCaveGame || globalThis.__eduniGiantTreeGame;
    if (!g?.player) return null;
    return { x: g.player.x, y: g.player.y };
  });
}
async function readState(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniCaveGame || globalThis.__eduniGiantTreeGame;
    return g?.getState?.() || null;
  });
}
async function readPhase(p) {
  return p.evaluate(() => document.querySelector("#status")?.dataset?.gamePhase || "");
}
async function readModalVisible(p) {
  return p.evaluate(() => {
    const m = document.querySelector("#modal");
    return m && m.style.display !== "none";
  });
}

async function shot(p, name) {
  N++;
  const pt = join(ART, `${String(N).padStart(2, "0")}-${name}.png`);
  await p.screenshot({ path: pt });
  R.push({ n: name, path: pt, sz: statSync(pt).size });
  log(`  📸 ${name} (${statSync(pt).size} bytes)`);
}

async function rdy(p, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate(() => {
      const g = globalThis.__eduniCaveGame || globalThis.__eduniGiantTreeGame;
      return g?.player && typeof g.player.x === "number";
    });
    if (ok) return true;
    await p.waitForTimeout(200);
  }
  return false;
}

const CRUISE_SPEED = 195;

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

async function moveTo(p, tx, ty, { maxSteps = 40, arriveRadius = 80, label = "" } = {}) {
  let stuckCount = 0;
  for (let i = 0; i < maxSteps; i++) {
    const pos = await readPlayer(p);
    if (!pos) break;
    const dx = tx - pos.x;
    const dy = ty - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < arriveRadius) return { pos, dist, steps: i };
    let dir;
    if (Math.abs(dy) >= Math.abs(dx)) dir = dy > 0 ? "d" : "u";
    else dir = dx > 0 ? "r" : "l";
    const holdMs = Math.min(1500, Math.max(150, (dist / CRUISE_SPEED) * 800 + 200));
    if (i === 0) log(`  moveTo(${label}): pos=(${pos.x.toFixed(0)},${pos.y.toFixed(0)}) → (${tx},${ty}) dist=${dist.toFixed(0)}`);
    const { after, moved } = await pressDir(p, dir, holdMs);
    if (moved < 2) {
      stuckCount++;
      if (stuckCount > 8) return { pos: after, dist, steps: i };
      const perps = Math.abs(dx) > Math.abs(dy)
        ? [dy > 0 ? "d" : "u", dy > 0 ? "u" : "d"]
        : [dx > 0 ? "r" : "l", dx > 0 ? "l" : "r"];
      for (const perp of perps) {
        const { moved: pm } = await pressDir(p, perp, 250);
        if (pm > 2) break;
      }
    } else { stuckCount = 0; }
  }
  const final = await readPlayer(p);
  return { pos: final, dist: Math.hypot(tx - final.x, ty - final.y), steps: maxSteps };
}

// Real keyboard A press — matches camp E2E pattern exactly
async function pressA(p) {
  await p.keyboard.down("a");
  await p.waitForTimeout(80);
  await p.keyboard.up("a");
  await p.waitForTimeout(300);
}

// Wait for modal to appear
async function wMod(p, ms = 5000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await readModalVisible(p)) return true;
    await p.waitForTimeout(100);
  }
  return false;
}

// For non-quiz: open panel then confirm (2 A presses, like camp E2E)
async function interactAndConfirm(p) {
  for (let i = 0; i < 5; i++) {
    await pressA(p);
    await p.waitForTimeout(500);
    const modal = await readModalVisible(p);
    if (!modal) return true;
  }
  return false;
}

// Quiz: ArrowDown to navigate, A to confirm
async function selectChoice(p, idx) {
  for (let i = 0; i < idx; i++) {
    await p.keyboard.down("ArrowDown");
    await p.waitForTimeout(80);
    await p.keyboard.up("ArrowDown");
    await p.waitForTimeout(300);
  }
  await pressA(p);
  await p.waitForTimeout(600);
}

// ─── CAVE PLAYTHROUGH ──────────────────────────────────────
async function cave(ctx) {
  log("=== CAVE (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "cave", m: e.message }));

  await p.goto(`${BASE}/cave-game.html?qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p, "cave-timeout"); await p.close(); return; }
  await shot(p, "cave-01-start");

  const steps = [
    { id: "caveGate",       x: 420,  y: 930,  r: 110, label: "동굴 입구" },
    { id: "glowTrail",      x: 620,  y: 860,  r: 110, label: "반딧불 길" },
    { id: "echoCrystal",    x: 780,  y: 700,  r: 100, label: "울림 수정" },
    { id: "shadowMark",     x: 930,  y: 600,  r: 100, label: "벽 그림자" },
    { id: "fireflyPattern", x: 1080, y: 520,  r: 120, label: "반딧불 깜빡임", quiz: [0, 1, 0] },
    { id: "crystalBridge",  x: 1260, y: 460,  r: 120, label: "수정 다리" },
    { id: "bat",            x: 1420, y: 340,  r: 100, label: "작은 박쥐" },
    { id: "reward",         x: 1420, y: 340,  r: 120, label: "보상" },
  ];

  for (const step of steps) {
    const phase = await readPhase(p);
    log(`\n[CAVE] Phase: ${phase} → ${step.label}`);
    const r = await moveTo(p, step.x, step.y, { arriveRadius: step.r * 0.8, label: step.id });
    log(`  Arrived: (${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}) dist=${r.dist?.toFixed(0)}`);
    if (["caveGate", "fireflyPattern", "bat", "reward"].includes(step.id))
      await shot(p, `cave-${step.id}-near`);

    if (step.quiz) {
      log(`  Quiz: ${step.quiz.length} rounds, indices: ${step.quiz}`);
      // First, open the quiz modal with A
      await pressA(p);
      const opened = await wMod(p, 3000);
      log(`  Quiz modal opened: ${opened}`);
      if (opened) {
        for (let round = 0; round < step.quiz.length; round++) {
          await p.waitForTimeout(400);
          await shot(p, `cave-quiz-r${round + 1}`);
          log(`  Round ${round + 1}: selecting index ${step.quiz[round]}`);
          await selectChoice(p, step.quiz[round]);
          const st = await readState(p);
          log(`  → fireflyPatternRound=${st?.fireflyPatternRound} complete=${st?.fireflyPatternComplete}`);
        }
      }
    } else {
      await interactAndConfirm(p);
    }

    const st = await readState(p);
    log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
  }

  const rw = await readState(p);
  log(`\n[CAVE] FINAL: phase=${await readPhase(p)} reward=${rw?.rewardComplete}`);
  await shot(p, "cave-02-done");
  await p.close();
  return { rewardComplete: rw?.rewardComplete, phase: await readPhase(p).catch(() => "?") };
}

// ─── GIANT TREE PLAYTHROUGH ────────────────────────────────
async function giantTree(ctx) {
  log("\n=== GIANT TREE (real input) ===");
  const p = await ctx.newPage();
  await p.setViewportSize(V);
  p.on("pageerror", (e) => E.push({ s: "giantTree", m: e.message }));

  await p.goto(`${BASE}/giant-tree-game.html?qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(4000);
  if (!await rdy(p)) { await shot(p, "gt-timeout"); await p.close(); return; }
  await shot(p, "gt-01-start");

  const steps = [
    { id: "rootGate",      x: 430,  y: 930,  r: 115, label: "거대한 뿌리 입구" },
    { id: "barkPattern",   x: 650,  y: 830,  r: 105, label: "나무껍질 무늬" },
    { id: "seedTrail",     x: 820,  y: 690,  r: 105, label: "도토리 흔적" },
    { id: "hollowEcho",    x: 980,  y: 570,  r: 105, label: "나무 속 울림" },
    { id: "treeRing",      x: 1110, y: 500,  r: 120, label: "나이테 관찰", quiz: [1, 1, 1] },
    { id: "canopyStairs",  x: 1290, y: 430,  r: 125, label: "나선 계단" },
    { id: "squirrel",      x: 1440, y: 320,  r: 100, label: "다람쥐" },
    { id: "reward",        x: 1440, y: 320,  r: 120, label: "보상" },
  ];

  for (const step of steps) {
    const phase = await readPhase(p);
    log(`\n[GT] Phase: ${phase} → ${step.label}`);
    const r = await moveTo(p, step.x, step.y, { arriveRadius: step.r * 0.8, label: step.id });
    log(`  Arrived: (${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}) dist=${r.dist?.toFixed(0)}`);
    if (["rootGate", "treeRing", "squirrel", "reward"].includes(step.id))
      await shot(p, `gt-${step.id}-near`);

    if (step.quiz) {
      log(`  Quiz: ${step.quiz.length} rounds, indices: ${step.quiz}`);
      await pressA(p);
      const opened = await wMod(p, 3000);
      log(`  Quiz modal opened: ${opened}`);
      if (opened) {
        for (let round = 0; round < step.quiz.length; round++) {
          await p.waitForTimeout(400);
          await shot(p, `gt-quiz-r${round + 1}`);
          log(`  Round ${round + 1}: selecting index ${step.quiz[round]}`);
          await selectChoice(p, step.quiz[round]);
          const st = await readState(p);
          log(`  → treeRingRound=${st?.treeRingRound} complete=${st?.treeRingComplete}`);
        }
      }
    } else {
      await interactAndConfirm(p);
    }

    const st = await readState(p);
    log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
  }

  const rw = await readState(p);
  log(`\n[GT] FINAL: phase=${await readPhase(p)} reward=${rw?.rewardComplete}`);
  await shot(p, "gt-02-done");
  await p.close();
  return { rewardComplete: rw?.rewardComplete, phase: await readPhase(p).catch(() => "?") };
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  log("Starting Cave + Giant Tree E2E");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const caveResult = await cave(ctx);
  const gtResult = await giantTree(ctx);
  await browser.close();

  log("\n=== RESULTS ===");
  log(`Cave:      reward=${caveResult?.rewardComplete} phase=${caveResult?.phase}`);
  log(`GiantTree: reward=${gtResult?.rewardComplete} phase=${gtResult?.phase}`);
  log(`Screenshots: ${R.length}`);
  log(`Errors: ${E.length}`);
  if (E.length > 0) E.forEach(e => log(`  ERROR [${e.s}]: ${e.m}`));

  const report = {
    timestamp: new Date().toISOString(),
    cave: caveResult, giantTree: gtResult,
    screenshots: R.map(r => ({ name: r.n, path: r.path, size: r.sz })),
    errors: E,
  };
  const rptPath = join(ART, "e2e-report.json");
  writeFileSync(rptPath, JSON.stringify(report, null, 2));
  log(`Report: ${rptPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
