import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { BIRD_QUIZ_BANK } from "../../src/content/bird_quiz_bank.js";

const BASE = "http://localhost:8123"; // working directory server with PROMPT 15 fix
const ART = join(import.meta.dirname, "..", "..", "artifacts", "jungle-random-quiz-real-acceptance");
if (!existsSync(ART)) mkdirSync(ART, { recursive: true });

const V = { width: 1280, height: 800 };
const RESULTS = [];
const PAGE_ERRORS = [];
const CONSOLE_ERRORS = [];
let shotN = 0;
let screenshots = [];

const bankMap = new Map(BIRD_QUIZ_BANK.map((q) => [q.id, q]));
const bankByText = new Map(BIRD_QUIZ_BANK.map((q) => [q.question, q.id]));

function record(tc, ok, detail = "") {
  RESULTS.push({ tc, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${tc}${detail ? " — " + detail : ""}`);
}

async function shot(p, name) {
  shotN++;
  const pt = join(ART, `${String(shotN).padStart(3, "0")}-${name}.png`);
  await p.screenshot({ path: pt });
  screenshots.push({ name, path: pt, size: statSync(pt).size });
}

async function readPlayer(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.player ? { x: g.player.x, y: g.player.y } : null;
  });
}

async function readNearest(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    const n = g?.getNearestInteractable?.();
    return n ? { id: n.id, x: n.x, y: n.y, radius: n.radius } : null;
  });
}

async function readState(p) {
  return p.evaluate(() => {
    const g = globalThis.__eduniJungleGame;
    return g?.getState?.() || null;
  });
}

async function readModalVisible(p) {
  return p.evaluate(() => {
    const m = document.querySelector("#modal");
    return m && m.style.display !== "none";
  });
}

async function readModalBody(p) {
  return p.evaluate(() => document.querySelector("#modal-body")?.textContent || "");
}

async function readChoices(p) {
  return p.evaluate(() =>
    Array.from(document.querySelectorAll("#modal-choices .choice")).map((c) => ({
      text: c.textContent.trim(),
      focused: c.classList.contains("focused"),
    }))
  );
}

async function readCodex(p) {
  return p.evaluate(() => {
    const r = localStorage.getItem("eduni.jungle.birdCodex.v1");
    return r ? JSON.parse(r) : null;
  });
}

async function hold(p, key, ms) {
  await p.keyboard.down(key);
  await p.waitForTimeout(ms);
  await p.keyboard.up(key);
  await p.waitForTimeout(150);
}

async function moveTo(p, tx, ty, { maxSteps = 20, tolerance = 30 } = {}) {
  for (let i = 0; i < maxSteps; i++) {
    const pos = await readPlayer(p);
    if (!pos) break;
    const dx = tx - pos.x, dy = ty - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < tolerance) return { pos, dist };
    const useY = Math.abs(dy) >= Math.abs(dx);
    const dir = useY ? (dy > 0 ? "ArrowDown" : "ArrowUp") : (dx > 0 ? "ArrowRight" : "ArrowLeft");
    const holdMs = Math.min(1000, Math.max(150, dist * 2.5));
    await hold(p, dir, holdMs);
    const after = await readPlayer(p);
    if (after) {
      const moved = Math.hypot(after.x - pos.x, after.y - pos.y);
      if (moved < 3) {
        const perpDir = useY ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp");
        await hold(p, perpDir, 200);
      }
    }
  }
  const final = await readPlayer(p);
  return { pos: final, dist: Math.hypot(tx - (final?.x || 0), ty - (final?.y || 0)) };
}

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

async function waitForModal(p, ms = 5000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (await readModalVisible(p)) return true;
    await p.waitForTimeout(100);
  }
  return false;
}

async function waitForModalClose(p, ms = 3000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (!(await readModalVisible(p))) return true;
    await p.waitForTimeout(100);
  }
  return false;
}

async function waitForConfirm(p, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const vis = await p.evaluate(() => {
      const btn = document.querySelector("#modal-confirm");
      if (!btn) return false;
      const s = window.getComputedStyle(btn);
      return s.display !== "none" && s.visibility !== "hidden" && !btn.disabled;
    });
    if (vis) return true;
    await p.waitForTimeout(100);
  }
  return false;
}

function identifyQuestion(text) {
  if (!text) return null;
  let lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) lines = text.split("\\n").map((l) => l.trim()).filter(Boolean);
  const questionLine = lines[lines.length - 1] || text;
  const qId = bankByText.get(questionLine);
  if (qId) return qId;
  for (const [q, id] of bankByText) {
    if (questionLine.includes(q) || q.includes(questionLine)) return id;
  }
  return null;
}

function findCorrectChoiceIndex(bankEntry) {
  if (!bankEntry) return 0;
  return bankEntry.choices.findIndex((c) => c.id === bankEntry.answer);
}

// Find the correct choice index in the CURRENT (shuffled) DOM choices list
function findCorrectChoiceIdxFromDom(choices, bankEntry) {
  if (!bankEntry || !choices.length) return 0;
  const correctLabel = bankEntry.choices.find((c) => c.id === bankEntry.answer)?.label;
  if (!correctLabel) return 0;
  const idx = choices.findIndex((c) => c.text.includes(correctLabel));
  return idx >= 0 ? idx : 0;
}

async function answerOneQuestion(p, targetCorrect) {
  await p.waitForTimeout(400);
  const bodyText = await readModalBody(p);
  const qId = identifyQuestion(bodyText);
  const choices = await readChoices(p);
  if (choices.length === 0) return { qId, answered: false };

  const bankEntry = qId ? bankMap.get(qId) : null;
  const correctIdx = findCorrectChoiceIdxFromDom(choices, bankEntry);
  const targetIdx = targetCorrect ? correctIdx : (correctIdx === 0 ? 1 : 0);

  for (let i = 0; i < targetIdx; i++) {
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(150);
  }
  await pressA(p);
  await p.waitForTimeout(1200);
  return { qId, answered: true, correct: targetCorrect };
}

// Extract just the question line from modal body (ignoring fact/preamble and response)
function extractQuestionLine(text) {
  if (!text) return "";
  let lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) lines = text.split("\\n").map((l) => l.trim()).filter(Boolean);
  const responsePrefixes = ["정답", "\uACFC", "answer", "\uC548\uB418"];
  const questionLines = lines.filter((l) => !responsePrefixes.some((p) => l.startsWith(p)));
  return questionLines[questionLines.length - 1] || text;
}

// Answer all 3 questions for a clue (panel stays open, advances automatically)
async function answerClueQuiz(p, targetCorrect) {
  const questionIds = [];
  let prevQuestion = "";
  for (let q = 0; q < 3; q++) {
    if (q > 0) {
      // Wait for question text to change from previous question
      const t = Date.now();
      let qLine = prevQuestion;
      while (Date.now() - t < 5000 && qLine === prevQuestion) {
        await p.waitForTimeout(300);
        const body = await readModalBody(p);
        qLine = extractQuestionLine(body);
      }
      // Extra stabilization: wait for modal to be fully settled
      await p.waitForTimeout(800);
    }
    // Read current question
    let bodyText = await readModalBody(p);
    let qLine = extractQuestionLine(bodyText);
    let qId = bankByText.get(qLine);
    if (!qId) {
      for (const [q, id] of bankByText) {
        if (qLine.includes(q) || q.includes(qLine)) { qId = id; break; }
      }
    }
    prevQuestion = qLine;

    // Read current choices and navigate to target
    const choices = await readChoices(p);
    const bankEntry = qId ? bankMap.get(qId) : null;
    const correctIdx = findCorrectChoiceIdxFromDom(choices, bankEntry);
    const targetIdx = targetCorrect ? correctIdx : (correctIdx === 0 ? 1 : 0);
    for (let i = 0; i < targetIdx; i++) {
      await p.keyboard.press("ArrowRight");
      await p.waitForTimeout(150);
    }

    // Press A to answer — then wait for game to process and advance
    await p.keyboard.down("a");
    await p.waitForTimeout(80);
    await p.keyboard.up("a");
    // Wait for game setTimeout(600ms) + render time
    await p.waitForTimeout(2000);

    questionIds.push(qId);
    console.log(`    Q${q + 1}: qId=${qId} qLine="${qLine?.substring(0, 40)}"`);
  }
  await waitForModalClose(p, 3000);
  return questionIds;
}

async function rdy(p, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate(() => {
      const g = globalThis.__eduniJungleGame;
      return g?.player && typeof g.player.x === "number";
    });
    if (ok) return true;
    await p.waitForTimeout(200);
  }
  return false;
}

async function hubNavigate(p, cardClass) {
  return p.evaluate((cls) => {
    const card = document.querySelector(`.card.${cls}`);
    const link = card?.querySelector("a");
    if (link) { link.click(); return true; }
    return false;
  }, cardClass);
}

// ── Start camp quest at hut ──
async function startCampQuest(p) {
  // Move to hut area
  await moveTo(p, 200, 620);
  await moveTo(p, 520, 620);
  await moveTo(p, 520, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "hut") await hold(p, "ArrowLeft", 800);

  // Open hut (A) → confirm → panel closes
  await pressA(p);
  await p.waitForTimeout(500);
  await pressA(p);
  await waitForModalClose(p, 3000);
  await p.waitForTimeout(500);
}

// ── CAMP PLAYTHROUGH ──
async function playCamp(p, { wrongAnswers = false } = {}) {
  const allQuestionIds = [];

  await startCampQuest(p);

  // feather (690,320) — press A to open quiz, then answer 3 questions
  await moveTo(p, 690, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "feather") await hold(p, "ArrowRight", 400);
  await pressA(p);
  await waitForModal(p, 5000);
  const featherIds = await answerClueQuiz(p, !wrongAnswers);
  allQuestionIds.push(...featherIds);

  // footprints (920,570)
  await moveTo(p, 920, 320);
  await moveTo(p, 920, 570);
  near = await readNearest(p);
  if (!near || near.id !== "footprints") await hold(p, "ArrowUp", 300);
  await pressA(p);
  await waitForModal(p, 5000);
  const fpIds = await answerClueQuiz(p, !wrongAnswers);
  allQuestionIds.push(...fpIds);

  // birdcall (1120,820)
  await moveTo(p, 920, 820);
  await moveTo(p, 1120, 820);
  near = await readNearest(p);
  if (!near || near.id !== "birdcall") await hold(p, "ArrowRight", 400);
  await pressA(p);
  await waitForModal(p, 5000);
  const bcIds = await answerClueQuiz(p, !wrongAnswers);
  allQuestionIds.push(...bcIds);

  const st = await readState(p);

  // bluebird (1300,420) — need to wait for ridge arrival sequence (~2.4s) after all clues
  await moveTo(p, 1300, 820);
  await moveTo(p, 1300, 420);
  // Wait for ridge arrival sequence to complete (2400ms) plus buffer
  await p.waitForTimeout(4000);

  // Retry if bluebird not yet available
  for (let attempt = 0; attempt < 3; attempt++) {
    near = await readNearest(p);
    if (near && near.id === "bluebird") break;
    await p.waitForTimeout(2000);
  }
  near = await readNearest(p);
  console.log(`  Bluebird near: ${JSON.stringify(near)}`);
  if (near && near.id === "bluebird") {
    await pressA(p);
    await p.waitForTimeout(1500);
    await waitForConfirm(p);
    await pressA(p);
    // Wait for reward reveal animation (~2.2s) then confirm reward panel
    await p.waitForTimeout(3000);
    await waitForConfirm(p, 5000);
    await pressA(p);
    await p.waitForTimeout(1500);
    await waitForModalClose(p, 5000);
  }

  return { questionIds: allQuestionIds, score: st?.clueQuizScore || 0, complete: !!(await readState(p))?.bluebirdComplete };
}

// ── WATERFALL PLAYTHROUGH ──
async function playWaterfall(p) {
  const allQuestionIds = [];

  // Stream gate (700,900)
  await moveTo(p, 200, 900);
  await moveTo(p, 700, 900);
  let near = await readNearest(p);
  if (near) {
    await pressA(p); await p.waitForTimeout(800);
    await waitForConfirm(p); await pressA(p);
    await p.waitForTimeout(1000);
    await waitForModalClose(p, 3000);
    await p.waitForTimeout(500);
  }

  // Stepping stones: follow L-shaped path with waypoints
  await moveTo(p, 700, 760);
  await moveTo(p, 900, 760);
  await moveTo(p, 900, 700);
  await moveTo(p, 1080, 700);
  near = await readNearest(p);
  if (near) {
    await pressA(p); await p.waitForTimeout(800);
    await waitForConfirm(p); await pressA(p);
    await p.waitForTimeout(1000);
    await waitForModalClose(p, 3000);
    await p.waitForTimeout(500);
  }

  // echo (1170,560) — press A to open quiz, then answer 3 questions
  await moveTo(p, 1080, 560);
  await moveTo(p, 1170, 560);
  await pressA(p);
  await waitForModal(p, 5000);
  const echoIds = await answerClueQuiz(p, true);
  allQuestionIds.push(...echoIds);

  // mistTrail (1020,480)
  await moveTo(p, 1020, 480);
  await pressA(p);
  await waitForModal(p, 5000);
  const mtIds = await answerClueQuiz(p, true);
  allQuestionIds.push(...mtIds);

  // waterDrops (1250,470)
  await moveTo(p, 1250, 470);
  await pressA(p);
  await waitForModal(p, 5000);
  const wdIds = await answerClueQuiz(p, true);
  allQuestionIds.push(...wdIds);

  // Kingfisher (1450,330)
  await moveTo(p, 1450, 330);
  await p.waitForTimeout(2000);
  near = await readNearest(p);
  if (near) {
    await pressA(p);
    await p.waitForTimeout(1500);
    await waitForConfirm(p);
    await pressA(p);
    await p.waitForTimeout(800);
    await waitForModalClose(p, 3000);
  }

  return { questionIds: allQuestionIds, score: 0 };
}

// ── MAIN RUNS ──
async function runA(browser) {
  console.log("\n=== Run A: Desktop Real Full Adventure ===");
  const ctx = await browser.newContext({ viewport: V });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => PAGE_ERRORS.push({ run: "A", msg: e.message }));
  p.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (!t.includes("404") && !t.includes("favicon")) {
        CONSOLE_ERRORS.push({ run: "A", msg: t.substring(0, 200) });
      }
    }
  });

  const allIds = [];

  // Camp (9 questions: 3 per clue × 3 clues)
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  await shot(p, "runA-hub");
  await hubNavigate(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { await shot(p, "runA-camp-fail"); await p.close(); await ctx.close(); return { allIds: [], uniqueCount: 0 }; }
  await shot(p, "runA-camp-start");
  const campResult = await playCamp(p);
  allIds.push(...campResult.questionIds.filter(Boolean));
  await shot(p, "runA-camp-done");

  // Waterfall (15 questions: 3 per interaction × 5 interactions)
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await hubNavigate(p, "waterfall");
  await p.waitForTimeout(3000);
  if (await rdy(p)) {
    await shot(p, "runA-wf-start");
    const wfResult = await playWaterfall(p);
    allIds.push(...wfResult.questionIds.filter(Boolean));
    await shot(p, "runA-wf-done");
  }

  // Cave, GiantTree, SkyRidge (load pages only)
  for (const stage of [
    { name: "Cave", url: "/cave-game.html", selector: "#three-cave-game" },
    { name: "GiantTree", url: "/giant-tree-game.html", selector: "#three-giant-tree-game" },
    { name: "SkyRidge", url: "/sky-ridge-game.html", selector: "#sky-game" },
  ]) {
    await p.goto(`${BASE}${stage.url}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(3000);
    await shot(p, `runA-${stage.name.toLowerCase()}-start`);
    const exists = await p.evaluate((sel) => !!document.querySelector(sel), stage.selector);
    record(`TC-RUN-A-${stage.name}-load`, exists, `${stage.name} canvas exists`);
  }

  // Final Hub
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  await shot(p, "runA-final-hub");
  const badgeCount = await p.evaluate(() => document.querySelectorAll(".badge.earned").length);

  const uniqueIds = new Set(allIds.filter(Boolean));
  const expectedCount = 18; // camp 3 clues × 3 + waterfall 3 quizzes × 3
  record("TC-RUN-A-18-IDs", allIds.filter(Boolean).length === expectedCount, `Got ${allIds.filter(Boolean).length} IDs (expected ${expectedCount})`);
  record("TC-RUN-A-18-unique", uniqueIds.size === expectedCount, `${uniqueIds.size} unique out of ${allIds.filter(Boolean).length}`);
  record("TC-RUN-A-camp-badge", badgeCount >= 1, `Badges earned: ${badgeCount} (camp expected)`);

  console.log("\nRun A Question IDs:");
  allIds.filter(Boolean).forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

  await p.close();
  await ctx.close();
  return { allIds, uniqueCount: uniqueIds.size };
}

async function runB(browser) {
  console.log("\n=== Run B: Failure → Retry → Success ===");
  const ctx = await browser.newContext({ viewport: V });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => PAGE_ERRORS.push({ run: "B", msg: e.message }));

  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await hubNavigate(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { await p.close(); await ctx.close(); return; }

  const failResult = await playCamp(p, { wrongAnswers: true });
  await shot(p, "runB-fail-done");
  // Check badges from hub DOM after fail
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  const failBadges = await p.evaluate(() => document.querySelectorAll(".badge.earned").length);
  record("TC-RUN-B-fail-no-reward", failBadges === 0, `Badges after fail: ${failBadges}`);

  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await hubNavigate(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { await p.close(); await ctx.close(); return; }

  const retryResult = await playCamp(p, { wrongAnswers: false });
  await shot(p, "runB-retry-done");
  // Check badges from hub DOM after retry
  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2000);
  const retryBadges = await p.evaluate(() => document.querySelectorAll(".badge.earned").length);
  record("TC-RUN-B-retry-reward-1", retryBadges >= 1, `Badges after retry: ${retryBadges}`);

  const failIds = new Set(failResult.questionIds.filter(Boolean));
  const retryIds = retryResult.questionIds.filter(Boolean);
  const overlap = retryIds.filter((id) => failIds.has(id)).length;
  record("TC-RUN-B-retry-overlap-0", overlap === 0, `Overlap: ${overlap}`);

  console.log(`\nRun B: fail IDs: ${failResult.questionIds}, retry IDs: ${retryIds}, overlap: ${overlap}`);
  await p.close();
  await ctx.close();
}

async function runC(browser) {
  console.log("\n=== Run C: Modal Stability ===");
  const ctx = await browser.newContext({ viewport: V });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => PAGE_ERRORS.push({ run: "C", msg: e.message }));

  await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1000);
  await hubNavigate(p, "camp");
  await p.waitForTimeout(3000);
  if (!await rdy(p)) { await p.close(); await ctx.close(); return; }

  await startCampQuest(p);

  await moveTo(p, 690, 320);
  let near = await readNearest(p);
  if (!near || near.id !== "feather") await hold(p, "ArrowRight", 400);

  // Open quiz
  await pressA(p);
  await waitForModal(p);
  await shot(p, "runC-modal-open-1");
  const body1 = await readModalBody(p);
  const choices1 = await readChoices(p);

  // Close with B
  await pressB(p);
  await p.waitForTimeout(500);

  // Re-open
  near = await readNearest(p);
  if (near) {
    await pressA(p);
    await waitForModal(p);
    await shot(p, "runC-modal-reopen");
    const body2 = await readModalBody(p);
    const choices2 = await readChoices(p);

    const hasBody1 = body1.length > 0;
    const hasBody2 = body2.length > 0;
    const hasChoices1 = choices1.length === 4;
    const hasChoices2 = choices2.length === 4;

    record("TC-RUN-C-modal-structure", hasBody1 && hasBody2 && hasChoices1 && hasChoices2,
      `Body1:${hasBody1} Body2:${hasBody2} Choices1:${choices1.length} Choices2:${choices2.length}`);

    // Answer correctly
    const qId = identifyQuestion(body2);
    if (qId) {
      const bankEntry = bankMap.get(qId);
      const correctIdx = findCorrectChoiceIdxFromDom(choices2, bankEntry);
      for (let i = 0; i < correctIdx; i++) {
        await p.keyboard.press("ArrowRight");
        await p.waitForTimeout(150);
      }
      await pressA(p);
      await p.waitForTimeout(800);
      await shot(p, "runC-correct-answer");
      await waitForModalClose(p, 2000);
    }
  }

  await p.close();
  await ctx.close();
}

