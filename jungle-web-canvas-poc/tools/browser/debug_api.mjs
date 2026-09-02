import { chromium } from "playwright";

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage();
await p.setViewportSize({ width: 1280, height: 720 });
await p.goto("http://localhost:8124/?renderer=three&qa=1", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(5000);

const info = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  if (!g) return "no __eduniJungleGame";
  const keys = Object.keys(g);
  const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(g));
  const methods = keys.filter(k => typeof g[k] === "function");
  const props = keys.filter(k => typeof g[k] !== "function");
  // Check for interactables in various forms
  const intChecks = {
    interactables: !!g.interactables,
    _interactables: !!g._interactables,
    objects: !!g.objects,
    _objects: !!g._objects,
    items: !!g.items,
    getInteractables: typeof g.getInteractables,
    getObjects: typeof g.getObjects,
    findNearby: typeof g.findNearby,
    nearbyObjects: !!g.nearbyObjects,
  };
  // Check sub-objects
  const subTypes = {};
  for (const k of keys) {
    if (g[k] && typeof g[k] === "object" && !Array.isArray(g[k])) {
      subTypes[k] = Object.keys(g[k]).slice(0, 10);
    } else if (Array.isArray(g[k])) {
      subTypes[k] = `array(${g[k].length})`;
    }
  }
  return { keys: keys.slice(0, 30), proto: proto.slice(0, 30), methods, props, intChecks, subTypes };
});
console.log(JSON.stringify(info, null, 2));

// Also check the content/UI system
const ui = await p.evaluate(() => {
  const g = globalThis.__eduniJungleGame;
  if (!g) return null;
  // Check if there's a content panel
  const panel = document.querySelector("#context-panel, #content-panel, .panel, #dialog, #modal");
  return {
    panelFound: !!panel,
    panelId: panel?.id,
    modalEl: !!document.querySelector("#modal"),
    qaBtn: !!document.querySelector("#qa-interact"),
  };
});
console.log("UI:", JSON.stringify(ui, null, 2));

await p.close();
await b.close();
