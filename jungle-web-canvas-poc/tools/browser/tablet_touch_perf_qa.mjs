import { chromium } from "playwright";
import { join } from "path";
import { mkdirSync, statSync } from "fs";

const BASE = "http://localhost:8123";
const ART = "D:/Codex/Projects/eduni-links/jungle-web-canvas-poc/artifacts/jungle-tablet-qa";
mkdirSync(ART, { recursive: true });

const STAGES = [
  { id: "camp", url: `${BASE}/index.html?qa=1`, gameGlobal: "__eduniJungleGame" },
  { id: "waterfall", url: `${BASE}/index.html?stage=waterfall&qa=1`, gameGlobal: "__eduniJungleGame" },
  { id: "cave", url: `${BASE}/cave-game.html?qa=1`, gameGlobal: "__eduniCaveGame" },
  { id: "giantTree", url: `${BASE}/giant-tree-game.html?qa=1`, gameGlobal: "__eduniGiantTreeGame" },
  { id: "skyRidge", url: `${BASE}/sky-ridge-game.html?qa=1`, gameGlobal: "__eduniSkyRidgeGame" },
];

const VIEWPORTS = [
  { name: "1280x800", w: 1280, h: 800, label: "landscape-tablet" },
  { name: "1024x768", w: 1024, h: 768, label: "landscape-small" },
  { name: "800x1280", w: 800, h: 1280, label: "portrait-tablet" },
  { name: "768x1024", w: 768, h: 1024, label: "portrait-small" },
];

let shotN = 0;
const shots = [];
const results = [];
const allErrors = [];
const perfData = [];

const log = (...a) => console.log("[QA]", ...a);

async function shot(p, name) {
  shotN++;
  const pt = join(ART, `${String(shotN).padStart(2, "0")}-${name}.png`);
  await p.screenshot({ path: pt, fullPage: false });
  shots.push({ n: name, path: pt, sz: statSync(pt).size });
  return pt;
}

async function rdy(p, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate((gg) => {
      const g = globalThis[gg];
      return g?.player && typeof g.player.x === "number";
    }, "_any");
    if (ok) return true;
    await p.waitForTimeout(200);
  }
  return false;
}

async function waitForGame(p, gameGlobal, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await p.evaluate((gg) => {
      const g = globalThis[gg];
      return g?.player && typeof g.player.x === "number";
    }, gameGlobal);
    if (ok) return true;
    await p.waitForTimeout(200);
  }
  return false;
}

async function measureStartup(p) {
  return p.evaluate(() => {
    const perf = performance.getEntriesByType("navigation")[0];
    return {
      domContentLoaded: perf?.domContentLoadedEventEnd || 0,
      load: perf?.loadEventEnd || 0,
      firstPaint: 0,
    };
  });
}

async function collectPerfMetrics(p) {
  return p.evaluate(() => {
    const entries = performance.getEntriesByType("longtask");
    const longTasks = entries.length;
    const longTaskDuration = entries.reduce((s, e) => s + (e.duration || 0), 0);
    let memUsage = null;
    if (performance.memory) {
      memUsage = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }
    return { longTasks, longTaskDuration, memUsage };
  });
}

async function checkElementSizes(p) {
  return p.evaluate(() => {
    const selectors = [
      "#dpad", "#dpad-up", "#dpad-down", "#dpad-left", "#dpad-right",
      "#dpad-a", "#dpad-b",
      "#objective-hud", "#context-hint",
      "#qa-input-panel",
    ];
    const results = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) { results[sel] = null; continue; }
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      results[sel] = {
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.x), y: Math.round(r.y),
        visible: s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0",
        overflow: s.overflow,
      };
    }
    return results;
  });
}

