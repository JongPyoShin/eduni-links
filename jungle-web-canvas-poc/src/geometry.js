import { WORLD, BLUEBIRD } from "./constants.js";

export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function pointInCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) <= r;
}

export class CampWorldGeometry {
  constructor() {
    this.world = { w: WORLD.WIDTH, h: WORLD.HEIGHT };
    this.pathHalfWidth = 72;
    this.paths = [
      [
        { x: 200, y: 1040 },
        { x: 200, y: 620 },
        { x: 520, y: 620 },
        { x: 520, y: 320 },
        { x: 920, y: 320 },
        { x: 920, y: 820 },
        { x: 1300, y: 820 },
        { x: 1300, y: 420 },
      ],
    ];
    this.clearings = [
      { x: 200, y: 1040, r: 130, label: "Camp Entrance" },
      { x: 520, y: 320, r: 150, label: "Tent" },
      { x: 920, y: 820, r: 140, label: "Fire Pit" },
      { x: 1300, y: 420, r: 140, label: "Ridge Lookout" },
    ];
    // Solid landmarks/props share the same logical coordinates as the Three Camp
    // presentation. Collision stays conservative so the route and interaction
    // edges remain reachable while visible solid centers cannot be crossed.
    this.blockers = [
      { x: 455, y: 320, r: 58, label: "Learning Hut" },
      { x: 990, y: 900, r: 42, label: "Fire Pit" },
      { x: 300, y: 1010, r: 28, label: "Entrance Cypress" },
      { x: 350, y: 690, r: 30, label: "Trail Rock" },
      { x: 610, y: 430, r: 34, label: "Hut Boulder" },
      { x: 1360, y: 680, r: 36, label: "Ridge Boulder" },
    ];
    this.bluebird = {
      x: BLUEBIRD.WORLD.x,
      y: BLUEBIRD.WORLD.y,
      r: 46,
    };
  }

  distToPath(px, py) {
    let best = Infinity;
    for (const poly of this.paths) {
      for (let i = 0; i < poly.length - 1; i++) {
        const d = distToSegment(px, py, poly[i].x, poly[i].y, poly[i + 1].x, poly[i + 1].y);
        if (d < best) best = d;
      }
    }
    return best;
  }

  isBlocked(px, py) {
    return this.blockers.some((blocker) => pointInCircle(px, py, blocker.x, blocker.y, blocker.r));
  }

  isWalkable(px, py) {
    if (px < 0 || py < 0 || px > this.world.w || py > this.world.h) return false;
    let insideWalkableShape = this.distToPath(px, py) <= this.pathHalfWidth;
    if (!insideWalkableShape) {
      insideWalkableShape = this.clearings.some((c) => pointInCircle(px, py, c.x, c.y, c.r));
    }
    return insideWalkableShape && !this.isBlocked(px, py);
  }

  walkableShapes() {
    return { paths: this.paths, clearings: this.clearings, blockers: this.blockers, halfWidth: this.pathHalfWidth };
  }
}

export class WaterfallWorldGeometry extends CampWorldGeometry {
  constructor() {
    super();
    this.paths = [[
      { x: 200, y: 1040 }, { x: 460, y: 900 }, { x: 700, y: 900 },
      { x: 900, y: 760 }, { x: 1080, y: 700 }, { x: 1170, y: 560 },
      { x: 1020, y: 480 }, { x: 1250, y: 470 }, { x: 1450, y: 330 },
    ]];
    this.clearings = [
      { x: 200, y: 1040, r: 130, label: "Waterfall Entrance" },
      { x: 700, y: 900, r: 130, label: "Stream Gate" },
      { x: 1170, y: 560, r: 120, label: "Waterfall Basin" },
      { x: 1450, y: 330, r: 140, label: "Waterfall Lookout" },
    ];
    this.blockers = [];
    this.bluebird = null;
  }
}

export class CaveWorldGeometry extends CampWorldGeometry {
  constructor() {
    super();
    this.paths = [[
      { x: 200, y: 1040 }, { x: 420, y: 930 }, { x: 620, y: 860 },
      { x: 780, y: 700 }, { x: 930, y: 600 }, { x: 1080, y: 520 },
      { x: 1260, y: 460 }, { x: 1420, y: 340 },
    ]];
    this.clearings = [
      { x: 200, y: 1040, r: 130, label: "Cave Entrance Trail" },
      { x: 420, y: 930, r: 125, label: "Cave Gate" },
      { x: 1080, y: 520, r: 145, label: "Firefly Chamber" },
      { x: 1260, y: 460, r: 125, label: "Crystal Bridge" },
      { x: 1420, y: 340, r: 135, label: "Bat Roost" },
    ];
    this.blockers = [];
    this.bluebird = null;
  }
}

export class GiantTreeWorldGeometry extends CampWorldGeometry {
  constructor() {
    super();
    this.paths = [[
      { x: 200, y: 1040 }, { x: 430, y: 930 }, { x: 650, y: 830 },
      { x: 820, y: 690 }, { x: 980, y: 570 }, { x: 1110, y: 500 },
      { x: 1290, y: 430 }, { x: 1440, y: 320 },
    ]];
    this.clearings = [
      { x: 200, y: 1040, r: 130, label: "Giant Tree Approach" },
      { x: 430, y: 930, r: 130, label: "Root Gate" },
      { x: 980, y: 570, r: 125, label: "Hollow Trunk" },
      { x: 1110, y: 500, r: 145, label: "Tree Ring Gallery" },
      { x: 1290, y: 430, r: 130, label: "Canopy Stairs" },
      { x: 1440, y: 320, r: 135, label: "Squirrel Canopy" },
    ];
    this.blockers = [];
    this.bluebird = null;
  }
}

export class SkyRidgeWorldGeometry extends CampWorldGeometry {
  constructor() {
    super();
    this.paths = [[
      { x: 200, y: 1040 }, { x: 430, y: 930 }, { x: 650, y: 820 },
      { x: 830, y: 690 }, { x: 1000, y: 560 }, { x: 1130, y: 490 },
      { x: 1300, y: 420 }, { x: 1450, y: 310 },
    ]];
    this.clearings = [
      { x: 200, y: 1040, r: 130, label: "Sky Ridge Approach" },
      { x: 430, y: 930, r: 130, label: "Sky Gate" },
      { x: 1000, y: 560, r: 125, label: "Wind Chime Shelf" },
      { x: 1130, y: 490, r: 145, label: "Star Pattern Terrace" },
      { x: 1300, y: 420, r: 130, label: "Summit Bridge" },
      { x: 1450, y: 310, r: 140, label: "Hawk Summit" },
    ];
    this.blockers = [];
    this.bluebird = null;
  }
}
