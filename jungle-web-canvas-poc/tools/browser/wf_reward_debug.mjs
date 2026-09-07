import { chromium } from "playwright";

const BASE = "http://localhost:8123";
const V = { width: 1280, height: 720 };
const log = (m) => console.log(`[DBG] ${m}`);

async function readPlayer(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.player ? { x: g.player.x, y: g.player.y } : null;
  });
}
async function readState(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.getState?.() || null;
  });
}
async function readNearest(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    const n = g?.getNearestInteractable?.();
    return n ? { id: n.id, x: n.x, y: n.y, radius: n.radius } : null;
  });
}

async function readModalVisible(p) {
  return p.evaluate(() => {
    const m = document.querySelector("#modal");
    return m && m.style.display !== "none";
  });
}
async function readModalTitle(p) {
  return p.evaluate(() => document.querySelector("#modal-title")?.textContent || "");
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
async function readRewardComplete(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    const st = g?.getState?.();
    return st ? { rewardComplete: st.rewardComplete } : null;
  });
}

const CRUISE_SPEED = 195;
async function pressDir(p, dir, holdMs) {
  const key = { u: "ArrowUp", d: "ArrowDown", l: "ArrowLeft", r: "ArrowRight" }[dir];
  await p.keyboard.down(key);
  await p.waitForTimeout(holdMs);
  await p.keyboard.up(key);
  await p.waitForTimeout(100);
}

async function moveTo(p, tx, ty, { maxSteps = 25 } = {}) {
  let stuckCount = 0;
  for (let i = 0; i < maxSteps; i++) {
    const pos = await readPlayer(p);
    if (!pos) break;
    const dx = tx - pos.x;
    const dy = ty - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30) return { pos, dist, steps: i };
    let dir;
    if (Math.abs(dy) >= Math.abs(dx)) dir = dy > 0 ? "d" : "u";
    else dir = dx > 0 ? "r" : "l";
    const holdMs = Math.min(2500, Math.max(150, (dist / CRUISE_SPEED) * 1000 + 200));
    await pressDir(p, dir, holdMs);
    const after = await readPlayer(p);
    const moved = after && pos ? Math.hypot(after.x - pos.x, after.y - pos.y) : 0;
    if (moved < 2) {
      stuckCount++;
      if (stuckCount > 4) return { pos: after, dist, steps: i };
      const perps = Math.abs(dx) > Math.abs(dy)
        ? [dy > 0 ? "d" : "u", dy > 0 ? "u" : "d"]
        : [dx > 0 ? "r" : "l", dx > 0 ? "l" : "r"];
      for (const perp of perps) {
        await pressDir(p, perp, 250);
        const pm = await readPlayer(p);
        if (pm && pos && Math.hypot(pm.x - pos.x, pm.y - pos.y) > 2) break;
      }
    } else {
      stuckCount = 0;
    }
  }
  const final = await readPlayer(p);
  return { pos: final, dist: Math.hypot(tx - final.x, ty - final.y), steps: maxSteps };
}

async function pressA(p) {
  await p.keyboard.down("a");
  await p.waitForTimeout(60);
  await p.keyboard.up("a");
  await p.waitForTimeout(200);
}

async function doQuiz(p, label) {
  log(`  quiz ${label}: pressing A to open panel...`);
  await pressA(p);

  const t = Date.now();
  let opened = false;
  while (Date.now() - t < 5000) {
    if (await readModalVisible(p)) { opened = true; break; }
    await p.waitForTimeout(80);
  }
  if (!opened) {
    log(`  quiz ${label}: panel did NOT open, trying another A`);
    await pressA(p);
    await p.waitForTimeout(500);
    opened = await readModalVisible(p);
  }
  log(`  quiz ${label}: panel opened=${opened}`);

  const title = await readModalTitle(p);
  log(`  quiz ${label}: title="${title}"`);

  await p.waitForTimeout(200);
  await pressA(p);
  log(`  quiz ${label}: answer submitted`);

  await p.waitForTimeout(1200);

  const stillOpen = await readModalVisible(p);
  log(`  quiz ${label}: panel still open after wait: ${stillOpen}`);
  if (stillOpen) {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
  }

  const st = await readState(p);
  log(`  quiz ${label}: score=${st?.adventure?.clueQuizScore} discovered=${st?.adventure?.discoveredClues?.length} complete=${st?.adventure?.clueQuizzesComplete}`);
}

async function doConfirm(p, label) {
  log(`  confirm ${label}: pressing A...`);
  await pressA(p);
  await p.waitForTimeout(400);
  const modal = await readModalVisible(p);
  log(`  confirm ${label}: modal visible=${modal}`);
  if (modal) {
    await pressA(p);
    await p.waitForTimeout(400);
  }
  const st = await readState(p);
  log(`  confirm ${label}: done, state keys=${Object.keys(st || {}).join(",")}`);
}