async function runD(browser) {
  console.log("\n=== Run D: Replay Variation (3 runs) ===");
  const allSets = [];

  for (let run = 0; run < 3; run++) {
    const ctx = await browser.newContext({ viewport: V });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await hubNavigate(p, "camp");
    await p.waitForTimeout(3000);
    if (!await rdy(p)) { await p.close(); await ctx.close(); continue; }

    await startCampQuest(p);

    const ids = [];

    // feather — press A to open quiz, then answerClueQuiz
    await moveTo(p, 690, 320);
    let near = await readNearest(p);
    if (!near || near.id !== "feather") await hold(p, "ArrowRight", 400);
    await pressA(p);
    await waitForModal(p, 5000);
    const featherIds = await answerClueQuiz(p, true);
    ids.push(...featherIds);

    // footprints
    await moveTo(p, 920, 320);
    await moveTo(p, 920, 570);
    near = await readNearest(p);
    if (!near || near.id !== "footprints") await hold(p, "ArrowUp", 300);
    await pressA(p);
    await waitForModal(p, 5000);
    const fpIds = await answerClueQuiz(p, true);
    ids.push(...fpIds);

    // birdcall
    await moveTo(p, 920, 820);
    await moveTo(p, 1120, 820);
    near = await readNearest(p);
    if (!near || near.id !== "birdcall") await hold(p, "ArrowRight", 400);
    await pressA(p);
    await waitForModal(p, 5000);
    const bcIds = await answerClueQuiz(p, true);
    ids.push(...bcIds);

    allSets.push(ids.filter(Boolean));
    console.log(`  Run ${run + 1}: ${ids.filter(Boolean).join(", ")}`);
    await p.close();
    await ctx.close();
  }

  const flat = allSets.flat();
  const uniqueFlat = new Set(flat);
  const uniqueSets = new Set(allSets.map((s) => s.sort().join(",")));

  record("TC-RUN-D-all-9-unique", allSets.every((s) => new Set(s).size === 9), "All runs have 9 unique IDs");
  record("TC-RUN-D-distinct-sets", uniqueSets.size >= 2, `${uniqueSets.size} distinct 9-ID sets`);
  record("TC-RUN-D-distinct-IDs", uniqueFlat.size >= 12, `${uniqueFlat.size} distinct IDs across 90 draws`);

  console.log(`\nRun D: ${uniqueSets.size} distinct sets, ${uniqueFlat.size} distinct IDs`);
  allSets.forEach((s, i) => console.log(`  Run ${i + 1}: ${s.join(", ")}`));
}

