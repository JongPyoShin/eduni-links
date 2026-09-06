import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:8123";
const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-full-adventure-e2e");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });
const V = { width: 1280, height: 720 };
const R = [];
const E = [];
let N = 0;
const log = (m) => console.log(`[E2E] ${m}`);

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

// ─── SCREENSHOT ────────────────────────────────────────────
async function shot(p, name) {
  N++;
  const pt = join(ART, `${String(N).padStart(2, "0")}-${name}.png`);
  await p.screenshot({ path: pt });
  R.push({ n: name, path: pt, sz: statSync(pt).size });
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

// ─── HUB NAVIGATION (no page.goto) ────────────────────────
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
async function camp(p) {
  log("=== CAMP ===");
  await clickHubLink(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: camp not ready"); return false; }
  await shot(p, "camp-start");

  await moveTo(p, 200, 620);
  await moveTo(p, 520, 620);
  await moveTo(p, 520, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "hut") await pressDir(p, "l", 800);
  await shot(p, "camp-near-hut");

  for (let i = 0; i < 5; i++) {
    await pressA(p);
    await p.waitForTimeout(500);
    const st = await readState(p);
    if (st?.questStarted) break;
  }
  await shot(p, "camp-quest-started");

  await moveTo(p, 690, 320);
  near = await readNearest(p);
  if (!near || near.id !== "feather") await pressDir(p, "r", 400);
  await shot(p, "camp-near-feather");
  await pressA(p); await wMod(p); await shot(p, "camp-q1");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 920, 320);
  await moveTo(p, 920, 570);
  near = await readNearest(p);
  if (!near || near.id !== "footprints") await pressDir(p, "u", 300);
  await shot(p, "camp-near-footprints");
  await pressA(p); await wMod(p); await shot(p, "camp-q2");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 920, 820);
  await moveTo(p, 1120, 820);
  near = await readNearest(p);
  if (!near || near.id !== "birdcall") await pressDir(p, "r", 400);
  await shot(p, "camp-near-birdcall");
  await pressA(p); await wMod(p); await shot(p, "camp-q3");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1300, 820);
  await moveTo(p, 1300, 420);
  await p.waitForTimeout(3000);
  near = await readNearest(p);
  await shot(p, "camp-near-bluebird");
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "camp-capture");

  const revealed = await waitForConfirm(p, 8000);
  await shot(p, "camp-reward-visible");
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "camp-reward-done");

  const st = await readState(p);
  log(`camp state: bluebirdComplete=${st?.bluebirdComplete}`);
  return st?.bluebirdComplete === true;
}

