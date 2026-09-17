import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SIZE = 9;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const createBoard = () => Array.from({length: SIZE}, () => Array(SIZE).fill(EMPTY));
const cloneBoard = source => source.map(row => row.slice());
const boardKey = source => source.map(row => row.join('')).join('/');
const inside = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;

function groupAt(source, row, col) {
  const color = source[row]?.[col] ?? EMPTY;
  if (color === EMPTY) return {stones: [], liberties: []};
  const queue = [[row, col]];
  const seen = new Set([`${row},${col}`]);
  const liberties = new Set();
  const stones = [];
  for (let i = 0; i < queue.length; i++) {
    const [r, c] = queue[i];
    stones.push([r, c]);
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (!inside(nr, nc)) continue;
      if (source[nr][nc] === EMPTY) liberties.add(`${nr},${nc}`);
      else if (source[nr][nc] === color) {
        const key = `${nr},${nc}`;
        if (!seen.has(key)) { seen.add(key); queue.push([nr, nc]); }
      }
    }
  }
  return {stones, liberties: [...liberties].map(v => v.split(',').map(Number))};
}

function tryMove(source, row, col, color, koState = null) {
  if (!inside(row, col)) return {legal: false, reason: '바둑판 안에 놓아 주세요.'};
  if (source[row][col] !== EMPTY) return {legal: false, reason: '이미 돌이 있는 자리예요.'};
  const next = cloneBoard(source);
  next[row][col] = color;
  const opponent = color === BLACK ? WHITE : BLACK;
  let captured = 0;
  const checked = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = row + dr, nc = col + dc;
    if (!inside(nr, nc) || next[nr][nc] !== opponent) continue;
    const marker = `${nr},${nc}`;
    if (checked.has(marker)) continue;
    const group = groupAt(next, nr, nc);
    group.stones.forEach(([gr, gc]) => checked.add(`${gr},${gc}`));
    if (group.liberties.length === 0) {
      captured += group.stones.length;
      group.stones.forEach(([gr, gc]) => { next[gr][gc] = EMPTY; });
    }
  }
  const own = groupAt(next, row, col);
  if (own.liberties.length === 0) return {legal: false, reason: '자충수는 둘 수 없어요.'};
  const key = boardKey(next);
  if (koState && key === koState) return {legal: false, reason: '패 때문에 바로 되따낼 수 없어요.'};
  return {legal: true, board: next, captured, liberties: own.liberties.length, key};
}

const context = {console};
context.globalThis = context;
vm.createContext(context);
const logicPath = new URL('../portal_app/static_games/eduni_baduk_coach_logic.js', import.meta.url);
vm.runInContext(fs.readFileSync(logicPath, 'utf8'), context, {filename: logicPath.pathname});
const engine = {SIZE, EMPTY, BLACK, WHITE, createBoard, cloneBoard, boardKey, groupAt, tryMove};
const {analyzeMove, analyzeAiDanger, suggestHint, ruleGuide, strongestAiReason} = context.EDUNIBadukCoachLogic.create(engine);

test('TC01/TC12 empty-board analysis is legal and pure', () => {
  const board = createBoard();
  const before = boardKey(board);
  const result = analyzeMove(board, 4, 4, BLACK, null);
  assert.equal(result.legal, true);
  assert.equal(result.sourceUnchanged, true);
  assert.equal(boardKey(board), before);
  assert.equal(result.ownLibertiesAfter, 4);
  assert.match(result.summary, /활로/);
});

test('TC02 occupied point is rejected', () => {
  const board = createBoard();
  board[4][4] = BLACK;
  const result = analyzeMove(board, 4, 4, WHITE, null);
  assert.equal(result.legal, false);
  assert.equal(result.reasonCode, 'occupied');
});

test('TC03 suicide is rejected with beginner wording', () => {
  const board = createBoard();
  [[3,4],[5,4],[4,3],[4,5]].forEach(([r,c]) => { board[r][c] = WHITE; });
  const result = analyzeMove(board, 4, 4, BLACK, null);
  assert.equal(result.legal, false);
  assert.equal(result.reasonCode, 'suicide');
  assert.match(result.summary, /활로/);
});

