import test from "node:test";
import assert from "node:assert/strict";

import { loadImage, preload } from "../src/assets.js";

class FakeImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this._src = "";
  }

  set src(value) {
    this._src = value;
    if (value.includes("ok")) {
      queueMicrotask(() => this.onload?.());
    } else if (value.includes("error")) {
      queueMicrotask(() => this.onerror?.(new Error("fake load failure")));
    }
    // URLs containing "stall" intentionally never fire either callback.
  }

  get src() {
    return this._src;
  }
}

test("asset loader resolves successful and failed images without rejecting startup", async () => {
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try {
    const ok = await loadImage("qa-ok.png", { timeoutMs: 50 });
    const failed = await loadImage("qa-error.png", { timeoutMs: 50 });
    assert.equal(ok.ok, true);
    assert.equal(failed.ok, false);
  } finally {
    globalThis.Image = previousImage;
  }
});

test("stalled presentation assets time out instead of blocking gameplay startup", async () => {
  const previousImage = globalThis.Image;
  globalThis.Image = FakeImage;
  try {
    const startedAt = Date.now();
    const [result] = await preload(["qa-stall.png"], { timeoutMs: 20 });
    assert.equal(result.ok, false);
    assert.equal(result.timedOut, true);
    assert.ok(Date.now() - startedAt < 500, "stalled asset resolves promptly through timeout fallback");
  } finally {
    globalThis.Image = previousImage;
  }
});
