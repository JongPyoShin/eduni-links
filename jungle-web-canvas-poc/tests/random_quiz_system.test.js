import test from "node:test";
import assert from "node:assert/strict";
import { BIRD_QUIZ_BANK } from "../src/content/bird_quiz_bank.js";
import {
  createBirdQuizSession,
  currentQuestion,
  answerBirdQuiz,
  isQuizComplete,
  isCaptureSuccess,
  pickQuestions,
  shuffleChoices,
  QUIZ_LENGTH,
  PASS_THRESHOLD,
} from "../src/content/bird_quiz.js";
import {
  getStageQuizPool,
  pickStageQuestions,
  getStagePoolIds,
  getStagePoolCount,
} from "../src/content/stage_quiz_pools.js";

const STAGES = ["camp", "waterfall", "cave", "giantTree", "skyRidge"];

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// TC-RNG-01: 265 bank integrity
test("TC-RNG-01: 265 bank integrity — sequential IDs, no gaps, required fields", () => {
  assert.equal(BIRD_QUIZ_BANK.length, 265);
  for (let i = 0; i < 265; i++) {
    const q = BIRD_QUIZ_BANK[i];
    assert.equal(q.id, `q${String(i + 1).padStart(3, "0")}`);
    assert.ok(q.question, `${q.id} missing question`);
    assert.ok(Array.isArray(q.choices) && q.choices.length === 4, `${q.id} must have 4 choices`);
    assert.ok(q.answer, `${q.id} missing answer`);
    assert.ok(q.explanation, `${q.id} missing explanation`);
  }
});

// TC-RNG-02: 5 stage pools >=20, duplicate 0 across all pools
test("TC-RNG-02: 5 stage pools each >=20 with zero cross-pool duplicates", () => {
  const allIds = [];
  for (const stage of STAGES) {
    const ids = getStagePoolIds(stage);
    assert.ok(ids.length >= 20, `${stage} pool has ${ids.length}, need >=20`);
    allIds.push(...ids);
  }
  const unique = new Set(allIds);
  assert.equal(allIds.length, unique.size, `Cross-pool duplicates found: ${allIds.length - unique.size}`);
});

// TC-RNG-03: pickStageQuestions returns exactly 3 unique questions per attempt
test("TC-RNG-03: attempt당 정확히 3 unique questions", () => {
  for (const stage of STAGES) {
    const questions = pickStageQuestions(stage, BIRD_QUIZ_BANK, new Set(), Math.random);
    assert.equal(questions.length, 3, `${stage}: expected 3, got ${questions.length}`);
    const ids = questions.map((q) => q.id);
    assert.equal(new Set(ids).size, 3, `${stage}: non-unique IDs in attempt: ${ids}`);
  }
});

// TC-RNG-04: 1000 iterations — no duplicate within any single attempt
test("TC-RNG-04: 1000 iterations — zero intra-attempt duplicates", () => {
  for (const stage of STAGES) {
    for (let i = 0; i < 1000; i++) {
      const rng = seededRng(i * 100 + STAGES.indexOf(stage));
      const questions = pickStageQuestions(stage, BIRD_QUIZ_BANK, new Set(), rng);
      const ids = questions.map((q) => q.id);
      assert.equal(new Set(ids).size, 3, `${stage} iteration ${i}: duplicate in ${ids}`);
    }
  }
});

// TC-RNG-05: 500 adventure simulations — 15 questions all unique
test("TC-RNG-05: 500 adventure simulations — 15-question cross-stage uniqueness", () => {
  for (let i = 0; i < 500; i++) {
    const usedIds = new Set();
    const adventureIds = [];
    for (const stage of STAGES) {
      const rng = seededRng(i * 7 + STAGES.indexOf(stage));
      const questions = pickStageQuestions(stage, BIRD_QUIZ_BANK, usedIds, rng);
      for (const q of questions) {
        usedIds.add(q.id);
        adventureIds.push(q.id);
      }
    }
    assert.equal(new Set(adventureIds).size, 15, `Adventure ${i}: not 15 unique IDs`);
  }
});

