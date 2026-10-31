import { LEARNING_BIRDS, LEARNING_QUESTIONS, MIXED_QUESTIONS_WITH_LEGACY } from './bird_learning_content.js?v=learning-20261015';

export const BIRD_LEARNING_KEY = 'eduni.explore.birdLearning.v1';
const birdById = new Map(LEARNING_BIRDS.map(bird => [bird.id, bird]));
const questionById = new Map(MIXED_QUESTIONS_WITH_LEGACY.map(question => [question.id, question]));
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const empty = () => ({ version: 1, difficulty: 'easy', collected: {}, recentQuestionIds: {}, recentSubjects: {}, activeSession: null });
const domains = ['과학', '상식', '수학', '국어', '영어', '생각', '한자'];
const choicesFor = id => birdById.get(id)?.facts || [];
const allQuestions = birdId => [...choicesFor(birdId), ...MIXED_QUESTIONS_WITH_LEGACY];
const qFor = id => questionById.get(id) || LEARNING_BIRDS.flatMap(bird => bird.facts).find(question => question.id === id);

function validQuestionSet(session) {
  const questions = session.questionIds.map(qFor);
  if (questions.some(question => !question || question.difficulty !== session.difficulty)) return false;
  // Preserve previously saved observation-first rounds without selecting them again.
  const subjects = questions[0].subject === '관찰' ? questions.slice(1) : questions;
  if (questions[0].subject === '관찰' && questions[0].speciesId !== session.birdId) return false;
  if (subjects.some(question => !domains.includes(question.subject)) || new Set(subjects.map(question => question.subject)).size !== subjects.length) return false;
  return session.choiceOrder.every((ids, index) => Array.isArray(ids) && ids.length === questions[index].choices.length &&
    new Set(ids).size === ids.length && ids.every(id => questions[index].choices.some(choice => choice.id === id)));
}

function validSession(value) {
  if (!record(value) || typeof value.id !== 'string' || !value.id || value.id.length > 100 || !birdById.has(value.birdId) ||
      value.mapId !== birdById.get(value.birdId).mapId || !['easy', 'challenge'].includes(value.difficulty) ||
      typeof value.review !== 'boolean' || !Array.isArray(value.questionIds) || value.questionIds.length !== 3 ||
      !Array.isArray(value.choiceOrder) || value.choiceOrder.length !== 3 || !Number.isInteger(value.index) || value.index < 0 || value.index > 2 ||
      !['question', 'feedback', 'complete'].includes(value.status) || !Array.isArray(value.firstTry) || value.firstTry.length !== 3 ||
      value.firstTry.some(item => item !== null && typeof item !== 'boolean') || typeof value.hintShown !== 'boolean' || !validQuestionSet(value)) return false;
  const question = qFor(value.questionIds[value.index]);
  if (value.questionIds.some((id, index) => qFor(id).subject === '관찰' && qFor(id).speciesId !== value.birdId)) return false;
  if (value.firstTry.some((answer, index) => index < value.index ? typeof answer !== 'boolean' : index > value.index ? answer !== null : false)) return false;
  if (value.status === 'question' && value.lastChoiceId !== null) return false;
  if (value.status === 'feedback' && !question.choices.some(choice => choice.id === value.lastChoiceId)) return false;
  if (value.status === 'feedback' && value.firstTry[value.index] === null) return false;
  if (value.status === 'question' && value.firstTry[value.index] === true) return false;
  if (value.status === 'complete' && (value.index !== 2 || value.lastChoiceId !== null)) return false;
  if (value.status === 'complete' && value.firstTry.some(answer => typeof answer !== 'boolean')) return false;
  return true;
}

export function normalizeBirdLearningSave(value) {
  if (!record(value) || value.version !== 1 || !['easy', 'challenge'].includes(value.difficulty) ||
      !record(value.collected) || !record(value.recentQuestionIds) || !record(value.recentSubjects) ||
      (value.activeSession !== null && !validSession(value.activeSession))) return { save: empty(), valid: false };
  const collected = {};
  for (const [id, item] of Object.entries(value.collected)) {
    if (!birdById.has(id) || !record(item) || !Number.isInteger(item.observedCount) || item.observedCount < 0 ||
        !Number.isInteger(item.reviewCount) || item.reviewCount < 0 || !Number.isFinite(item.lastAt) || item.lastAt < 0 ||
        !Array.isArray(item.lastFirstTryCorrect) || item.lastFirstTryCorrect.length !== 3 || item.lastFirstTryCorrect.some(flag => typeof flag !== 'boolean')) return { save: empty(), valid: false };
    collected[id] = { observedCount: item.observedCount, reviewCount: item.reviewCount, lastAt: item.lastAt, lastFirstTryCorrect: [...item.lastFirstTryCorrect] };
  }
  const recentQuestionIds = {}, recentSubjects = {};
  for (const [id, ids] of Object.entries(value.recentQuestionIds)) {
    if (!birdById.has(id) || !Array.isArray(ids) || ids.length > 3 || ids.some(questionId => !allQuestions(id).some(question => question.id === questionId))) return { save: empty(), valid: false };
    recentQuestionIds[id] = [...ids];
  }
  for (const [id, subjects] of Object.entries(value.recentSubjects)) {
    if (!birdById.has(id) || !Array.isArray(subjects) || subjects.length > 3 || subjects.some(subject => !domains.includes(subject)) || new Set(subjects).size !== subjects.length) return { save: empty(), valid: false };
    recentSubjects[id] = [...subjects];
  }
  return { save: { version: 1, difficulty: value.difficulty, collected, recentQuestionIds, recentSubjects,
    activeSession: value.activeSession ? structuredClone(value.activeSession) : null }, valid: true };
}

