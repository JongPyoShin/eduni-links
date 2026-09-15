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
const {analyzeMove, strongestAiReason} = context.EDUNIBadukCoachLogic.create(engine);

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

test('TC07 opponent atari is detected', () => {
  const board = createBoard();
  board[4][4] = WHITE;
  board[3][4] = BLACK;
  board[5][4] = BLACK;
  const result = analyzeMove(board, 4, 3, BLACK, null);
  assert.equal(result.legal, true);
  assert.ok(result.opponentAtariGroups.length >= 1);
  assert.match(result.summary, /단수/);
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

test('TC11 AI explanation uses actual capture score component', () => {
  const move = {
    result: {captured: 1, liberties: 2},
    aiAnalysis: {
      beforeAtari: 0,
      afterAtari: 0,
      components: {capture: 60, atari: 0, liberties: 3.2, neighbors: 2.2, center: 2.8, edge: 0, jitter: 1.1},
    },
  };
  assert.match(strongestAiReason(move), /잡을 수 있어서/);
});
