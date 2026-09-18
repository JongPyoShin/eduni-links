import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const appRoot = new URL('../', import.meta.url);
const strategySource = fs.readFileSync(new URL('portal_app/static_games/eduni_baduk_ai_strategy.js', appRoot), 'utf8');
const coachSource = fs.readFileSync(new URL('portal_app/static_games/eduni_baduk_coach_logic.js', appRoot), 'utf8');

const context = {console};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(strategySource, context);
vm.runInContext(coachSource, context);

const strategy = context.EDUNIBadukAiStrategy;

function board(size) {
  return Array.from({length: size}, () => Array(size).fill(0));
}

function hasPoint(points, row, col) {
  return points.some(([r, c]) => r === row && c === col);
}

test('9x9 and 13x13 candidates are preserved exactly', () => {
  const local = [[2, 2], [4, 4], [6, 6]];
  assert.equal(JSON.stringify(strategy.expandCandidates(board(9), local)), JSON.stringify(local));
  assert.equal(JSON.stringify(strategy.expandCandidates(board(13), local)), JSON.stringify(local));
});

test('19x19 keeps distant strategic anchors after local play begins', () => {
  const source = board(19);
  source[3][3] = 1;
  const local = [[3, 4], [4, 3], [4, 4]];
  const candidates = strategy.expandCandidates(source, local);

  assert.equal(hasPoint(candidates, 15, 15), true);
  assert.equal(hasPoint(candidates, 3, 15), true);
  assert.equal(hasPoint(candidates, 15, 3), true);
});

test('19x19 global candidate expansion stays bounded', () => {
  const source = board(19);
  source[3][3] = 1;
  const local = [[3, 4], [4, 3], [4, 4], [2, 3], [3, 2]];
  const candidates = strategy.expandCandidates(source, local);

  assert.ok(candidates.length <= local.length + 13);
  assert.ok(candidates.length < 50);
  assert.ok(candidates.length < 19 * 19 - 1);
});

test('opening spread score tapers to zero by move 30', () => {
  const source = board(19);
  source[3][3] = 1;
  const early = strategy.scoreMove(source, 15, 15, 1);
  const lateOpening = strategy.scoreMove(source, 15, 15, 29);
  const middleGame = strategy.scoreMove(source, 15, 15, 30);

  assert.ok(early.spread > lateOpening.spread);
  assert.ok(early.opening > lateOpening.opening);
  assert.equal(middleGame.spread, 0);
  assert.equal(middleGame.opening, 0);
});

test('one-stone capture score remains far above pure opening bonuses', () => {
  const source = board(19);
  source[3][3] = 1;
  const bonus = strategy.scoreMove(source, 15, 15, 0);
  assert.ok(bonus.spread + bonus.opening < 86);
});

test('coach explains actual spread component and ignores jitter', () => {
  const coach = context.EDUNIBadukCoachLogic.create({});
  const spreadMove = {
    result: {captured: 0, liberties: 4},
    aiAnalysis: {
      beforeAtari: 0,
      afterAtari: 0,
      components: {capture: 0, atari: 0, spread: 12, opening: 7, neighbors: 0, liberties: 8, center: 3, jitter: 999},
    },
  };
  assert.match(coach.strongestAiReason(spreadMove), /초반이라 넓은 곳/);
  assert.doesNotMatch(coach.strongestAiReason(spreadMove), /999/);

  const captureMove = {
    result: {captured: 1, liberties: 2},
    aiAnalysis: {
      beforeAtari: 0,
      afterAtari: 0,
      components: {capture: 86, atari: 0, spread: 12, opening: 7, neighbors: 0, liberties: 4, center: 0, jitter: 999},
    },
  };
  assert.match(coach.strongestAiReason(captureMove), /내 돌 1개를 바로 잡/);
  assert.doesNotMatch(coach.strongestAiReason(captureMove), /999/);
});