import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const appRoot = new URL('../', import.meta.url);
const persistenceSource = fs.readFileSync(new URL('portal_app/static_games/eduni_baduk_persistence.js', appRoot), 'utf8');

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    _store: store,
  };
}

function createContext(ls) {
  const ctx = {console, Math, JSON, Date, Array, Object, Number, String, Boolean, Set, Map};
  ctx.localStorage = ls || makeLocalStorage();
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(persistenceSource, ctx);
  return ctx;
}

function board9() { return Array.from({length: 9}, () => Array(9).fill(0)); }
function board13() { return Array.from({length: 13}, () => Array(13).fill(0)); }
function board19() { return Array.from({length: 19}, () => Array(19).fill(0)); }

function baseState(size, levelId) {
  const b = size === 9 ? board9() : size === 13 ? board13() : board19();
  b[3][3] = 1; b[4][4] = 2;
  return {
    version: 1, levelId, boardSize: size, mode: 'ai',
    board: b, currentPlayer: 1, previousPosition: null,
    captures: {'1': 0, '2': 1}, moveCount: 2, consecutivePasses: 0,
    lastMove: {row: 4, col: 4, color: 2}, gameOver: false, coachEnabled: true,
  };
}

test('valid 9x9 state serializes and restores', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  const json = P.serialize(s);
  const loaded = P.deserialize(json);
  assert.deepEqual(loaded.board, s.board);
  assert.equal(loaded.levelId, 'beginner');
  assert.equal(loaded.boardSize, 9);
  assert.equal(loaded.currentPlayer, 1);
  assert.equal(loaded.mode, 'ai');
});

test('valid 13x13 state serializes and restores', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(13, 'intermediate');
  const json = P.serialize(s);
  const loaded = P.deserialize(json);
  assert.deepEqual(loaded.board, s.board);
  assert.equal(loaded.levelId, 'intermediate');
  assert.equal(loaded.boardSize, 13);
});

test('valid 19x19 state serializes and restores', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(19, 'standard');
  const json = P.serialize(s);
  const loaded = P.deserialize(json);
  assert.deepEqual(loaded.board, s.board);
  assert.equal(loaded.levelId, 'standard');
  assert.equal(loaded.boardSize, 19);
});

test('board, captures, turn, moveCount, lastMove, ko survive round trip', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  s.captures = {'1': 3, '2': 5};
  s.moveCount = 17;
  s.consecutivePasses = 1;
  s.lastMove = {row: 7, col: 2, color: 1};
  s.previousPosition = {row: 3, col: 3};
  const json = P.serialize(s);
  const loaded = P.deserialize(json);
  assert.deepEqual(loaded.captures, {'1': 3, '2': 5});
  assert.equal(loaded.moveCount, 17);
  assert.equal(loaded.consecutivePasses, 1);
  assert.deepEqual(loaded.lastMove, {row: 7, col: 2, color: 1});
  assert.deepEqual(loaded.previousPosition, {row: 3, col: 3});
});

test('AI/local mode survives round trip', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const ai = baseState(9, 'beginner');
  ai.mode = 'ai';
  const local = baseState(9, 'beginner');
  local.mode = 'local';
  assert.equal(P.deserialize(P.serialize(ai)).mode, 'ai');
  assert.equal(P.deserialize(P.serialize(local)).mode, 'local');
});

test('unsupported schema version is rejected', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  s.version = 999;
  assert.equal(P.validateState(s), false);
  assert.equal(P.deserialize('{"version":999}'), null);
});

test('malformed JSON is rejected safely', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  assert.equal(P.deserialize('not json at all'), null);
  assert.equal(P.deserialize(''), null);
  assert.equal(P.deserialize(undefined), null);
  assert.equal(P.deserialize(null), null);
});

test('wrong board dimension is rejected', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  s.board = board13();
  assert.equal(P.validateState(s), false);
});

test('invalid stone value is rejected', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  s.board[0][0] = 5;
  assert.equal(P.validateState(s), false);
});

test('out-of-range last move is rejected', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  s.lastMove = {row: 99, col: 0, color: 1};
  assert.equal(P.validateState(s), false);
});

test('storage exception does not break game startup/play', () => {
  const broken_ls = {
    getItem() { throw new Error('quota'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('quota'); },
  };
  const ctx = createContext(broken_ls);
  const P = ctx.EDUNIBadukPersistence;
  assert.equal(P.load(), null);
  assert.equal(P.save(baseState(9, 'beginner')), false);
  assert.doesNotThrow(() => P.clear());
});

test('new-game clear prevents old state from returning', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  P.save(baseState(9, 'beginner'));
  assert.notEqual(P.load(), null);
  P.clear();
  assert.equal(P.load(), null);
});

test('preview/ghost state is not persisted', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(9, 'beginner');
  const json = P.serialize(s);
  assert.ok(!json.includes('preview'));
  assert.ok(!json.includes('ghost'));
  assert.ok(!json.includes('aiThinking'));
});

test('storage round trip via save/load', () => {
  const ctx = createContext();
  const P = ctx.EDUNIBadukPersistence;
  const s = baseState(13, 'intermediate');
  P.save(s);
  const loaded = P.load();
  assert.deepEqual(loaded.board, s.board);
  assert.equal(loaded.levelId, 'intermediate');
  P.clear();
  assert.equal(P.load(), null);
});
