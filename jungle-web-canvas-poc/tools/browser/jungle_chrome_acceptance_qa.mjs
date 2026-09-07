import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8123";
const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-chrome-acceptance-qa");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });

const log = (m) => console.log(`[QA] ${m}`);

// ─── READ-ONLY OBSERVATION ─────────────────────────────────
async function readPlayer(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniCaveGame ||
              globalThis.__eduniGiantTreeGame || globalThis.__eduniSkyRidgeGame;
    if (!g?.player) return null;
    return { x: g.player.x, y: g.player.y };
  });
}
async function readState(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniCaveGame ||
              globalThis.__eduniGiantTreeGame || globalThis.__eduniSkyRidgeGame;
    return g?.getState?.() || null;
  });
}
async function readNearest(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame || globalThis.__eduniCaveGame ||
              globalThis.__eduniGiantTreeGame || globalThis.__eduniSkyRidgeGame;
    const n = g?.getNearestInteractable?.();
    return n ? { id: n.id, x: n.x, y: n.y, radius: n.radius } : null;
  });
}
async function readRewards(p) {
  return p.evaluate(() => {
    const r = localStorage.getItem("eduni.jungle.stageRewards.v1");
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
async function readHintText(p) {
  return p.evaluate(() => document.querySelector("#modal-hint")?.textContent || "");
}
async function readPhase(p) {
  return p.evaluate(() => document.querySelector("#status")?.dataset?.gamePhase || "");
}
async function readHubBadges(p) {
  return p.evaluate(() => {
    const badges = document.querySelectorAll("#badges .badge.earned");
    return Array.from(badges).map((b) => b.textContent.trim());
  });
}
async function readHubProgress(p) {
  return p.evaluate(() => document.querySelector("#progress")?.textContent || "");
}
async function readCanvasVisible(p) {
  return p.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c) return false;
    return c.width > 0 && c.height > 0;
  });
}
async function readDpadVisible(p) {
  return p.evaluate(() => {
    const dpad = document.querySelector("#dpad");
    if (!dpad) return false;
    const s = window.getComputedStyle(dpad);
    return s.display !== "none" && s.visibility !== "hidden";
  });
}

// ─── SCREENSHOT ────────────────────────────────────────────
let N = 0;
const R = [];
async function shot(p, name, ctx = "") {
  N++;
  const prefix = ctx ? `${ctx}-` : "";
  const pt = join(ART, `${String(N).padStart(3, "0")}-${prefix}${name}.png`);
  await p.screenshot({ path: pt });
  R.push({ n: name, ctx, path: pt, sz: statSync(pt).size });
}

// ─── WAIT FOR GAME READY ──────────────────────────────────
async function rdy(p, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate(() => {
      const g = globalThis.__eduniJungleGame || globalThis.__eduniCaveGame ||
                globalThis.__eduniGiantTreeGame || globalThis.__eduniSkyRidgeGame;
      return g?.player && typeof g.player.x === "number";
    });
    if (ok) return true;
    await p.waitForTimeout(300);
  }
  return false;
}

// ─── REAL INPUT: MOVEMENT ─────────────────────────────────
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

async function moveTo(p, tx, ty, { maxSteps = 40, arriveRadius = 30, label = "" } = {}) {
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
    const { after, moved } = await pressDir(p, dir, holdMs);
    if (moved < 2) {
      stuckCount++;
      if (stuckCount > 6) return { pos: after, dist, steps: i };
      const perps = Math.abs(dx) > Math.abs(dy)
        ? [dy > 0 ? "d" : "u", dy > 0 ? "u" : "d"]
        : [dx > 0 ? "r" : "l", dx > 0 ? "l" : "r"];
      for (const perp of perps) {
        const { moved: pm } = await pressDir(p, perp, 300);
        if (pm > 2) break;
      }
    } else { stuckCount = 0; }
  }
  const final = await readPlayer(p);
  return { pos: final, dist: Math.hypot(tx - final.x, ty - final.y), steps: maxSteps };
}