// TC-RNG-06: Variation across seeds — same stage produces different sets
test("TC-RNG-06: Multiple seeds produce actual variation within same stage", () => {
  const stage = "camp";
  const sets = new Set();
  for (let i = 0; i < 50; i++) {
    const rng = seededRng(i + 1000);
    const questions = pickStageQuestions(stage, BIRD_QUIZ_BANK, new Set(), rng);
    sets.add(questions.map((q) => q.id).sort().join(","));
  }
  assert.ok(sets.size >= 6, `Expected >=6 distinct sets from 50 seeds, got ${sets.size}`);
});

// TC-RNG-07: Immediate retry — new questions, zero overlap with previous attempt
test("TC-RNG-07: Immediate retry produces zero overlap when pool is large enough", () => {
  for (const stage of STAGES) {
    const pool = getStagePoolIds(stage);
    if (pool.length < 6) continue;
    const rng1 = seededRng(42);
    const first = pickStageQuestions(stage, BIRD_QUIZ_BANK, new Set(), rng1);
    const firstIds = new Set(first.map((q) => q.id));
    const rng2 = seededRng(99);
    const usedIds = new Set([...firstIds]);
    const second = pickStageQuestions(stage, BIRD_QUIZ_BANK, usedIds, rng2);
    for (const q of second) {
      assert.ok(!firstIds.has(q.id), `${stage}: retry overlaps with first attempt: ${q.id}`);
    }
  }
});

// TC-RNG-08: 3/3 success — all correct
test("TC-RNG-08: 3/3 all correct → capture success", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  for (const q of s.questions) {
    const result = answerBirdQuiz(s, q.answer);
    s = result.session;
    assert.equal(result.correct, true);
  }
  assert.equal(isQuizComplete(s), true);
  assert.equal(isCaptureSuccess(s), true);
  assert.equal(s.correctCount, 3);
});

// TC-RNG-09: 2/3 success — exactly threshold
test("TC-RNG-09: 2/3 correct → capture success (threshold met)", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  let answered = 0;
  for (const q of s.questions) {
    answered++;
    if (answered <= 2) {
      const result = answerBirdQuiz(s, q.answer);
      s = result.session;
      assert.equal(result.correct, true);
    } else {
      const wrongId = q.choices.find((c) => c.id !== q.answer)?.id || "wrong";
      const result = answerBirdQuiz(s, wrongId);
      s = result.session;
      assert.equal(result.correct, false);
    }
  }
  assert.equal(isQuizComplete(s), true);
  assert.equal(isCaptureSuccess(s), true);
  assert.equal(s.correctCount, 2);
});

// TC-RNG-10: 1/3 fail — below threshold
test("TC-RNG-10: 1/3 correct → capture fail", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  let answered = 0;
  for (const q of s.questions) {
    answered++;
    if (answered === 1) {
      const result = answerBirdQuiz(s, q.answer);
      s = result.session;
      assert.equal(result.correct, true);
    } else {
      const wrongId = q.choices.find((c) => c.id !== q.answer)?.id || "wrong";
      const result = answerBirdQuiz(s, wrongId);
      s = result.session;
      assert.equal(result.correct, false);
    }
  }
  assert.equal(isQuizComplete(s), true);
  assert.equal(isCaptureSuccess(s), false);
  assert.equal(s.correctCount, 1);
});

// TC-RNG-11: 0/3 fail — all wrong
test("TC-RNG-11: 0/3 correct → capture fail", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  for (const q of s.questions) {
    const wrongId = q.choices.find((c) => c.id !== q.answer)?.id || "wrong";
    const result = answerBirdQuiz(s, wrongId);
    s = result.session;
    assert.equal(result.correct, false);
  }
  assert.equal(isQuizComplete(s), true);
  assert.equal(isCaptureSuccess(s), false);
  assert.equal(s.correctCount, 0);
});

// TC-RNG-12: currentQuestion is stable across multiple calls (same session)
test("TC-RNG-12: modal close/reopen — current question ID/number stays stable", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  const q1 = currentQuestion(session);
  const q2 = currentQuestion(session);
  const q3 = currentQuestion(session);
  assert.equal(q1.id, q2.id, "Question ID changed between reads");
  assert.equal(q1.id, q3.id, "Question ID changed across 3 reads");
  assert.equal(q1.number, q2.number);
  assert.equal(q1.number, q3.number);
});