test('TC04/TC06 capture is legal and exposes captured coordinates', () => {
  const board = createBoard();
  board[4][4] = WHITE;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { board[r][c] = BLACK; });
  const result = analyzeMove(board, 4, 5, BLACK, null);
  assert.equal(result.legal, true);
  assert.equal(result.captured, 1);
  assert.equal(JSON.stringify(result.capturedStones), JSON.stringify([[4,4]]));
  assert.match(result.summary, /잡아요/);
});

test('TC05 simple ko reason is exposed', () => {
  const board = createBoard();
  const future = tryMove(board, 4, 4, BLACK, null);
  const result = analyzeMove(board, 4, 4, BLACK, future.key);
  assert.equal(result.legal, false);
  assert.equal(result.reasonCode, 'ko');
});

test('TC07 opponent atari is detected with child-friendly wording', () => {
  const board = createBoard();
  board[4][4] = WHITE;
  board[3][4] = BLACK;
  board[5][4] = BLACK;
  const result = analyzeMove(board, 4, 3, BLACK, null);
  assert.equal(result.legal, true);
  assert.ok(result.opponentAtariGroups.length >= 1);
  assert.match(result.summary, /숨 쉴 곳/);
});

test('TC08 own atari group rescue is detected', () => {
  const board = createBoard();
  board[4][4] = BLACK;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { board[r][c] = WHITE; });
  const result = analyzeMove(board, 4, 5, BLACK, null);
  assert.equal(result.legal, true);
  assert.equal(result.rescuedOwnGroups, 1);
  assert.match(result.summary, /위험했던 내 돌/);
});

test('TC09 two friendly groups connect through one move', () => {
  const board = createBoard();
  board[4][3] = BLACK;
  board[4][5] = BLACK;
  const result = analyzeMove(board, 4, 4, BLACK, null);
  assert.equal(result.legal, true);
  assert.ok(result.connectedOwnGroups >= 2);
  assert.match(result.summary, /이어져요/);
});

test('TC10 legal self-atari is warned, not rejected', () => {
  const board = createBoard();
  [[3,4],[4,3],[4,5]].forEach(([r,c]) => { board[r][c] = WHITE; });
  const result = analyzeMove(board, 4, 4, BLACK, null);
  assert.equal(result.legal, true);
  assert.equal(result.selfAtariRisk, true);
  assert.match(result.title, /조심/);
});

test('TC11 AI explanation uses actual capture count and simple wording', () => {
  const move = {
    result: {captured: 2, liberties: 2},
    aiAnalysis: {
      beforeAtari: 0,
      afterAtari: 0,
      components: {capture: 120, atari: 0, liberties: 3.2, neighbors: 2.2, center: 2.8, edge: 0, jitter: 999},
    },
  };
  assert.match(strongestAiReason(move), /내 돌 2개/);
  assert.doesNotMatch(strongestAiReason(move), /999/);
});

test('AI danger: capture is critical and counts exact stones', () => {
  const before = createBoard();
  before[4][4] = BLACK;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { before[r][c] = WHITE; });
  const after = cloneBoard(before);
  after[4][5] = WHITE;
  after[4][4] = EMPTY;
  const result = analyzeAiDanger(before, after, {row:4,col:5});
  assert.equal(result.level, 'critical');
  assert.equal(result.capturedCount, 1);
  assert.equal(JSON.stringify(result.affectedStones), JSON.stringify([[4,4]]));
  assert.match(result.summary, /1개/);
});

test('AI danger: newly reduced to one liberty is danger', () => {
  const before = createBoard();
  before[4][4] = BLACK;
  before[3][4] = WHITE;
  before[4][3] = WHITE;
  const after = cloneBoard(before);
  after[5][4] = WHITE;
  const result = analyzeAiDanger(before, after, {row:5,col:4});
  assert.equal(result.level, 'danger');
  assert.equal(result.beforeLiberties, 2);
  assert.equal(result.afterLiberties, 1);
  assert.equal(result.libertyPoints.length, 1);
  assert.match(result.summary, /숨 쉴 곳이 1개/);
});

