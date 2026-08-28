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

  isWalkable(px, py) {
    if (px < 0 || py < 0 || px > this.world.w || py > this.world.h) return false;
    if (this.distToPath(px, py) <= this.pathHalfWidth) return true;
    for (const c of this.clearings) {
      if (pointInCircle(px, py, c.x, c.y, c.r)) return true;
    }
    return false;
  }

  walkableShapes() {
    return { paths: this.paths, clearings: this.clearings, halfWidth: this.pathHalfWidth };
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
    this.bluebird = null;
  }
}