export function loadBirdLearning(storage) {
  if (!storage || typeof storage.getItem !== 'function') return { save: empty(), valid: false, warning: '새 학습 기록을 읽을 수 없어 이 화면에서만 진행해요.' };
  let raw;
  try { raw = storage.getItem(BIRD_LEARNING_KEY); } catch { return { save: empty(), valid: false, warning: '새 학습 기록을 읽지 못해 이 화면에서만 진행해요.' }; }
  if (raw === null || raw === undefined || raw === '') return { save: empty(), valid: true, warning: null };
  try {
    const result = normalizeBirdLearningSave(JSON.parse(raw));
    return { ...result, warning: result.valid ? null : '새 학습 기록이 손상되어 원본을 그대로 두었어요.' };
  } catch { return { save: empty(), valid: false, warning: '새 학습 기록을 확인하지 못했어요. 원본은 그대로 두었어요.' }; }
}

export const birdSessionVersion = session => session ? ({ id: session.id, index: session.index, status: session.status,
  lastChoiceId: session.lastChoiceId, hintShown: session.hintShown, firstTry: [...session.firstTry] }) : null;
const sameExpected = (actual, expected) => expected === null ? actual === null :
  actual?.id === expected.id && actual?.index === expected.index && actual?.status === expected.status &&
  actual?.lastChoiceId === expected.lastChoiceId && actual?.hintShown === expected.hintShown &&
  JSON.stringify(actual?.firstTry) === JSON.stringify(expected.firstTry);

export function saveBirdLearning(save, storage, expectedSession) {
  const normalized = normalizeBirdLearningSave(save);
  if (!normalized.valid || !storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return false;
  try {
    const raw = storage.getItem(BIRD_LEARNING_KEY);
    if (raw !== null && raw !== undefined && raw !== '') {
      let parsed;
      try { parsed = normalizeBirdLearningSave(JSON.parse(raw)); } catch { return false; }
      if (!parsed.valid || !sameExpected(parsed.save.activeSession, expectedSession)) return false;
      const latest = parsed.save;
      for (const [id, previous] of Object.entries(latest.collected)) {
        const proposed = normalized.save.collected[id];
        if (!proposed || previous.observedCount > proposed.observedCount || previous.reviewCount > proposed.reviewCount || previous.lastAt > proposed.lastAt) {
          normalized.save.collected[id] = { ...previous, lastFirstTryCorrect: [...previous.lastFirstTryCorrect] };
        }
      }
    } else if (expectedSession !== null) return false;
    storage.setItem(BIRD_LEARNING_KEY, JSON.stringify(normalized.save));
    return true;
  } catch { return false; }
}

function randomIndex(length, random) { return Math.min(length - 1, Math.floor(Math.max(0, random()) * length)); }
function choose(items, random) { return items[randomIndex(items.length, random)]; }
function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1, random);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function buildMixedQuestionSet(difficulty, { random = Math.random, previousIds = [], previousSubjects = [] } = {}) {
  if (!['easy', 'challenge'].includes(difficulty)) return null;
  const freshSubjects = domains.filter(subject => !previousSubjects.includes(subject));
  const candidates = freshSubjects.length >= 3 ? freshSubjects : domains;
  const preferred = candidates.filter(subject => subject === '국어' || subject === '수학');
  const selectedSubjects = [choose(preferred.length ? preferred : ['국어', '수학'], random)];
  selectedSubjects.push(...shuffled(candidates.filter(subject => !selectedSubjects.includes(subject)), random).slice(0, 2));
  if (selectedSubjects.length < 3) selectedSubjects.push(...shuffled(domains.filter(subject => !selectedSubjects.includes(subject)), random).slice(0, 3 - selectedSubjects.length));
  const questions = selectedSubjects.map(subject => {
    const pool = LEARNING_QUESTIONS.filter(question => question.subject === subject && question.difficulty === difficulty);
    const fresh = pool.filter(question => !previousIds.includes(question.id));
    return choose(fresh.length ? fresh : pool, random);
  });
  if (questions.length !== 3 || questions.some(question => !question)) return null;
  return {
    questionIds: questions.map(question => question.id),
    choiceOrder: questions.map(question => shuffled(question.choices.map(choice => choice.id), random)),
    subjects: questions.map(question => question.subject),
  };
}

