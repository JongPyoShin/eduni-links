const MAX_SLOPE = Math.PI / 6;
const MAX_STEP_HEIGHT = 0.2;

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq)) : 0;
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}

function normalized(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  return { x: x / length, y: y / length, z: z / length };
}

function pointSegmentDistanceSq(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq)) : 0;
  return (px - ax - t * dx) ** 2 + (pz - az - t * dz) ** 2;
}

const SURFACE_COLORS = {
  'river-meadow': { grass:[.22,.39,.17], dirt:[.48,.31,.17], water:[.15,.42,.52] },
  camp: { grass:[.22,.39,.17], dirt:[.48,.31,.17], water:[.15,.42,.52] },
  waterfall: { grass:[.26,.39,.35], dirt:[.43,.35,.27], water:[.18,.48,.58] },
  cave: { grass:[.34,.31,.39], dirt:[.43,.36,.34], water:[.24,.39,.51] },
  'giant-tree': { grass:[.31,.37,.16], dirt:[.45,.31,.17], water:[.15,.42,.52] },
  'sky-ridge': { grass:[.39,.53,.62], dirt:[.49,.45,.36], water:[.34,.53,.65] },
};

function colorForSurface(surface, seed, props = 'river-meadow') {
  const jitter = ((seed * 1103515245 + 12345) >>> 16 & 255) / 255;
  if (props === 'river' || props === 'river-meadow') {
    if (surface === 'water') return [0.15 + jitter * 0.018, 0.42 + jitter * 0.03, 0.52 + jitter * 0.03];
    if (surface === 'dirt') return [0.48 + jitter * 0.035, 0.31 + jitter * 0.025, 0.17 + jitter * 0.02];
    return [0.22 + jitter * 0.025, 0.39 + jitter * 0.035, 0.17 + jitter * 0.025];
  }
  const theme = SURFACE_COLORS[props] || SURFACE_COLORS['river-meadow'];
  const base = theme[surface] || theme.grass;
  const scale = surface === 'water' ? .018 : .035;
  return base.map((channel, index) => channel + jitter * scale * (index === 1 ? 1.25 : 1));
}