async function main() {
  const b = await chromium.launch({ headless: true });
  const c = await b.newContext({ viewport: V });
  const p = await c.newPage();
  p.on("pageerror", (e) => log(`PAGE ERROR: ${e.message}`));

  log("=== WATERFALL REWARD DEBUG v3 (DOM-only) ===");

  await p.goto(`${BASE}/?stage=waterfall&renderer=three&qa=1`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);

  const ready = await p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.player && typeof g.player.x === "number";
  });
  log(`game ready: ${ready}`);

  // ── stream gate (700,900) ──
  log("→ stream gate");
  await moveTo(p, 200, 900);
  await moveTo(p, 700, 900);
  await doConfirm(p, "streamGate");
  let st = await readState(p);
  log(`  streamGateComplete: ${st?.streamGateComplete}`);

  // ── stepping stones (1080,700) ──
  log("→ stepping stones");
  await moveTo(p, 700, 760);
  await moveTo(p, 900, 760);
  await moveTo(p, 900, 700);
  await moveTo(p, 1080, 700);
  await doConfirm(p, "steppingStones");
  st = await readState(p);
  log(`  steppingStonesComplete: ${st?.steppingStonesComplete}`);

  // ── echo quiz (1170,560) ──
  log("→ echo");
  await moveTo(p, 1080, 560);
  await moveTo(p, 1170, 560);
  let near = await readNearest(p);
  log(`  near: ${JSON.stringify(near)}`);
  await doQuiz(p, "echo");

  // ── mistTrail quiz (1020,480) ──
  log("→ mistTrail");
  await moveTo(p, 1020, 480);
  near = await readNearest(p);
  log(`  near: ${JSON.stringify(near)}`);
  await doQuiz(p, "mistTrail");

  // ── waterDrops quiz (1250,470) ──
  log("→ waterDrops");
  await moveTo(p, 1250, 470);
  near = await readNearest(p);
  log(`  near: ${JSON.stringify(near)}`);
  await doQuiz(p, "waterDrops");

  st = await readState(p);
  log(`\n=== after all quizzes ===`);
  log(`  score=${st?.adventure?.clueQuizScore} complete=${st?.adventure?.clueQuizzesComplete} discovered=${st?.adventure?.discoveredClues?.length}`);

  // ══════════════════════════════════════════════════════════
  // LOOKOUT → KINGFISHER → REWARD (DOM-only, no panel/secrets access)
  // ══════════════════════════════════════════════════════════
  log("\n→ lookout (1450,330)");
  await moveTo(p, 1250, 330);
  await moveTo(p, 1450, 330);
  near = await readNearest(p);
  log(`  near: ${JSON.stringify(near)}`);

  // Step 1: A → open lookout panel
  log("\n  [1] A → open lookout panel");
  await pressA(p);
  await p.waitForTimeout(600);
  let modal = await readModalVisible(p);
  let title = await readModalTitle(p);
  log(`  modal=${modal} title="${title}"`);

  // Step 2: A → confirm lookout → opens kingfisher panel
  log("  [2] A → confirm lookout");
  await pressA(p);
  await p.waitForTimeout(600);
  modal = await readModalVisible(p);
  title = await readModalTitle(p);
  const confirmAfterLookout = await readConfirmVisible(p);
  log(`  modal=${modal} title="${title}" confirmVisible=${confirmAfterLookout}`);

  // Step 3: A → confirm kingfisher → opens reward panel (revealReady=false)
  log("  [3] A → confirm kingfisher");
  await pressA(p);
  await p.waitForTimeout(600);
  modal = await readModalVisible(p);
  title = await readModalTitle(p);
  let confirmVis = await readConfirmVisible(p);
  let hint = await readHintText(p);
  log(`  modal=${modal} title="${title}" confirmVisible=${confirmVis}`);
  log(`  hint="${hint}"`);

  // Step 4: Wait for revealReady (confirm button becomes visible)
  log("\n  [4] waiting for revealReady (confirm button appears)...");
  const revealStart = Date.now();
  let revealed = false;
  while (Date.now() - revealStart < 10000) {
    confirmVis = await readConfirmVisible(p);
    const elapsed = Date.now() - revealStart;
    if (elapsed < 4000 || elapsed % 1000 < 200) {
      hint = await readHintText(p);
      log(`    t=${elapsed}ms: confirmVisible=${confirmVis} hint="${hint}"`);
    }
    if (confirmVis) {
      revealed = true;
      log(`  revealReady=true after ${elapsed}ms`);
      break;
    }
    await p.waitForTimeout(100);
  }

  if (!revealed) {
    log("FAIL: revealReady never became true (confirm button never appeared)");
    const fp = await readHintText(p);
    const ft = await readModalTitle(p);
    log(`  final title="${ft}" hint="${fp}"`);
    await p.close();
    await b.close();
    return;
  }

  // Step 5: A → confirm reward → rewardComplete=true
  log("\n  [5] A → confirm reward");
  await pressA(p);
  await p.waitForTimeout(600);
  let rc = await readRewardComplete(p);
  log(`  rewardComplete after KeyA: ${JSON.stringify(rc)}`);

  if (!rc?.rewardComplete) {
    log("  KeyA failed, trying Enter...");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(600);
    rc = await readRewardComplete(p);
    log(`  rewardComplete after Enter: ${JSON.stringify(rc)}`);
  }

  st = await readState(p);
  log(`\nfinal state: rewardComplete=${st?.rewardComplete} birdComplete=${st?.adventure?.birdComplete}`);

  // Reload persistence check
  log("\n=== RELOAD PERSISTENCE CHECK ===");
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  const ready2 = await p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.player && typeof g.player.x === "number";
  });
  log(`game ready after reload: ${ready2}`);

  st = await readState(p);
  log(`state after reload: rewardComplete=${st?.rewardComplete} birdComplete=${st?.adventure?.birdComplete} lookoutComplete=${st?.lookoutComplete}`);

  const cx = await p.evaluate(() => {
    const r = localStorage.getItem("eduni.jungle.birdCodex.v1");
    return r ? JSON.parse(r) : null;
  });
  log(`codex after reload: ${JSON.stringify(cx)}`);

  // Waterfall state is session-only (no localStorage persistence).
  // Codex and stage rewards ARE persisted.
  const codexPersisted = cx?.captured?.kingfisher?.captured === true;
  if (codexPersisted) {
    log("\n=== WATERFALL REWARD: PASS ===");
    log("  (waterfall state is session-only by design; codex persisted)");
  } else {
    log("\n=== WATERFALL REWARD: FAIL ===");
    log("  (codex not persisted after reload)");
  }

  await p.close();
  await b.close();
}

main();
