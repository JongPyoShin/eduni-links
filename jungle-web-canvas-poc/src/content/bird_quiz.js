import { BIRD_QUIZ_BANK } from "./bird_quiz_bank.js";

export const QUIZ_LENGTH = 3;
export const PASS_THRESHOLD = 2;
const SESSION_STORAGE_KEY = "eduni.jungle.quizUsedIds.v1";

export function getUsedQuestionIds() {
  try {
    const raw = globalThis.sessionStorage?.getItem(SESSION_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markQuestionUsed(questionId) {
  try {
    const ids = getUsedQuestionIds();
    ids.add(questionId);
    globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

export function markQuestionsUsed(questionIds) {
  try {
    const ids = getUsedQuestionIds();
    for (const id of questionIds) ids.add(id);
    globalThis.sessionStorage?.setItem(SESSION_STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
}

export function clearUsedQuestionIds() {
  try { globalThis.sessionStorage?.removeItem(SESSION_STORAGE_KEY); } catch { /* ignore */ }
}

export function pickQuestions(bank, count, rng = Math.random) {
  const shuffled = [...bank];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function shuffleChoices(question, rng = Math.random) {
  const shuffled = [...question.choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createBirdQuizSession(birdId, bank = BIRD_QUIZ_BANK, rng = Math.random) {
  const questions = pickQuestions(bank, QUIZ_LENGTH, rng).map((q) => ({
    ...q,
    shuffledChoices: shuffleChoices(q, rng),
  }));
  return {
    birdId,
    questions,
    currentIndex: 0,
    answers: [],
    correctCount: 0,
    complete: false,
  };
}

export function currentQuestion(session) {
  if (session.complete || session.currentIndex >= session.questions.length) return null;
  const q = session.questions[session.currentIndex];
  return {
    ...q,
    choices: q.shuffledChoices || shuffleChoices(q, Math.random),
    number: session.currentIndex + 1,
    total: session.questions.length,
  };
}

export function answerBirdQuiz(session, answerId) {
  if (session.complete || session.currentIndex >= session.questions.length) {
    return { session, correct: false, complete: true, lastAnswer: null };
  }
  const q = session.questions[session.currentIndex];
  const correct = answerId === q.answer;
  const nextIndex = session.currentIndex + 1;
  const correctCount = session.correctCount + (correct ? 1 : 0);
  const complete = nextIndex >= session.questions.length;
  const nextSession = {
    ...session,
    currentIndex: nextIndex,
    answers: [...session.answers, { questionId: q.id, answerId, correct }],
    correctCount,
    complete,
  };
  return { session: nextSession, correct, complete, lastAnswer: { questionId: q.id, correct, explanation: q.explanation } };
}

export function isQuizComplete(session) {
  return session.complete;
}

export function isCaptureSuccess(session) {
  return session.complete && session.correctCount >= PASS_THRESHOLD;
}

export function quizResultText(session) {
  if (!session.complete) return null;
  const score = session.correctCount;
  const total = session.questions.length;
  if (score >= PASS_THRESHOLD) return `포획 성공! ${score} / ${total} 정답`;
  return `아쉽다! ${score} / ${total} 정답`;
}
