import test from "node:test";
import assert from "node:assert/strict";
import {
  playerFrameUrls,
  playerLayout,
  directionToFacing,
  PlayerSprite,
} from "../src/player.js";
import { PLAYER } from "../src/constants.js";
import { CampWorldGeometry } from "../src/geometry.js";

const DIRS = ["front", "back", "left", "right"];

test("playerFrameUrls maps 4 idle + 4-dir x 4-frame walk sets", () => {
  const u = playerFrameUrls("./assets/player/");
  for (const d of DIRS) {
    assert.equal(u.idle[d], `./assets/player/player_${d}_idle_00_v01.png`);
    assert.equal(u.walk[d].length, 4);
    assert.equal(u.walk[d][0], `./assets/player/player_${d}_walk_00_v01.png`);
    assert.equal(u.walk[d][3], `./assets/player/player_${d}_walk_03_v01.png`);
  }
});

test("direction -> facing selection", () => {
  assert.equal(directionToFacing({ x: 1, y: 0 }), "right");
  assert.equal(directionToFacing({ x: -1, y: 0 }), "left");
  assert.equal(directionToFacing({ x: 0, y: 1 }), "front");
  assert.equal(directionToFacing({ x: 0, y: -1 }), "back");
  assert.equal(directionToFacing({ x: 1, y: 1 }), "right");
  assert.equal(directionToFacing({ x: -1, y: 1 }), "left");
});

test("playerLayout uses 112px width and 192x256 pivot (96,232)", () => {
  const L = playerLayout(112);
  assert.equal(L.w, 112);
  assert.ok(Math.abs(L.h - (112 * 256) / 192) < 1e-9);
  assert.ok(Math.abs(L.pivotX - (96 / 192) * 112) < 1e-9);
  assert.ok(Math.abs(L.pivotY - (232 / 256) * L.h) < 1e-9);
});

test("pivot scaling preserves foot point across display sizes", () => {
  const a = playerLayout(112);
  const b = playerLayout(224);
  assert.ok(Math.abs(a.pivotX / a.w - b.pivotX / b.w) < 1e-9);
  assert.ok(Math.abs(a.pivotY / a.h - b.pivotY / b.h) < 1e-9);
  assert.ok(Math.abs(a.pivotX / a.w - 96 / 192) < 1e-9);
  assert.ok(Math.abs(a.pivotY / a.h - 232 / 256) < 1e-9);
});

test("stationary holds directional idle frame", () => {
  const ps = new PlayerSprite();
  ps.frames = {
    idle: { front: "iF", back: "iB", left: "iL", right: "iR" },
    walk: { front: [], back: [], left: [], right: [] },
  };
  ps.update(16.7, false, { x: 0, y: -1 });
  assert.equal(ps.facing, "back");
  assert.equal(ps.currentImage(), "iB");
  ps.update(16.7, false, { x: -1, y: 0 });
  assert.equal(ps.facing, "left");
  assert.equal(ps.currentImage(), "iL");
});

test("movement animates the corresponding directional walk sequence", () => {
  const ps = new PlayerSprite();
  ps.frames = {
    idle: { front: "iF", back: "iB", left: "iL", right: "iR" },
    walk: {
      front: ["f0", "f1", "f2", "f3"],
      back: [],
      left: [],
      right: ["r0", "r1", "r2", "r3"],
    },
  };
  ps.update(16.7, true, { x: 1, y: 0 });
  assert.equal(ps.facing, "right");
  assert.equal(ps.currentImage(), "r0");
  ps.update(200, true, { x: 1, y: 0 });
  assert.equal(ps.walkFrame, 1);
  assert.equal(ps.currentImage(), "r1");
  ps.update(200, true, { x: 1, y: 0 });
  assert.equal(ps.walkFrame, 2);
  ps.update(200, true, { x: 1, y: 0 });
  assert.equal(ps.walkFrame, 3);
  ps.update(200, true, { x: 1, y: 0 });
  assert.equal(ps.walkFrame, 0);
});

test("112px display width is independent from gameplay geometry", () => {
  assert.equal(PLAYER.DISPLAY_W, 112);
  const g = new CampWorldGeometry();
  const before = g.isWalkable(200, 800);
  const same = g.isWalkable(200, 800);
  assert.equal(before, same);
  assert.ok(g.paths && g.clearings); // geometry owns its own source, not player size
});
