/**
 * Contract Fixture Runner — executes shared/bubble_shooter_rule_contract_cases.json
 * against EDUNIBubbleShooterLogic (Node).
 *
 * Proves Web platform exercises the same expected rule cases as Android JVM.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load the logic module
await import('../portal_app/static_games/eduni_bubble_shooter_logic.js');
const L = globalThis.EDUNIBubbleShooterLogic;

// Load the shared fixture
const fixturePath = resolve(import.meta.dirname, '../../shared/bubble_shooter_rule_contract_cases.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));

function parseBubbles(arr) {
  return arr.map(b => ({
    hanja: b.hanja,
    target: b.hanja,
    x: b.x || 0,
    y: b.y || 0,
    r: b.r || 20,
    popped: b.popped || false,
  }));
}

describe('Contract Fixture — shared rule-contract cases', () => {
  it('fixture loads with 11 cases', () => {
    assert.equal(fixture.schemaVersion, 1);
    assert.equal(fixture.cases.length, 11);
  });

  it('all 4 categories covered', () => {
    const cats = new Set(fixture.cases.map(c => c.category));
    assert.deepEqual(cats, new Set(['shot_resolution', 'danger', 'generation', 'target_selection']));
  });

  // --- shot_resolution ---

  describe('shot_resolution', () => {
    it('shot_correct_with_remaining', () => {
      const c = fixture.cases.find(c => c.id === 'shot_correct_with_remaining');
      const bubbles = parseBubbles(c.input.bubbles);
      const hitBubble = bubbles.find(b => b.hanja === c.input.shotHit.hanja);
      const result = L.resolveShot({
        shot: { target: c.input.target.hanja },
        hitBubble,
        bubbles,
        shotTarget: c.input.target.hanja,
      });
      assert.equal(result.type, c.expected.type);
      assert.equal(result.scoreDelta, c.expected.scoreDelta);
      assert.equal(result.addPressure, c.expected.pressure);
      assert.equal(result.gameOver, c.expected.gameOver);
    });

    it('shot_correct_final_bubble', () => {
      const c = fixture.cases.find(c => c.id === 'shot_correct_final_bubble');
      const bubbles = parseBubbles(c.input.bubbles);
      const hitBubble = bubbles.find(b => b.hanja === c.input.shotHit.hanja);
      const result = L.resolveShot({
        shot: { target: c.input.target.hanja },
        hitBubble,
        bubbles,
        shotTarget: c.input.target.hanja,
      });
      assert.equal(result.type, c.expected.type);
      assert.equal(result.scoreDelta, c.expected.scoreDelta);
      assert.equal(result.gameOver, c.expected.gameOver);
    });

    it('shot_wrong_bubble', () => {
      const c = fixture.cases.find(c => c.id === 'shot_wrong_bubble');
      const bubbles = parseBubbles(c.input.bubbles);
      const hitBubble = bubbles.find(b => b.hanja === c.input.shotHit.hanja);
      const result = L.resolveShot({
        shot: { target: c.input.target.hanja },
        hitBubble,
        bubbles,
        shotTarget: c.input.target.hanja,
      });
      assert.equal(result.type, c.expected.type);
      assert.equal(result.scoreDelta, c.expected.scoreDelta);
      assert.equal(result.addPressure, c.expected.pressure);
    });

    it('shot_empty_miss', () => {
      const c = fixture.cases.find(c => c.id === 'shot_empty_miss');
      const bubbles = parseBubbles(c.input.bubbles);
      const result = L.resolveShot({
        shot: { target: c.input.target.hanja },
        hitBubble: null,
        bubbles,
        shotTarget: c.input.target.hanja,
      });
      assert.equal(result.type, c.expected.type);
      assert.equal(result.scoreDelta, c.expected.scoreDelta);
      assert.equal(result.addPressure, c.expected.pressure);
    });
  });

  // --- danger ---

  describe('danger', () => {
    it('danger_false_all_above', () => {
      const c = fixture.cases.find(c => c.id === 'danger_false_all_above');
      const bubbles = parseBubbles(c.input.bubbles);
      assert.equal(L.isDanger(bubbles, c.input.dangerLineY), c.expected.danger);
    });

    it('danger_true_one_crossing', () => {
      const c = fixture.cases.find(c => c.id === 'danger_true_one_crossing');
      const bubbles = parseBubbles(c.input.bubbles);
      assert.equal(L.isDanger(bubbles, c.input.dangerLineY), c.expected.danger);
    });

    it('danger_popped_ignored', () => {
      const c = fixture.cases.find(c => c.id === 'danger_popped_ignored');
      const bubbles = parseBubbles(c.input.bubbles);
      assert.equal(L.isDanger(bubbles, c.input.dangerLineY), c.expected.danger);
    });
  });

  // --- generation ---

  describe('generation', () => {
    it('generation_valid_match', () => {
      const c = fixture.cases.find(c => c.id === 'generation_valid_match');
      assert.equal(L.isGenerationValid(c.input.expectedGeneration, c.input.actualGeneration), c.expected.valid);
    });

    it('generation_invalid_mismatch', () => {
      const c = fixture.cases.find(c => c.id === 'generation_invalid_mismatch');
      assert.equal(L.isGenerationValid(c.input.expectedGeneration, c.input.actualGeneration), c.expected.valid);
    });
  });

  // --- target_selection ---

  describe('target_selection', () => {
    it('target_eligible_live_only', () => {
      const c = fixture.cases.find(c => c.id === 'target_eligible_live_only');
      const bubbles = parseBubbles(c.input.bubbles);
      const eligible = bubbles.filter(b => !b.popped);
      assert.equal(eligible.length, c.expected.eligibleCount);
      const hanjas = eligible.map(b => b.hanja).sort();
      assert.deepEqual(hanjas, c.expected.eligibleHanja.sort());
    });

    it('target_front_row_preference', () => {
      const c = fixture.cases.find(c => c.id === 'target_front_row_preference');
      const bubbles = parseBubbles(c.input.bubbles);
      const live = bubbles.filter(b => !b.popped);
      const maxY = Math.max(...live.map(b => b.y));
      const frontRow = live.filter(b => (maxY - b.y) <= c.input.frontRowThreshold);
      assert.equal(frontRow.length, c.expected.frontRowCount);
      const hanjas = frontRow.map(b => b.hanja).sort();
      assert.deepEqual(hanjas, c.expected.frontRowHanja.sort());
    });
  });
});