export function buildBirdSession(save, birdId, mapId, { random = Math.random, sessionId = null, review = false } = {}) {
  const bird = birdById.get(birdId);
  if (!bird || bird.mapId !== mapId || save.activeSession) return null;
  const difficulty = save.difficulty;
  const previousIds = save.recentQuestionIds[birdId] || [];
  const questionSet = buildMixedQuestionSet(difficulty, {
    random,
    previousIds,
    previousSubjects: save.recentSubjects[birdId] || [],
  });
  if (!questionSet) return null;
  const id = sessionId || `blr-${Date.now().toString(36)}-${Math.floor(random() * 0xffffff).toString(36)}`;
  const activeSession = { id, birdId, mapId, difficulty, review, questionIds: questionSet.questionIds,
    choiceOrder: questionSet.choiceOrder, index: 0,
    status: 'question', firstTry: [null, null, null], lastChoiceId: null, hintShown: false };
  return { ...save, activeSession };
}

export function canStartBirdSession(save, birdId, mapId, { review = false, nearbyBirdId = null } = {}) {
  const bird = birdById.get(birdId);
  if (!bird || save?.activeSession) return false;
  return review ? (save.collected[birdId]?.observedCount > 0) : (bird.mapId === mapId && nearbyBirdId === birdId);
}

export function getBirdLocateTarget(currentMapId, birdId) {
  const bird = birdById.get(birdId);
  return bird ? { birdId, mapId: bird.mapId, changeMap: bird.mapId !== currentMapId } : null;
}

export function reduceBirdLearning(save, action, now = Date.now()) {
  const session = save?.activeSession;
  if (!session || !action || action.sessionId !== session.id || action.questionId !== session.questionIds[session.index] || action.index !== session.index) return save;
  const question = qFor(action.questionId);
  if (action.type === 'ANSWER' && session.status === 'question' && question.choices.some(choice => choice.id === action.choiceId)) {
    const correct = question.answerId === action.choiceId;
    const firstTry = [...session.firstTry];
    if (firstTry[session.index] === null) firstTry[session.index] = correct;
    return { ...save, activeSession: { ...session, status: 'feedback', firstTry, lastChoiceId: action.choiceId, hintShown: false } };
  }
  if (action.type === 'HINT' && session.status === 'question' && !session.hintShown) return { ...save, activeSession: { ...session, hintShown: true } };
  if (action.type === 'RETRY' && session.status === 'feedback' && question.answerId !== session.lastChoiceId) {
    return { ...save, activeSession: { ...session, status: 'question', lastChoiceId: null, hintShown: true } };
  }
  if (action.type === 'CONTINUE' && session.status === 'feedback' && question.answerId === session.lastChoiceId) {
    if (session.index < 2) return { ...save, activeSession: { ...session, index: session.index + 1, status: 'question', lastChoiceId: null, hintShown: false } };
    const old = save.collected[session.birdId] || { observedCount: 0, reviewCount: 0, lastAt: 0, lastFirstTryCorrect: [false, false, false] };
    const collected = { ...save.collected, [session.birdId]: {
      observedCount: old.observedCount + (session.review ? 0 : 1), reviewCount: old.reviewCount + (session.review ? 1 : 0),
      lastAt: Math.max(0, Number(now) || 0), lastFirstTryCorrect: [...session.firstTry],
    } };
    const recentQuestionIds = { ...save.recentQuestionIds, [session.birdId]: [...session.questionIds.slice(-3)] };
    const recentSubjects = session.questionIds.map(id => qFor(id).subject).filter(subject => domains.includes(subject));
    return { ...save, collected, recentQuestionIds, recentSubjects: { ...save.recentSubjects, [session.birdId]: recentSubjects },
      activeSession: { ...session, status: 'complete', lastChoiceId: null } };
  }
  if (action.type === 'DONE' && session.status === 'complete') return { ...save, activeSession: null };
  return save;
}

export function setBirdDifficulty(save, difficulty) {
  return !save.activeSession && ['easy', 'challenge'].includes(difficulty) && save.difficulty !== difficulty ? { ...save, difficulty } : save;
}

export function getLearningBirds(region) {
  const birds = LEARNING_BIRDS.filter(bird => bird.mapId === region.id);
  const path = region.trails?.[1] || region.trails?.[0] || region.trail;
  const points = path?.points || [];
  const pointAt = distance => {
    let remaining = distance;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1], end = points[index], length = Math.hypot(end.x - start.x, end.z - start.z);
      if (remaining <= length) {
        const ratio = length ? remaining / length : 0;
        return { x: start.x + (end.x - start.x) * ratio, z: start.z + (end.z - start.z) * ratio };
      }
      remaining -= length;
    }
    return null;
  };
  return birds.map((bird, index) => ({ ...bird, ...pointAt(index ? 7.6 : 3.2), radius: 2.1, order: index + 10 })).filter(bird => Number.isFinite(bird.x));
}

export const getBirdQuestion = id => qFor(id);