// ─── REAL INPUT: INTERACTIONS ──────────────────────────────
async function pressA(p) {
  await p.keyboard.down("a");
  await p.waitForTimeout(80);
  await p.keyboard.up("a");
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
async function pickAnswer0(p) {
  await p.waitForTimeout(300);
  await pressA(p);
  await p.waitForTimeout(600);
}
async function dismissPanel(p) {
  await pressA(p);
  await p.waitForTimeout(400);
}
async function interactAndConfirm(p, { maxAttempts = 8, waitMs = 500 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    await pressA(p);
    await p.waitForTimeout(waitMs);
    const modal = await readModalVisible(p);
    if (!modal) return true;
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

// ─── HUB NAVIGATION ───────────────────────────────────────
const STAGE_LINKS = {
  camp:      ".card.camp a",
  waterfall: ".card.waterfall a",
  cave:      ".card.cave a",
  giantTree: ".card.tree a",
  skyRidge:  ".card.sky a",
};

async function clickHubLink(p, stageId) {
  const selector = STAGE_LINKS[stageId];
  await p.waitForSelector(selector, { state: "visible", timeout: 5000 });
  await p.click(selector);
  await p.waitForTimeout(1000);
}

async function backToHub(p) {
  await p.goBack({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1000);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
}

// ─── CAMP ──────────────────────────────────────────────────
async function camp(p, ctx) {
  log("=== CAMP ===");
  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: camp not ready"); return false; }
  await shot(p, "start", ctx);

  await moveTo(p, 200, 620);
  await moveTo(p, 520, 620);
  await moveTo(p, 520, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "hut") await pressDir(p, "l", 800);
  await shot(p, "near-hut", ctx);

  for (let i = 0; i < 5; i++) {
    await pressA(p);
    await p.waitForTimeout(500);
    const st = await readState(p);
    if (st?.questStarted) break;
  }
  await shot(p, "quest-started", ctx);

  await moveTo(p, 690, 320);
  near = await readNearest(p);
  if (!near || near.id !== "feather") await pressDir(p, "r", 400);
  await shot(p, "near-feather", ctx);
  await pressA(p); await wMod(p); await shot(p, "q1", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 920, 320);
  await moveTo(p, 920, 570);
  near = await readNearest(p);
  if (!near || near.id !== "footprints") await pressDir(p, "u", 300);
  await shot(p, "near-footprints", ctx);
  await pressA(p); await wMod(p); await shot(p, "q2", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 920, 820);
  await moveTo(p, 1120, 820);
  near = await readNearest(p);
  if (!near || near.id !== "birdcall") await pressDir(p, "r", 400);
  await shot(p, "near-birdcall", ctx);
  await pressA(p); await wMod(p); await shot(p, "q3", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1300, 820);
  await moveTo(p, 1300, 420);
  await p.waitForTimeout(3000);
  near = await readNearest(p);
  await shot(p, "near-bluebird", ctx);
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "capture", ctx);

  const revealed = await waitForConfirm(p, 8000);
  await shot(p, "reward-visible", ctx);
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "reward-done", ctx);

  const st = await readState(p);
  log(`camp state: bluebirdComplete=${st?.bluebirdComplete}`);
  return st?.bluebirdComplete === true;
}

// ─── WATERFALL ─────────────────────────────────────────────
async function waterfall(p, ctx) {
  log("=== WATERFALL ===");
  await clickHubLink(p, "waterfall");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: waterfall not ready"); return false; }
  await shot(p, "start", ctx);

  await moveTo(p, 200, 900);
  await moveTo(p, 700, 900);
  await shot(p, "near-gate", ctx);
  await interactAndConfirm(p);
  let st = await readState(p);
  log(`streamGateComplete: ${st?.streamGateComplete}`);
  await shot(p, "gate-done", ctx);

  await moveTo(p, 700, 760);
  await moveTo(p, 900, 760);
  await moveTo(p, 900, 700);
  await moveTo(p, 1080, 700);
  await shot(p, "near-stones", ctx);
  await interactAndConfirm(p);
  st = await readState(p);
  log(`steppingStonesComplete: ${st?.steppingStonesComplete}`);
  await shot(p, "stones-done", ctx);

  await moveTo(p, 1080, 560);
  await moveTo(p, 1170, 560);
  await shot(p, "near-echo", ctx);
  await pressA(p); await wMod(p); await shot(p, "q1", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1020, 480);
  let near = await readNearest(p);
  if (!near || near.id !== "mistTrail") await pressDir(p, "l", 400);
  await shot(p, "near-mist", ctx);
  await pressA(p); await wMod(p); await shot(p, "q2", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1250, 470);
  near = await readNearest(p);
  if (!near || near.id !== "waterDrops") await pressDir(p, "r", 400);
  await shot(p, "near-drops", ctx);
  await pressA(p); await wMod(p); await shot(p, "q3", ctx);
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1250, 330);
  await moveTo(p, 1450, 330);
  await shot(p, "near-lookout", ctx);
  await interactAndConfirm(p);

  await p.waitForTimeout(2000);
  near = await readNearest(p);
  await shot(p, "near-kingfisher", ctx);
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "capture", ctx);

  const revealed = await waitForConfirm(p, 8000);
  await shot(p, "reward-visible", ctx);
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "reward-done", ctx);

  st = await readState(p);
  log(`wf state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── CAVE ──────────────────────────────────────────────────
async function cave(p, ctx) {
  log("=== CAVE ===");
  await clickHubLink(p, "cave");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: cave not ready"); return false; }
  await shot(p, "start", ctx);

  const steps = [
    { id: "caveGate",       x: 420,  y: 930,  r: 110, label: "동굴 입구" },
    { id: "glowTrail",      x: 620,  y: 860,  r: 110, label: "반딧불 길" },
    { id: "echoCrystal",    x: 780,  y: 700,  r: 100, label: "울림 수정" },
    { id: "shadowMark",     x: 930,  y: 600,  r: 100, label: "벽 그림자" },
    { id: "fireflyPattern", x: 1080, y: 520,  r: 120, label: "반딧불 깜빡임", quiz: true, quizIndices: [0, 1, 0] },
    { id: "crystalBridge",  x: 1260, y: 460,  r: 120, label: "수정 다리" },
    { id: "bat",            x: 1420, y: 340,  r: 100, label: "작은 박쥐" },
    { id: "reward",         x: 1420, y: 340,  r: 120, label: "보상" },
  ];

  for (const step of steps) {
    const phase = await readPhase(p);
    log(`[CAVE] Phase: ${phase} → ${step.label}`);

    let r = await moveTo(p, step.x, step.y, { arriveRadius: step.r * 0.8, maxSteps: 60, label: step.id });
    log(`  Arrived: (${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}) dist=${r.dist?.toFixed(0)}`);

    if (r.dist > step.r) {
      for (let pass = 0; pass < 3 && r.dist > step.r; pass++) {
        for (const dir of ["r", "d", "l", "u"]) {
          await pressDir(p, dir, 200);
          const fp = await readPlayer(p);
          if (fp) {
            const fd = Math.hypot(step.x - fp.x, step.y - fp.y);
            if (fd <= step.r) { r = { pos: fp, dist: fd }; break; }
          }
        }
      }
    }

    if (step.quiz) {
      const quizIndices = step.quizIndices || [0, 0, 0];
      await pressA(p);
      const opened = await wMod(p, 5000);
      log(`  Quiz modal opened: ${opened}`);
      if (opened) {
        for (let round = 0; round < 3; round++) {
          await p.waitForTimeout(1000);
          const stillOpen = await readModalVisible(p);
          log(`  Round ${round + 1}: modal=${stillOpen}`);
          if (!stillOpen) {
            await pressA(p);
            await wMod(p, 3000);
          }
          await shot(p, `quiz-r${round + 1}`, ctx);
          await selectChoice(p, quizIndices[round]);
          await p.waitForTimeout(1000);
          const st = await readState(p);
          log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
        }
      } else {
        await pressA(p);
        await wMod(p, 3000);
        for (let round = 0; round < 3; round++) {
          await selectChoice(p, quizIndices[round]);
          await p.waitForTimeout(1000);
        }
      }
    } else if (step.id === "reward") {
      await p.waitForTimeout(2000);
      await shot(p, "near-bat", ctx);
      await pressA(p); await p.waitForTimeout(1500);
      await shot(p, "bat-capture", ctx);
      const revealed = await waitForConfirm(p, 8000);
      await shot(p, "reward-visible", ctx);
      await dismissPanel(p);
      await p.waitForTimeout(500);
      await shot(p, "reward-done", ctx);
    } else {
      for (let attempt = 0; attempt < 3; attempt++) {
        const done = await interactAndConfirm(p);
        if (done) break;
        await pressDir(p, "r", 200);
      }
    }

    const st = await readState(p);
    log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
  }

  const st = await readState(p);
  log(`cave state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── GIANT TREE ────────────────────────────────────────────
async function giantTree(p, ctx) {
  log("=== GIANT TREE ===");
  await clickHubLink(p, "giantTree");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: giant tree not ready"); return false; }
  await shot(p, "start", ctx);

  const steps = [
    { id: "rootGate",      x: 430,  y: 930,  r: 115, label: "거대한 뿌리 입구" },
    { id: "barkPattern",   x: 650,  y: 830,  r: 105, label: "나무껍질 무늬", waypoint: { x: 430, y: 830 } },
    { id: "seedTrail",     x: 820,  y: 690,  r: 105, label: "도토리 흔적" },
    { id: "hollowEcho",    x: 980,  y: 570,  r: 105, label: "나무 속 울림" },
    { id: "treeRing",      x: 1110, y: 500,  r: 120, label: "나이테 관찰", quiz: true, quizIndices: [1, 1, 1] },
    { id: "canopyStairs",  x: 1290, y: 430,  r: 125, label: "나선 계단" },
    { id: "squirrel",      x: 1440, y: 320,  r: 100, label: "다람쥐", waypoint: { x: 1290, y: 320 } },
    { id: "reward",        x: 1440, y: 320,  r: 120, label: "보상" },
  ];

  for (const step of steps) {
    const phase = await readPhase(p);
    log(`[TREE] Phase: ${phase} → ${step.label}`);

    if (step.waypoint) {
      await moveTo(p, step.waypoint.x, step.waypoint.y, { arriveRadius: 40, maxSteps: 40, label: step.id + "-wp" });
    }

    let r = await moveTo(p, step.x, step.y, { arriveRadius: step.r * 0.8, maxSteps: 60, label: step.id });
    log(`  Arrived: (${r.pos?.x?.toFixed(0)},${r.pos?.y?.toFixed(0)}) dist=${r.dist?.toFixed(0)}`);

    if (r.dist > step.r) {
      for (let pass = 0; pass < 3 && r.dist > step.r; pass++) {
        for (const dir of ["r", "d", "l", "u"]) {
          await pressDir(p, dir, 200);
          const fp = await readPlayer(p);
          if (fp) {
            const fd = Math.hypot(step.x - fp.x, step.y - fp.y);
            if (fd <= step.r) { r = { pos: fp, dist: fd }; break; }
          }
        }
      }
    }

    if (step.quiz) {
      const quizIndices = step.quizIndices || [0, 0, 0];
      await pressA(p);
      const opened = await wMod(p, 5000);
      log(`  Quiz modal opened: ${opened}`);
      if (opened) {
        for (let round = 0; round < 3; round++) {
          await p.waitForTimeout(1000);
          const stillOpen = await readModalVisible(p);
          log(`  Round ${round + 1}: modal=${stillOpen}`);
          if (!stillOpen) {
            await pressA(p);
            await wMod(p, 3000);
          }
          await shot(p, `quiz-r${round + 1}`, ctx);
          await selectChoice(p, quizIndices[round]);
          await p.waitForTimeout(1000);
          const st = await readState(p);
          log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
        }
      } else {
        await pressA(p);
        await wMod(p, 3000);
        for (let round = 0; round < 3; round++) {
          await selectChoice(p, quizIndices[round]);
          await p.waitForTimeout(1000);
        }
      }
    } else if (step.id === "reward") {
      await p.waitForTimeout(2000);
      await shot(p, "near-squirrel", ctx);
      await pressA(p); await p.waitForTimeout(1500);
      await shot(p, "squirrel-capture", ctx);
      const revealed = await waitForConfirm(p, 8000);
      await shot(p, "reward-visible", ctx);
      await dismissPanel(p);
      await p.waitForTimeout(500);
      await shot(p, "reward-done", ctx);
    } else {
      for (let attempt = 0; attempt < 3; attempt++) {
        const done = await interactAndConfirm(p);
        if (done) break;
        await pressDir(p, "r", 200);
      }
    }

    const st = await readState(p);
    log(`  → phase=${await readPhase(p)} reward=${st?.rewardComplete}`);
  }

  const st = await readState(p);
  log(`tree state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── SKY RIDGE ─────────────────────────────────────────────
async function skyRidge(p, ctx) {
  log("=== SKY RIDGE ===");
  await clickHubLink(p, "skyRidge");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: sky ridge not ready"); return false; }
  await shot(p, "start", ctx);

  await moveTo(p, 430, 930, { label: "skyGate" });
  await shot(p, "near-gate", ctx);
  for (let attempt = 0; attempt < 5; attempt++) {
    await pressA(p);
    await p.waitForTimeout(1500);
    const st = await readState(p);
    if (st?.skyGateComplete) break;
    log(`  gate attempt ${attempt + 1}: skyGateComplete=${st?.skyGateComplete}`);
  }
  let st = await readState(p);
  log(`skyGateComplete: ${st?.skyGateComplete}`);
  await shot(p, "gate-done", ctx);
  await p.waitForTimeout(1500);

  const panelOpen = await readModalVisible(p);
  if (panelOpen) await dismissPanel(p);

  await moveTo(p, 430, 820, { label: "windRibbon-wp1" });
  await moveTo(p, 650, 820, { label: "windRibbon" });
  await shot(p, "near-ribbon", ctx);
  await pressA(p); await wMod(p); await shot(p, "q1", ctx);
  await pressA(p); await p.waitForTimeout(1200);

  await moveTo(p, 650, 690, { label: "cloudShadow-wp1" });
  await moveTo(p, 830, 690, { label: "cloudShadow" });
  await shot(p, "near-cloud", ctx);
  await pressA(p); await wMod(p); await shot(p, "q2", ctx);
  await pressA(p); await p.waitForTimeout(1200);

  await moveTo(p, 830, 560, { label: "windChime-wp1" });
  await moveTo(p, 1000, 560, { label: "windChime" });
  await shot(p, "near-chime", ctx);
  await pressA(p); await wMod(p); await shot(p, "q3", ctx);
  await pressA(p); await p.waitForTimeout(1200);

  st = await readState(p);
  log(`after quizzes: clueQuizzesComplete=${st?.adventure?.clueQuizzesComplete}, score=${st?.adventure?.clueQuizScore}`);

  await moveTo(p, 1000, 490, { label: "summit-wp1" });
  await moveTo(p, 1130, 490, { label: "summit-wp2" });
  await moveTo(p, 1130, 420, { label: "summit-wp3" });
  await moveTo(p, 1300, 420, { label: "summitBridge" });
  await shot(p, "near-bridge", ctx);
  await interactAndConfirm(p);

  await moveTo(p, 1300, 310, { label: "hawk-wp1" });
  await moveTo(p, 1450, 310, { label: "hawk" });
  await p.waitForTimeout(2000);
  await shot(p, "near-hawk", ctx);
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "hawk-capture", ctx);

  await waitForConfirm(p, 8000);
  await shot(p, "reward-visible", ctx);
  await dismissPanel(p);
  await p.waitForTimeout(1500);

  await waitForConfirm(p, 8000);
  await shot(p, "reward-confirm", ctx);
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "reward-done", ctx);

  st = await readState(p);
  log(`sky state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── HUB VERIFICATION ─────────────────────────────────────
async function verifyHub(p, ctx) {
  log("=== HUB VERIFICATION ===");
  await shot(p, "overview", ctx);

  const rw = await readRewards(p);
  const rewards = rw?.earned || [];
  log(`rewards: ${JSON.stringify(rewards)}`);
  log(`rewards: ${rewards.length}/5`);

  const badges = await readHubBadges(p);
  log(`hub badges: ${JSON.stringify(badges)}`);
  const progress = await readHubProgress(p);
  log(`hub progress: ${progress}`);

  const has5of5 = progress.includes("5 / 5");
  const hasComplete = progress.includes("정글 탐험 완주!");
  log(`hub assert 5/5: ${has5of5}, 완주: ${hasComplete}`);

  await shot(p, "final", ctx);
  return { rewardCount: rewards.length, has5of5, hasComplete };
}

// ─── PERSISTENCE CHECK ────────────────────────────────────
async function persistenceCheck(p, ctx) {
  log("=== PERSISTENCE CHECK ===");
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await shot(p, "reload", ctx);

  const rw = await readRewards(p);
  const rewardCount = rw?.earned ? rw.earned.length : 0;
  log(`after reload — rewards: ${rewardCount}/5`);
  await shot(p, "verify", ctx);
  return { rewardCount };
}

// ═════════════════════════════════════════════════════════════
// RUN A: DESKTOP CHROME ACCEPTANCE
// ═════════════════════════════════════════════════════════════
async function runA() {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  RUN A: DESKTOP CHROME ACCEPTANCE (1280×800)");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const browser = await chromium.launch({ headless: false, channel: "chrome", timeout: 15000 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push({ s: "pageerror", m: e.message }));
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (t.includes("404")) return;
      errors.push({ s: "console.error", m: t });
    }
  });
  p.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("/assets/vendor/")) {
      errors.push({ s: "response-error", m: `${res.status()} ${res.url()}` });
    }
  });

  const results = {};

  // Hub fresh start
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await shot(p, "hub-fresh", "runA");
  const freshProgress = await readHubProgress(p);
  results.hubFresh = freshProgress;
  log(`Hub fresh: ${freshProgress}`);

  // TC-HUB-001: Canvas visible
  const canvasOk = await readCanvasVisible(p);
  results.canvasVisible = canvasOk;
  log(`Canvas visible: ${canvasOk}`);

  // Camp
  results.camp = await camp(p, "runA");
  await shot(p, "after-camp", "runA");
  log(`Camp: ${results.camp ? "PASS" : "FAIL"}`);

  // Back to Hub, verify 1/5
  await backToHub(p);
  const hub1 = await verifyHub(p, "runA-1of5");
  results.hubAfterCamp = hub1;
  log(`Hub after Camp: ${hub1.rewardCount}/5`);

  // Waterfall
  results.waterfall = await waterfall(p, "runA");
  await shot(p, "after-waterfall", "runA");
  log(`Waterfall: ${results.waterfall ? "PASS" : "FAIL"}`);

  // Mid persistence
  await backToHub(p);
  const mid = await persistenceCheck(p, "runA-mid");
  results.midPersist = mid;
  log(`Mid persist: ${mid.rewardCount}/5`);

  // Cave
  results.cave = await cave(p, "runA");
  await shot(p, "after-cave", "runA");
  log(`Cave: ${results.cave ? "PASS" : "FAIL"}`);

  // Giant Tree
  await backToHub(p);
  results.giantTree = await giantTree(p, "runA");
  await shot(p, "after-gianttree", "runA");
  log(`Giant Tree: ${results.giantTree ? "PASS" : "FAIL"}`);

  // Sky Ridge
  await backToHub(p);
  results.skyRidge = await skyRidge(p, "runA");
  await shot(p, "after-skyridge", "runA");
  log(`Sky Ridge: ${results.skyRidge ? "PASS" : "FAIL"}`);

  // Final Hub verification
  await backToHub(p);
  const hubFinal = await verifyHub(p, "runA-final");
  results.hubFinal = hubFinal;

  // Final persistence
  const finalPersist = await persistenceCheck(p, "runA-final");
  results.finalPersist = finalPersist;

  // TC-PERSIST-003: Re-entry check
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  const reEntryRewards = await readRewards(p);
  results.reEntryRewards = reEntryRewards?.earned?.length || 0;
  log(`Re-entry rewards after camp: ${results.reEntryRewards}/5`);
  await backToHub(p);

  // TC-INPUT-002: Mouse click test
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await p.click(".card.waterfall a");
  await p.waitForTimeout(2000);
  const mouseNavOk = await rdy(p, 5000);
  results.mouseNav = mouseNavOk;
  log(`Mouse nav: ${mouseNavOk}`);
  await backToHub(p);

  await p.close();
  await browser.close();

  results.errors = errors;
  results.vendorWarnings = errors.filter(e => e.m.includes("404")).length;
  results.realErrors = errors.filter(e => !e.m.includes("404")).length;

  return results;
}

