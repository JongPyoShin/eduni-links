import test from "node:test";
import assert from "node:assert/strict";
import { CampWorldGeometry } from "../src/geometry.js";

test("walkable shapes are the same source used for isWalkable", () => {
  const g = new CampWorldGeometry();
  const shapes = g.walkableShapes();
  assert.equal(shapes.halfWidth, g.pathHalfWidth);
  assert.equal(shapes.paths[0], g.paths[0]);
  assert.equal(shapes.clearings, g.clearings);
});

test("visible walkable corridor equals collision corridor (halfWidth band)", () => {
  const g = new CampWorldGeometry();
  const hw = g.pathHalfWidth;
  const onCenter = g.isWalkable(200, 800);
  const inside = g.isWalkable(200 + (hw - 1), 800);
  const outside = g.isWalkable(200 + (hw + 1), 800);
  assert.equal(onCenter, true);
  assert.equal(inside, true);
  assert.equal(outside, false);
});

test("clearing circular walkable area matches radius", () => {
  const g = new CampWorldGeometry();
  const tent = g.clearings[1];
  assert.equal(g.isWalkable(tent.x, tent.y), true);
  const ox = tent.x + Math.round((tent.r + 10) * Math.SQRT1_2);
  const oy = tent.y + Math.round((tent.r + 10) * Math.SQRT1_2);
  assert.equal(g.isWalkable(ox, oy), false);
});

test("world bounds clamp walkability", () => {
  const g = new CampWorldGeometry();
  assert.equal(g.isWalkable(-5, 500), false);
  assert.equal(g.isWalkable(g.world.w + 5, 500), false);
});