// ─── WATERFALL ─────────────────────────────────────────────
async function waterfall(p) {
  log("=== WATERFALL ===");
  await clickHubLink(p, "waterfall");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: waterfall not ready"); return false; }
  await shot(p, "wf-start");

  await moveTo(p, 200, 900);
  await moveTo(p, 700, 900);
  await shot(p, "wf-near-gate");
  await interactAndConfirm(p);
  let st = await readState(p);
  log(`streamGateComplete: ${st?.streamGateComplete}`);
  await shot(p, "wf-gate-done");

  await moveTo(p, 700, 760);
  await moveTo(p, 900, 760);
  await moveTo(p, 900, 700);
  await moveTo(p, 1080, 700);
  await shot(p, "wf-near-stones");
  await interactAndConfirm(p);
  st = await readState(p);
  log(`steppingStonesComplete: ${st?.steppingStonesComplete}`);
  await shot(p, "wf-stones-done");

  await moveTo(p, 1080, 560);
  await moveTo(p, 1170, 560);
  await shot(p, "wf-near-echo");
  await pressA(p); await wMod(p); await shot(p, "wf-q1");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1020, 480);
  let near = await readNearest(p);
  if (!near || near.id !== "mistTrail") await pressDir(p, "l", 400);
  await shot(p, "wf-near-mist");
  await pressA(p); await wMod(p); await shot(p, "wf-q2");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1250, 470);
  near = await readNearest(p);
  if (!near || near.id !== "waterDrops") await pressDir(p, "r", 400);
  await shot(p, "wf-near-drops");
  await pressA(p); await wMod(p); await shot(p, "wf-q3");
  await pickAnswer0(p); await dismissPanel(p);

  await moveTo(p, 1250, 330);
  await moveTo(p, 1450, 330);
  await shot(p, "wf-near-lookout");
  await interactAndConfirm(p);

  await p.waitForTimeout(2000);
  near = await readNearest(p);
  await shot(p, "wf-near-kingfisher");
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "wf-capture");

  const revealed = await waitForConfirm(p, 8000);
  await shot(p, "wf-reward-visible");
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "wf-reward-done");

  st = await readState(p);
  log(`wf state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── CAVE ──────────────────────────────────────────────────
async function cave(p) {
  log("=== CAVE ===");
  await clickHubLink(p, "cave");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: cave not ready"); return false; }
  await shot(p, "cave-start");

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
          await shot(p, step.id + `-quiz-r${round + 1}`);
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
      await shot(p, "cave-near-bat");
      await pressA(p); await p.waitForTimeout(1500);
      await shot(p, "cave-bat-capture");
      const revealed = await waitForConfirm(p, 8000);
      await shot(p, "cave-reward-visible");
      await dismissPanel(p);
      await p.waitForTimeout(500);
      await shot(p, "cave-reward-done");
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
async function giantTree(p) {
  log("=== GIANT TREE ===");
  await clickHubLink(p, "giantTree");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: giant tree not ready"); return false; }
  await shot(p, "tree-start");

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
          await shot(p, step.id + `-quiz-r${round + 1}`);
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
      await shot(p, "tree-near-squirrel");
      await pressA(p); await p.waitForTimeout(1500);
      await shot(p, "tree-squirrel-capture");
      const revealed = await waitForConfirm(p, 8000);
      await shot(p, "tree-reward-visible");
      await dismissPanel(p);
      await p.waitForTimeout(500);
      await shot(p, "tree-reward-done");
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
async function skyRidge(p) {
  log("=== SKY RIDGE ===");
  await clickHubLink(p, "skyRidge");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { log("FAIL: sky ridge not ready"); return false; }
  await shot(p, "sky-start");

  await moveTo(p, 430, 930, { label: "skyGate" });
  await shot(p, "sky-near-gate");
  await interactAndConfirm(p);
  let st = await readState(p);
  log(`skyGateComplete: ${st?.skyGateComplete}`);
  await shot(p, "sky-gate-done");
  await p.waitForTimeout(1500);

  const panelOpen = await readModalVisible(p);
  if (panelOpen) await dismissPanel(p);

  // Wind ribbon quiz (650,820) — follow corridor: up to (430,820) then right to (650,820)
  await moveTo(p, 430, 820, { label: "windRibbon-wp1" });
  await moveTo(p, 650, 820, { label: "windRibbon" });
  await shot(p, "sky-near-ribbon");
  const near1 = await readNearest(p);
  log(`[SKY-Q] near windRibbon: ${near1 ? near1.id : "null"}`);
  await pressA(p); await wMod(p); await shot(p, "sky-q1");
  log(`[SKY-Q] q1 modal=${await readModalVisible(p)}`);
  await pressA(p); await p.waitForTimeout(1200);
  log(`[SKY-Q] q1 after: modal=${await readModalVisible(p)}`);

  // Cloud shadow quiz (830,690) — follow corridor: up to (650,690) then right to (830,690)
  await moveTo(p, 650, 690, { label: "cloudShadow-wp1" });
  await moveTo(p, 830, 690, { label: "cloudShadow" });
  await shot(p, "sky-near-cloud");
  const near2 = await readNearest(p);
  log(`[SKY-Q] near cloudShadow: ${near2 ? near2.id : "null"}`);
  await pressA(p); await wMod(p); await shot(p, "sky-q2");
  log(`[SKY-Q] q2 modal=${await readModalVisible(p)}`);
  await pressA(p); await p.waitForTimeout(1200);
  log(`[SKY-Q] q2 after: modal=${await readModalVisible(p)}`);

  // Wind chime quiz (1000,560) — follow corridor: up to (830,560) then right to (1000,560)
  await moveTo(p, 830, 560, { label: "windChime-wp1" });
  await moveTo(p, 1000, 560, { label: "windChime" });
  await shot(p, "sky-near-chime");
  const near3 = await readNearest(p);
  log(`[SKY-Q] near windChime: ${near3 ? near3.id : "null"}`);
  await pressA(p); await wMod(p); await shot(p, "sky-q3");
  log(`[SKY-Q] q3 modal=${await readModalVisible(p)}`);
  await pressA(p); await p.waitForTimeout(1200);
  log(`[SKY-Q] q3 after: modal=${await readModalVisible(p)}`);

  st = await readState(p);
  log(`after quizzes: clueQuizzesComplete=${st?.adventure?.clueQuizzesComplete}, score=${st?.adventure?.clueQuizScore}`);

  await moveTo(p, 1000, 490, { label: "summit-wp1" });
  await moveTo(p, 1130, 490, { label: "summit-wp2" });
  await moveTo(p, 1130, 420, { label: "summit-wp3" });
  await moveTo(p, 1300, 420, { label: "summitBridge" });
  await shot(p, "sky-near-bridge");
  await interactAndConfirm(p);

  await moveTo(p, 1300, 310, { label: "hawk-wp1" });
  await moveTo(p, 1450, 310, { label: "hawk" });
  await p.waitForTimeout(2000);
  await shot(p, "sky-near-hawk");
  await pressA(p); await p.waitForTimeout(1500);
  await shot(p, "sky-hawk-capture");

  await waitForConfirm(p, 8000);
  await shot(p, "sky-reward-visible");
  await dismissPanel(p);
  await p.waitForTimeout(1500);

  await waitForConfirm(p, 8000);
  await shot(p, "sky-reward-confirm");
  await dismissPanel(p);
  await p.waitForTimeout(500);
  await shot(p, "sky-reward-done");

  st = await readState(p);
  log(`sky state: rewardComplete=${st?.rewardComplete}`);
  return st?.rewardComplete === true;
}

// ─── HUB VERIFICATION ─────────────────────────────────────
async function verifyHub(p) {
  log("=== HUB VERIFICATION ===");
  await shot(p, "hub-overview");

  const rw = await readRewards(p);
  const rewards = rw?.earned || [];
  log(`rewards: ${JSON.stringify(rewards)}`);
  log(`rewards: ${rewards.length}/5`);

  const badges = await readHubBadges(p);
  log(`hub badges: ${JSON.stringify(badges)}`);
  const progress = await readHubProgress(p);
  log(`hub progress: ${progress}`);

  await shot(p, "hub-final");
  return { rewardCount: rewards.length };
}

// ─── PERSISTENCE CHECK ────────────────────────────────────
async function persistenceCheck(p) {
  log("=== PERSISTENCE CHECK ===");
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  await shot(p, "persist-reload");

  const rw = await readRewards(p);
  const rewardCount = rw?.earned ? rw.earned.length : 0;
  log(`after reload — rewards: ${rewardCount}/5`);
  await shot(p, "persist-verify");
  return { rewardCount };
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  log(`START ${ts}`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: V });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => E.push({ s: "pageerror", m: e.message }));
  p.on("console", (msg) => {
    if (msg.type() === "error") E.push({ s: "console.error", m: msg.text() });
  });

  const results = {};

  // Run A: Full clean run via Hub navigation
  log("━━━ RUN A: FULL CLEAN RUN (Hub navigation) ━━━");
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(2000);
  await shot(p, "hub-initial");

  results.camp = await camp(p);
  await shot(p, "after-camp");
  log(`Camp: ${results.camp ? "PASS" : "FAIL"}`);

  await backToHub(p);
  results.waterfall = await waterfall(p);
  await shot(p, "after-waterfall");
  log(`Waterfall: ${results.waterfall ? "PASS" : "FAIL"}`);

  // Mid-run persistence check
  const midPersist = await persistenceCheck(p);
  log(`mid-run persistence: rewards=${midPersist.rewardCount}`);
  await backToHub(p);

  results.cave = await cave(p);
  await shot(p, "after-cave");
  log(`Cave: ${results.cave ? "PASS" : "FAIL"}`);

  await backToHub(p);
  results.giantTree = await giantTree(p);
  await shot(p, "after-gianttree");
  log(`Giant Tree: ${results.giantTree ? "PASS" : "FAIL"}`);

  await backToHub(p);
  results.skyRidge = await skyRidge(p);
  await shot(p, "after-skyridge");
  log(`Sky Ridge: ${results.skyRidge ? "PASS" : "FAIL"}`);

  // Hub verification
  await backToHub(p);
  const hub = await verifyHub(p);
  results.rewardCount = hub.rewardCount;

  // Run B: Persistence check
  log("━━━ RUN B: PERSISTENCE CHECK ━━━");
  const persist = await persistenceCheck(p);
  results.persistRewards = persist.rewardCount;

  await p.close();
  await browser.close();

  // Write results
  const report = {
    ts,
    shots: R.length,
    errors: E,
    results,
    screenshots: R,
  };
  writeFileSync(join(ART, "e2e-results.json"), JSON.stringify(report, null, 2));

  log("━━━ SUMMARY ━━━");
  log(`Camp: ${results.camp ? "PASS" : "FAIL"}`);
  log(`Waterfall: ${results.waterfall ? "PASS" : "FAIL"}`);
  log(`Cave: ${results.cave ? "PASS" : "FAIL"}`);
  log(`Giant Tree: ${results.giantTree ? "PASS" : "FAIL"}`);
  log(`Sky Ridge: ${results.skyRidge ? "PASS" : "FAIL"}`);
  log(`Rewards: ${results.rewardCount}/5`);
  log(`Persist rewards: ${results.persistRewards}/5`);
  log(`Screenshots: ${R.length}`);
  log(`Errors: ${E.length}`);
  log(`END`);

  const allPass = results.camp && results.waterfall && results.cave &&
                  results.giantTree && results.skyRidge &&
                  results.rewardCount === 5 &&
                  results.persistRewards === 5;
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
