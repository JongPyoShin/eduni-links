import test from "node:test";
import assert from "node:assert/strict";
import { buildProps, pathBands, SCENE_IMAGES } from "../src/scene.js";
import { CampWorldGeometry } from "../src/geometry.js";
import { BLUEBIRD, PLAYER } from "../src/constants.js";
import { playerFrameUrls } from "../src/player.js";

test("scene props are deterministic with valid world foot positions", () => {
  const a = buildProps();
  const b = buildProps();
  assert.equal(a.length, b.length);
  for (const p of a) {
    assert.equal(typeof p.x === "number" && Number.isFinite(p.x), true);
    assert.equal(typeof p.y === "number" && Number.isFinite(p.y), true);
    assert.equal(typeof p.footY === "number" && Number.isFinite(p.footY), true);
    assert.ok(p.x >= 0 && p.x <= 1600, `x ${p.x} in bounds`);
    assert.ok(p.y >= 0 && p.y <= 1200, `y ${p.y} in bounds`);
  }
});

test("clearing identities are present at the correct world anchors", () => {
  const props = buildProps();
  const hut = props.find((p) => p.type === "hut");
  const fire = props.find((p) => p.type === "firepit");
  assert.ok(hut && hut.x === 430 && hut.y === 260, "tent hut framed within Tent clearing");
  assert.ok(fire && fire.x === 990 && fire.y === 935, "fire pit framed within Fire Pit clearing");
  const perchOccluder = props.find(
    (p) => p.type === "rock" && Math.abs(p.x - BLUEBIRD.VISUAL.x) < 1 && Math.abs(p.y - 430) < 30
  );
  assert.equal(
    perchOccluder,
    undefined,
    "no standalone perch rock in the depth list that would occlude the bird (now drawn behind the bird)"
  );
});

test("tile-like grass and flower-bed assets are not depth-sorted props", () => {
  const props = buildProps();
  assert.equal(props.some((p) => p.type === "grass" || p.type === "flower_bed"), false);
  assert.equal(
    props.some((p) => Math.abs(p.x - 1340) < 1 && Math.abs(p.y - 520) < 1),
    false,
    "nothing can be depth-sorted over the Bluebird from the former grass placement"
  );
  assert.equal("grass" in SCENE_IMAGES || "flower_bed" in SCENE_IMAGES, false);
});

test("landmark visuals frame the route without sitting on its centerline", () => {
  const geometry = new CampWorldGeometry();
  const props = buildProps();
  for (const type of ["hut", "firepit"]) {
    const prop = props.find((p) => p.type === type);
    assert.ok(prop, `${type} exists`);
    assert.ok(
      geometry.distToPath(prop.x, prop.y) > geometry.pathHalfWidth,
      `${type} is visually off the route centerline`
    );
  }
  const movedTree = props.find((p) => p.type === "tree_round" && p.x === 360 && p.y === 900);
  const movedPine = props.find((p) => p.type === "pine" && p.x === 1450 && p.y === 900);
  assert.ok(movedTree && movedPine, "route-blocking trees remain framed off the route");
});

test("path rendering consumes CampWorldGeometry single source", () => {
  const g = new CampWorldGeometry();
  const bands = pathBands(g);
  assert.equal(bands.paths, g.paths);
  assert.equal(bands.clearings, g.clearings);
});

test("bluebird visual position is separated from interaction anchor", () => {
  const anchor = BLUEBIRD.WORLD;
  const vis = BLUEBIRD.VISUAL;
  const d = Math.hypot(vis.x - anchor.x, vis.y - anchor.y);
  assert.ok(d > 100 && d < 130, `visual offset ~100-130, got ${d.toFixed(1)}`);
  const ridge = new CampWorldGeometry().clearings[3];
  assert.ok(
    Math.hypot(vis.x - ridge.x, vis.y - ridge.y) <= ridge.r,
    "visual bird stays within Ridge clearing"
  );
});

test("player geometry contract unchanged", () => {
  assert.equal(PLAYER.DISPLAY_W, 112);
  assert.equal(PLAYER.PIVOT.x, 96);
  assert.equal(PLAYER.PIVOT.y, 232);
  assert.equal(PLAYER.FRAME_W, 192);
  assert.equal(PLAYER.FRAME_H, 256);
  const u = playerFrameUrls();
  const total = 4 + Object.values(u.walk).reduce((s, a) => s + a.length, 0);
  assert.equal(total, 20);
});

test("scene asset manifest references only approved runtime files", () => {
  const keys = Object.keys(SCENE_IMAGES);
  for (const k of keys) {
    assert.ok(SCENE_IMAGES[k].startsWith("assets/scene/"), k);
  }
});