async function runE(browser) {
  console.log("\n=== Run E: Tablet Touch ===");
  const ctx = await browser.newContext({
    viewport: { width: 800, height: 1280 },
    hasTouch: true,
    isMobile: true,
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => PAGE_ERRORS.push({ run: "E", msg: e.message }));

  await p.goto(`${BASE}/?renderer=three&qa=1`, { waitUntil: "networkidle" });
  await p.waitForTimeout(5000);
  await shot(p, "runE-tablet-camp-loaded");

  const dpad = await p.$("#dpad");
  const btnA = await p.$("#dpad-a");
  const btnB = await p.$("#dpad-b");
  record("TC-RUN-E-dpad", !!dpad, "D-pad present");
  record("TC-RUN-E-ab", !!btnA && !!btnB, "A/B present");

  if (dpad) {
    const box = await dpad.boundingBox();
    if (box) {
      await p.touchscreen.tap(box.x + box.width / 2, box.y + 20);
      await p.waitForTimeout(500);
    }
  }
  await shot(p, "runE-tablet-touch-move");

  await p.setViewportSize({ width: 1280, height: 800 });
  await p.waitForTimeout(1000);
  await shot(p, "runE-tablet-landscape");

  await p.setViewportSize({ width: 800, height: 1280 });
  await p.waitForTimeout(1000);
  await shot(p, "runE-tablet-portrait-again");

  const objective = await p.evaluate(() => document.getElementById("objective-hud")?.textContent || "");
  record("TC-RUN-E-resize-preserve", objective.length > 0, `Objective after resize: "${objective}"`);

  await p.close();
  await ctx.close();
}

async function runF(browser) {
  console.log("\n=== Run F: Persistence / Re-entry ===");

  const ctx1 = await browser.newContext({ viewport: V });
  const p1 = await ctx1.newPage();
  p1.on("pageerror", (e) => PAGE_ERRORS.push({ run: "F", msg: e.message }));

  await p1.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
  await p1.waitForTimeout(1000);
  await hubNavigate(p1, "camp");
  await p1.waitForTimeout(3000);
  if (await rdy(p1)) {
    await playCamp(p1);
    await shot(p1, "runF-camp-complete");

    // Reload the camp page to verify state persists in localStorage
    await p1.reload({ waitUntil: "networkidle" });
    await p1.waitForTimeout(3000);
    await shot(p1, "runF-camp-reload");

    // Navigate to hub to check persisted badges via DOM
    await p1.goto(`${BASE}/jungle-hub.html`, { waitUntil: "networkidle" });
    await p1.waitForTimeout(2000);
    const badges = await p1.evaluate(() => document.querySelectorAll(".badge.earned").length);
    record("TC-RUN-F-camp-persist", badges >= 1, `Badges after reload: ${badges}`);
    await shot(p1, "runF-hub-persist");
    record("TC-RUN-F-hub-persist", badges >= 1, `Hub earned badges: ${badges}`);
  }
  await p1.close();
  await ctx1.close();
}

// ── MAIN ──
async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--no-sandbox"] });

  const runAResult = await runA(browser);
  await runB(browser);
  await runC(browser);
  await runD(browser);
  await runE(browser);
  await runF(browser);

  await browser.close();

  console.log("\n=== SUMMARY ===");
  console.log(`Total tests: ${RESULTS.length}`);
  console.log(`Pass: ${RESULTS.filter((r) => r.ok).length}`);
  console.log(`Fail: ${RESULTS.filter((r) => !r.ok).length}`);
  console.log(`Page errors: ${PAGE_ERRORS.length}`);
  console.log(`Console errors: ${CONSOLE_ERRORS.length}`);
  console.log(`Screenshots: ${screenshots.length}`);

  const report = {
    timestamp: new Date().toISOString(),
    results: RESULTS,
    pageErrors: PAGE_ERRORS,
    consoleErrors: CONSOLE_ERRORS,
    screenshots: screenshots.length,
    runA: { allIds: runAResult?.allIds || [], uniqueCount: runAResult?.uniqueCount || 0 },
    summary: {
      total: RESULTS.length,
      pass: RESULTS.filter((r) => r.ok).length,
      fail: RESULTS.filter((r) => !r.ok).length,
    },
  };
  writeFileSync(join(ART, "qa-results.json"), JSON.stringify(report, null, 2));

  const failed = RESULTS.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log("\nFAILED:");
    failed.forEach((f) => console.log(`  ${f.tc}: ${f.detail}`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
