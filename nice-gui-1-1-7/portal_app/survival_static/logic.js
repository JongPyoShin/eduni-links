/* 의준 서바이벌: pure game rules shared by browser and Node tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SurvivalLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SIZE = 720; // Visible viewport; world geometry is much larger.
  const WORLD_WIDTH = 2048;
  const WORLD_HEIGHT = 1536;
  const WORLD_AREAS = Object.freeze([
    Object.freeze({ name: "이끼길 입구", x: 0, y: 1000, w: 650, h: 536 }),
    Object.freeze({ name: "나비 숲", x: 0, y: 0, w: 1010, h: 1000 }),
    Object.freeze({ name: "폭포 계곡", x: 650, y: 850, w: 1398, h: 686 }),
    Object.freeze({ name: "고대 유적", x: 1010, y: 0, w: 1038, h: 850 }),
  ]);
  const PADDING = 26;
  const PLAYER_RADIUS = 20;
  const ENEMY_COOLDOWN_SECONDS = 1.5;
  const PLAYER_SPEED = 216;
  const DASH_BOOST = 2.05;
  const DASH_SECONDS = 0.5;
  const DASH_COOLDOWN = 5;
  const TIME_LIMITS = Object.freeze({ thrill: 105, explore: 180 });
  const START = Object.freeze({ x: 124, y: 1325 });
  const EXIT = Object.freeze({ x: 1890, y: 144, radius: 38 });
  // World-scale trees and thickets leave multiple routes between clearings.
  const OBSTACLES = Object.freeze([
    Object.freeze({ x: 232, y: 1110, w: 156, h: 56 }),
    Object.freeze({ x: 492, y: 1238, w: 74, h: 165 }),
    Object.freeze({ x: 395, y: 834, w: 160, h: 77 }),
    Object.freeze({ x: 695, y: 667, w: 81, h: 183 }),
    Object.freeze({ x: 925, y: 1105, w: 206, h: 65 }),
    Object.freeze({ x: 1045, y: 374, w: 77, h: 236 }),
    Object.freeze({ x: 1250, y: 785, w: 174, h: 65 }),
    Object.freeze({ x: 1472, y: 1120, w: 100, h: 226 }),
    Object.freeze({ x: 1710, y: 515, w: 190, h: 72 }),
    Object.freeze({ x: 1730, y: 240, w: 64, h: 185 }),
    Object.freeze({ x: 310, y: 295, w: 190, h: 78 }),
    Object.freeze({ x: 631, y: 161, w: 75, h: 193 }),
    Object.freeze({ x: 1350, y: 302, w: 162, h: 71 }),
    Object.freeze({ x: 835, y: 1320, w: 123, h: 95 }),
  ]);
  const ENEMIES = Object.freeze([
    Object.freeze({ id: "monkey-south", kind: "monkey", x: 310, y: 1040, radius: 22, axis: "x", min: 270, max: 430, speed: 104, direction: 1 }),
    Object.freeze({ id: "snake-middle", kind: "snake", x: 980, y: 825, radius: 19, axis: "y", min: 750, max: 1040, speed: 113, direction: 1 }),
    Object.freeze({ id: "monkey-north", kind: "monkey", x: 1525, y: 525, radius: 22, axis: "x", min: 1480, max: 1670, speed: 115, direction: 1 }),
  ]);
  const KEY = Object.freeze({ x: 1685, y: 938, radius: 19 });
  const JAGUAR = Object.freeze({ x: 1838, y: 365, radius: 22, speed: 174, kind: "jaguar" });
  // One-use hideouts distributed across the journey, not stacked near spawn.
  const HIDE_EXIT_GRACE = 1.3;
  const HIDE_EXIT_BOOST = 0.8;
  const SEARCH_SAFE_RADIUS = 255;
  const SEARCH_AFTER_HIDE_SECONDS = 2.8;
  const SEARCH_LOCATIONS = Object.freeze([
    Object.freeze({ x: 115, y: 110 }),
    Object.freeze({ x: 1900, y: 110 }),
    Object.freeze({ x: 115, y: 1410 }),
    Object.freeze({ x: 1900, y: 1410 }),
    Object.freeze({ x: 590, y: 410 }),
    Object.freeze({ x: 1185, y: 180 }),
    Object.freeze({ x: 1150, y: 1435 }),
    Object.freeze({ x: 520, y: 1450 }),
    Object.freeze({ x: 1930, y: 810 }),
    Object.freeze({ x: 170, y: 795 }),
  ]);
  const SHELTERS = Object.freeze([
    Object.freeze({ id: "bush-start", kind: "bush", name: "덤불", x: 190, y: 1235, radius: 32, hideSeconds: 4 }),
    Object.freeze({ id: "log-grove", kind: "log", name: "통나무", x: 590, y: 1055, radius: 33, hideSeconds: 5 }),
    Object.freeze({ id: "cave-butterfly", kind: "cave", name: "동굴", x: 585, y: 580, radius: 35, hideSeconds: 6 }),
    Object.freeze({ id: "bush-mid", kind: "bush", name: "덤불", x: 1005, y: 930, radius: 31, hideSeconds: 4 }),
    Object.freeze({ id: "log-waterfall", kind: "log", name: "통나무", x: 1260, y: 1220, radius: 33, hideSeconds: 5 }),
    Object.freeze({ id: "cave-ruins", kind: "cave", name: "동굴", x: 1455, y: 540, radius: 35, hideSeconds: 6 }),
    Object.freeze({ id: "bush-key", kind: "bush", name: "덤불", x: 1800, y: 1055, radius: 32, hideSeconds: 4 }),
    Object.freeze({ id: "log-gate", kind: "log", name: "통나무", x: 1645, y: 140, radius: 33, hideSeconds: 5 }),
  ]);
  const HAZARDS = Object.freeze([
    Object.freeze({ x: 435, y: 725, radius: 41, phase: 0 }),
    Object.freeze({ x: 890, y: 985, radius: 41, phase: 2.7 }),
    Object.freeze({ x: 1400, y: 990, radius: 41, phase: 4.4 }),
    Object.freeze({ x: 1790, y: 660, radius: 41, phase: 1.2 }),
  ]);
  const STARS = Object.freeze([
    Object.freeze({ x: 230, y: 850 }),
    Object.freeze({ x: 745, y: 425 }),
    Object.freeze({ x: 1160, y: 1290 }),
    Object.freeze({ x: 1555, y: 210 }),
    Object.freeze({ x: 1920, y: 850 }),
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
    if (x - radius < PADDING || x + radius > WORLD_WIDTH - PADDING ||
        y - radius < PADDING || y + radius > WORLD_HEIGHT - PADDING) return false;
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
    const step = 24, origin = PADDING + PLAYER_RADIUS;
    const cols = Math.floor((WORLD_WIDTH - 2 * origin) / step) + 1;
    const rows = Math.floor((WORLD_HEIGHT - 2 * origin) / step) + 1;
    const size = cols * rows;
    const passable = new Uint8Array(size);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      passable[y * cols + x] = canOccupy(origin + x * step, origin + y * step, 22) ? 1 : 0;
    }
    function closest(point) {
      let best = -1, bestDist = Infinity;
      for (let i = 0; i < size; i++) if (passable[i]) {
        const x = origin + (i % cols) * step;
        const y = origin + Math.floor(i / cols) * step;
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
      const x = here % cols, y = Math.floor(here / cols);
      const neighbors = [x + 1 < cols ? here + 1 : -1, x > 0 ? here - 1 : -1,
        y + 1 < rows ? here + cols : -1, y > 0 ? here - cols : -1];
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
      x: origin + (i % cols) * step,
      y: origin + Math.floor(i / cols) * step,
    }));
  }

  function nearbyShelter(player, shelters, maxDistance = 46) {
    return shelters.find(shelter =>
      shelter.status === "available" &&
      Math.hypot(player.x - shelter.x, player.y - shelter.y) <= maxDistance) || null;
  }
  function hideCountdown(current, elapsed) {
    const next = Math.max(0, current - clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, 0.05));
    return { remaining: next, expired: next <= 0 };
  }
  function cameraFor(player) {
    return { x: clamp(player.x - SIZE / 2, 0, WORLD_WIDTH - SIZE),
      y: clamp(player.y - SIZE / 2, 0, WORLD_HEIGHT - SIZE) };
  }
  function areaFor(point) {
    const area = WORLD_AREAS.find(a =>
      point.x >= a.x && point.x < a.x + a.w && point.y >= a.y && point.y < a.y + a.h);
    return area ? area.name : "깊은 정글";
  }
  function searchTarget(shelter, round, enemyIndex) {
    // Deliberately scatter enemies to distant, traversable map regions.
    // Keep the destination stable for the whole hiding round, including the
    // post-hide grace period; enemies may not instantly re-acquire the player.
    const distance = point => Math.hypot(point.x - shelter.x, point.y - shelter.y);
    const choices = SEARCH_LOCATIONS.filter(point =>
      canOccupy(point.x, point.y, 22) && distance(point) >= SEARCH_SAFE_RADIUS)
      .sort((a, b) => distance(b) - distance(a));
    if (!choices.length) {
      return SEARCH_LOCATIONS.filter(point => canOccupy(point.x, point.y, 22))
        .sort((a, b) => distance(b) - distance(a))[0] || { ...shelter };
    }
    const sector = Math.max(0, Math.floor(Number.isFinite(enemyIndex) ? enemyIndex : 0));
    const offset = Math.max(0, Math.floor(Number.isFinite(round) ? round : 0));
    return choices[(sector + offset) % Math.min(choices.length, 4)];
  }
  function hideStateStart(shelter) {
    return { shelterId: shelter.id, remaining: shelter.hideSeconds, max: shelter.hideSeconds };
  }
  function hideStateEnd(invulnerable, boost) {
    return { invulnerable: Math.max(invulnerable, HIDE_EXIT_GRACE),
      boost: Math.max(boost, HIDE_EXIT_BOOST) };
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
    const stride = (mode === "explore" ? jaguar.speed * (126 / 174) : jaguar.speed) * seconds;
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
    SIZE, WORLD_WIDTH, WORLD_HEIGHT, WORLD_AREAS, cameraFor, areaFor, PADDING, PLAYER_RADIUS, PLAYER_SPEED, START, EXIT, OBSTACLES, ENEMIES, STARS,
    ENEMY_COOLDOWN_SECONDS, DASH_BOOST, DASH_SECONDS, DASH_COOLDOWN, TIME_LIMITS, KEY, JAGUAR, HAZARDS,
    SHELTERS, HIDE_EXIT_GRACE, HIDE_EXIT_BOOST, SEARCH_SAFE_RADIUS, SEARCH_AFTER_HIDE_SECONDS,
    SEARCH_LOCATIONS, nearbyShelter, hideCountdown, hideStateStart, hideStateEnd, searchTarget,
    dangerPhase, chaseJaguar, findChasePath, remainingTime, clamp, selectLives, scoreMultiplier, circleHitsRect,
    canOccupy, movePlayer, patrol, circlesTouch, resolveEnemyHit, hasEscaped, calculateScore,
  });
});
