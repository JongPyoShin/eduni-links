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

  function directionScenarioFromSeed(seed) {
    const rng = makeRng(seed * 71 + 23);
    const startDirection = Math.floor(rng() * 4);
    const commands = [];
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];
    let row = 2;
    let col = 2;
    let direction = startDirection;
    const commandCount = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < commandCount; i += 1) {
      const roll = rng();
      let command = roll < .3 ? 'L' : roll < .6 ? 'R' : 'F';
      if (command === 'L') direction = (direction + 3) % 4;
      if (command === 'R') direction = (direction + 1) % 4;
      if (command === 'F') {
        const nextRow = row + dr[direction];
        const nextCol = col + dc[direction];
        if (nextRow < 0 || nextRow >= 5 || nextCol < 0 || nextCol >= 5) {
          command = 'R';
          direction = (direction + 1) % 4;
        } else {
          row = nextRow;
          col = nextCol;
        }
      }
      commands.push(command);
    }
    return { startRow:2, startCol:2, startDirection, commands, finalRow:row, finalCol:col, finalDirection:direction };
  }

  function directionKey(item) {
    return `${item.startDirection}:${item.commands.join('')}`;
  }

  function compositionScenarioFromShape(matrix, seed) {
    const rng = makeRng(seed * 101 + 31);
    const cells = [];
    matrix.forEach((row, r) => row.forEach((value, c) => {
      if (value) cells.push([r, c]);
    }));
    const shuffled = [...cells];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const split = Math.max(2, Math.min(shuffled.length - 2, Math.floor(shuffled.length / 2)));
    const pieceA = Array.from({length:4}, () => Array(4).fill(0));
    const pieceB = Array.from({length:4}, () => Array(4).fill(0));
    const combined = Array.from({length:4}, () => Array(4).fill(0));
    shuffled.forEach(([r, c], index) => {
      combined[r][c] = 1;
      (index < split ? pieceA : pieceB)[r][c] = 1;
    });
    return { pieceA, pieceB, combined };
  }

  function foldScenarioFromSeed(seed) {
    const rng = makeRng(seed * 83 + 29);
    const directions = ['L2R', 'R2L', 'T2B', 'B2T'];
    const foldDirection = directions[Math.floor(rng() * directions.length)];
    const foldedRows = foldDirection === 'L2R' || foldDirection === 'R2L' ? 4 : 2;
    const foldedCols = foldDirection === 'L2R' || foldDirection === 'R2L' ? 2 : 4;
    const holeCount = 1 + (rng() < .55 ? 1 : 0);
    const holes = [];
    const used = new Set();
    while (holes.length < holeCount) {
      const row = Math.floor(rng() * foldedRows);
      const col = Math.floor(rng() * foldedCols);
      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) continue;
      used.add(cellKey);
      holes.push([row, col]);
    }
    const unfolded = Array.from({length:4}, () => Array(4).fill(0));
    holes.forEach(([r, c]) => {
      if (foldDirection === 'L2R') {
        const rightCol = c + 2;
        unfolded[r][rightCol] = 1;
        unfolded[r][3 - rightCol] = 1;
      } else if (foldDirection === 'R2L') {
        unfolded[r][c] = 1;
        unfolded[r][3 - c] = 1;
      } else if (foldDirection === 'T2B') {
        const bottomRow = r + 2;
        unfolded[bottomRow][c] = 1;
        unfolded[3 - bottomRow][c] = 1;
      } else {
        unfolded[r][c] = 1;
        unfolded[3 - r][c] = 1;
      }
    });
    return { foldDirection, foldedRows, foldedCols, holes, unfolded };
  }

  function foldKey(item) {
    return `${item.foldDirection}:${item.holes.map(([r,c]) => `${r},${c}`).sort().join(';')}`;
  }

  const shapes = buildUnique(50, 101, shapeFromSeed, key, shapeIsUseful);
  const countMaps = buildUnique(50, 2001, (seed) => heightMapFromSeed(seed, false), key);
  const projectionMaps = buildUnique(50, 5001, (seed) => heightMapFromSeed(seed, true), occupancyKey);
  const directionScenarios = buildUnique(50, 8001, directionScenarioFromSeed, directionKey);
  const composeScenarios = shapes.map((matrix, index) => compositionScenarioFromShape(matrix, 9001 + index));
  const foldScenarios = buildUnique(50, 12001, foldScenarioFromSeed, foldKey);

  window.EDUNI_SPACE_BANK = Object.freeze({
    shapes,
    countMaps,
    projectionMaps,
    directionScenarios,
    composeScenarios,
    foldScenarios,
    meta: Object.freeze({
      mirror:50,
      rotate:50,
      count:50,
      projection:50,
      direction:50,
      compose:50,
      fold:50,
      total:350,
    }),
  });
})();