export function createWorld(region) {
  const { minX, maxX, minZ, maxZ } = region.bounds;
  const cellSize = region.cellSize;
  if (!(cellSize > 0) || !(maxX > minX) || !(maxZ > minZ)) throw new TypeError("Invalid region bounds or cellSize");
  const columns = Math.round((maxX - minX) / cellSize);
  const rows = Math.round((maxZ - minZ) / cellSize);
  if (Math.abs(minX + columns * cellSize - maxX) > 1e-7 || Math.abs(minZ + rows * cellSize - maxZ) > 1e-7) {
    throw new TypeError("Region bounds must align to cellSize");
  }
  const vertexRows = rows + 1;
  const vertexColumns = columns + 1;
  const vertexHeight = new Float32Array(vertexRows * vertexColumns);
  const vertexAt = (row, column) => vertexHeight[row * vertexColumns + column];
  const trailSegments = [region.trail, ...(region.trails || [])]
    .filter((path) => path?.points?.length > 1)
    .flatMap((path) => path.points.slice(1).map((point, index) => ({
      a: path.points[index], b: point, halfWidth: (path.width || 0) / 2,
    })));
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const x = minX + column * cellSize;
      const z = minZ + row * cellSize;
      const height = region.heightAtVertex ? region.heightAtVertex(x, z) : 0;
      vertexHeight[row * vertexColumns + column] = finite(height);
    }
  }

  const cells = new Array(rows * columns);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = minX + (column + 0.5) * cellSize;
      const z = minZ + (row + 0.5) * cellSize;
      const isWater = Boolean(region.water && z < region.water.edgeZ);
      const onTrail = trailSegments.some(({ a, b, halfWidth }) => distanceToSegment(x, z, a, b) <= halfWidth);
      const surface = isWater ? "water" : onTrail ? "dirt" : "grass";
      cells[row * columns + column] = { surface, walkable: !isWater };
    }
  }
  const cellHeight = (cellRow, cellColumn, vertexRow, vertexColumn) => {
    const depth = cells[cellRow * columns + cellColumn].surface === "water" ? finite(region.water?.bedDepth, 0.55) : 0;
    return vertexAt(vertexRow, vertexColumn) - depth;
  };

  const positions = new Float32Array(rows * columns * 4 * 3);
  const colors = new Float32Array(positions.length);
  const indices = new Uint32Array(rows * columns * 6);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const cell = row * columns + column;
      const base = cell * 4;
      const x0 = minX + column * cellSize;
      const z0 = minZ + row * cellSize;
      const points = [
        [x0, cellHeight(row, column, row, column), z0],
        [x0 + cellSize, cellHeight(row, column, row, column + 1), z0],
        [x0 + cellSize, cellHeight(row, column, row + 1, column + 1), z0 + cellSize],
        [x0, cellHeight(row, column, row + 1, column), z0 + cellSize],
      ];
      const color = colorForSurface(cells[cell].surface, cell, region.props);
      for (let i = 0; i < 4; i += 1) {
        positions.set(points[i], (base + i) * 3);
        colors.set(color, (base + i) * 3);
      }
      const index = cell * 6;
      // Fixed 00→11 diagonal, with both triangles wound toward +Y.
      indices.set([base, base + 2, base + 1, base, base + 3, base + 2], index);
    }
  }

  function locate(x, z) {
    if (x < minX - 1e-8 || x > maxX + 1e-8 || z < minZ - 1e-8 || z > maxZ + 1e-8) return null;
    const column = Math.min(columns - 1, Math.max(0, Math.floor((x - minX) / cellSize)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((z - minZ) / cellSize)));
    return { column, row, u: Math.max(0, Math.min(1, (x - (minX + column * cellSize)) / cellSize)), v: Math.max(0, Math.min(1, (z - (minZ + row * cellSize)) / cellSize)) };
  }

  function sampleSurface(x, z) {
    const point = locate(x, z);
    if (!point) return null;
    const { row, column, u, v } = point;
    const cell = cells[row * columns + column];
    const h00 = cellHeight(row, column, row, column);
    const h10 = cellHeight(row, column, row, column + 1);
    const h11 = cellHeight(row, column, row + 1, column + 1);
    const h01 = cellHeight(row, column, row + 1, column);
    let height;
    let normal;
    if (v <= u) {
      height = (1 - u) * h00 + (u - v) * h10 + v * h11;
      normal = normalized(-cellSize * (h10 - h00), cellSize * cellSize, -cellSize * (h11 - h10));
    } else {
      height = (1 - v) * h00 + u * h11 + (v - u) * h01;
      normal = normalized(cellSize * (h01 - h11), cellSize * cellSize, -cellSize * (h01 - h00));
    }
    return { height, normal, surface: cell.surface, walkable: cell.walkable };
  }

  function circleOverlapsCell(x, z, radius, column, row) {
    const x0 = minX + column * cellSize;
    const z0 = minZ + row * cellSize;
    const nearestX = Math.max(x0, Math.min(x0 + cellSize, x));
    const nearestZ = Math.max(z0, Math.min(z0 + cellSize, z));
    return (x - nearestX) ** 2 + (z - nearestZ) ** 2 <= radius * radius + 1e-10;
  }

  function canStand(x, z, radius = 0) {
    radius = Math.max(0, finite(radius));
    if (x - radius < minX - 1e-8 || x + radius > maxX + 1e-8 || z - radius < minZ - 1e-8 || z + radius > maxZ + 1e-8) return false;
    const center = sampleSurface(x, z);
    if (!center || !center.walkable) return false;
    for (const obstacle of region.obstacles || []) {
      if ((x - obstacle.x) ** 2 + (z - obstacle.z) ** 2 <= (radius + Math.max(0, obstacle.radius)) ** 2 + 1e-10) return false;
    }

    const minColumn = Math.max(0, Math.floor((x - radius - minX) / cellSize));
    const maxColumn = Math.min(columns - 1, Math.floor((x + radius - minX) / cellSize));
    const minRow = Math.max(0, Math.floor((z - radius - minZ) / cellSize));
    const maxRow = Math.min(rows - 1, Math.floor((z + radius - minZ) / cellSize));
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const cell = cells[row * columns + column];
        if (!cell.walkable && circleOverlapsCell(x, z, radius, column, row)) return false;
      }
    }

    let minHeight = center.height;
    let maxHeight = center.height;
    const ringStep = Math.max(0.08, Math.min(cellSize / 4, radius || cellSize / 4));
    const rings = radius > 0 ? Math.ceil(radius / ringStep) : 0;
    for (let ring = 0; ring <= rings; ring += 1) {
      const ringRadius = rings ? radius * ring / rings : 0;
      const count = ring === 0 ? 1 : Math.max(8, Math.ceil(2 * Math.PI * ringRadius / ringStep));
      for (let i = 0; i < count; i += 1) {
        const angle = 2 * Math.PI * i / count;
        const sample = sampleSurface(x + Math.cos(angle) * ringRadius, z + Math.sin(angle) * ringRadius);
        if (!sample || !sample.walkable || sample.normal.y < Math.cos(MAX_SLOPE)) return false;
        minHeight = Math.min(minHeight, sample.height);
        maxHeight = Math.max(maxHeight, sample.height);
      }
    }
    return maxHeight - minHeight <= MAX_STEP_HEIGHT + 2 * radius * Math.tan(MAX_SLOPE) + 1e-8;
  }

  function clearSegment(from, to, radius) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const distance = Math.hypot(dx, dz);
    const sampleStep = cellSize / 8;
    const steps = Math.max(1, Math.ceil(distance / sampleStep));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      if (!canStand(from.x + dx * t, from.z + dz * t, radius)) return false;
    }
    for (const obstacle of region.obstacles || []) {
      const combined = radius + Math.max(0, obstacle.radius);
      if (pointSegmentDistanceSq(obstacle.x, obstacle.z, from.x, from.z, to.x, to.z) < combined * combined - 1e-10) return false;
    }
    return true;
  }

  function resolveMove(position, delta, radius = 0) {
    const start = { x: finite(position?.x), z: finite(position?.z) };
    const dx = finite(delta?.x);
    const dz = finite(delta?.z);
    const distance = Math.hypot(dx, dz);
    const maxStep = Math.min(cellSize / 8, radius > 0 ? radius / 2 : cellSize / 8);
    const steps = distance ? Math.max(1, Math.ceil(distance / maxStep)) : 0;
    let current = start;
    let movedDistance = 0;
    const attempt = (moveX, moveZ) => {
      if (!moveX && !moveZ) return false;
      const next = { x: current.x + moveX, z: current.z + moveZ };
      if (!clearSegment(current, next, radius)) return false;
      movedDistance += Math.hypot(next.x - current.x, next.z - current.z);
      current = next;
      return true;
    };
    for (let step = 0; step < steps; step += 1) {
      const stepX = dx / steps;
      const stepZ = dz / steps;
      if (attempt(stepX, stepZ)) continue;
      if (Math.abs(stepX) >= Math.abs(stepZ)) {
        if (!attempt(stepX, 0)) attempt(0, stepZ);
      } else if (!attempt(0, stepZ)) {
        attempt(stepX, 0);
      }
    }
    const surface = sampleSurface(current.x, current.z);
    return { position: current, groundY: surface?.height ?? finite(position?.groundY), movedDistance };
  }

  return {
    region,
    meshData: { positions, indices, colors },
    sampleSurface,
    canStand,
    resolveMove,
  };
}
