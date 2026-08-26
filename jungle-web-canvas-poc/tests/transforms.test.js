import test from "node:test";
import assert from "node:assert/strict";
import { worldToScreen, screenToWorld, makeCamera } from "../src/transforms.js";

test("world -> screen -> world roundtrip", () => {
  const cam = makeCamera(740, 510, 1.25);
  const viewW = 1280;
  const viewH = 720;
  const points = [
    { x: 0, y: 0 },
    { x: 1600, y: 1200 },
    { x: 333, y: 777 },
    { x: 900.5, y: 12.25 },
  ];
  for (const p of points) {
    const s = worldToScreen(p.x, p.y, cam, viewW, viewH);
    const w = screenToWorld(s.x, s.y, cam, viewW, viewH);
    assert.ok(Math.abs(w.x - p.x) < 1e-9, `x ${w.x} vs ${p.x}`);
    assert.ok(Math.abs(w.y - p.y) < 1e-9, `y ${w.y} vs ${p.y}`);
  }
});
