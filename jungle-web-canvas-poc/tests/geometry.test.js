import test from "node:test";
import assert from "node:assert/strict";
import {
  CampWorldGeometry,
  WaterfallWorldGeometry,
  CaveWorldGeometry,
  GiantTreeWorldGeometry,
  SkyRidgeWorldGeometry,
} from "../src/geometry.js";

test("walkable shapes are the same source used for isWalkable", () => {
  const g = new CampWorldGeometry();
  const shapes = g.walkableShapes();
  assert.equal(shapes.halfWidth, g.pathHalfWidth);
  assert.equal(shapes.paths[0], g.paths[0]);
  assert.equal(shapes.clearings, g.clearings);
  assert.equal(shapes.blockers, g.blockers);
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

test("Camp solid props block their visible ground footprint instead of only the center point", () => {
  const g = new CampWorldGeometry();
  for (const [x, y, label] of [
    [405, 320, "hut body"],
    [480, 320, "hut right edge"],
    [610, 430, "large hut boulder"],
    [550, 430, "large hut boulder left edge"],
    [350, 690, "trail rock"],
    [1360, 680, "ridge boulder"],
  ]) {
    assert.equal(g.isWalkable(x, y), false, `${label} must be solid`);
  }
});

test("Camp orthogonal route centerline remains open beside the larger solid footprints", () => {
  const g = new CampWorldGeometry();
  for (const [x, y] of [
    [520, 320],
    [520, 430],
    [920, 690],
    [1300, 680],
  ]) {
    assert.equal(g.isWalkable(x, y), true, `route center (${x}, ${y}) must stay walkable`);
  }
});

test("world bounds clamp walkability", () => {
  const g = new CampWorldGeometry();
  assert.equal(g.isWalkable(-5, 500), false);
  assert.equal(g.isWalkable(g.world.w + 5, 500), false);
});

test("Waterfall geometry exposes its own walkable source and no Camp Bluebird", () => {
  const g = new WaterfallWorldGeometry();
  const shapes = g.walkableShapes();
  assert.equal(shapes.paths[0], g.paths[0]);
  assert.equal(shapes.clearings, g.clearings);
  assert.equal(shapes.halfWidth, g.pathHalfWidth);
  assert.equal(g.bluebird, null);
});

test("all Waterfall progression anchors are reachable walkable points", () => {
  const g = new WaterfallWorldGeometry();
  const anchors = [
    [700, 900],
    [1080, 700],
    [1170, 560],
    [1020, 480],
    [1250, 470],
    [1450, 330],
    [1410, 400],
  ];
  for (const [x, y] of anchors) {
    assert.equal(g.isWalkable(x, y), true, `Waterfall anchor (${x}, ${y}) must be reachable`);
  }
});

function assertCardinalPath(Geometry, label) {
  const geometry = new Geometry();
  const path = geometry.paths[0];
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    assert.ok(
      a.x === b.x || a.y === b.y,
      `${label} segment ${i} must be horizontal or vertical: (${a.x},${a.y}) -> (${b.x},${b.y})`
    );
    assert.notDeepEqual(a, b, `${label} segment ${i} must have non-zero length`);
  }
}

test("all playable Jungle stage routes are horizontal/vertical D-pad corridors", () => {
  assertCardinalPath(CampWorldGeometry, "Camp");
  assertCardinalPath(WaterfallWorldGeometry, "Waterfall");
  assertCardinalPath(CaveWorldGeometry, "Cave");
  assertCardinalPath(GiantTreeWorldGeometry, "Giant Tree");
  assertCardinalPath(SkyRidgeWorldGeometry, "Sky Ridge");
});

test("cardinal route redesign preserves authored stage progression anchors", () => {
  const cases = [
    [CaveWorldGeometry, [[420,930],[620,860],[780,700],[930,600],[1080,520],[1260,460],[1420,340]]],
    [GiantTreeWorldGeometry, [[430,930],[650,830],[820,690],[980,570],[1110,500],[1290,430],[1440,320]]],
    [SkyRidgeWorldGeometry, [[430,930],[650,820],[830,690],[1000,560],[1130,490],[1300,420],[1450,310]]],
  ];
  for (const [Geometry, anchors] of cases) {
    const geometry = new Geometry();
    for (const [x, y] of anchors) {
      assert.equal(geometry.isWalkable(x, y), true, `${Geometry.name} anchor (${x}, ${y}) must stay reachable`);
    }
  }
});
