(() => {
  'use strict';

  const bank = window.EDUNI_SPACE_BANK;
  if (!bank) throw new Error('EDUNI spatial bank must load before spatial guard');

  const makeRng = (seed) => {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const mapKey = (matrix) => matrix.map((row) => row.join('')).join('|');
  const occupancyKey = (matrix) => matrix.map((row) => row.map((value) => value > 0 ? 1 : 0).join('')).join('|');

  function hasProjectedColumnCollision(matrix) {
    const projectionColumns = new Set();
    for (let r = 0; r < matrix.length; r += 1) {
      for (let c = 0; c < matrix[r].length; c += 1) {
        if (matrix[r][c] <= 0) continue;
        const projectedColumn = c - r;
        if (projectionColumns.has(projectedColumn)) return true;
        projectionColumns.add(projectedColumn);
      }
    }
    return false;
  }

  function hasSolidTwoByTwo(matrix) {
    for (let r = 0; r < matrix.length - 1; r += 1) {
      for (let c = 0; c < matrix[r].length - 1; c += 1) {
        if (matrix[r][c] > 0 && matrix[r + 1][c] > 0 && matrix[r][c + 1] > 0 && matrix[r + 1][c + 1] > 0) return true;
      }
    }
    return false;
  }

  function isVisuallyUnambiguousMap(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 3 || matrix.some((row) => !Array.isArray(row) || row.length !== 3)) return false;
    if (matrix.some((row) => row.some((height) => !Number.isInteger(height) || height < 0 || height > 2))) return false;
    const occupied = matrix.flat().filter((height) => height > 0).length;
    if (occupied < 4 || occupied > 5) return false;
    return !hasProjectedColumnCollision(matrix) && !hasSolidTwoByTwo(matrix);
  }

  const diagonalCells = [
    [[2,0]],
    [[1,0],[2,1]],
    [[0,0],[1,1],[2,2]],
    [[0,1],[1,2]],
    [[0,2]],
  ];

  function clearHeightMapFromSeed(seed, projectionMode) {
    const rng = makeRng(seed * 191 + (projectionMode ? 73 : 37));
    const map = Array.from({length:3}, () => Array(3).fill(0));
    const wanted = rng() < .58 ? 4 : 5;
    const order = [0,1,2,3,4];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.slice(0,wanted).forEach((diagonalIndex) => {
      const cells = diagonalCells[diagonalIndex];
      const [r,c] = cells[Math.floor(rng() * cells.length)];
      map[r][c] = rng() < (projectionMode ? .38 : .52) ? 2 : 1;
    });
    if (!map.some((row) => row.some((height) => height === 2))) {
      outer: for (let r = 0; r < 3; r += 1) {
        for (let c = 0; c < 3; c += 1) {
          if (map[r][c] > 0) { map[r][c] = 2; break outer; }
        }
      }
    }
    return map;
  }

  function refill(pool, count, startSeed, projectionMode, keyFn) {
    const filtered = pool.filter(isVisuallyUnambiguousMap);
    const seen = new Set(filtered.map(keyFn));
    let seed = startSeed;
    let guard = 0;
    while (filtered.length < count && guard < 20000) {
      guard += 1;
      const candidate = clearHeightMapFromSeed(seed, projectionMode);
      seed += 1;
      if (!isVisuallyUnambiguousMap(candidate)) continue;
      const key = keyFn(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      filtered.push(candidate);
    }
    if (filtered.length !== count) throw new Error(`EDUNI spatial clarity refill failed: ${filtered.length}/${count}`);
    pool.splice(0, pool.length, ...filtered.slice(0,count));
  }

  refill(bank.countMaps, 50, 41001, false, mapKey);
  refill(bank.projectionMaps, 50, 51001, true, occupancyKey);

  window.EDUNI_SPACE_SPATIAL_AUDIT = Object.freeze({
    count:bank.countMaps.length,
    projection:bank.projectionMaps.length,
    collisionRule:'unique c-r projection column',
    audited:true,
  });
})();
