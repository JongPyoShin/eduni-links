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

  const shuffled = (items, rng) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const signature = (value) => JSON.stringify(value);

  const permutations = (items) => {
    if (items.length <= 1) return [items];
    const out = [];
    items.forEach((item, index) => {
      const rest = items.slice(0, index).concat(items.slice(index + 1));
      permutations(rest).forEach((tail) => out.push([item, ...tail]));
    });
    return out;
  };

  function sequenceFrames(rule, start, count) {
    const frames = [];
    for (let step = 0; step < count; step += 1) {
      frames.push({
        direction: (start.direction + rule.turnStep * step + 16) % 4,
        color: (start.color + rule.colorStep * step + 12) % 3,
        count: start.count + rule.countStep * step,
      });
    }
    return frames;
  }

  function sequenceScenarioFromSeed(seed) {
    const rng = makeRng(seed * 97 + 41);
    const rule = {
      turnStep: rng() < .5 ? 1 : 3,
      colorStep: rng() < .5 ? 1 : 2,
      countStep: rng() < .72 ? 1 : 2,
    };
    const start = {
      direction: Math.floor(rng() * 4),
      color: Math.floor(rng() * 3),
      count: 1 + Math.floor(rng() * 2),
    };
    return {rule, start, frames:sequenceFrames(rule, start, 4)};
  }

  function solveSequenceScenario(scenario) {
    return sequenceFrames(scenario.rule, scenario.start, 5)[4];
  }

  function validateSequenceScenario(scenario) {
    const expected = sequenceFrames(scenario.rule, scenario.start, 4);
    if (signature(expected) !== signature(scenario.frames)) return false;
    const answer = solveSequenceScenario(scenario);
    return answer.count > scenario.frames[3].count
      && answer.direction !== scenario.frames[3].direction
      && answer.color !== scenario.frames[3].color;
  }

  const CONDITION_TOKENS = ['🐶','🐱','🐰','🐼'];

  function conditionHolds(order, condition) {
    const indexOf = (token) => order.indexOf(token);
    if (condition.type === 'leftOf') return indexOf(condition.a) < indexOf(condition.b);
    if (condition.type === 'adjacent') return Math.abs(indexOf(condition.a) - indexOf(condition.b)) === 1;
    if (condition.type === 'notEnd') {
      const index = indexOf(condition.a);
      return index !== 0 && index !== order.length - 1;
    }
    if (condition.type === 'atEnd') {
      const index = indexOf(condition.a);
      return index === 0 || index === order.length - 1;
    }
    return false;
  }

  function solveConditionScenario(scenario) {
    return permutations(scenario.tokens).filter((order) =>
      scenario.conditions.every((condition) => conditionHolds(order, condition))
    );
  }

  function trueConditionPool(target) {
    const out = [];
    for (let i = 0; i < target.length; i += 1) {
      for (let j = i + 1; j < target.length; j += 1) {
        out.push({type:'leftOf', a:target[i], b:target[j]});
      }
    }
    for (let i = 0; i < target.length - 1; i += 1) {
      out.push({type:'adjacent', a:target[i], b:target[i + 1]});
    }
    out.push({type:'notEnd', a:target[1]});
    out.push({type:'notEnd', a:target[2]});
    out.push({type:'atEnd', a:target[0]});
    out.push({type:'atEnd', a:target[3]});
    return out;
  }

  function chooseUniqueConditions(target, rng) {
    const pool = shuffled(trueConditionPool(target), rng);
    const allOrders = permutations(CONDITION_TOKENS);
    for (let a = 0; a < pool.length; a += 1) {
      for (let b = a + 1; b < pool.length; b += 1) {
        for (let c = b + 1; c < pool.length; c += 1) {
          const conditions = [pool[a], pool[b], pool[c]];
          const solved = allOrders.filter((order) => conditions.every((condition) => conditionHolds(order, condition)));
          if (solved.length === 1 && signature(solved[0]) === signature(target)) return conditions;
        }
      }
    }
    return null;
  }

  function conditionScenarioFromSeed(seed) {
    const rng = makeRng(seed * 131 + 17);
    const target = shuffled(CONDITION_TOKENS, rng);
    const conditions = chooseUniqueConditions(target, rng);
    if (!conditions) return null;
    return {tokens:[...CONDITION_TOKENS], conditions, solution:target};
  }

  function validateConditionScenario(scenario) {
    if (!scenario) return false;
    const solved = solveConditionScenario(scenario);
    return solved.length === 1 && signature(solved[0]) === signature(scenario.solution);
  }

  const PATH_SIZE = 5;
  const cellKey = (row, col) => `${row},${col}`;

  function solvePathScenario(scenario) {
    const blocked = new Set(scenario.walls.map(([r,c]) => cellKey(r,c)));
    const keyCell = cellKey(scenario.key[0], scenario.key[1]);
    const doorCell = cellKey(scenario.door[0], scenario.door[1]);
    const goalByCell = new Map(Object.entries(scenario.goals).map(([label,[r,c]]) => [cellKey(r,c), label]));
    const queue = [{row:scenario.start[0], col:scenario.start[1], hasKey:false, passedDoor:false}];
    const seen = new Set([`0:${cellKey(scenario.start[0], scenario.start[1])}:0`]);
    const qualified = new Set();
    const directions = [[-1,0],[1,0],[0,-1],[0,1]];

    while (queue.length) {
      const current = queue.shift();
      const currentCell = cellKey(current.row, current.col);
      const hasKey = current.hasKey || currentCell === keyCell;
      const passedDoor = current.passedDoor || currentCell === doorCell;
      const goal = goalByCell.get(currentCell);
      if (goal && hasKey && passedDoor) qualified.add(goal);

      directions.forEach(([dr,dc]) => {
        const row = current.row + dr;
        const col = current.col + dc;
        if (row < 0 || row >= PATH_SIZE || col < 0 || col >= PATH_SIZE) return;
        const nextCell = cellKey(row,col);
        if (blocked.has(nextCell)) return;
        if (nextCell === doorCell && !hasKey) return;
        const nextHasKey = hasKey || nextCell === keyCell;
        const nextPassedDoor = passedDoor || nextCell === doorCell;
        const stateKey = `${nextHasKey ? 1 : 0}:${nextCell}:${nextPassedDoor ? 1 : 0}`;
        if (seen.has(stateKey)) return;
        seen.add(stateKey);
        queue.push({row,col,hasKey:nextHasKey,passedDoor:nextPassedDoor});
      });
    }
    return [...qualified].sort();
  }

  function reachableWithoutDoor(scenario, targetLabel) {
    const blocked = new Set(scenario.walls.map(([r,c]) => cellKey(r,c)));
    blocked.add(cellKey(scenario.door[0], scenario.door[1]));
    const target = scenario.goals[targetLabel];
    const targetKey = cellKey(target[0], target[1]);
    const queue = [scenario.start];
    const seen = new Set([cellKey(scenario.start[0], scenario.start[1])]);
    const directions = [[-1,0],[1,0],[0,-1],[0,1]];
    while (queue.length) {
      const [row,col] = queue.shift();
      if (cellKey(row,col) === targetKey) return true;
      directions.forEach(([dr,dc]) => {
        const nr = row + dr;
        const nc = col + dc;
        const nextKey = cellKey(nr,nc);
        if (nr < 0 || nr >= PATH_SIZE || nc < 0 || nc >= PATH_SIZE) return;
        if (blocked.has(nextKey) || seen.has(nextKey)) return;
        seen.add(nextKey);
        queue.push([nr,nc]);
      });
    }
    return false;
  }

  function uniqueCells(cells) {
    const seen = new Set();
    return cells.filter(([r,c]) => {
      const key = cellKey(r,c);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function pathScenarioFromSeed(seed) {
    const rng = makeRng(seed * 173 + 59);
    const vertical = rng() < .5;
    const doorIndex = 1 + Math.floor(rng() * 3);
    const labels = shuffled(['A','B','C'], rng);
    const correctLabel = labels[0];

    if (vertical) {
      const barrier = Array.from({length:PATH_SIZE}, (_,r) => [r,2]).filter(([r]) => r !== doorIndex);
      const enclosure = [[0,1],[1,0],[4,1],[3,0]];
      const nearChoices = shuffled([[1,1],[2,0],[2,1],[3,1]], rng);
      const farChoices = shuffled([
        [doorIndex,3],
        [doorIndex,4],
        [Math.max(0,doorIndex-1),4],
        [Math.min(4,doorIndex+1),4],
      ], rng);
      return {
        size:PATH_SIZE,
        start:nearChoices[0],
        key:nearChoices[1],
        door:[doorIndex,2],
        walls:uniqueCells([...barrier,...enclosure]),
        goals:{
          [correctLabel]:farChoices[0],
          [labels[1]]:[0,0],
          [labels[2]]:[4,0],
        },
        correctLabel,
      };
    }

    const barrier = Array.from({length:PATH_SIZE}, (_,c) => [2,c]).filter(([,c]) => c !== doorIndex);
    const enclosure = [[1,0],[0,1],[1,4],[0,3]];
    const nearChoices = shuffled([[1,1],[1,2],[1,3],[0,2]], rng);
    const farChoices = shuffled([
      [3,doorIndex],
      [4,doorIndex],
      [4,Math.max(0,doorIndex-1)],
      [4,Math.min(4,doorIndex+1)],
    ], rng);
    return {
      size:PATH_SIZE,
      start:nearChoices[0],
      key:nearChoices[1],
      door:[2,doorIndex],
      walls:uniqueCells([...barrier,...enclosure]),
      goals:{
        [correctLabel]:farChoices[0],
        [labels[1]]:[0,0],
        [labels[2]]:[0,4],
      },
      correctLabel,
    };
  }

  function validatePathScenario(scenario) {
    const solved = solvePathScenario(scenario);
    return solved.length === 1
      && solved[0] === scenario.correctLabel
      && !reachableWithoutDoor(scenario, scenario.correctLabel);
  }

  function buildValidated(count, startSeed, factory, validator, keyFn) {
    const out = [];
    const seen = new Set();
    let seed = startSeed;
    let guard = 0;
    while (out.length < count && guard < 30000) {
      guard += 1;
      const scenario = factory(seed);
      seed += 1;
      if (!validator(scenario)) continue;
      const key = keyFn(scenario);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({...scenario});
    }
    if (out.length !== count) throw new Error(`EDUNI logic bank generation failed: ${out.length}/${count}`);
    return out.map((scenario,index) => ({...scenario,index:index + 1}));
  }

  const sequenceScenarios = buildValidated(
    40,
    21001,
    sequenceScenarioFromSeed,
    validateSequenceScenario,
    (scenario) => signature({rule:scenario.rule,start:scenario.start})
  );
  const conditionScenarios = buildValidated(
    40,
    26001,
    conditionScenarioFromSeed,
    validateConditionScenario,
    (scenario) => signature(scenario.conditions)
  );
  const pathScenarios = buildValidated(
    40,
    31001,
    pathScenarioFromSeed,
    validatePathScenario,
    (scenario) => signature({start:scenario.start,key:scenario.key,door:scenario.door,goals:scenario.goals})
  );

  window.EDUNI_LOGIC_BANK = Object.freeze({
    sequenceScenarios,
    conditionScenarios,
    pathScenarios,
    meta:Object.freeze({sequence:40, condition:40, pathlogic:40, total:120}),
  });
})();
