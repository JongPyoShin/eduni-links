(() => {
  'use strict';

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

  const clone = (matrix) => matrix.map((row) => [...row]);
  const key = (matrix) => matrix.map((row) => row.join('')).join('|');
  const rotate90 = (matrix) => {
    const n = matrix.length;
    return matrix.map((row, r) => row.map((_, c) => matrix[n - 1 - c][r]));
  };
  const flipX = (matrix) => matrix.map((row) => [...row].reverse());
  const flipY = (matrix) => [...matrix].reverse().map((row) => [...row]);

  function connectedCells(seed, target, size) {
    const rng = makeRng(seed);
    const cells = [];
    const used = new Set();
    const startR = 1 + Math.floor(rng() * Math.max(1, size - 2));
    const startC = 1 + Math.floor(rng() * Math.max(1, size - 2));
    cells.push([startR, startC]);
    used.add(`${startR},${startC}`);
    const directions = [[-1,0],[1,0],[0,-1],[0,1]];
    let guard = 0;
    while (cells.length < target && guard < 300) {
      guard += 1;
      const [r, c] = cells[Math.floor(rng() * cells.length)];
      const [dr, dc] = directions[Math.floor(rng() * directions.length)];
      const nr = r + dr;
      const nc = c + dc;
      const cellKey = `${nr},${nc}`;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || used.has(cellKey)) continue;
      used.add(cellKey);
      cells.push([nr, nc]);
    }
    return cells;
  }

  function shapeFromSeed(seed) {
    const rng = makeRng(seed * 37 + 11);
    const matrix = Array.from({length:4}, () => Array(4).fill(0));
    const target = 5 + Math.floor(rng() * 3);
    const cells = connectedCells(seed * 97 + 3, target, 4);
    cells.forEach(([r, c]) => { matrix[r][c] = 1; });
    const marker = cells[Math.floor(rng() * cells.length)];
    if (marker) matrix[marker[0]][marker[1]] = 2;
    return matrix;
  }

  function shapeIsUseful(matrix) {
    const variants = new Set();
    let rotated = clone(matrix);
    for (let turn = 0; turn < 4; turn += 1) {
      variants.add(key(rotated));
      variants.add(key(flipX(rotated)));
      rotated = rotate90(rotated);
    }
    return variants.size >= 6 && key(matrix) !== key(flipX(matrix)) && key(matrix) !== key(flipY(matrix));
  }

  function heightMapFromSeed(seed, projectionMode = false) {
    const rng = makeRng(seed * 53 + 19);
    const matrix = Array.from({length:3}, () => Array(3).fill(0));
    const target = projectionMode ? 4 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 4);
    const cells = connectedCells(seed * 131 + 7, target, 3);
    cells.forEach(([r, c]) => {
      matrix[r][c] = rng() < (projectionMode ? 0.45 : 0.52) ? 2 : 1;
    });
    if (!matrix.some((row) => row.some((height) => height === 2)) && cells.length) {
      const [r, c] = cells[Math.floor(rng() * cells.length)];
      matrix[r][c] = 2;
    }
    return matrix;
  }

  function occupancyKey(matrix) {
    return matrix.map((row) => row.map((height) => height > 0 ? 1 : 0).join('')).join('|');
  }

  function buildUnique(count, startSeed, factory, keyFn, validator = () => true) {
    const out = [];
    const seen = new Set();
    let seed = startSeed;
    let guard = 0;
    while (out.length < count && guard < 20000) {
      guard += 1;
      const item = factory(seed);
      seed += 1;
      if (!validator(item)) continue;
      const itemKey = keyFn(item);
      if (seen.has(itemKey)) continue;
      seen.add(itemKey);
      out.push(item);
    }
    if (out.length !== count) throw new Error(`EDUNI question bank generation failed: ${out.length}/${count}`);
    return out;
  }

  const shapes = buildUnique(50, 101, shapeFromSeed, key, shapeIsUseful);
  const countMaps = buildUnique(50, 2001, (seed) => heightMapFromSeed(seed, false), key);
  const projectionMaps = buildUnique(50, 5001, (seed) => heightMapFromSeed(seed, true), occupancyKey);

  window.EDUNI_SPACE_BANK = Object.freeze({
    shapes,
    countMaps,
    projectionMaps,
    meta: Object.freeze({ mirror: 50, rotate: 50, count: 50, projection: 50, total: 200 }),
  });
})();