test('AI danger: newly reduced to two liberties is caution', () => {
  const before = createBoard();
  before[4][4] = BLACK;
  before[3][4] = WHITE;
  const after = cloneBoard(before);
  after[5][4] = WHITE;
  const result = analyzeAiDanger(before, after, {row:5,col:4});
  assert.equal(result.level, 'caution');
  assert.equal(result.beforeLiberties, 3);
  assert.equal(result.afterLiberties, 2);
});

test('AI danger: unrelated already-dangerous group is not blamed on remote move', () => {
  const before = createBoard();
  before[4][4] = BLACK;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { before[r][c] = WHITE; });
  const after = cloneBoard(before);
  after[0][0] = WHITE;
  const result = analyzeAiDanger(before, after, {row:0,col:0});
  assert.equal(result.level, 'safe');
  assert.equal(result.reasonCode, 'safe');
});

test('AI danger analysis does not mutate either board', () => {
  const before = createBoard();
  before[4][4] = BLACK;
  before[3][4] = WHITE;
  const after = cloneBoard(before);
  after[5][4] = WHITE;
  const beforeKey = boardKey(before);
  const afterKey = boardKey(after);
  const result = analyzeAiDanger(before, after, {row:5,col:4});
  assert.equal(boardKey(before), beforeKey);
  assert.equal(boardKey(after), afterKey);
  assert.equal(result.sourceUnchanged, true);
});

test('AI atari reason explains breathing spaces and ignores jitter', () => {
  const move = {
    result: {captured: 0, liberties: 3},
    aiAnalysis: {
      beforeAtari: 0,
      afterAtari: 1,
      components: {capture: 0, atari: 12, liberties: 2, neighbors: 1, center: 1, edge: 0, jitter: 9999},
    },
  };
  const reason = strongestAiReason(move);
  assert.match(reason, /숨 쉴 곳/);
  assert.doesNotMatch(reason, /9999/);
});

test('hint: capture is recommended before generic safe moves', () => {
  const board = createBoard();
  board[4][4] = WHITE;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { board[r][c] = BLACK; });
  const before = boardKey(board);
  const hint = suggestHint(board, BLACK, null);
  assert.equal(hint.type, 'capture');
  assert.equal(hint.row, 4);
  assert.equal(hint.col, 5);
  assert.equal(hint.analysis.captured, 1);
  assert.match(hint.summary, /1개/);
  assert.equal(boardKey(board), before);
  assert.equal(hint.sourceUnchanged, true);
});

test('hint: endangered own group rescue is preferred', () => {
  const board = createBoard();
  board[4][4] = BLACK;
  [[3,4],[5,4],[4,3]].forEach(([r,c]) => { board[r][c] = WHITE; });
  const hint = suggestHint(board, BLACK, null);
  assert.equal(hint.type, 'rescue');
  assert.equal(hint.row, 4);
  assert.equal(hint.col, 5);
  assert.match(hint.summary, /숨 쉴 곳/);
});

test('hint: empty board is deterministic and prefers the center', () => {
  const board = createBoard();
  const first = suggestHint(board, BLACK, null);
  const second = suggestHint(board, BLACK, null);
  assert.equal(first.type, 'safe');
  assert.equal(first.row, 4);
  assert.equal(first.col, 4);
  assert.equal(second.row, first.row);
  assert.equal(second.col, first.col);
});

test('hint: safer legal move is preferred over self-atari', () => {
  const board = createBoard();
  [[3,4],[4,3],[4,5]].forEach(([r,c]) => { board[r][c] = WHITE; });
  const hint = suggestHint(board, BLACK, null);
  assert.notEqual(hint.type, 'risky');
  assert.equal(hint.analysis.selfAtariRisk, false);
});

test('rule guide explains liberties, capture, ko and komi in simple Korean', () => {
  const rules = ruleGuide(6.5);
  assert.equal(rules.length, 6);
  const text = rules.map(rule => `${rule.title} ${rule.summary}`).join(' ');
  assert.match(text, /숨 쉴 곳\(활로\)/);
  assert.match(text, /모두 막으면/);
  assert.match(text, /패/);
  assert.match(text, /덤 6\.5집/);
});