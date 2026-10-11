/* 의준 서바이벌: pure game rules shared by browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SurvivalLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SIZE = 720;
  const PADDING = 26;
  const PLAYER_RADIUS = 20;
  const ENEMY_COOLDOWN_SECONDS = 1.5;
  const PLAYER_SPEED = 216;
  const DASH_BOOST = 2.05;
  const DASH_SECONDS = 0.5;
  const DASH_COOLDOWN = 5;
  const TIME_LIMITS = Object.freeze({ thrill: 110, explore: 190 });
  const START = Object.freeze({ x: 78, y: 637 });
  const EXIT = Object.freeze({ x: 635, y: 83, radius: 38 });
  const OBSTACLES = Object.freeze([
    Object.freeze({ x: 155, y: 480, w: 153, h: 52 }),
    Object.freeze({ x: 272, y: 299, w: 64, h: 159 }),
    Object.freeze({ x: 424, y: 149, w: 55, h: 160 }),
    Object.freeze({ x: 437, y: 486, w: 143, h: 50 }),
  ]);
  const ENEMIES = Object.freeze([
    Object.freeze({ id: "monkey-south", kind: "monkey", x: 93, y: 405, radius: 22, axis: "x", min: 70, max: 246, speed: 94, direction: 1 }),
    Object.freeze({ id: "snake-middle", kind: "snake", x: 386, y: 360, radius: 19, axis: "y", min: 344, max: 627, speed: 107, direction: 1 }),
    Object.freeze({ id: "monkey-north", kind: "monkey", x: 558, y: 220, radius: 22, axis: "x", min: 508, max: 659, speed: 110, direction: 1 }),
  ]);
  // The key is reachable without entering a hazard; taking it wakes the jaguar.
  const KEY = Object.freeze({ x: 611, y: 367, radius: 19 });
  const JAGUAR = Object.freeze({ x: 95, y: 264, radius: 22, speed: 174, kind: "jaguar" });
  // Fruit fall warning (orange ring) → short dangerous pulse (red ring).
  const HAZARDS = Object.freeze([
    Object.freeze({ x: 205, y: 252, radius: 41, phase: 0 }),
    Object.freeze({ x: 548, y: 390, radius: 41, phase: 2.7 }),
  ]);
  const STARS = Object.freeze([
    Object.freeze({ x: 102, y: 213 }),
    Object.freeze({ x: 392, y: 101 }),
    Object.freeze({ x: 632, y: 404 }),
  ]);
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function selectLives(value) {
    const n = Number(value);
    return Number.isFinite(n) ? clamp(Math.round(n), 1, 35) : 5;
  }
  function scoreMultiplier(lives) {
    const n = selectLives(lives);
    return n <= 3 ? 3 : n <= 7 ? 2 : n <= 15 ? 1.5 : 1;
  }
  function circleHitsRect(x, y, radius, rect) {
    const nearX = clamp(x, rect.x, rect.x + rect.w);
    const nearY = clamp(y, rect.y, rect.y + rect.h);
    return (x - nearX) ** 2 + (y - nearY) ** 2 < radius ** 2;
  }
  function canOccupy(x, y, radius = PLAYER_RADIUS, obstacles = OBSTACLES) {
    if (x - radius < PADDING || x + radius > SIZE - PADDING ||
        y - radius < PADDING || y + radius > SIZE - PADDING) return false;
    return !obstacles.some((rect) => circleHitsRect(x, y, radius, rect));
  }
  function movePlayer(pos, dx, dy, elapsed, obstacles = OBSTACLES, speedMultiplier = 1) {
    // Normalize diagonals. Per-axis collision permits sliding along tree/log edges.
    const length = Math.hypot(dx, dy);
    if (length <= 0 || !Number.isFinite(elapsed) || elapsed <= 0) return { x: pos.x, y: pos.y };
    const seconds = clamp(elapsed, 0, 0.05);
    const step = PLAYER_SPEED * clamp(speedMultiplier, 0.1, DASH_BOOST) * seconds / Math.max(1, length);
    let x = pos.x, y = pos.y;
    if (canOccupy(x + dx * step, y, PLAYER_RADIUS, obstacles)) x += dx * step;
    if (canOccupy(x, y + dy * step, PLAYER_RADIUS, obstacles)) y += dy * step;
    return { x, y };
  }
  function patrol(enemy, dt) {
    const seconds = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    const axis = enemy.axis;
    const distance = enemy.speed * seconds;
    let coord = enemy[axis] + enemy.direction * distance;
    let direction = enemy.direction;
    if (coord > enemy.max) { coord = enemy.max - (coord - enemy.max); direction = -1; }
    if (coord < enemy.min) { coord = enemy.min + (enemy.min - coord); direction = 1; }
    return { ...enemy, [axis]: clamp(coord, enemy.min, enemy.max), direction };
  }
  function circlesTouch(a, b, extra = 0) {
    return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius + extra;
  }
  function resolveEnemyHit(lives, invulnerableSeconds, touching) {
    const remaining = Math.max(0, invulnerableSeconds);
    if (!touching || remaining > 0 || lives <= 0) {
      return { lives, invulnerableSeconds: remaining, hit: false, dead: lives <= 0 };
    }
    const next = Math.max(0, lives - 1);
    return { lives: next, invulnerableSeconds: ENEMY_COOLDOWN_SECONDS, hit: true, dead: next === 0 };
  }
  function hasEscaped(player) {
    return Math.hypot(player.x - EXIT.x, player.y - EXIT.y) <= EXIT.radius + PLAYER_RADIUS - 7;
  }


  // Small deterministic walkability grid. Recompute at most once per second in the game loop.
  // 24 px cells keep the chase smart around tree trunks with no third-party pathfinder.
  function findChasePath(from, to) {
    const step = 24, origin = PADDING + PLAYER_RADIUS, side = 27, size = side * side;
    const passable = new Uint8Array(size);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      passable[y * side + x] = canOccupy(origin + x * step, origin + y * step, 22) ? 1 : 0;
    }
    function closest(point) {
      let best = -1, bestDist = Infinity;
      for (let i = 0; i < size; i++) if (passable[i]) {
        const x = origin + (i % side) * step;
        const y = origin + Math.floor(i / side) * step;
        const d = (x - point.x) ** 2 + (y - point.y) ** 2;
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best;
    }
    const start = closest(from), goal = closest(to);
    if (start < 0 || goal < 0) return [];
    const previous = new Int16Array(size);
    previous.fill(-1);
    const queue = new Int16Array(size);
    let head = 0, tail = 0;
    queue[tail++] = start; previous[start] = start;
    while (head < tail && previous[goal] < 0) {
      const here = queue[head++];
      const x = here % side, y = Math.floor(here / side);
      const neighbors = [x + 1 < side ? here + 1 : -1, x > 0 ? here - 1 : -1,
        y + 1 < side ? here + side : -1, y > 0 ? here - side : -1];
      for (const next of neighbors) {
        if (next < 0 || !passable[next] || previous[next] !== -1) continue;
        previous[next] = here;
        queue[tail++] = next;
      }
    }
    if (previous[goal] < 0) return [];
    const indices = [goal];
    for (let i = goal; i !== start; ) {
      i = previous[i];
      indices.push(i);
    }
    indices.reverse();
    return indices.slice(1).map(i => ({
      x: origin + (i % side) * step,
      y: origin + Math.floor(i / side) * step,
    }));
  }
  function dangerPhase(seconds, offset = 0, mode = "thrill") {
    const duration = mode === "explore" ? 7.0 : 5.8;
    const t = ((seconds + offset) % duration + duration) % duration;
    const warning = mode === "explore" ? 3.4 : 2.5;
    if (t < warning) return "idle";
    if (t < warning + 1.35) return "warning";
    if (t < warning + 2.2) return "active";
    return "idle";
  }
  function chaseJaguar(jaguar, player, dt, mode = "thrill") {
    const seconds = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    const dx = player.x - jaguar.x, dy = player.y - jaguar.y;
    const distance = Math.hypot(dx, dy);
    if (!seconds || distance < 1) return { ...jaguar };
    const stride = (mode === "explore" ? 126 : jaguar.speed) * seconds;
    const nx = dx / distance, ny = dy / distance;
    let x = jaguar.x, y = jaguar.y;
    // Enemies obey the same tree collision as the child character.
    if (canOccupy(x + nx * stride, y, jaguar.radius)) x += nx * stride;
    if (canOccupy(x, y + ny * stride, jaguar.radius)) y += ny * stride;
    // Predictable sidestep if the jaguar gets stuck behind a tree.
    if (Math.abs(x - jaguar.x) < .01 && Math.abs(y - jaguar.y) < .01) {
      for (const [sideX, sideY] of [[-ny, nx], [ny, -nx]]) {
        if (canOccupy(x + sideX * stride, y + sideY * stride, jaguar.radius)) {
          x += sideX * stride;
          y += sideY * stride;
          break;
        }
      }
    }
    return { ...jaguar, x, y };
  }
  function remainingTime(seconds, mode = "thrill") {
    return Math.max(0, TIME_LIMITS[mode === "explore" ? "explore" : "thrill"] - Math.floor(seconds));
  }

  function calculateScore(startingLives, livesLeft, starsPicked, timeSeconds) {
    const safeStars = clamp(Math.round(starsPicked || 0), 0, STARS.length);
    const remaining = Math.max(0, Math.floor(livesLeft || 0));
    const timeBonus = Math.max(0, 120 - Math.floor(timeSeconds || 0));
    return Math.round((100 + remaining * 20 + safeStars * 50 + timeBonus) * scoreMultiplier(startingLives));
  }
  return Object.freeze({
    SIZE, PADDING, PLAYER_RADIUS, PLAYER_SPEED, START, EXIT, OBSTACLES, ENEMIES, STARS,
    ENEMY_COOLDOWN_SECONDS, DASH_BOOST, DASH_SECONDS, DASH_COOLDOWN, TIME_LIMITS, KEY, JAGUAR, HAZARDS,
    dangerPhase, chaseJaguar, findChasePath, remainingTime, clamp, selectLives, scoreMultiplier, circleHitsRect,
    canOccupy, movePlayer, patrol, circlesTouch, resolveEnemyHit, hasEscaped, calculateScore,
  });
});
