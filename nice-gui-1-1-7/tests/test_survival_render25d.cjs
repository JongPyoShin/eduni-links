"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../portal_app/survival_static/render25d.js");
const L = require("../portal_app/survival_static/logic.js");

function mockCanvas() {
  const calls = {};
  const ctx = {};
  for (const method of ["beginPath","closePath","roundRect","ellipse","arc","moveTo","lineTo",
    "bezierCurveTo","quadraticCurveTo","fill","stroke","fillRect","strokeRect",
    "clearRect","save","restore","clip","translate","rotate","scale","fillText"]) {
    ctx[method] = () => { calls[method] = (calls[method] || 0) + 1; };
  }
  ctx.createLinearGradient = () => ({
    addColorStop() { calls.gradients = (calls.gradients || 0) + 1; },
  });
  return { ctx, calls };
}

test("2.5D explorer and bunny render in all directions with silhouette and shadow", () => {
  for (const bunny of [false, true]) for (const facing of ["up","down","left","right"]) {
    const { ctx, calls } = mockCanvas();
    R.drawPlayer(ctx, { x: 100, y: 105 }, {
      facing, bunny, walk: 2.1, moving: true, dash: true, invulnerable: true,
    });
    assert.ok((calls.ellipse || 0) >= 12, "body/hat/face/shadow details");
    assert.ok((calls.gradients || 0) >= 4, "dimensional shading");
    assert.equal(calls.fillText || 0, 0, "player is not an emoji");
    assert.equal(calls.save, calls.restore, "canvas state balanced");
  }
});
test("monkey, snake and jaguar are modeled shapes rather than emoji icons", () => {
  for (const enemy of [...L.ENEMIES, L.JAGUAR]) {
    const { ctx, calls } = mockCanvas();
    R.drawEnemy(ctx, enemy, 3.1);
    assert.ok((calls.ellipse || 0) >= 8, enemy.kind);
    assert.ok((calls.stroke || 0) >= 3, enemy.kind);
    assert.equal(calls.fillText || 0, 0);
    assert.equal(calls.save, calls.restore);
  }
});
test("all shelters are dimensional and hide the avatar when occupied", () => {
  for (const shelter of L.SHELTERS) {
    const { ctx, calls } = mockCanvas();
    R.drawShelter(ctx, { ...shelter, status: "available" }, false, 0, 3);
    const rendered = calls.fill || 0;
    R.drawShelter(ctx, { ...shelter, status: "occupied" }, true, 1.5, 3);
    assert.ok((calls.fill || 0) > rendered);
    assert.ok((calls.stroke || 0) >= 2);
    assert.equal(calls.save, calls.restore);
    const { ctx: usedCtx, calls: usedCalls } = mockCanvas();
    R.drawShelter(usedCtx, { ...shelter, status: "used" }, false, 0, 3);
    assert.equal(usedCalls.fill || 0, 0);
  }
  const { ctx, calls } = mockCanvas();
  R.drawPlayer(ctx, L.START, { hiding: true });
  assert.equal(calls.ellipse || 0, 0, "hidden avatar is covered by the shelter");
});
test("layer objects, pickups, forest scenes and portals render without remote textures", () => {
  const { ctx, calls } = mockCanvas();
  for (const [i, obstacle] of L.OBSTACLES.entries()) {
    R.drawObstacleBase(ctx, obstacle);
    R.drawObstacle(ctx, obstacle, i);
  }
  for (const kind of ["camp","butterflies","flowers","ruins","jungle","waterfall"])
    R.drawLandmark(ctx, { x: 220, y: 250, kind }, 1.4);
  for (const phase of ["idle","warning","active"])
    R.drawHazard(ctx, L.HAZARDS[0], phase, 1.4);
  R.drawExit(ctx, L.EXIT, false, 1.4);
  R.drawExit(ctx, L.EXIT, true, 1.4);
  R.drawStar(ctx, L.STARS[0].x, L.STARS[0].y, 1.4);
  R.drawKey(ctx, L.KEY, 1.4);
  assert.ok((calls.fill || 0) > 80);
  assert.ok((calls.gradients || 0) > 20);
  assert.equal(calls.save, calls.restore);
});
