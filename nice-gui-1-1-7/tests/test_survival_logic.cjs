"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../portal_app/survival_static/logic.js");

test("child's original 1~35 lives are available; invalid inputs are safe", () => {
  assert.equal(L.selectLives(1), 1);
  assert.equal(L.selectLives(35), 35);
  assert.equal(L.selectLives(0), 1);
  assert.equal(L.selectLives(36), 35);
  assert.equal(L.selectLives("bad"), 5);
  assert.equal(L.scoreMultiplier(1), 3);
  assert.equal(L.scoreMultiplier(35), 1);
});
test("spawn/exit positions are inside playable geometry", () => {
  assert.ok(L.canOccupy(L.START.x, L.START.y));
  assert.ok(L.canOccupy(L.EXIT.x, L.EXIT.y));
});
test("diagonal speed is normalized; keys cannot pass walls or map borders", () => {
  const a = L.movePlayer({ x: 110, y: 580 }, 1, 0, 0.05);
  const d = L.movePlayer({ x: 110, y: 580 }, 1, 1, 0.05);
  assert.ok(Math.abs(Math.hypot(d.x - 110, d.y - 580) - (a.x - 110)) < 0.00001);
  let p = { x: 200, y: 575 };
  for (let i = 0; i < 100; i++) p = L.movePlayer(p, 0, -1, 0.05);
  assert.ok(p.y >= 480 + 52 + L.PLAYER_RADIUS);
  const edge = L.movePlayer({ x: 46, y: 650 }, -1, 0, 0.05);
  assert.equal(edge.x, 46);
});
test("each collision costs precisely one life, with 1.5s grace", () => {
  let hit = L.resolveEnemyHit(35, 0, true);
  assert.equal(hit.lives, 34); assert.equal(hit.hit, true);
  let again = L.resolveEnemyHit(hit.lives, hit.invulnerableSeconds, true);
  assert.equal(again.lives, 34); assert.equal(again.hit, false);
  hit = L.resolveEnemyHit(1, 0, true);
  assert.equal(hit.lives, 0); assert.equal(hit.dead, true);
  assert.equal(L.resolveEnemyHit(0, 0, true).lives, 0);
});
test("patrol reverses at ends and cannot drift out of range", () => {
  for (const enemy of L.ENEMIES) {
    let e = { ...enemy };
    let reversed = false;
    for (let i = 0; i < 400; i++) {
      const next = L.patrol(e, 0.05);
      if (next.direction !== e.direction) reversed = true;
      assert.ok(next[next.axis] >= next.min && next[next.axis] <= next.max);
      e = next;
    }
    assert.ok(reversed, enemy.id);
  }
});
test("all three optional stars are reachable and cannot block escape", () => {
  for (const star of L.STARS) assert.ok(L.canOccupy(star.x, star.y, 13));
  assert.equal(L.hasEscaped({ x: L.EXIT.x, y: L.EXIT.y }), true);
  assert.equal(L.hasEscaped(L.START), false);
  assert.ok(L.calculateScore(1, 1, 3, 30) > L.calculateScore(35, 35, 3, 30));
});

test("the key unlocks a reachable gate, and hazards leave room to dodge", () => {
  assert.ok(L.canOccupy(L.KEY.x, L.KEY.y));
  assert.ok(L.canOccupy(L.JAGUAR.x, L.JAGUAR.y, L.JAGUAR.radius));
  for (const h of L.HAZARDS) {
    assert.ok(L.canOccupy(h.x, h.y, 13), "hazard should be on traversable ground");
    assert.ok(h.radius >= 30, "warning area visible");
  }
});
test("hazard warns before impact in both modes", () => {
  for (const mode of ["thrill", "explore"]) {
    for (const hazard of L.HAZARDS) {
      const phases = [];
      for (let t = 0; t < 16; t += .05) phases.push(L.dangerPhase(t, hazard.phase, mode));
      const firstDanger = phases.indexOf("active");
      assert.ok(firstDanger > 0, mode);
      assert.ok(phases.slice(Math.max(0, firstDanger - 28), firstDanger).includes("warning"));
    }
  }
});
test("the jaguar pursues but cannot walk through tree hitboxes", () => {
  for (const mode of ["thrill", "explore"]) {
    let jaguar = { ...L.JAGUAR };
    const original = Math.hypot(jaguar.x - L.KEY.x, jaguar.y - L.KEY.y);
    for (let t = 0; t < 600; t++) {
      jaguar = L.chaseJaguar(jaguar, L.KEY, .05, mode);
      assert.ok(L.canOccupy(jaguar.x, jaguar.y, jaguar.radius), "jaguar blocked by trees");
    }
    assert.ok(Math.hypot(jaguar.x - L.KEY.x, jaguar.y - L.KEY.y) < original);
  }
});
test("dash is faster but still obeys boundaries", () => {
  const pos = { x: 120, y: 585 };
  const walk = L.movePlayer(pos, 1, 0, .05);
  const dash = L.movePlayer(pos, 1, 0, .05, L.OBSTACLES, L.DASH_BOOST);
  assert.ok(dash.x > walk.x);
  assert.equal(L.DASH_COOLDOWN, 5);
  assert.equal(L.DASH_SECONDS, .5);
  let blocked = { x: 200, y: 575 };
  for (let t = 0; t < 100; t++) blocked = L.movePlayer(blocked, 0, -1, .05, L.OBSTACLES, L.DASH_BOOST);
  assert.ok(blocked.y >= 552, "dash may not tunnel through trees");
});
test("the 45s chase and 90s relaxed timers expire exactly", () => {
  assert.equal(L.remainingTime(0, "thrill"), 45);
  assert.equal(L.remainingTime(44.9, "thrill"), 1);
  assert.equal(L.remainingTime(45, "thrill"), 0);
  assert.equal(L.remainingTime(0, "explore"), 90);
  assert.equal(L.remainingTime(90, "explore"), 0);
});
