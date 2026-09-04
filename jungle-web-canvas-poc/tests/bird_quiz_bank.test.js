import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BIRD_QUIZ_BANK } from '../src/content/bird_quiz_bank.js';

describe('BIRD_QUIZ_BANK', () => {
  it('exports an array with exactly 265 questions', () => {
    assert.ok(Array.isArray(BIRD_QUIZ_BANK));
    assert.equal(BIRD_QUIZ_BANK.length, 265);
  });

  it('has sequential IDs q001 through q265 with no gaps', () => {
    for (let i = 0; i < 265; i++) {
      const expected = `q${String(i + 1).padStart(3, '0')}`;
      assert.equal(BIRD_QUIZ_BANK[i].id, expected, `Question at index ${i} should have id ${expected}`);
    }
  });

  it('each question has required fields', () => {
    const requiredFields = ['id', 'category', 'question', 'choices', 'answer', 'explanation'];
    for (const q of BIRD_QUIZ_BANK) {
      for (const field of requiredFields) {
        assert.ok(field in q, `Question ${q.id} is missing field: ${field}`);
      }
    }
  });

  it('each question has exactly 4 choices', () => {
    for (const q of BIRD_QUIZ_BANK) {
      assert.equal(q.choices.length, 4, `Question ${q.id} does not have exactly 4 choices`);
    }
  });

  it('each question has unique choice IDs within that question', () => {
    for (const q of BIRD_QUIZ_BANK) {
      const ids = q.choices.map(c => c.id);
      const uniqueIds = new Set(ids);
      assert.equal(ids.length, uniqueIds.size, `Question ${q.id} has duplicate choice IDs`);
    }
  });

  it('each answer matches one of its choice IDs', () => {
    for (const q of BIRD_QUIZ_BANK) {
      const choiceIds = q.choices.map(c => c.id);
      assert.ok(choiceIds.includes(q.answer), `Question ${q.id} answer "${q.answer}" is not a valid choice ID`);
    }
  });

  it('no duplicate question stems', () => {
    const stems = BIRD_QUIZ_BANK.map(q => q.question.replace(/\s+/g, ' ').trim());
    const uniqueStems = new Set(stems);
    assert.equal(stems.length, uniqueStems.size, 'There are duplicate question stems');
  });

  it('all categories are from the expected set', () => {
    const validCategories = new Set([
      'nature', 'dailyLife', 'science', 'math', 'korean', 'observation',
      'animals', 'plants', 'weather', 'water_nature', 'space',
      'senses', 'basic_science', 'safety', 'environment'
    ]);
    for (const q of BIRD_QUIZ_BANK) {
      assert.ok(validCategories.has(q.category), `Question ${q.id} has invalid category: ${q.category}`);
    }
  });

  it('all questions are frozen objects', () => {
    assert.ok(Object.isFrozen(BIRD_QUIZ_BANK), 'BIRD_QUIZ_BANK should be frozen');
    for (const q of BIRD_QUIZ_BANK) {
      assert.ok(Object.isFrozen(q), `Question ${q.id} should be frozen`);
      assert.ok(Object.isFrozen(q.choices), `Question ${q.id} choices should be frozen`);
      for (const c of q.choices) {
        assert.ok(Object.isFrozen(c), `Question ${q.id} choice ${c.id} should be frozen`);
      }
    }
  });
});
