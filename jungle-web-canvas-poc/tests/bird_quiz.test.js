import test from "node:test";
import assert from "node:assert/strict";
import {
  QUIZ_LENGTH,
  PASS_THRESHOLD,
  pickQuestions,
  shuffleChoices,
  createBirdQuizSession,
  currentQuestion,
  answerBirdQuiz,
  isQuizComplete,
  isCaptureSuccess,
  quizResultText,
  QUIZ_STORAGE_KEY,
  saveBirdQuizSession,
  loadBirdQuizSession,
  clearBirdQuizSession,
} from "../src/content/bird_quiz.js";
import { BIRD_QUIZ_BANK } from "../src/content/bird_quiz_bank.js";

function mockStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  };
}

// Deterministic RNG for testing
function seededRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

test("QUIZ_LENGTH is 3 and PASS_THRESHOLD is 2", () => {
  assert.equal(QUIZ_LENGTH, 3);
  assert.equal(PASS_THRESHOLD, 2);
});

test("BIRD_QUIZ_BANK has 60+ questions", () => {
  assert.ok(BIRD_QUIZ_BANK.length >= 60, `Expected >=60, got ${BIRD_QUIZ_BANK.length}`);
});

test("pickQuestions returns requested count", () => {
  const rng = seededRng(42);
  const picked = pickQuestions(BIRD_QUIZ_BANK, 3, rng);
  assert.equal(picked.length, 3);
});

test("pickQuestions returns unique questions", () => {
  const rng = seededRng(42);
  const picked = pickQuestions(BIRD_QUIZ_BANK, 3, rng);
  const ids = picked.map((q) => q.id);
  assert.equal(new Set(ids).size, 3);
});

test("pickQuestions does not mutate source bank", () => {
  const rng = seededRng(42);
  const original = [...BIRD_QUIZ_BANK];
  pickQuestions(BIRD_QUIZ_BANK, 3, rng);
  assert.deepEqual(BIRD_QUIZ_BANK, original);
});

test("shuffleChoices returns same choices in different order", () => {
  const rng = seededRng(42);
  const q = BIRD_QUIZ_BANK[0];
  const shuffled = shuffleChoices(q, rng);
  assert.equal(shuffled.length, q.choices.length);
  const shuffledIds = shuffled.map((c) => c.id).sort();
  const originalIds = q.choices.map((c) => c.id).sort();
  assert.deepEqual(shuffledIds, originalIds);
});

test("createBirdQuizSession returns correct initial state", () => {
  const session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, seededRng(42));
  assert.equal(session.birdId, "bluebird");
  assert.equal(session.questions.length, QUIZ_LENGTH);
  assert.equal(session.currentIndex, 0);
  assert.deepEqual(session.answers, []);
  assert.equal(session.correctCount, 0);
  assert.equal(session.complete, false);
});

test("currentQuestion returns first question", () => {
  const session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, seededRng(42));
  const q = currentQuestion(session);
  assert.ok(q);
  assert.equal(q.number, 1);
  assert.equal(q.total, QUIZ_LENGTH);
  assert.equal(q.choices.length, 4);
});

test("answerBirdQuiz with correct answer increments correctCount", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  const q = currentQuestion(session);
  const result = answerBirdQuiz(session, q.answer);
  assert.equal(result.correct, true);
  assert.equal(result.session.correctCount, 1);
  assert.equal(result.session.currentIndex, 1);
  assert.equal(result.session.answers.length, 1);
});

test("answerBirdQuiz with wrong answer does not increment correctCount", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  const q = currentQuestion(session);
  const wrongAnswer = q.choices.find((c) => c.id !== q.answer)?.id || "wrong";
  const result = answerBirdQuiz(session, wrongAnswer);
  assert.equal(result.correct, false);
  assert.equal(result.session.correctCount, 0);
});

test("answerBirdQuiz completes after QUIZ_LENGTH answers", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  assert.equal(session.complete, true);
  assert.equal(session.currentIndex, QUIZ_LENGTH);
  assert.equal(session.answers.length, QUIZ_LENGTH);
});

test("isQuizComplete returns true only when complete", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  assert.equal(isQuizComplete(session), false);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  assert.equal(isQuizComplete(session), true);
});

test("isCaptureSuccess requires at least PASS_THRESHOLD correct", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  // Answer all correctly
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  assert.equal(isCaptureSuccess(session), true);
});

test("isCaptureSuccess fails with fewer than PASS_THRESHOLD correct", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  let wrongCount = 0;
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const wrongChoice = q.choices.find((c) => c.id !== q.answer);
    const result = answerBirdQuiz(session, wrongChoice ? wrongChoice.id : q.answer);
    session = result.session;
    if (!result.correct) wrongCount++;
  }
  assert.ok(wrongCount >= 1, "At least one wrong answer was given");
  assert.equal(isCaptureSuccess(session), false);
});

test("quizResultText returns null when not complete", () => {
  const session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, seededRng(42));
  assert.equal(quizResultText(session), null);
});

test("quizResultText shows success message when captured", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  const text = quizResultText(session);
  assert.ok(text.includes("성공"));
});

test("quizResultText shows failure message when not captured", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const wrongChoice = q.choices.find((c) => c.id !== q.answer);
    const result = answerBirdQuiz(session, wrongChoice ? wrongChoice.id : q.answer);
    session = result.session;
  }
  const text = quizResultText(session);
  assert.ok(text.includes("아쉽"));
});

test("answerBirdQuiz after completion returns complete flag", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  const result = answerBirdQuiz(session, "feather");
  assert.equal(result.complete, true);
  assert.equal(result.correct, false);
});

test("currentQuestion returns null when quiz is complete", () => {
  const rng = seededRng(42);
  let session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, rng);
  for (let i = 0; i < QUIZ_LENGTH; i++) {
    const q = currentQuestion(session);
    const result = answerBirdQuiz(session, q.answer);
    session = result.session;
  }
  assert.equal(currentQuestion(session), null);
});

test("quiz session survives reload and rejects another bird", () => {
  const storage = mockStorage();
  const session = createBirdQuizSession("bluebird", BIRD_QUIZ_BANK, seededRng(42));
  assert.equal(saveBirdQuizSession(session, storage), true);
  assert.deepEqual(loadBirdQuizSession("bluebird", storage), session);
  assert.equal(loadBirdQuizSession("kingfisher", storage), null);
  assert.equal(clearBirdQuizSession(storage), true);
  assert.equal(storage.getItem(QUIZ_STORAGE_KEY), null);
});

test("malformed quiz session safely falls back to no active quiz", () => {
  const storage = mockStorage();
  storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ birdId: "bluebird", questions: [] }));
  assert.equal(loadBirdQuizSession("bluebird", storage), null);
});

test("all quiz bank questions have 4 choices and valid answer", () => {
  for (const q of BIRD_QUIZ_BANK) {
    assert.equal(q.choices.length, 4, `Question ${q.id} must have 4 choices`);
    const answerIds = q.choices.map((c) => c.id);
    assert.ok(answerIds.includes(q.answer), `Question ${q.id} answer '${q.answer}' must be in choices`);
  }
});
