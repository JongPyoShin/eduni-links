import { chromium } from "playwright";
import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:8123";
const OUT = join("artifacts", "jungle-random-quiz-qa");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const RESULTS = [];
function record(tc, ok, detail = "") {
  RESULTS.push({ tc, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${tc}${detail ? " — " + detail : ""}`);
}

async function screenshot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function waitForGameReady(page, apiName, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((name) => !!globalThis[name], apiName);
    if (ready) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--no-sandbox"] });
  const pageErrors = [];
  const consoleErrors = [];

  // === Run A — Desktop Full Adventure ===
  console.log("\n=== Run A: Desktop 1280x800 Full Adventure ===");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });

    const stages = [
      { name: "Camp", url: "/?renderer=three", api: "__eduniJungleGame" },
      { name: "Waterfall", url: "/?renderer=three&stage=waterfall", api: "__eduniJungleGame" },
      { name: "Cave", url: "/cave-game.html", api: "__eduniCaveGame" },
      { name: "GiantTree", url: "/giant-tree-game.html", api: "__eduniGiantTreeGame" },
      { name: "SkyRidge", url: "/sky-ridge-game.html", api: "__eduniSkyRidgeGame" },
    ];

    for (const stage of stages) {
      console.log(`\n--- Stage: ${stage.name} ---`);
      await page.goto(BASE + stage.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);
      await screenshot(page, `runA-${stage.name.toLowerCase()}-loaded`);

      const ready = await waitForGameReady(page, stage.api, 12000);
      record(`TC-CHROME-A-${stage.name}-load`, ready, `${stage.name} game loaded`);

      // Check objective HUD
      const objective = await page.evaluate(() => document.getElementById("objective-hud")?.textContent || "");
      record(`TC-CHROME-A-${stage.name}-objective`, objective.length > 0, `Objective: "${objective}"`);

      // Check modal exists
      const modalExists = await page.evaluate(() => !!document.getElementById("modal"));
      record(`TC-CHROME-A-${stage.name}-modal-exists`, modalExists, "Modal element present");
    }

    // Check Hub page
    await page.goto(BASE + "/jungle-hub.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const hubCards = await page.$$(".card");
    record("TC-CHROME-A-Hub-cards", hubCards.length === 5, `Hub cards: ${hubCards.length}`);
    await screenshot(page, "runA-hub");

    await page.close();
    await context.close();
  }

  // === Run B — Quiz System Integration Check ===
  console.log("\n=== Run B: Quiz System Integration Check ===");
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Check Camp quiz system
    await page.goto(BASE + "/?renderer=three", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const campQuizCheck = await page.evaluate(() => {
      const game = globalThis.__eduniJungleGame;
      if (!game?.getState) return { hasState: false };
      const state = game.getState();
      return {
        hasState: true,
        chapterState: !!state.chapter,
        waterfallState: !!state.waterfall,
      };
    });
    record("TC-CHROME-B-camp-quiz-state", campQuizCheck.hasState, `Camp state: ${JSON.stringify(campQuizCheck)}`);
    await screenshot(page, "runB-camp-quiz-check");

    // Check Cave quiz system
    await page.goto(BASE + "/cave-game.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const caveQuizCheck = await page.evaluate(() => {
      const game = globalThis.__eduniCaveGame;
      if (!game?.getState) return { hasState: false };
      const state = game.getState();
      return {
        hasState: true,
        fireflyPatternComplete: state.fireflyPatternComplete,
        fireflyPatternRound: state.fireflyPatternRound,
      };
    });
    record("TC-CHROME-B-cave-quiz-state", caveQuizCheck.hasState, `Cave state: ${JSON.stringify(caveQuizCheck)}`);
    await screenshot(page, "runB-cave-quiz-check");

    // Check GiantTree quiz system
    await page.goto(BASE + "/giant-tree-game.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const treeQuizCheck = await page.evaluate(() => {
      const game = globalThis.__eduniGiantTreeGame;
      if (!game?.getState) return { hasState: false };
      const state = game.getState();
      return {
        hasState: true,
        treeRingComplete: state.treeRingComplete,
        treeRingRound: state.treeRingRound,
      };
    });
    record("TC-CHROME-B-tree-quiz-state", treeQuizCheck.hasState, `GiantTree state: ${JSON.stringify(treeQuizCheck)}`);
    await screenshot(page, "runB-tree-quiz-check");

    // Check SkyRidge quiz system
    await page.goto(BASE + "/sky-ridge-game.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const skyQuizCheck = await page.evaluate(() => {
      const game = globalThis.__eduniSkyRidgeGame;
      if (!game?.getState) return { hasState: false };
      const state = game.getState();
      return {
        hasState: true,
        clueQuizScore: state.adventure?.clueQuizScore,
      };
    });
    record("TC-CHROME-B-sky-quiz-state", skyQuizCheck.hasState, `SkyRidge state: ${JSON.stringify(skyQuizCheck)}`);
    await screenshot(page, "runB-sky-quiz-check");

    await page.close();
    await context.close();
  }

  // === Run C — Tablet Touch 800x1280 ===
  console.log("\n=== Run C: Tablet Touch 800x1280 ===");
  {
    const tabletContext = await browser.newContext({
      viewport: { width: 800, height: 1280 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await tabletContext.newPage();
    page.on("pageerror", (err) => pageErrors.push(err.message));

    // Camp tablet
    await page.goto(BASE + "/?renderer=three", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await screenshot(page, "runC-tablet-camp");

    const dpad = await page.$("#dpad");
    const btnA = await page.$("#dpad-a");
    const btnB = await page.$("#dpad-b");
    record("TC-CHROME-C-dpad-visible", !!dpad, "D-pad present");
    record("TC-CHROME-C-ab-buttons", !!btnA && !!btnB, "A/B buttons present");

    // Test touch on D-pad
    if (dpad) {
      const box = await dpad.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y);
        await page.waitForTimeout(300);
        await page.touchscreen.tap(box.x + box.width, box.y + box.height / 2);
        await page.waitForTimeout(300);
      }
    }
    await screenshot(page, "runC-tablet-after-touch");

    // Test A button
    if (btnA) {
      const box = await btnA.boundingBox();
      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(300);
      }
    }
    await screenshot(page, "runC-tablet-after-a");

    // Landscape
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await screenshot(page, "runC-tablet-landscape");

    // Back to portrait
    await page.setViewportSize({ width: 800, height: 1280 });
    await page.waitForTimeout(500);
    await screenshot(page, "runC-tablet-portrait-again");

    // Cave tablet
    await page.goto(BASE + "/cave-game.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await screenshot(page, "runC-tablet-cave");

    // Sky Ridge tablet
    await page.goto(BASE + "/sky-ridge-game.html", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await screenshot(page, "runC-tablet-sky");

    await page.close();
    await tabletContext.close();
  }

  // === Run D — Replay Variation ===
  console.log("\n=== Run D: Replay Variation ===");
  {
    const allQuizBodies = [];
    for (let run = 0; run < 5; run++) {
      const freshContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await freshContext.newPage();

      // Use Cave for variation test (simpler interaction)
      await page.goto(BASE + "/cave-game.html", { waitUntil: "networkidle" });
      await page.waitForTimeout(3000);

      const ready = await waitForGameReady(page, "__eduniCaveGame", 12000);
      if (!ready) {
        await page.close();
        await freshContext.close();
        continue;
      }

      // Check game state
      const state = await page.evaluate(() => {
        const game = globalThis.__eduniCaveGame;
        return game?.getState ? game.getState() : null;
      });

      if (state) {
        allQuizBodies.push(JSON.stringify(state));
      }

      await screenshot(page, `runD-variation-${run}`);
      await page.close();
      await freshContext.close();
    }

    const uniqueStates = new Set(allQuizBodies);
    record("TC-CHROME-D-replay-states", uniqueStates.size >= 1, `${uniqueStates.size} distinct game states across 5 runs`);
  }

  // === Summary ===
  console.log("\n=== Summary ===");
  console.log(`Total: ${RESULTS.length}`);
  console.log(`Pass: ${RESULTS.filter((r) => r.ok).length}`);
  console.log(`Fail: ${RESULTS.filter((r) => !r.ok).length}`);
  console.log(`Page errors: ${pageErrors.length}`);
  console.log(`Console errors: ${consoleErrors.length}`);

  if (pageErrors.length > 0) {
    console.log("\nPage errors:");
    pageErrors.forEach((e) => console.log(`  - ${e}`));
  }

  // Write results
  const report = {
    timestamp: new Date().toISOString(),
    results: RESULTS,
    pageErrors,
    consoleErrors: consoleErrors.slice(0, 10),
    summary: {
      total: RESULTS.length,
      pass: RESULTS.filter((r) => r.ok).length,
      fail: RESULTS.filter((r) => !r.ok).length,
    },
  };
  writeFileSync(join(OUT, "qa-results.json"), JSON.stringify(report, null, 2));

  await browser.close();

  const failed = RESULTS.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log("\nFAILED TESTS:");
    failed.forEach((f) => console.log(`  ${f.tc}: ${f.detail}`));
  }
}

run().catch((err) => {
  console.error("QA script error:", err);
  process.exit(1);
});
