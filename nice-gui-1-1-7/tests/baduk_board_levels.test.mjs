import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, '..', 'portal_app', 'static_games', 'eduni_baduk_v2.html');

function makeElement(id) {
  const listeners = new Map();
  return {
    id,
    value: id === 'level' ? 'beginner' : id === 'mode' ? 'ai' : '',
    checked: id === 'coachEnabled',
    disabled: false,
    textContent: '',
    className: '',
    style: {},
    attributes: {},
    classList: {
      add() {},
      remove() {},
    },
    addEventListener(type, handler) { listeners.set(type, handler); },
    appendChild() {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getBoundingClientRect() { return {left: 0, top: 0, width: 640, height: 640}; },
    _listeners: listeners,
  };
}

function makeContext2d() {
  const gradient = () => ({addColorStop() {}});
  return {
    clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
    save() {}, restore() {}, setTransform() {},
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  };
}

function loadGame() {
  const html = fs.readFileSync(HTML, 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'inline game script must exist');

  const ids = [
    'board','miniBoard','turnText','modeText','message','result','mode','level','levelNote','boardSubtitle','rules',
    'blackCaptured','whiteCaptured','moveCount','pass','resign','coachEnabled','coachCard','coachIcon','coachTitle',
    'coachSummary','coachBadges','confirmMove','cancelPreview','newGame','hint',
  ];
  const elements = new Map(ids.map(id => [id, makeElement(id)]));
  elements.get('board').getContext = () => makeContext2d();
  elements.get('miniBoard').getContext = () => makeContext2d();

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, makeElement(id));
      return elements.get(id);
    },
    createElement() { return makeElement('created'); },
  };
  const window = {
    devicePixelRatio: 1,
    addEventListener() {},
  };
  const context = vm.createContext({
    window,
    document,
    console,
    Math,
    Set,
    Map,
    Array,
    Object,
    Number,
    String,
    Boolean,
    JSON,
    Date,
    requestAnimationFrame: fn => fn(),
    setTimeout: () => 1,
    clearTimeout() {},
  });
  vm.runInContext(match[1], context, {filename: 'eduni_baduk_v2.inline.js'});
  return {engine: window.EDUNIBadukEngine, elements};
}

test('level presets expose 9x9, 13x13, and 19x19 boards', () => {
  const {engine} = loadGame();
  assert.ok(engine);
  assert.equal(engine.SIZE, 9);
  assert.equal(engine.createBoard().length, 9);

  assert.equal(engine.setLevel('intermediate'), true);
  assert.equal(engine.SIZE, 13);
  assert.equal(engine.createBoard().length, 13);
  assert.equal(engine.createBoard()[0].length, 13);

  assert.equal(engine.setLevel('standard'), true);
  assert.equal(engine.SIZE, 19);
  assert.equal(engine.createBoard().length, 19);
  assert.equal(engine.createBoard()[0].length, 19);
});

test('level change resets state and updates learning metadata', () => {
  const {engine, elements} = loadGame();
  engine.setLevel('intermediate');
  let state = engine.getState();
  assert.equal(state.boardSize, 13);
  assert.equal(state.levelId, 'intermediate');
  assert.equal(state.moveCount, 0);
  assert.match(elements.get('boardSubtitle').textContent, /중급 13×13/);
  assert.match(elements.get('levelNote').textContent, /전술 설명/);

  engine.setLevel('standard');
  state = engine.getState();
  assert.equal(state.boardSize, 19);
  assert.equal(state.levelId, 'standard');
  assert.match(elements.get('boardSubtitle').textContent, /정규 19×19/);
  assert.match(elements.get('levelNote').textContent, /상세 설명/);
});

test('rules engine remains board-size aware after switching levels', () => {
  const {engine} = loadGame();
  for (const [level, size] of [['beginner', 9], ['intermediate', 13], ['standard', 19]]) {
    engine.setLevel(level);
    const board = engine.createBoard();
    assert.equal(engine.tryMove(board, 0, 0, engine.BLACK).legal, true);
    assert.equal(engine.tryMove(board, size - 1, size - 1, engine.BLACK).legal, true);
    assert.equal(engine.tryMove(board, size, size, engine.BLACK).legal, false);
  }
});

test('AI and coach profiles become less random and more detailed by level', () => {
  const {engine} = loadGame();
  assert.equal(engine.LEVELS.beginner.size, 9);
  assert.equal(engine.LEVELS.intermediate.size, 13);
  assert.equal(engine.LEVELS.standard.size, 19);
  assert.ok(engine.LEVELS.beginner.ai.jitter > engine.LEVELS.intermediate.ai.jitter);
  assert.ok(engine.LEVELS.intermediate.ai.jitter > engine.LEVELS.standard.ai.jitter);
  assert.equal(engine.LEVELS.beginner.coach, '쉬운 말');
  assert.equal(engine.LEVELS.intermediate.coach, '전술 설명');
  assert.equal(engine.LEVELS.standard.coach, '상세 설명');
});

test('invalid level is rejected without changing the current board preset', () => {
  const {engine} = loadGame();
  engine.setLevel('intermediate');
  assert.equal(engine.setLevel('does-not-exist'), false);
  assert.equal(engine.SIZE, 13);
  assert.equal(engine.LEVEL_ID, 'intermediate');
});
