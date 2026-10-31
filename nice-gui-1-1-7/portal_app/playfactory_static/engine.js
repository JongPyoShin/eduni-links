/* Pure rule engines. No DOM, network, storage, or dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Playfacto = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  function rng(seed) { let n = seed >>> 0; return () => ((n = (1664525 * n + 1013904223) >>> 0) / 4294967296); }
  function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  const fail = (state, message) => { state.message = message; return false; };

  // Ten-Twenty / Speed 1020. Chip identity is never its numeric value.
  function newTen(random = Math.random) {
    return {chips: shuffle(Array.from({length: 100}, (_, id) => ({id, value: id % 10, up: false, owner: null})), random),
      turn: 0, piles: [[], []], claimant: null, selected: [], finished: false, winner: null, message: '1번 플레이어가 숫자칩 하나를 뒤집어요.'};
  }
  function tenFlip(s, id) {
    if (s.finished) return false;
    if (s.claimant !== null) return fail(s, '종 판정을 마친 뒤 뒤집을 수 있어요.');
    const chip = s.chips.find(c => c.id === id);
    if (!chip || chip.up || chip.owner !== null) return fail(s, '아직 뒤집지 않은 칩을 골라요.');
    chip.up = true; s.turn = 1 - s.turn;
    s.message = `${chip.value} 공개! 합이 10 또는 20인 두세 칩을 찾으면 종을 눌러요.`;
    return true;
  }
  function tenRing(s, player) {
    if (s.finished || s.claimant !== null || ![0, 1].includes(player)) return false;
    s.claimant = player; s.selected = []; s.message = `${player + 1}번의 종! 공개된 칩을 정확히 2개 또는 3개 고르세요.`; return true;
  }
  function tenSelect(s, id) {
    if (s.finished || s.claimant === null) return false;
    const chip = s.chips.find(c => c.id === id);
    if (!chip || !chip.up || chip.owner !== null) return false;
    if (s.selected.includes(id)) s.selected = s.selected.filter(x => x !== id);
    else if (s.selected.length < 3) s.selected.push(id);
    else return fail(s, '최대 3개까지만 고를 수 있어요.');
    return true;
  }
  function tenJudge(s) {
    if (s.finished || s.claimant === null) return false;
    const who = s.claimant, ids = [...s.selected];
    const chips = ids.map(id => s.chips.find(c => c.id === id));
    const sum = chips.reduce((v, c) => v + (c ? c.value : 0), 0);
    const valid = [2, 3].includes(ids.length) && new Set(ids).size === ids.length &&
      chips.every(c => c && c.up && c.owner === null) && [10, 20].includes(sum);
    if (valid) {
      chips.forEach(c => { c.owner = who; c.up = false; s.piles[who].push(c.id); });
      s.message = `${who + 1}번 정답! ${chips.map(c => c.value).join(' + ')} = ${sum}, 칩 ${chips.length}개 획득!`;
    } else {
      const penalty = s.piles[who].pop();
      if (penalty !== undefined) { const c = s.chips.find(c => c.id === penalty); c.owner = null; c.up = false; }
      s.message = `합 ${sum}: 두세 칩의 합이 10 또는 20이어야 해요. ${penalty === undefined ? '모은 칩이 없어 반납하지 않아요.' : '모은 칩 1개를 뒤집어 돌려놓았어요.'}`;
    }
    s.claimant = null; s.selected = []; return valid;
  }
  function tenFinish(s) {
    if (s.finished || s.claimant !== null || s.chips.some(c => c.owner === null && !c.up)) return false;
    s.finished = true; s.winner = s.piles[0].length === s.piles[1].length ? null : s.piles[0].length > s.piles[1].length ? 0 : 1;
    s.message = s.winner === null ? '무승부예요!' : `${s.winner + 1}번 플레이어 승리!`; return true;
  }

  // Pixel inventory visually transcribed from the official component illustration.
  const pixelPieces = [
    {id: 'y2', color: 'yellow', w: 1, h: 2}, {id: 'y3', color: 'yellow', w: 1, h: 3}, {id: 'y4', color: 'yellow', w: 2, h: 2},
    {id: 'p2', color: 'pink', w: 1, h: 2}, {id: 'p3', color: 'pink', w: 1, h: 3}, {id: 'p4', color: 'pink', w: 2, h: 2},
    {id: 'b2a', color: 'blue', w: 1, h: 2}, {id: 'b2b', color: 'blue', w: 1, h: 2},
    {id: 'b3', color: 'blue', w: 1, h: 3}, {id: 'b4', color: 'blue', w: 1, h: 4}
  ];
  function rectangleCells(piece, r, c, rot) {
    const w = rot % 2 ? piece.h : piece.w, h = rot % 2 ? piece.w : piece.h, cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([r + y, c + x]);
    return cells;
  }
  function createPixelCard(seed) {
    const random = rng(seed), pieces = shuffle(pixelPieces, random), occupied = Array(25).fill(false), placements = [];
    const memo = new Set();
    function fill(available) {
      const index = occupied.indexOf(false); if (index < 0) return true;
      const key = occupied.map(Number).join('') + '|' + available.map(p => p.id).sort().join(',');
      if (memo.has(key)) return false;
      const r = Math.floor(index / 5), c = index % 5;
      for (const piece of available) for (const rot of shuffle(piece.w === piece.h ? [0] : [0, 1], random)) {
        const cells = rectangleCells(piece, r, c, rot);
        if (cells.some(([y, x]) => x >= 5 || y >= 5 || occupied[y * 5 + x])) continue;
        cells.forEach(([y, x]) => occupied[y * 5 + x] = true); placements.push({id: piece.id, r, c, rot});
        if (fill(available.filter(p => p.id !== piece.id))) return true;
        placements.pop(); cells.forEach(([y, x]) => occupied[y * 5 + x] = false);
      }
      memo.add(key); return false;
    }
    if (!fill(pieces)) throw new Error('Pixel original card could not be tiled');
    const clues = placements.map(v => {
      const p = pixelPieces.find(p => p.id === v.id), cells = rectangleCells(p, v.r, v.c, v.rot);
      const [r, c] = cells[Math.floor(random() * cells.length)]; return {r, c, color: p.color, size: p.w * p.h};
    });
    return {id: seed, rows: 5, cols: 5, clues, solution: copy(placements)};
  }
  const pixelCards = [11, 27, 39, 57, 81, 106].map(createPixelCard);
  function newPixel(card = 0) { return {card, poses: {}, history: [], selected: pixelPieces[0].id, rot: 0, finished: false, message: '숫자의 색과 칸 수를 모두 맞춰 보세요. 사용하지 않는 블록도 있어요.'}; }
  function pixelBoard(s, puzzle = pixelCards[s.card], omit = null) {
    const board = Array(puzzle.rows * puzzle.cols).fill(null);
    for (const [id, pose] of Object.entries(s.poses)) {
      if (id === omit) continue;
      const p = pixelPieces.find(p => p.id === id);
      rectangleCells(p, pose.r, pose.c, pose.rot).forEach(([r, c]) => { if (r >= 0 && c >= 0 && r < puzzle.rows && c < puzzle.cols) board[r * puzzle.cols + c] = id; });
    }
    return board;
  }
  function pixelCheck(s, id, r, c, rot, puzzle = pixelCards[s.card]) {
    if (![r, c, rot].every(Number.isInteger) || ![0, 1].includes(rot)) return {ok: false, reason: '칸 안에 블록을 놓아 주세요.'};
    const p = pixelPieces.find(p => p.id === id); if (!p) return {ok: false, reason: '블록을 선택하세요.'};
    const cells = rectangleCells(p, r, c, rot), board = pixelBoard(s, puzzle, id);
    if (cells.some(([y, x]) => y < 0 || x < 0 || y >= puzzle.rows || x >= puzzle.cols)) return {ok: false, reason: '블록이 카드 밖으로 나가요.'};
    if (cells.some(([y, x]) => board[y * puzzle.cols + x] !== null)) return {ok: false, reason: '다른 블록과 겹쳐요.'};
    const clues = puzzle.clues.filter(v => cells.some(([y, x]) => v.r === y && v.c === x));
    if (clues.length !== 1) return {ok: false, reason: '블록 하나는 숫자 하나만 덮어야 해요.'};
    if (clues[0].color !== p.color || clues[0].size !== p.w * p.h) return {ok: false, reason: '숫자의 색과 블록 칸 수가 모두 같아야 해요.'};
    return {ok: true};
  }
  function pixelPlace(s, id, r, c, rot = s.rot) {
    if (s.finished) return false;
    const check = pixelCheck(s, id, r, c, rot); if (!check.ok) return fail(s, check.reason);
    s.history.push(copy(s.poses)); s.poses[id] = {r, c, rot};
    s.finished = pixelBoard(s).every(Boolean);
    s.message = s.finished ? '픽셀 카드 완성! 모든 색·숫자 조건을 지켰어요.' : '좋아요! 다음 숫자도 찾아보세요.';
    s.selected = pixelPieces.find(p => !s.poses[p.id])?.id || id; s.rot = 0; return true;
  }
  function pixelUndo(s) { if (s.finished || !s.history.length) return false; s.poses = s.history.pop(); s.message = '한 수 되돌렸어요.'; return true; }
  function pixelHint(s) {
    const trial = {...s, poses: copy(s.poses)}, puzzle = pixelCards[s.card], moves = [];
    function solve() {
      const empty = pixelBoard(trial).indexOf(null); if (empty < 0) return true;
      for (const p of pixelPieces.filter(p => !trial.poses[p.id])) for (const rot of p.w === p.h ? [0] : [0, 1]) {
        const r = Math.floor(empty / puzzle.cols), c = empty % puzzle.cols;
        if (!pixelCheck(trial, p.id, r, c, rot).ok) continue;
        trial.poses[p.id] = {r, c, rot}; moves.push({id: p.id, r, c, rot});
        if (solve()) return true;
        delete trial.poses[p.id]; moves.pop();
      }
      return false;
    }
    return solve() ? moves[0] || null : null;
  }

  // Finger Chess: physical die confirmed by the user: 1, 2, 3, each twice.
  const signs = ['rock', 'paper', 'scissors'], beats = {rock: 'scissors', paper: 'rock', scissors: 'paper'};
  function newFinger() {
    const board = Array(36).fill(null);
    for (let player = 0; player < 2; player++) for (let i = 0; i < 12; i++) {
      const row = player === 0 ? 4 + Math.floor(i / 6) : Math.floor(i / 6);
      board[row * 6 + i % 6] = {id: `${player}-${i}`, player, sign: signs[i % 3]};
    }
    return {board, phase: 'setup', ready: [false, false], turn: 0, die: null, captures: [{rock: 0, paper: 0, scissors: 0}, {rock: 0, paper: 0, scissors: 0}], winner: null, message: '각자 앞 두 줄에서 말을 바꾸어 배치한 뒤 준비를 눌러요.'};
  }
  function fingerSwap(s, player, a, b) {
    if (s.phase !== 'setup' || s.ready[player] || a === b || !s.board[a] || !s.board[b] || s.board[a].player !== player || s.board[b].player !== player) return false;
    [s.board[a], s.board[b]] = [s.board[b], s.board[a]]; return true;
  }
  function fingerReady(s, player) { if (s.phase !== 'setup' || ![0, 1].includes(player)) return false; s.ready[player] = true; if (s.ready.every(Boolean)) { s.phase = 'play'; s.message = '1번이 주사위를 굴릴 차례예요.'; } return true; }
  function fingerMoves(s, index) {
    const piece = s.board[index]; if (s.phase !== 'play' || !s.die || !piece || piece.player !== s.turn) return [];
    const row = Math.floor(index / 6), col = index % 6, moves = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = row + dr * s.die, c = col + dc * s.die; if (r < 0 || c < 0 || r >= 6 || c >= 6) continue;
      let blocked = false;
      for (let step = 1; step < s.die; step++) if (s.board[(row + dr * step) * 6 + col + dc * step]) blocked = true;
      const target = s.board[r * 6 + c];
      if (!blocked && (!target || (target.player !== s.turn && beats[piece.sign] === target.sign))) moves.push(r * 6 + c);
    }
    return moves;
  }
  function fingerRoll(s, value) {
    if (s.phase !== 'play' || s.die !== null || !Number.isInteger(value) || value < 1 || value > 3) return false;
    s.die = value;
    if (!s.board.some((_, i) => fingerMoves(s, i).length)) { const who = s.turn; s.turn = 1 - s.turn; s.die = null; s.message = `${who + 1}번: ${value}칸 이동할 말이 없어 차례를 넘겼어요. ${s.turn + 1}번이 굴리세요.`; }
    else s.message = `${value}칸! 움직일 말을 고른 뒤 표시된 도착 칸을 누르세요.`;
    return true;
  }
  function fingerMove(s, from, to) {
    if (s.phase !== 'play') return false;
    if (!fingerMoves(s, from).includes(to)) return fail(s, '주사위 수만큼 직선 이동해야 하며, 말을 뛰어넘거나 이길 수 없는 말을 잡을 수 없어요.');
    const captured = s.board[to], who = s.turn; s.board[to] = s.board[from]; s.board[from] = null;
    if (captured) s.captures[who][captured.sign]++;
    s.die = null;
    if (Object.values(s.captures[who]).some(n => n === 4)) { s.phase = 'finished'; s.winner = who; s.message = `${who + 1}번 승리! 같은 그림의 상대 말 4개를 모았어요.`; }
    else { s.turn = 1 - who; s.message = `${captured ? '상대 말을 잡았어요! ' : ''}${s.turn + 1}번이 주사위를 굴리세요.`; }
    return true;
  }

  // Tangram geometry: a genuine seven-piece set, area-based union validation.
  const rawTangram = [
    {id: 'L1', kind: 'large', p: [[0, 0], [4, 0], [2, 2]]},
    {id: 'L2', kind: 'large', p: [[0, 0], [2, 2], [0, 4]]},
    {id: 'M', kind: 'medium', p: [[4, 2], [4, 4], [2, 4]]},
    {id: 'S1', kind: 'small', p: [[2, 2], [3, 3], [1, 3]]},
    {id: 'S2', kind: 'small', p: [[4, 0], [4, 2], [3, 1]]},
    {id: 'Q', kind: 'square', p: [[2, 2], [3, 1], [4, 2], [3, 3]]},
    {id: 'P', kind: 'para', p: [[0, 4], [2, 4], [3, 3], [1, 3]]}
  ];
  const centroid = p => [p.reduce((n, a) => n + a[0], 0) / p.length, p.reduce((n, a) => n + a[1], 0) / p.length];
  const tangramPieces = rawTangram.map(v => { const c = centroid(v.p); return {...v, p: v.p.map(([x, y]) => [x - c[0], y - c[1]])}; });
  function signedArea(p) { return p.reduce((a, v, i) => a + v[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * v[1], 0) / 2; }
  const area = p => Math.abs(signedArea(p));
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  function clip(subject, clipping) {
    let out = subject.map(p => [...p]), cp = signedArea(clipping) < 0 ? [...clipping].reverse() : clipping;
    for (let i = 0; i < cp.length && out.length; i++) {
      const a = cp[i], b = cp[(i + 1) % cp.length], input = out; out = [];
      const inside = p => cross(a, b, p) >= -1e-8;
      const intersection = (p, q) => {
        const px = q[0] - p[0], py = q[1] - p[1], ex = b[0] - a[0], ey = b[1] - a[1];
        const den = px * ey - py * ex; if (Math.abs(den) < 1e-10) return q;
        const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den; return [p[0] + t * px, p[1] + t * py];
      };
      for (let j = 0; j < input.length; j++) {
        const p = input[j], q = input[(j + 1) % input.length], pi = inside(p), qi = inside(q);
        if (pi && qi) out.push(q); else if (pi && !qi) out.push(intersection(p, q)); else if (!pi && qi) out.push(intersection(p, q), q);
      }
    }
    return out;
  }
  const intersectionArea = (a, b) => area(clip(a, b));
  function transform(points, pose, scale = 1) {
    const a = (pose.angle || 0) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
    return points.map(([x, y]) => { x *= pose.flip ? -1 : 1; return [pose.x + scale * (x * co - y * si), pose.y + scale * (x * si + y * co)]; });
  }
  function bounds(polygons) { const points = polygons.flat(); return {x0: Math.min(...points.map(p => p[0])), y0: Math.min(...points.map(p => p[1])), x1: Math.max(...points.map(p => p[0])), y1: Math.max(...points.map(p => p[1]))}; }
  function sharedEdge(a, b) {
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
      const p = a[i], q = a[(i + 1) % a.length], u = b[j], v = b[(j + 1) % b.length];
      if (Math.abs(cross(p, q, u)) > 1e-6 || Math.abs(cross(p, q, v)) > 1e-6) continue;
      const axis = Math.abs(q[0] - p[0]) > Math.abs(q[1] - p[1]) ? 0 : 1;
      if (Math.min(Math.max(p[axis], q[axis]), Math.max(u[axis], v[axis])) - Math.max(Math.min(p[axis], q[axis]), Math.min(u[axis], v[axis])) > .4) return true;
    }
    return false;
  }
  function makeTangram(seed, title) {
    let parts;
    if (seed === 0) parts = rawTangram.map(p => ({id: p.id, polygon: p.p, pose: {...Object.fromEntries(['x', 'y'].map((k, i) => [k, centroid(p.p)[i]])), angle: 0, flip: false}}));
    else {
      const random = rng(seed); parts = [];
      for (const piece of tangramPieces) {
        if (!parts.length) { parts.push({id: piece.id, polygon: transform(piece.p, {x: 0, y: 0, angle: 0}), pose: {x: 0, y: 0, angle: 0, flip: false}}); continue; }
        const candidates = [];
        for (let angle = 0; angle < 360; angle += 45) for (const flip of piece.kind === 'para' ? [false, true] : [false]) {
          const rotated = transform(piece.p, {x: 0, y: 0, angle, flip});
          for (const part of parts) for (const p of part.polygon) for (const q of rotated) {
            const pose = {x: p[0] - q[0], y: p[1] - q[1], angle, flip}, poly = transform(piece.p, pose);
            if (parts.some(v => intersectionArea(v.polygon, poly) > 1e-6) || !parts.some(v => sharedEdge(v.polygon, poly))) continue;
            const b = bounds([...parts.map(v => v.polygon), poly]);
            candidates.push({id: piece.id, polygon: poly, pose, score: (b.x1 - b.x0) * (b.y1 - b.y0) + random() * 5});
          }
        }
        candidates.sort((a, b) => a.score - b.score);
        if (!candidates.length) throw new Error('Tangram layout has no connected placement');
        parts.push(candidates[Math.floor(random() * Math.min(4, candidates.length))]);
      }
    }
    const b = bounds(parts.map(p => p.polygon)), scale = Math.min(52, 280 / Math.max(b.x1 - b.x0, b.y1 - b.y0));
    const ox = 210 - (b.x0 + b.x1) * scale / 2, oy = 205 - (b.y0 + b.y1) * scale / 2;
    return {title, scale, parts: parts.map(v => ({id: v.id, kind: tangramPieces.find(p => p.id === v.id).kind,
      polygon: v.polygon.map(([x, y]) => [ox + x * scale, oy + y * scale]), pose: {...v.pose, x: ox + v.pose.x * scale, y: oy + v.pose.y * scale}}))};
  }
  const tangramPuzzles = [makeTangram(0, '정사각형'), makeTangram(73, '바람 조각'), makeTangram(168, '산책길')];
  function newTangram(puzzle = 0, practice = false) {
    return {puzzle, practice, started: practice, poses: [{}, {}], winner: null, finished: false, message: practice ? '연습 모드: 조각을 옮겨 실루엣을 채워요.' : '두 사람 모두 준비되었으면 시작! 먼저 완성한 사람이 이겨요.', hint: [false, false]};
  }
  function tangramPolygon(puzzle, id, pose) { return transform(tangramPieces.find(p => p.id === id).p, pose, puzzle.scale); }
  function tangramCheck(puzzle, poses) {
    if (!poses || typeof poses !== 'object' || Array.isArray(poses)) return {valid: false, solved: false, reason: '조각 위치를 확인하세요.'};
    const ids = Object.keys(poses); if (ids.some(id => !tangramPieces.some(p => p.id === id))) return {valid: false, solved: false, reason: '알 수 없는 조각'};
    if (ids.some(id => !poses[id] || typeof poses[id] !== 'object' || ![poses[id].x, poses[id].y, poses[id].angle].every(Number.isFinite))) return {valid: false, solved: false, reason: '조각 위치를 확인하세요.'};
    const polys = ids.map(id => tangramPolygon(puzzle, id, poses[id]));
    for (let i = 0; i < polys.length; i++) {
      const covered = puzzle.parts.reduce((n, p) => n + intersectionArea(polys[i], p.polygon), 0);
      if (Math.abs(covered - area(polys[i])) > .05) return {valid: false, solved: false, reason: '실루엣 밖으로 나온 조각이 있어요.'};
      for (let j = 0; j < i; j++) if (intersectionArea(polys[i], polys[j]) > .05) return {valid: false, solved: false, reason: '조각이 겹쳐 있어요.'};
    }
    return {valid: true, solved: ids.length === 7, reason: ids.length === 7 ? '7조각으로 실루엣 완성!' : `${ids.length} / 7 조각이 실루엣 안에 있어요.`};
  }
  function symmetricDifference(a, b) { return area(a) + area(b) - 2 * intersectionArea(a, b); }
  function snapTangram(puzzle, id, pose) {
    const piece = tangramPieces.find(p => p.id === id), poly = tangramPolygon(puzzle, id, pose);
    for (const part of puzzle.parts.filter(p => p.kind === piece.kind)) {
      const center = centroid(poly), dest = centroid(part.polygon), dx = dest[0] - center[0], dy = dest[1] - center[1];
      if (Math.hypot(dx, dy) > 19) continue;
      const aligned = poly.map(([x, y]) => [x + dx, y + dy]);
      if (symmetricDifference(aligned, part.polygon) < .05) return {...pose, x: pose.x + dx, y: pose.y + dy};
    }
    return {...pose};
  }
  function tangramPlace(s, player, id, pose) {
    if (!s.started || s.finished || ![0, 1].includes(player) || !tangramPieces.some(p => p.id === id) || !pose || typeof pose !== 'object' || ![pose.x, pose.y, pose.angle].every(Number.isFinite)) return false;
    s.poses[player][id] = snapTangram(tangramPuzzles[s.puzzle], id, pose);
    const check = tangramCheck(tangramPuzzles[s.puzzle], s.poses[player]);
    s.message = `${player + 1}번: ${check.reason}`;
    if (check.solved) { s.finished = true; s.winner = player; s.message = s.practice ? '연습 퍼즐 완성!' : `${player + 1}번이 먼저 완성했어요!`; }
    return check.solved;
  }
  return {copy, rng, shuffle, newTen, tenFlip, tenRing, tenSelect, tenJudge, tenFinish,
    pixelPieces, pixelCards, rectangleCells, newPixel, pixelBoard, pixelCheck, pixelPlace, pixelUndo, pixelHint,
    signs, beats, newFinger, fingerSwap, fingerReady, fingerMoves, fingerRoll, fingerMove,
    tangramPieces, tangramPuzzles, area, intersectionArea, transform, newTangram, tangramPolygon, tangramCheck, snapTangram, tangramPlace};
});