// TC-RNG-13: Choice order stable across multiple reads of same question
test("TC-RNG-13: same question choice order is identical across 20 reads", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  const first = currentQuestion(session);
  for (let i = 0; i < 20; i++) {
    const q = currentQuestion(session);
    const orderA = q.choices.map((c) => c.id).join(",");
    const orderB = first.choices.map((c) => c.id).join(",");
    assert.equal(orderA, orderB, `Choice order changed on read ${i}`);
  }
});

// TC-RNG-14: Double answer guard — answering after complete returns stale result
test("TC-RNG-14: double answer guard — answering after complete returns stale result", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  for (const q of s.questions) {
    const result = answerBirdQuiz(s, q.answer);
    s = result.session;
  }
  assert.equal(isQuizComplete(s), true);
  const extra = answerBirdQuiz(s, "anything");
  assert.equal(extra.complete, true);
  assert.equal(extra.correct, false);
});

// TC-RNG-15: Reward exactly once — idempotent completion check
test("TC-RNG-15: reward exactly once — capture success is idempotent", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  for (const q of s.questions) {
    const result = answerBirdQuiz(s, q.answer);
    s = result.session;
  }
  assert.equal(isCaptureSuccess(s), true);
  assert.equal(isCaptureSuccess(s), true);
});

// TC-RNG-16: completed stage re-entry — no duplicate reward (quiz already complete)
test("TC-RNG-16: completed stage re-entry — quiz already complete, no new session needed", () => {
  const session = createBirdQuizSession("test", BIRD_QUIZ_BANK, Math.random);
  let s = session;
  for (const q of s.questions) {
    const result = answerBirdQuiz(s, q.answer);
    s = result.session;
  }
  assert.equal(isQuizComplete(s), true);
  const q = currentQuestion(s);
  assert.equal(q, null, "Completed session should return null for currentQuestion");
});

// TC-RNG-17: Each pool ID resolves to a valid bank question
test("TC-RNG-17: every pool ID resolves to a valid BIRD_QUIZ_BANK question", () => {
  const bankMap = new Map(BIRD_QUIZ_BANK.map((q) => [q.id, q]));
  for (const stage of STAGES) {
    const ids = getStagePoolIds(stage);
    for (const id of ids) {
      assert.ok(bankMap.has(id), `${stage} pool has unknown ID: ${id}`);
    }
  }
});

// TC-RNG-18: pickStageQuestions falls back to full pool when usedIds exhaust available
test("TC-RNG-18: pickStageQuestions falls back gracefully when usedIds exhaust pool", () => {
  for (const stage of STAGES) {
    const allIds = new Set(getStagePoolIds(stage));
    const questions = pickStageQuestions(stage, BIRD_QUIZ_BANK, allIds, Math.random);
    assert.equal(questions.length, 3, `${stage}: should still return 3 via fallback`);
  }
});

// TC-RNG-19: shuffleChoices returns all original choices in different order
test("TC-RNG-19: shuffleChoices returns all original choices (potentially reordered)", () => {
  const q = BIRD_QUIZ_BANK[0];
  const shuffled = shuffleChoices(q, Math.random);
  assert.equal(shuffled.length, q.choices.length);
  const originalIds = q.choices.map((c) => c.id).sort();
  const shuffledIds = shuffled.map((c) => c.id).sort();
  assert.deepEqual(shuffledIds, originalIds);
});

// TC-RNG-20: seeded RNG produces deterministic quiz sessions
test("TC-RNG-20: seeded RNG produces deterministic quiz sessions", () => {
  const rng1 = seededRng(123);
  const s1 = createBirdQuizSession("test", BIRD_QUIZ_BANK, rng1);
  const rng2 = seededRng(123);
  const s2 = createBirdQuizSession("test", BIRD_QUIZ_BANK, rng2);
  const ids1 = s1.questions.map((q) => q.id);
  const ids2 = s2.questions.map((q) => q.id);
  assert.deepEqual(ids1, ids2, "Same seed should produce same session");
});