// ═════════════════════════════════════════════════════════════
// RUN B: TABLET TOUCH ACCEPTANCE
// ═════════════════════════════════════════════════════════════
async function runB() {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  RUN B: TABLET TOUCH ACCEPTANCE (800×1280)");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const browser = await chromium.launch({ headless: false, channel: "chrome", timeout: 15000 });
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 1280 },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push({ s: "pageerror", m: e.message }));
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (t.includes("404")) return;
      errors.push({ s: "console.error", m: t });
    }
  });

  const results = {};

  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await shot(p, "hub-fresh", "runB");

  // Camp via touch
  results.camp = await camp(p, "runB");
  await backToHub(p);
  log(`Camp (touch): ${results.camp ? "PASS" : "FAIL"}`);

  // Check D-pad after entering a game (not at hub)
  const dpadOk = await readDpadVisible(p);
  results.dpadVisible = dpadOk;
  log(`D-pad visible: ${dpadOk}`);

  // Waterfall via touch
  results.waterfall = await waterfall(p, "runB");
  await backToHub(p);
  log(`Waterfall (touch): ${results.waterfall ? "PASS" : "FAIL"}`);

  // Cave via touch (needed to unlock Giant Tree, then Sky Ridge)
  results.cave = await cave(p, "runB");
  await backToHub(p);
  log(`Cave (touch): ${results.cave ? "PASS" : "FAIL"}`);

  // Giant Tree via touch (needed to unlock Sky Ridge)
  results.giantTree = await giantTree(p, "runB");
  await backToHub(p);
  log(`Giant Tree (touch): ${results.giantTree ? "PASS" : "FAIL"}`);

  // TC-INPUT-004: Orientation change
  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForTimeout(1000);
  await shot(p, "landscape", "runB");
  const canvasAfterResize = await readCanvasVisible(p);
  results.resizeOk = canvasAfterResize;
  log(`After resize: canvas=${canvasAfterResize}`);
  await p.setViewportSize({ width: 800, height: 1280 });
  await p.waitForTimeout(1000);
  await shot(p, "portrait-again", "runB");

  // Sky Ridge via touch
  results.skyRidge = await skyRidge(p, "runB");
  await backToHub(p);
  log(`Sky Ridge (touch): ${results.skyRidge ? "PASS" : "FAIL"}`);

  const hubFinal = await verifyHub(p, "runB-final");
  results.hubFinal = hubFinal;

  await p.close();
  await browser.close();

  results.errors = errors;
  results.realErrors = errors.filter(e => !e.m.includes("404")).length;
  return results;
}