async function checkModalOverflow(p) {
  return p.evaluate(() => {
    const modal = document.querySelector("#modal");
    if (!modal) return { exists: false };
    const card = modal.querySelector(".card");
    if (!card) return { exists: true, cardExists: false };
    const cardR = card.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflowX = cardR.right > vw || cardR.left < 0;
    const overflowY = cardR.bottom > vh || cardR.top < 0;
    const choices = card.querySelectorAll(".choice");
    let choiceOverflow = false;
    choices.forEach(c => {
      const cr = c.getBoundingClientRect();
      if (cr.right > cardR.right || cr.left < cardR.left) choiceOverflow = true;
    });
    return {
      exists: true, cardExists: true,
      cardW: Math.round(cardR.width), cardH: Math.round(cardR.height),
      vw, vh, overflowX, overflowY, choiceOverflow,
      choiceCount: choices.length,
    };
  });
}

async function checkCanvasSize(p) {
  return p.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    const results = [];
    canvases.forEach(c => {
      const r = c.getBoundingClientRect();
      results.push({
        id: c.id || "(no id)",
        cssW: Math.round(r.width), cssH: Math.round(r.height),
        bufW: c.width, bufH: c.height,
        visible: window.getComputedStyle(c).visibility !== "hidden",
      });
    });
    return results;
  });
}

async function checkDpadOverlap(p) {
  return p.evaluate(() => {
    const dpad = document.querySelector("#dpad");
    const hud = document.querySelector("#objective-hud");
    const hint = document.querySelector("#context-hint");
    if (!dpad || !hud) return { overlap: false, reason: "elements missing" };
    const dr = dpad.getBoundingClientRect();
    const hr = hud.getBoundingClientRect();
    const hintR = hint?.getBoundingClientRect();
    const dpadHUD = !(dr.right < hr.left || dr.left > hr.right || dr.bottom < hr.top || dr.top > hr.bottom);
    let dpadHint = false;
    if (hintR) {
      dpadHint = !(dr.right < hintR.left || dr.left > hintR.right || dr.bottom < hintR.top || dr.top > hintR.bottom);
    }
    const a = document.querySelector("#dpad-a");
    const b = document.querySelector("#dpad-b");
    const aR = a?.getBoundingClientRect();
    const bR = b?.getBoundingClientRect();
    let abOverlap = false;
    if (aR && bR) {
      abOverlap = !(aR.right < bR.left || aR.left > bR.right || aR.bottom < bR.top || aR.top > bR.bottom);
    }
    return { dpadHUD, dpadHint, abOverlap };
  });
}

