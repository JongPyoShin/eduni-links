(() => {
  'use strict';

  const spatial = window.EDUNI_SPACE_BANK;
  const logic = window.EDUNI_LOGIC_BANK;
  if (!spatial) throw new Error('EDUNI full audit: spatial bank missing');
  if (!logic) throw new Error('EDUNI full audit: logic bank missing');

  const failures = [];
  const counts = Object.create(null);
  const fail = (type, index, message) => failures.push(`${type}-${String(index + 1).padStart(3,'0')}: ${message}`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const matrixKey = (m) => m.map((row) => row.join('')).join('|');
  const clone = (m) => m.map((row) => [...row]);
  const rotate90 = (m) => {
    const n = m.length;
    return m.map((row, r) => row.map((_, c) => m[n - 1 - c][r]));
  };
  const rotateN = (m, turns) => {
    let out = clone(m);
    for (let i = 0; i < turns; i += 1) out = rotate90(out);
    return out;
  };
  const flipX = (m) => m.map((row) => [...row].reverse());
  const flipY = (m) => [...m].reverse().map((row) => [...row]);
  const occupancy = (m) => m.map((row) => row.map((height) => height > 0 ? 1 : 0));
  const validMatrix = (m, size) => Array.isArray(m) && m.length === size && m.every((row) => Array.isArray(row) && row.length === size);

  function visualMapIsClear(matrix) {
    if (!validMatrix(matrix, 3)) return false;
    const projectionColumns = new Set();
    let occupied = 0;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        const height = matrix[r][c];
        if (!Number.isInteger(height) || height < 0 || height > 2) return false;
        if (height <= 0) continue;
        occupied += 1;
        const projectedColumn = c - r;
        if (projectionColumns.has(projectedColumn)) return false;
        projectionColumns.add(projectedColumn);
      }
    }
    if (occupied < 4 || occupied > 5) return false;
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < 2; c += 1) {
        if (matrix[r][c] > 0 && matrix[r + 1][c] > 0 && matrix[r][c + 1] > 0 && matrix[r + 1][c + 1] > 0) return false;
      }
    }
    return true;
  }

  function auditShapes() {
    const shapes = spatial.shapes || [];
    counts.mirror = shapes.length;
    counts.rotate = shapes.length;
    if (shapes.length !== 50) fail('MIR', 0, `shape pool ${shapes.length}/50`);
    shapes.forEach((shape, index) => {
      if (!validMatrix(shape, 4)) { fail('MIR', index, '4x4 shape expected'); return; }
      const markerCount = shape.flat().filter((value) => value === 2).length;
      const occupiedCount = shape.flat().filter((value) => value > 0).length;
      if (markerCount !== 1) fail('MIR', index, `yellow marker count ${markerCount}`);
      if (occupiedCount < 5) fail('MIR', index, `too few occupied cells ${occupiedCount}`);
      const mirror = flipX(shape);
      if (matrixKey(mirror) === matrixKey(shape)) fail('MIR', index, 'mirror answer equals source');
      const mirrorCandidates = [mirror, flipY(shape), rotate90(shape), rotateN(shape,2), rotateN(shape,3), shape];
      if (new Set(mirrorCandidates.map(matrixKey)).size < 3) fail('MIR', index, 'fewer than 3 unique mirror choices');
      for (let turns = 1; turns <= 3; turns += 1) {
        const correct = rotateN(shape, turns);
        const candidates = [correct, rotateN(shape,(turns+1)%4), rotateN(shape,(turns+2)%4), flipX(shape), flipY(shape), shape];
        if (new Set(candidates.map(matrixKey)).size < 3) fail('ROT', index, `${turns*90}° has fewer than 3 unique choices`);
      }
    });
  }

  function auditCubeMaps() {
    const countMaps = spatial.countMaps || [];
    const projectionMaps = spatial.projectionMaps || [];
    counts.count = countMaps.length;
    counts.projection = projectionMaps.length;
    if (countMaps.length !== 50) fail('CNT', 0, `count pool ${countMaps.length}/50`);
    if (projectionMaps.length !== 50) fail('TOP', 0, `projection pool ${projectionMaps.length}/50`);
    const countKeys = new Set();
    countMaps.forEach((map, index) => {
      if (!visualMapIsClear(map)) fail('CNT', index, 'visual clarity rule failed');
      const key = matrixKey(map);
      if (countKeys.has(key)) fail('CNT', index, 'duplicate height map');
      countKeys.add(key);
      const total = map.flat().reduce((sum, height) => sum + height, 0);
      if (!Number.isInteger(total) || total < 5 || total > 10) fail('CNT', index, `invalid total ${total}`);
      const choices = new Set([total]);
      for (const delta of [-2,-1,1,2,3]) if (total + delta > 1) choices.add(total + delta);
      if (choices.size < 3) fail('CNT', index, 'cannot construct 3 unique numeric choices');
    });
    const projectionKeys = new Set();
    projectionMaps.forEach((map, index) => {
      if (!visualMapIsClear(map)) fail('TOP', index, 'visual clarity rule failed');
      const top = occupancy(map);
      const key = matrixKey(top);
      if (projectionKeys.has(key)) fail('TOP', index, 'duplicate top-view answer');
      projectionKeys.add(key);
      const occupied = top.flat().reduce((sum, value) => sum + value, 0);
      if (occupied < 4 || occupied > 5) fail('TOP', index, `invalid occupied count ${occupied}`);
    });
  }

  function auditDirections() {
    const scenarios = spatial.directionScenarios || [];
    counts.direction = scenarios.length;
    if (scenarios.length !== 50) fail('DIR', 0, `direction pool ${scenarios.length}/50`);
    const dr = [-1,0,1,0];
    const dc = [0,1,0,-1];
    scenarios.forEach((scenario, index) => {
      let row = scenario.startRow;
      let col = scenario.startCol;
      let direction = scenario.startDirection;
      if (!scenario.commands.includes('F')) fail('DIR', index, 'no forward command');
      for (const command of scenario.commands) {
        if (command === 'L') direction = (direction + 3) % 4;
        else if (command === 'R') direction = (direction + 1) % 4;
        else if (command === 'F') { row += dr[direction]; col += dc[direction]; }
        else fail('DIR', index, `unknown command ${command}`);
        if (row < 0 || row >= 5 || col < 0 || col >= 5) fail('DIR', index, `path leaves grid at ${row},${col}`);
      }
      if (row !== scenario.finalRow || col !== scenario.finalCol || direction !== scenario.finalDirection) {
        fail('DIR', index, `solver=${row},${col},${direction} stored=${scenario.finalRow},${scenario.finalCol},${scenario.finalDirection}`);
      }
    });
  }

  function auditCompose() {
    const scenarios = spatial.composeScenarios || [];
    counts.compose = scenarios.length;
    if (scenarios.length !== 50) fail('COM', 0, `compose pool ${scenarios.length}/50`);
    scenarios.forEach((scenario, index) => {
      if (![scenario.pieceA,scenario.pieceB,scenario.combined].every((m) => validMatrix(m,4))) {
        fail('COM', index, '4x4 matrices expected'); return;
      }
      const rebuilt = Array.from({length:4}, () => Array(4).fill(0));
      for (let r = 0; r < 4; r += 1) {
        for (let c = 0; c < 4; c += 1) {
          const a = scenario.pieceA[r][c] ? 1 : 0;
          const b = scenario.pieceB[r][c] ? 1 : 0;
          if (a && b) fail('COM', index, `pieces overlap at ${r},${c}`);
          rebuilt[r][c] = a || b ? 1 : 0;
        }
      }
      const normalizedCombined = scenario.combined.map((row) => row.map((value) => value ? 1 : 0));
      if (!same(rebuilt, normalizedCombined)) fail('COM', index, 'piece union does not equal combined answer');
      const candidates = [normalizedCombined, rotate90(normalizedCombined), rotateN(normalizedCombined,2), flipX(normalizedCombined), flipY(normalizedCombined)];
      if (new Set(candidates.map(matrixKey)).size < 3) fail('COM', index, 'fewer than 3 unique compose choices');
    });
  }

  function unfoldScenario(scenario) {
    const out = Array.from({length:4}, () => Array(4).fill(0));
    for (const [r,c] of scenario.holes) {
      if (scenario.foldDirection === 'L2R') {
        const rightCol = c + 2;
        out[r][rightCol] = 1;
        out[r][3 - rightCol] = 1;
      } else if (scenario.foldDirection === 'R2L') {
        out[r][c] = 1;
        out[r][3 - c] = 1;
      } else if (scenario.foldDirection === 'T2B') {
        const bottomRow = r + 2;
        out[bottomRow][c] = 1;
        out[3 - bottomRow][c] = 1;
      } else if (scenario.foldDirection === 'B2T') {
        out[r][c] = 1;
        out[3 - r][c] = 1;
      } else {
        return null;
      }
    }
    return out;
  }

  function auditFolds() {
    const scenarios = spatial.foldScenarios || [];
    counts.fold = scenarios.length;
    if (scenarios.length !== 50) fail('FLD', 0, `fold pool ${scenarios.length}/50`);
    scenarios.forEach((scenario, index) => {
      const solved = unfoldScenario(scenario);
      if (!solved) { fail('FLD', index, `unknown fold ${scenario.foldDirection}`); return; }
      if (!same(solved, scenario.unfolded)) fail('FLD', index, 'independent unfold does not match stored answer');
      const expectedRows = ['L2R','R2L'].includes(scenario.foldDirection) ? 4 : 2;
      const expectedCols = ['L2R','R2L'].includes(scenario.foldDirection) ? 2 : 4;
      if (scenario.foldedRows !== expectedRows || scenario.foldedCols !== expectedCols) fail('FLD', index, 'folded dimensions do not match fold direction');
      for (const [r,c] of scenario.holes) {
        if (r < 0 || r >= scenario.foldedRows || c < 0 || c >= scenario.foldedCols) fail('FLD', index, `hole out of folded paper ${r},${c}`);
      }
      const candidates = [solved, flipX(solved), flipY(solved), rotate90(solved), rotateN(solved,2)];
      if (new Set(candidates.map(matrixKey)).size < 3) fail('FLD', index, 'fewer than 3 unique fold choices');
    });
  }

  function auditSequences() {
    const scenarios = logic.sequenceScenarios || [];
    counts.sequence = scenarios.length;
    if (scenarios.length !== 40) fail('SEQ', 0, `sequence pool ${scenarios.length}/40`);
    scenarios.forEach((scenario, index) => {
      if (!Array.isArray(scenario.frames) || scenario.frames.length !== 4) { fail('SEQ', index, '4 source frames expected'); return; }
      for (let step = 0; step < 4; step += 1) {
        const expected = {
          direction:(scenario.start.direction + scenario.rule.turnStep * step + 16) % 4,
          color:(scenario.start.color + scenario.rule.colorStep * step + 12) % 3,
          count:scenario.start.count + scenario.rule.countStep * step,
        };
        if (!same(expected, scenario.frames[step])) fail('SEQ', index, `frame ${step + 1} violates rule`);
      }
      const answer = {
        direction:(scenario.start.direction + scenario.rule.turnStep * 4 + 16) % 4,
        color:(scenario.start.color + scenario.rule.colorStep * 4 + 12) % 3,
        count:scenario.start.count + scenario.rule.countStep * 4,
      };
      const answerKey = `${answer.direction}:${answer.color}:${answer.count}`;
      const distractors = [
        {...answer,direction:(answer.direction+2)%4},
        {...answer,color:(answer.color+1)%3},
        {...answer,count:Math.max(1,answer.count-scenario.rule.countStep)},
      ];
      const optionKeys = new Set([answerKey,...distractors.map((item) => `${item.direction}:${item.color}:${item.count}`)]);
      if (optionKeys.size < 3) fail('SEQ', index, 'fewer than 3 unique answer choices');
    });
  }

  function permutations(items) {
    if (items.length <= 1) return [items];
    const out = [];
    items.forEach((item,index) => {
      const rest = items.slice(0,index).concat(items.slice(index+1));
      permutations(rest).forEach((tail) => out.push([item,...tail]));
    });
    return out;
  }

  function conditionHolds(order, condition) {
    const indexOf = (token) => order.indexOf(token);
    if (condition.type === 'leftOf') return indexOf(condition.a) < indexOf(condition.b);
    if (condition.type === 'adjacent') return Math.abs(indexOf(condition.a) - indexOf(condition.b)) === 1;
    if (condition.type === 'notEnd') { const i = indexOf(condition.a); return i !== 0 && i !== order.length - 1; }
    if (condition.type === 'atEnd') { const i = indexOf(condition.a); return i === 0 || i === order.length - 1; }
    return false;
  }

  function auditConditions() {
    const scenarios = logic.conditionScenarios || [];
    counts.condition = scenarios.length;
    if (scenarios.length !== 40) fail('CON', 0, `condition pool ${scenarios.length}/40`);
    scenarios.forEach((scenario, index) => {
      if (!Array.isArray(scenario.tokens) || scenario.tokens.length !== 4 || new Set(scenario.tokens).size !== 4) {
        fail('CON', index, '4 unique tokens expected'); return;
      }
      if (!Array.isArray(scenario.conditions) || scenario.conditions.length !== 3) fail('CON', index, 'exactly 3 conditions expected');
      const solved = permutations(scenario.tokens).filter((order) => scenario.conditions.every((condition) => conditionHolds(order,condition)));
      if (solved.length !== 1) fail('CON', index, `independent solver found ${solved.length} answers`);
      if (scenario.solution && solved.length === 1 && !same(solved[0], scenario.solution)) fail('CON', index, 'stored solution differs from independent solver');
    });
  }

  function cellKey(r,c) { return `${r},${c}`; }

  function solvePath(scenario) {
    const size = scenario.size || 5;
    const walls = new Set((scenario.walls || []).map(([r,c]) => cellKey(r,c)));
    const keyCell = cellKey(scenario.key[0],scenario.key[1]);
    const doorCell = cellKey(scenario.door[0],scenario.door[1]);
    const goalAt = new Map(Object.entries(scenario.goals).map(([label,[r,c]]) => [cellKey(r,c),label]));
    const queue = [{r:scenario.start[0],c:scenario.start[1],hasKey:false,passedDoor:false}];
    const seen = new Set();
    const reached = new Set();
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    while (queue.length) {
      const current = queue.shift();
      const here = cellKey(current.r,current.c);
      const hasKey = current.hasKey || here === keyCell;
      const passedDoor = current.passedDoor || here === doorCell;
      const stateKey = `${here}|${hasKey?1:0}|${passedDoor?1:0}`;
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);
      const goal = goalAt.get(here);
      if (goal && hasKey && passedDoor) reached.add(goal);
      for (const [dr,dc] of dirs) {
        const nr = current.r + dr;
        const nc = current.c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const next = cellKey(nr,nc);
        if (walls.has(next)) continue;
        if (next === doorCell && !hasKey) continue;
        queue.push({r:nr,c:nc,hasKey,passedDoor});
      }
    }
    return [...reached].sort();
  }

  function auditPaths() {
    const scenarios = logic.pathScenarios || [];
    counts.pathlogic = scenarios.length;
    if (scenarios.length !== 40) fail('PTH', 0, `path pool ${scenarios.length}/40`);
    scenarios.forEach((scenario, index) => {
      const solved = solvePath(scenario);
      if (solved.length !== 1) fail('PTH', index, `independent BFS found ${solved.length} qualified goals`);
      if (solved.length === 1 && solved[0] !== scenario.correctLabel) fail('PTH', index, `solver=${solved[0]} stored=${scenario.correctLabel}`);
      const occupied = [scenario.start,scenario.key,scenario.door,...Object.values(scenario.goals),...(scenario.walls || [])].map(([r,c]) => cellKey(r,c));
      if (new Set(occupied).size !== occupied.length) fail('PTH', index, 'two visual objects occupy the same cell');
    });
  }

  auditShapes();
  auditCubeMaps();
  auditDirections();
  auditCompose();
  auditFolds();
  auditSequences();
  auditConditions();
  auditPaths();

  const expected = {mirror:50,rotate:50,count:50,projection:50,direction:50,compose:50,fold:50,sequence:40,condition:40,pathlogic:40};
  for (const [type,count] of Object.entries(expected)) {
    if (counts[type] !== count) failures.push(`META-${type}: ${counts[type] ?? 0}/${count}`);
  }
  const total = Object.values(expected).reduce((sum,value) => sum + value,0);
  if (total !== 470) failures.push(`META-total: ${total}/470`);
  if (spatial.meta && spatial.meta.total !== 350) failures.push(`META-spatial: ${spatial.meta.total}/350`);
  if (logic.meta && logic.meta.total !== 120) failures.push(`META-logic: ${logic.meta.total}/120`);

  const report = Object.freeze({
    ok:failures.length === 0,
    total,
    checked:total,
    counts:Object.freeze({...counts}),
    failures:Object.freeze([...failures]),
    method:'independent scenario solvers + uniqueness + visual-data invariants',
  });
  window.EDUNI_SPACE_FULL_AUDIT = report;
  document.documentElement.dataset.spaceAudit = report.ok ? '470-pass' : 'failed';

  if (!report.ok) {
    console.error('EDUNI full question audit failed', report);
    throw new Error(`EDUNI full question audit failed (${failures.length}): ${failures.slice(0,5).join(' | ')}`);
  }
  console.info('EDUNI full question audit passed', report);
})();
