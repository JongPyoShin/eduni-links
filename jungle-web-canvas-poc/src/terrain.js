import { WaterfallWorldGeometry } from "./geometry.js";

const WORLD_W = 1600;
const WORLD_H = 1080;
const SAMPLING_RESOLUTION = 20;

const TERRAIN_PADDING = 100;
const MIN_HEIGHT = 0.0;
const MAX_HEIGHT = 3.5;
const ENTRY_HEIGHT = 0.15;
const LOOKOUT_HEIGHT = 2.8;

const TERRAIN_MIN_X = -TERRAIN_PADDING;
const TERRAIN_MAX_X = WORLD_W + TERRAIN_PADDING;
const TERRAIN_MIN_Y = -TERRAIN_PADDING;
const TERRAIN_MAX_Y = WORLD_H + TERRAIN_PADDING;

const GRID_W = Math.ceil((TERRAIN_MAX_X - TERRAIN_MIN_X) / SAMPLING_RESOLUTION) + 1;
const GRID_H = Math.ceil((TERRAIN_MAX_Y - TERRAIN_MIN_Y) / SAMPLING_RESOLUTION) + 1;

const geometry = new WaterfallWorldGeometry();
const ROUTE = geometry.paths[0] || [];
const CLEARINGS = geometry.clearings;

function buildHeightField() {
  const field = new Float32Array(GRID_W * GRID_H);
  const routeSegments = [];
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const a = ROUTE[i];
    const b = ROUTE[i + 1];
    routeSegments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }

  for (let gy = 0; gy < GRID_H; gy++) {
    const y = TERRAIN_MIN_Y + gy * SAMPLING_RESOLUTION;
    for (let gx = 0; gx < GRID_W; gx++) {
      const x = TERRAIN_MIN_X + gx * SAMPLING_RESOLUTION;
      let h = baseHeightAt(x, y);
      h = applyRouteInfluence(h, x, y, routeSegments);
      h = applyClearingInfluence(h, x, y);
      h = applyWaterfallInfluence(h, x, y);
      h = applyLookoutInfluence(h, x, y);
      field[gy * GRID_W + gx] = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h));
    }
  }
  return field;
}

const HEIGHT_FIELD = buildHeightField();

function baseHeightAt(x, y) {
  const ny = (y - TERRAIN_MIN_Y) / (TERRAIN_MAX_Y - TERRAIN_MIN_Y);
  return MIN_HEIGHT + ny * 0.3;
}

function applyRouteInfluence(h, x, y, segments) {
  let minDist = Infinity;
  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      minDist = Math.min(minDist, Math.hypot(x - seg.x1, y - seg.y1));
      continue;
    }
    let t = ((x - seg.x1) * dx + (y - seg.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = seg.x1 + t * dx;
    const cy = seg.y1 + t * dy;
    const d = Math.hypot(x - cx, y - cy);
    if (d < minDist) minDist = d;
  }
  const hw = geometry.pathHalfWidth;
  const routeWidth = hw * 1.5;
  if (minDist < routeWidth) {
    const factor = 1 - minDist / routeWidth;
    h += factor * 0.08;
  }
  return h;
}

function applyClearingInfluence(h, x, y) {
  for (const c of CLEARINGS) {
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < c.r) {
      const factor = 1 - d / c.r;
      if (c.label.includes("Entrance") || c.label.includes("Gate")) {
        h = Math.max(h, ENTRY_HEIGHT + factor * 0.05);
      } else if (c.label.includes("Lookout")) {
        h = Math.max(h, LOOKOUT_HEIGHT * (0.6 + factor * 0.4));
      } else {
        h = Math.max(h, h + factor * 0.15);
      }
    }
  }
  return h;
}

function applyWaterfallInfluence(h, x, y) {
  const wx = 1170;
  const wy = 260;
  const d = Math.hypot(x - wx, y - wy);
  const fallRadius = 300;
  if (d < fallRadius) {
    const factor = 1 - d / fallRadius;
    const cliffHeight = 2.2 + factor * 1.0;
    h = Math.max(h, cliffHeight);
  }
  const basinX = 1050;
  const basinY = 535;
  const basinD = Math.hypot(x - basinX, y - basinY);
  if (basinD < 500) {
    const factor = 1 - basinD / 500;
    h = Math.min(h, factor * 0.2);
  }
  return h;
}