async function testStageInViewport(browser, stage, vp) {
  const tag = `${stage.id}-${vp.name}`;
  log(`--- ${tag} ---`);

  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors = [];
  const warnings = [];
  p.on("pageerror", e => errors.push(e.message));
  p.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning") warnings.push(msg.text());
  });

  const navStart = Date.now();
  let loaded = false;
  let startupMs = 0;
  try {
    await p.goto(stage.url, { waitUntil: "domcontentloaded", timeout: 15000 });
    loaded = true;
    startupMs = Date.now() - navStart;
  } catch (e) {
    startupMs = Date.now() - navStart;
    errors.push(`nav error: ${e.message}`);
  }

  let gameReady = false;
  let readyMs = 0;
  if (loaded) {
    const t0 = Date.now();
    gameReady = await waitForGame(p, stage.gameGlobal, 12000);
    readyMs = Date.now() - t0;
  }

  await p.waitForTimeout(1000);

  const startup = await measureStartup(p).catch(() => ({}));
  const sizes = await checkElementSizes(p).catch(() => ({}));
  const modal = await checkModalOverflow(p).catch(() => ({}));
  const canvas = await checkCanvasSize(p).catch(() => []);
  const overlap = await checkDpadOverlap(p).catch(() => ({}));
  const perf = await collectPerfMetrics(p).catch(() => ({}));

  const orient = vp.w > vp.h ? "landscape" : "portrait";
  const shotName = `${stage.id}-${vp.label}`;
  const pt = await shot(p, shotName);

  const r = {
    stage: stage.id, viewport: vp.name, orient,
    loaded, gameReady, startupMs, readyMs,
    domContentLoaded: startup.domContentLoaded,
    errors: errors.length, warnings: warnings.length,
    errorMessages: [...errors],
    warningSamples: warnings.slice(0, 3),
    sizes, modal, canvas, overlap,
    perf,
  };
  results.push(r);
  allErrors.push(...errors.map(e => ({ stage: stage.id, vp: vp.name, msg: e })));
  perfData.push({ stage: stage.id, vp: vp.name, startupMs, readyMs, ...perf });

  log(`  loaded=${loaded} ready=${gameReady} startup=${startupMs}ms ready=${readyMs}ms`);
  log(`  errors=${errors.length} warnings=${warnings.length}`);
  if (errors.length > 0) log(`  error[0]: ${errors[0].slice(0, 120)}`);

  const dpadBtns = ["#dpad-up", "#dpad-down", "#dpad-left", "#dpad-right"];
  for (const sel of dpadBtns) {
    const s = sizes[sel];
    if (s) log(`  ${sel}: ${s.w}x${s.h}px visible=${s.visible}`);
  }
  const abBtns = ["#dpad-a", "#dpad-b"];
  for (const sel of abBtns) {
    const s = sizes[sel];
    if (s) log(`  ${sel}: ${s.w}x${s.h}px visible=${s.visible}`);
  }
  log(`  HUD: #objective-hud=${sizes["#objective-hud"]?.w}x${sizes["#objective-hud"]?.h} visible=${sizes["#objective-hud"]?.visible}`);
  log(`  canvas: ${canvas.map(c => `${c.id} ${c.bufW}x${c.bufH} visible=${c.visible}`).join(", ") || "none"}`);
  log(`  modal overflow: x=${modal.overflowX} y=${modal.overflowY} choices=${modal.choiceOverflow}`);
  log(`  overlap: dpadHUD=${overlap.dpadHUD} dpadHint=${overlap.dpadHint} abOverlap=${overlap.abOverlap}`);

  await ctx.close();
  return r;
}

async function testResize(browser, stage) {
  log(`--- resize test: ${stage.id} ---`);
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));

  await p.goto(stage.url, { waitUntil: "domcontentloaded", timeout: 15000 });
  const gameReady = await waitForGame(p, stage.gameGlobal, 12000);
  await p.waitForTimeout(1000);

  const before = await checkCanvasSize(p);

  await p.setViewportSize({ width: 800, height: 1280 });
  await p.waitForTimeout(1500);

  const after = await checkCanvasSize(p);
  const resizeErrors = errors.filter(e => e.includes("resize") || e.includes("ResizeObserver"));

  await shot(p, `${stage.id}-resized-portrait`);

  await ctx.close();
  return {
    stage: stage.id,
    canvasBefore: before,
    canvasAfter: after,
    resizeErrors: resizeErrors.length,
    allErrors: errors.length,
  };
}

async function testInteractionSmoke(browser, stage, vp) {
  log(`--- interaction smoke: ${stage.id} @ ${vp.name} ---`);
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: true,
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));

  await p.goto(stage.url, { waitUntil: "domcontentloaded", timeout: 15000 });
  const gameReady = await waitForGame(p, stage.gameGlobal, 12000);
  await p.waitForTimeout(1000);

  if (!gameReady) {
    await ctx.close();
    return { stage: stage.id, vp: vp.name, gameReady: false, interactable: false, errors: errors.length };
  }

  const posBefore = await p.evaluate((gg) => {
    const g = globalThis[gg];
    return g?.player ? { x: g.player.x, y: g.player.y } : null;
  }, stage.gameGlobal);

  await p.keyboard.down("ArrowUp");
  await p.waitForTimeout(500);
  await p.keyboard.up("ArrowUp");
  await p.waitForTimeout(300);

  const posAfter = await p.evaluate((gg) => {
    const g = globalThis[gg];
    return g?.player ? { x: g.player.x, y: g.player.y } : null;
  }, stage.gameGlobal);

  const moved = posBefore && posAfter
    ? Math.hypot(posAfter.x - posBefore.x, posAfter.y - posBefore.y) > 1
    : false;

  await p.keyboard.press("a");
  await p.waitForTimeout(500);

  const modalOpen = await p.evaluate(() => {
    const m = document.querySelector("#modal");
    return m && window.getComputedStyle(m).display !== "none";
  });

  await shot(p, `${stage.id}-${vp.label}-interaction`);

  await ctx.close();
  return {
    stage: stage.id, vp: vp.name,
    gameReady, moved, modalOpen,
    posBefore, posAfter,
    errors: errors.length,
  };
}

