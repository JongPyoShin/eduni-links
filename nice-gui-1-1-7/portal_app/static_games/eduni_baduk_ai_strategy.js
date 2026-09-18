((root) => {
  'use strict';

  const STANDARD_SIZE = 19;
  const STANDARD_ANCHORS = [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15],
  ];
  const CORNER_ANCHORS = new Set(['3,3', '3,15', '15,3', '15,15']);
  const SIDE_ANCHORS = new Set(['3,9', '9,3', '9,15', '15,9']);
  const GLOBAL_GRID = [3, 6, 9, 12, 15];
  const GLOBAL_SAMPLE_LIMIT = 4;
  const OPENING_MOVE_LIMIT = 30;

  function key(row, col) {
    return `${row},${col}`;
  }

  function stones(source) {
    const out = [];
    for (let row = 0; row < source.length; row++) {
      for (let col = 0; col < source.length; col++) {
        if (source[row][col]) out.push([row, col]);
      }
    }
    return out;
  }

  function nearestDistance(points, row, col) {
    if (!points.length) return 9;
    let best = Infinity;
    for (const [stoneRow, stoneCol] of points) {
      best = Math.min(best, Math.abs(stoneRow - row) + Math.abs(stoneCol - col));
    }
    return best;
  }

  function expandCandidates(source, localCandidates) {
    const size = source.length;
    if (size !== STANDARD_SIZE) return localCandidates.map(([row, col]) => [row, col]);

    const pointMap = new Map();
    const add = (row, col) => {
      if (row < 0 || col < 0 || row >= size || col >= size || source[row][col] !== 0) return;
      pointMap.set(key(row, col), [row, col]);
    };

    for (const [row, col] of localCandidates) add(row, col);
    for (const [row, col] of STANDARD_ANCHORS) add(row, col);

    const occupied = stones(source);
    const openGrid = [];
    for (const row of GLOBAL_GRID) {
      for (const col of GLOBAL_GRID) {
        if (source[row][col] !== 0 || pointMap.has(key(row, col))) continue;
        openGrid.push({row, col, distance: nearestDistance(occupied, row, col)});
      }
    }
    openGrid.sort((a, b) => b.distance - a.distance || a.row - b.row || a.col - b.col);
    for (const point of openGrid.slice(0, GLOBAL_SAMPLE_LIMIT)) add(point.row, point.col);

    return [...pointMap.values()];
  }

  function scoreMove(source, row, col, moveCount = 0) {
    if (source.length !== STANDARD_SIZE) return {spread: 0, opening: 0};

    const openingPhase = Math.max(0, Math.min(1, (OPENING_MOVE_LIMIT - moveCount) / OPENING_MOVE_LIMIT));
    if (openingPhase <= 0) return {spread: 0, opening: 0};

    const occupied = stones(source);
    const distance = Math.min(8, nearestDistance(occupied, row, col));
    const spread = distance * 1.15 * openingPhase;
    const pointKey = key(row, col);
    let anchorWeight = 0;
    if (CORNER_ANCHORS.has(pointKey)) anchorWeight = 7;
    else if (SIDE_ANCHORS.has(pointKey)) anchorWeight = 4;
    else if (pointKey === '9,9') anchorWeight = 2;

    return {
      spread,
      opening: anchorWeight * openingPhase,
    };
  }

  root.EDUNIBadukAiStrategy = {
    STANDARD_SIZE,
    STANDARD_ANCHORS,
    OPENING_MOVE_LIMIT,
    expandCandidates,
    scoreMove,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