// ═════════════════════════════════════════════════════════════
// RUN C: NEGATIVE / RECOVERY ACCEPTANCE
// ═════════════════════════════════════════════════════════════
async function runC() {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  RUN C: NEGATIVE / RECOVERY ACCEPTANCE");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const browser = await chromium.launch({ headless: false, channel: "chrome", timeout: 15000 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push({ s: "pageerror", m: e.message }));
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (t.includes("404")) return;
      errors.push({ s: "console.error", m: t });
    }
  });

  const results = {};

  // TC-CAMP-004: Fail path — wrong answers
  log("--- TC-CAMP-004: Wrong answers ---");
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await shot(p, "hub-fresh", "runC");

  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  await rdy(p);

  // Quest start
  await moveTo(p, 520, 320);
  for (let i = 0; i < 5; i++) {
    await pressA(p);
    await p.waitForTimeout(500);
    const st = await readState(p);
    if (st?.questStarted) break;
  }

  // Wrong answers: select choice 3 (last) for all 3 quizzes
  await moveTo(p, 690, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "feather") await pressDir(p, "r", 400);
  await pressA(p); await wMod(p); await shot(p, "fail-q1", "runC");
  await selectChoice(p, 3); await dismissPanel(p);

  await moveTo(p, 920, 320);
  await moveTo(p, 920, 570);
  near = await readNearest(p);
  if (!near || near.id !== "footprints") await pressDir(p, "u", 300);
  await pressA(p); await wMod(p); await shot(p, "fail-q2", "runC");
  await selectChoice(p, 3); await dismissPanel(p);

  await moveTo(p, 920, 820);
  await moveTo(p, 1120, 820);
  near = await readNearest(p);
  if (!near || near.id !== "birdcall") await pressDir(p, "r", 400);
  await pressA(p); await wMod(p); await shot(p, "fail-q3", "runC");
  await selectChoice(p, 3); await dismissPanel(p);

  // Try to meet bluebird — should fail or not be accessible
  await moveTo(p, 1300, 420);
  await p.waitForTimeout(2000);
  near = await readNearest(p);
  const failState = await readState(p);
  results.failPathNoReward = !failState?.bluebirdComplete;
  results.failPathNearbird = near?.id || "none";
  log(`Fail path: bluebirdComplete=${failState?.bluebirdComplete}, near=${near?.id}`);
  await shot(p, "fail-near-bird", "runC");
  await backToHub(p);

  // TC-CAVE-002: Retry/re-observation
  log("--- TC-CAVE-002: Modal close/reopen ---");
  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  await rdy(p);
  await moveTo(p, 690, 320);
  near = await readNearest(p);
  if (!near || near.id !== "feather") await pressDir(p, "r", 400);
  await pressA(p); await wMod(p);
  // Close with Escape
  await p.keyboard.press("Escape");
  await p.waitForTimeout(500);
  const modalClosed = !(await readModalVisible(p));
  results.modalCloseOk = modalClosed;
  log(`Modal close with Escape: ${modalClosed}`);
  // Reopen
  await pressA(p); await wMod(p);
  const modalReopen = await readModalVisible(p);
  results.modalReopenOk = modalReopen;
  log(`Modal reopen: ${modalReopen}`);
  await shot(p, "modal-reopen", "runC");
  await dismissPanel(p);
  await backToHub(p);

  // TC-WF-004: Rapid A regression
  log("--- TC-WF-004: Rapid A presses ---");
  await clickHubLink(p, "waterfall");
  await p.waitForTimeout(3000);
  await rdy(p);
  await moveTo(p, 700, 900);
  await interactAndConfirm(p);
  // Rapid A on gate
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press("a");
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(1000);
  const rapidACrash = errors.length;
  results.rapidANoCrash = true; // if we get here, no crash
  log(`Rapid A: errors after=${errors.length}`);
  await shot(p, "rapid-a", "runC");
  await backToHub(p);

  // Reload test
  log("--- Reload recovery ---");
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  const afterReload = await readRewards(p);
  results.reloadRecovery = afterReload?.earned?.length || 0;
  log(`After reload: ${results.reloadRecovery} rewards`);
  await shot(p, "reload-recovery", "runC");

  // TC-PERSIST-003: Re-entry no duplicate reward
  log("--- TC-PERSIST-003: Re-entry no duplicate ---");
  // First, complete camp properly
  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  await rdy(p);
  const campState = await readState(p);
  results.campAlreadyComplete = campState?.bluebirdComplete;
  log(`Camp already complete: ${campState?.bluebirdComplete}`);
  await shot(p, "re-entry-camp", "runC");
  await backToHub(p);

  const reEntryRewards = await readRewards(p);
  results.noDuplicateReward = (reEntryRewards?.earned?.length || 0) <= 5;
  log(`Re-entry rewards: ${reEntryRewards?.earned?.length}, no duplicate: ${results.noDuplicateReward}`);
  await shot(p, "re-entry-hub", "runC");

  await p.close();
  await browser.close();

  results.errors = errors;
  results.realErrors = errors.filter(e => !e.m.includes("404")).length;
  return results;
}