function applyLookoutInfluence(h, x, y) {
  const lx = 1450;
  const ly = 330;
  const d = Math.hypot(x - lx, y - ly);
  const radius = 250;
  if (d < radius) {
    const factor = 1 - d / radius;
    const lookoutBase = LOOKOUT_HEIGHT * (0.7 + factor * 0.3);
    h = Math.max(h, lookoutBase);
  }
  return h;
}

export function sampleHeight(x, y) {
  if (x < TERRAIN_MIN_X || x > TERRAIN_MAX_X || y < TERRAIN_MIN_Y || y > TERRAIN_MAX_Y) {
    return MIN_HEIGHT;
  }
  const gx = (x - TERRAIN_MIN_X) / SAMPLING_RESOLUTION;
  const gy = (y - TERRAIN_MIN_Y) / SAMPLING_RESOLUTION;
  const ix0 = Math.floor(gx);
  const iy0 = Math.floor(gy);
  const ix1 = Math.min(ix0 + 1, GRID_W - 1);
  const iy1 = Math.min(iy0 + 1, GRID_H - 1);
  const tx = gx - ix0;
  const ty = gy - iy0;
  const h00 = HEIGHT_FIELD[iy0 * GRID_W + ix0];
  const h10 = HEIGHT_FIELD[iy0 * GRID_W + ix1];
  const h01 = HEIGHT_FIELD[iy1 * GRID_W + ix0];
  const h11 = HEIGHT_FIELD[iy1 * GRID_W + ix1];
  const h0 = h00 + (h10 - h00) * tx;
  const h1 = h01 + (h11 - h01) * tx;
  return h0 + (h1 - h0) * ty;
}

export function sampleNormal(x, y, eps = 0.5) {
  const hx = sampleHeight(x + eps, y) - sampleHeight(x - eps, y);
  const hy = sampleHeight(x, y + eps) - sampleHeight(x, y - eps);
  const len = Math.hypot(hx, hy, 2 * eps);
  if (len === 0) return { x: 0, y: 1, z: 0 };
  return { x: -hx / len, y: 2 * eps / len, z: -hy / len };
}

export function generateTerrainMesh(segmentsX = 160, segmentsY = 108) {
  const vertices = [];
  const uvs = [];
  const indices = [];
  const normals = [];

  const worldMinX = TERRAIN_MIN_X;
  const worldMaxX = TERRAIN_MAX_X;
  const worldMinY = TERRAIN_MIN_Y;
  const worldMaxY = TERRAIN_MAX_Y;

  for (let gy = 0; gy <= segmentsY; gy++) {
    const y = worldMinY + (gy / segmentsY) * (worldMaxY - worldMinY);
    const v = gy / segmentsY;
    for (let gx = 0; gx <= segmentsX; gx++) {
      const x = worldMinX + (gx / segmentsX) * (worldMaxX - worldMinX);
      const u = gx / segmentsX;
      const h = sampleHeight(x, y);
      const n = sampleNormal(x, y);
      vertices.push(
        (x - WORLD_W / 2) * 0.01,
        h,
        (y - WORLD_H / 2) * 0.01
      );
      uvs.push(u, v);
      normals.push(n.x, n.y, n.z);
    }
  }

  for (let gy = 0; gy < segmentsY; gy++) {
    for (let gx = 0; gx < segmentsX; gx++) {
      const a = gy * (segmentsX + 1) + gx;
      const b = gy * (segmentsX + 1) + gx + 1;
      const c = (gy + 1) * (segmentsX + 1) + gx;
      const d = (gy + 1) * (segmentsX + 1) + gx + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return { vertices, uvs, indices, normals };
}

export function getTerrainInfo() {
  return {
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
    entryHeight: ENTRY_HEIGHT,
    lookoutHeight: LOOKOUT_HEIGHT,
    samplingResolution: SAMPLING_RESOLUTION,
    gridWidth: GRID_W,
    gridHeight: GRID_H,
    worldWidth: WORLD_W,
    worldHeight: WORLD_H,
  };
}

export function validateTerrainMesh(mesh) {
  const { vertices } = mesh;
  let finite = true;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 1; i < vertices.length; i += 3) {
    const y = vertices[i];
    if (!Number.isFinite(y)) finite = false;
    if (y < minZ) minZ = y;
    if (y > maxZ) maxZ = y;
  }
  return { finite, minHeight: minZ, maxHeight: maxZ, vertexCount: vertices.length / 3 };
}