const b = await chromium.launch({ headless: true });

log("=== TABLET/TOUCH/PERF QA — 4 viewports x 5 stages ===");
log(`viewports: ${VIEWPORTS.map(v => v.name).join(", ")}`);
log(`stages: ${STAGES.map(s => s.id).join(", ")}`);

for (const vp of VIEWPORTS) {
  for (const stage of STAGES) {
    await testStageInViewport(b, stage, vp);
  }
}

log("\n=== RESIZE TESTS ===");
const resizeResults = [];
for (const stage of STAGES) {
  const r = await testResize(b, stage);
  resizeResults.push(r);
  log(`  ${stage.id}: resizeErrors=${r.resizeErrors} canvasBefore=${r.canvasBefore.length} after=${r.canvasAfter.length}`);
}

log("\n=== INTERACTION SMOKE ===");
const smokeResults = [];
for (const stage of STAGES) {
  const r = await testInteractionSmoke(b, stage, VIEWPORTS[0]);
  smokeResults.push(r);
  log(`  ${stage.id}: ready=${r.gameReady} moved=${r.moved} modal=${r.modalOpen} errors=${r.errors}`);
}

await b.close();

const totalErrors = allErrors.length;
const totalShots = shots.length;
const viewportFailures = results.filter(r => !r.loaded || !r.gameReady).length;
const modalOverflows = results.filter(r => r.modal.overflowX || r.modal.overflowY || r.modal.choiceOverflow).length;
const dpadOverlaps = results.filter(r => r.overlap.dpadHUD || r.overlap.dpadHint).length;
const touchTargetsSmall = results.filter(r => {
  const a = r.sizes["#dpad-a"];
  const b2 = r.sizes["#dpad-b"];
  return (a && (a.w < 44 || a.h < 44)) || (b2 && (b2.w < 44 || b2.h < 44));
}).length;
const dpadBtnSmall = results.filter(r => {
  const u = r.sizes["#dpad-up"];
  return u && (u.w < 44 || u.h < 44);
}).length;

log("\n=== SUMMARY ===");
log(`screenshots: ${totalShots}`);
log(`total errors: ${totalErrors}`);
log(`viewport load failures: ${viewportFailures}`);
log(`modal overflows: ${modalOverflows}`);
log(`dpad/HUD overlaps: ${dpadOverlaps}`);
log(`touch targets < 44px: A/B=${touchTargetsSmall} dpad=${dpadBtnSmall}`);
log(`resize errors: ${resizeResults.reduce((s, r) => s + r.resizeErrors, 0)}`);
log(`interaction smoke failures: ${smokeResults.filter(r => !r.gameReady || !r.moved).length}`);

const report = {
  summary: {
    totalShots, totalErrors, viewportFailures, modalOverflows,
    dpadOverlaps, touchTargetsSmall, dpadBtnSmall,
    resizeErrors: resizeResults.reduce((s, r) => s + r.resizeErrors, 0),
    interactionFailures: smokeResults.filter(r => !r.gameReady || !r.moved).length,
  },
  viewportResults: results,
  resizeResults,
  smokeResults,
  allErrors,
  screenshots: shots,
  perfData,
};

const { writeFileSync } = await import("fs");
writeFileSync(
  join(ART, "qa-results.json"),
  JSON.stringify(report, null, 2)
);
log(`\nResults written to ${ART}/qa-results.json`);