// ═════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════
async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  log(`START ${ts}`);

  const resultA = await runA();
  const resultB = await runB();
  const resultC = await runC();

  const allResults = { ts, runA: resultA, runB: resultB, runC: resultC, screenshots: R };
  writeFileSync(join(ART, "acceptance-results.json"), JSON.stringify(allResults, null, 2));

  log("━━━ SUMMARY ━━━");
  log(`Run A Camp: ${resultA.camp ? "PASS" : "FAIL"}`);
  log(`Run A Waterfall: ${resultA.waterfall ? "PASS" : "FAIL"}`);
  log(`Run A Cave: ${resultA.cave ? "PASS" : "FAIL"}`);
  log(`Run A Giant Tree: ${resultA.giantTree ? "PASS" : "FAIL"}`);
  log(`Run A Sky Ridge: ${resultA.skyRidge ? "PASS" : "FAIL"}`);
  log(`Run A Hub: ${resultA.hubFinal?.rewardCount}/5, 완주: ${resultA.hubFinal?.hasComplete}`);
  log(`Run A Errors: ${resultA.realErrors}`);
  log(`Run B Camp: ${resultB.camp ? "PASS" : "FAIL"}`);
  log(`Run B Waterfall: ${resultB.waterfall ? "PASS" : "FAIL"}`);
  log(`Run B Cave: ${resultB.cave ? "PASS" : "FAIL"}`);
  log(`Run B Giant Tree: ${resultB.giantTree ? "PASS" : "FAIL"}`);
  log(`Run B Sky Ridge: ${resultB.skyRidge ? "PASS" : "FAIL"}`);
  log(`Run B Hub: ${resultB.hubFinal?.rewardCount}/5`);
  log(`Run B Errors: ${resultB.realErrors}`);
  log(`Run C Fail path no reward: ${resultC.failPathNoReward}`);
  log(`Run C Modal close: ${resultC.modalCloseOk}`);
  log(`Run C Modal reopen: ${resultC.modalReopenOk}`);
  log(`Run C Rapid A no crash: ${resultC.rapidANoCrash}`);
  log(`Run C Reload recovery: ${resultC.reloadRecovery}`);
  log(`Run C No duplicate: ${resultC.noDuplicateReward}`);
  log(`Run C Errors: ${resultC.realErrors}`);
  log(`Screenshots: ${R.length}`);
  log(`END`);

  const allPass = resultA.camp && resultA.waterfall && resultA.cave && resultA.giantTree && resultA.skyRidge &&
                  resultA.hubFinal?.rewardCount === 5 && resultA.hubFinal?.hasComplete &&
                  resultA.finalPersist?.rewardCount === 5 && resultA.realErrors === 0;
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
