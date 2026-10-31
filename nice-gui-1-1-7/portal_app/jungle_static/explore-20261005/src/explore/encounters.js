import { buildMixedQuestionSet } from './bird_learning.js?v=learning-20261015';
import { LEARNING_QUESTIONS } from './bird_learning_content.js?v=learning-20261015';

export const EXPLORE_SAVE_KEY = "eduni.explore.save.v1";
const SAVE_VERSION = 1;
const REGION_ID = "river-meadow";
const BIRD_ID = "riverBird";
const CONTENT_VERSION = "riverbird-nature-v1";
const PASS_SCORE = 2;

const QUESTIONS = [
  {
    id: "river-beak",
    prompt: "물가새의 뾰족한 부리는 무엇을 할 때 도움이 될까요?",
    answerId: "catch-small-fish",
    explanation: "뾰족한 부리로 물속의 작은 먹이를 잡아요.",
    choices: [
      { id: "catch-small-fish", text: "물속의 작은 먹이를 잡아요" },
      { id: "sing-louder", text: "더 큰 소리를 내요" },
      { id: "dig-rock", text: "바위를 파요" },
      { id: "store-water", text: "물을 저장해요" },
    ],
  },
  {
    id: "river-perch",
    prompt: "가지에 앉아 물가를 살펴보면 어떤 점이 좋을까요?",
    answerId: "spot-small-prey",
    explanation: "가지 위에서 물가를 살펴보면 물속의 작은 먹이를 발견할 수 있어요.",
    choices: [
      { id: "spot-small-prey", text: "물속의 작은 먹이를 발견할 수 있어요" },
      { id: "hide-from-rain", text: "나무 아래에서 비를 피할 수 있어요" },
      { id: "dig-tree", text: "나무줄기에 굴을 팔 수 있어요" },
      { id: "store-water", text: "물을 가지에 저장할 수 있어요" },
    ],
  },
  {
    id: "river-home",
    prompt: "물가새가 먹이를 찾으며 살기 좋은 곳은 어디일까요?",
    answerId: "shallow-bank",
    explanation: "얕은 물가에는 작은 물고기와 곤충 같은 먹이가 있어요.",
    choices: [
      { id: "deep-cave", text: "어둡고 깊은 동굴" },
      { id: "dry-desert", text: "물이 없는 모래밭" },
      { id: "shallow-bank", text: "작은 먹이가 사는 얕은 물가" },
      { id: "busy-road", text: "차가 많이 다니는 길" },
    ],
  },
];
const QUESTION_BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));
const QUESTION_IDS = QUESTIONS.map((question) => question.id);
const GENERAL_FORMAT = 'general-v1';
const GENERAL_QUESTIONS = new Map(LEARNING_QUESTIONS.map(question => [question.id, question]));
const GENERAL_SUBJECTS = new Set(LEARNING_QUESTIONS.map(question => question.subject));
const isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));

function emptySave() {
  return { version: SAVE_VERSION, regionId: REGION_ID, captured: {}, activeQuiz: null, recentQuestionIds: [], recentSubjects: [] };
}

function validCaptured(value) {
  return isRecord(value) && value.captured === true && Number.isFinite(value.capturedAt) && value.capturedAt >= 0 &&
    Number.isInteger(value.bestScore) && value.bestScore >= PASS_SCORE && value.bestScore <= QUESTIONS.length
    ? { captured: true, capturedAt: value.capturedAt, bestScore: value.bestScore }
    : null;
}

function mergeCaptured(existing, incoming) {
  const previous = validCaptured(existing?.[BIRD_ID]);
  const next = validCaptured(incoming?.[BIRD_ID]);
  if (!previous && !next) return {};
  if (!previous) return { [BIRD_ID]: next };
  if (!next) return { [BIRD_ID]: previous };
  return {
    [BIRD_ID]: {
      captured: true,
      capturedAt: Math.min(previous.capturedAt, next.capturedAt),
      bestScore: Math.max(previous.bestScore, next.bestScore),
    },
  };
}

function sameCaptured(left, right) {
  const a = left?.[BIRD_ID];
  const b = right?.[BIRD_ID];
  return (!a && !b) || Boolean(a && b && a.captured === b.captured && a.capturedAt === b.capturedAt && a.bestScore === b.bestScore);
}

function validActiveQuiz(value) {
  if (isRecord(value) && value.format === GENERAL_FORMAT) {
    if (typeof value.sessionId !== 'string' || !value.sessionId || value.sessionId.length > 120 ||
        !['easy', 'challenge'].includes(value.difficulty) || !Array.isArray(value.questionIds) || value.questionIds.length !== 3 ||
        new Set(value.questionIds).size !== 3 || value.questionIds.some(id => !GENERAL_QUESTIONS.has(id) || GENERAL_QUESTIONS.get(id).difficulty !== value.difficulty) ||
        !isRecord(value.choiceOrders) || !Array.isArray(value.answers) || !Array.isArray(value.firstAnswers) || value.firstAnswers.length !== 3 ||
        !Number.isInteger(value.index) || value.index < 0 || value.index > 2 || value.answers.length !== value.index || typeof value.hintShown !== 'boolean') return null;
    const questions = value.questionIds.map(id => GENERAL_QUESTIONS.get(id));
    if (new Set(questions.map(question => question.subject)).size !== 3 || !questions.some(question => question.subject === '국어' || question.subject === '수학')) return null;
    const choiceOrders = {};
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index], order = value.choiceOrders[question.id], choices = question.choices.map(choice => choice.id);
      if (!Array.isArray(order) || order.length !== choices.length || new Set(order).size !== choices.length || order.some(id => !choices.includes(id))) return null;
      const first = value.firstAnswers[index];
      if (first !== null && !choices.includes(first)) return null;
      if (index < value.index && (first === null || value.answers[index]?.questionId !== question.id || value.answers[index]?.choiceId !== question.answerId)) return null;
      if (index === value.index && first !== null && (first === question.answerId || !value.hintShown)) return null;
      if (index > value.index && first !== null) return null;
      choiceOrders[question.id] = [...order];
    }
    if (Object.keys(value.choiceOrders).length !== 3 || value.answers.some((answer, index) =>
      !isRecord(answer) || answer.questionId !== value.questionIds[index] || answer.choiceId !== GENERAL_QUESTIONS.get(answer.questionId)?.answerId)) return null;
    return { format: GENERAL_FORMAT, sessionId: value.sessionId, difficulty: value.difficulty, questionIds: [...value.questionIds],
      choiceOrders, index: value.index, answers: value.answers.map(answer => ({ questionId: answer.questionId, choiceId: answer.choiceId })),
      firstAnswers: [...value.firstAnswers], hintShown: value.hintShown };
  }
  if (!isRecord(value) || typeof value.sessionId !== "string" || !value.sessionId || value.sessionId.length > 120 ||
      value.birdId !== BIRD_ID || value.contentVersion !== CONTENT_VERSION || !Array.isArray(value.questionIds) ||
      value.questionIds.length !== QUESTIONS.length || new Set(value.questionIds).size !== QUESTIONS.length ||
      value.questionIds.some((id) => !QUESTION_BY_ID.has(id)) || !isRecord(value.choiceOrders) ||
      !Array.isArray(value.answers) || value.answers.length > QUESTIONS.length ||
      !Number.isInteger(value.currentIndex) || value.currentIndex !== value.answers.length) return null;
  if (QUESTION_IDS.some((id) => !value.questionIds.includes(id))) return null;
  const orderIds = Object.keys(value.choiceOrders);
  if (orderIds.length !== QUESTIONS.length || orderIds.some((id) => !value.questionIds.includes(id))) return null;
  const choiceOrders = {};
  for (const id of value.questionIds) {
    const order = value.choiceOrders[id];
    const choices = QUESTION_BY_ID.get(id).choices.map((choice) => choice.id);
    if (!Array.isArray(order) || order.length !== choices.length || new Set(order).size !== choices.length ||
        order.some((choiceId) => !choices.includes(choiceId))) return null;
    choiceOrders[id] = [...order];
  }
  const answers = [];
  for (let i = 0; i < value.answers.length; i += 1) {
    const answer = value.answers[i];
    const questionId = value.questionIds[i];
    if (!isRecord(answer) || answer.questionId !== questionId ||
        !QUESTION_BY_ID.get(questionId).choices.some((choice) => choice.id === answer.choiceId)) return null;
    answers.push({ questionId, choiceId: answer.choiceId });
  }
  return {
    sessionId: value.sessionId,
    birdId: BIRD_ID,
    contentVersion: CONTENT_VERSION,
    questionIds: [...value.questionIds],
    choiceOrders,
    answers,
    currentIndex: value.currentIndex,
  };
}

function normalizeSave(value) {
  if (!isRecord(value) || value.version !== SAVE_VERSION || value.regionId !== REGION_ID) {
    return { save: emptySave(), warning: "저장 버전이나 지역을 확인하지 못해 새 탐험을 시작해요." };
  }
  let warning = null;
  const captured = {};
  if (!isRecord(value.captured)) warning = "도감 기록을 확인하지 못했어요.";
  else {
    for (const [birdId, entry] of Object.entries(value.captured)) {
      const valid = birdId === BIRD_ID && validCaptured(entry);
      if (valid) captured[birdId] = valid;
      else warning = "일부 저장 기록을 읽지 못했어요. 확인된 도감 기록은 보존했어요.";
    }
  }
  let activeQuiz = null;
  if (value.activeQuiz !== null && value.activeQuiz !== undefined) {
    activeQuiz = validActiveQuiz(value.activeQuiz);
    if (!activeQuiz) warning = "저장된 문제를 확인하지 못해 퀴즈를 새로 시작해요. 도감 기록은 보존했어요.";
  }
  const recentQuestionIds = value.recentQuestionIds;
  const recentSubjects = value.recentSubjects;
  const validRecentQuestionIds = Array.isArray(recentQuestionIds) && recentQuestionIds.length <= 3 &&
    recentQuestionIds.every(id => GENERAL_QUESTIONS.has(id)) && new Set(recentQuestionIds).size === recentQuestionIds.length;
  const validRecentSubjects = Array.isArray(recentSubjects) && recentSubjects.length <= 3 &&
    recentSubjects.every(subject => GENERAL_SUBJECTS.has(subject)) && new Set(recentSubjects).size === recentSubjects.length;
  return { save: { version: SAVE_VERSION, regionId: REGION_ID, captured, activeQuiz,
    recentQuestionIds: validRecentQuestionIds ? [...recentQuestionIds] : [],
    recentSubjects: validRecentSubjects ? [...recentSubjects] : [] }, warning };
}

function seededShuffle(items, seed) {
  const shuffled = [...items];
  let state = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createQuiz(now, sequence) {
  const timestamp = Number.isFinite(now) ? Math.max(0, Math.trunc(now)) : 0;
  const seed = (timestamp ^ Math.imul(sequence, 0x9e3779b1)) >>> 0;
  const choiceOrders = {};
  QUESTIONS.forEach((question, index) => {
    choiceOrders[question.id] = seededShuffle(question.choices.map((choice) => choice.id), seed + index * 0x85ebca6b);
  });
  return {
    sessionId: `${CONTENT_VERSION}:${timestamp}:${sequence}`,
    birdId: BIRD_ID,
    contentVersion: CONTENT_VERSION,
    questionIds: [...QUESTION_IDS],
    choiceOrders,
    answers: [],
    currentIndex: 0,
  };
}

function createGeneralQuiz(save, difficulty, now, sequence) {
  const questionSet = buildMixedQuestionSet(difficulty, { previousIds: save.recentQuestionIds, previousSubjects: save.recentSubjects });
  if (!questionSet) return null;
  const timestamp = Number.isFinite(now) ? Math.max(0, Math.trunc(now)) : 0;
  return { format: GENERAL_FORMAT, sessionId: `${CONTENT_VERSION}:${timestamp}:${sequence}:${Math.random().toString(36).slice(2, 8)}`,
    difficulty, questionIds: questionSet.questionIds,
    choiceOrders: Object.fromEntries(questionSet.questionIds.map((id, index) => [id, questionSet.choiceOrder[index]])),
    index: 0, answers: [], firstAnswers: [null, null, null], hintShown: false };
}

function scoreGeneralQuiz(quiz) {
  return quiz.questionIds.reduce((score, id, index) => score + (GENERAL_QUESTIONS.get(id).answerId === quiz.firstAnswers[index] ? 1 : 0), 0);
}

function completeGeneralQuiz(save, quiz, now) {
  const firstTryScore = scoreGeneralQuiz(quiz), result = { format: GENERAL_FORMAT, sessionId: quiz.sessionId, score: 3, firstTryScore, total: 3, success: true };
  const captured = recordCapture(save.captured, result, now);
  return { save: { ...save, captured, activeQuiz: null, recentQuestionIds: [...quiz.questionIds],
    recentSubjects: quiz.questionIds.map(id => GENERAL_QUESTIONS.get(id).subject) }, result };
}

function scoreQuiz(quiz) {
  return quiz.answers.reduce((score, answer) => score + (QUESTION_BY_ID.get(answer.questionId).answerId === answer.choiceId ? 1 : 0), 0);
}

function quizResult(quiz) {
  const score = scoreQuiz(quiz);
  return { sessionId: quiz.sessionId, score, total: QUESTIONS.length, success: score >= PASS_SCORE };
}

function recordCapture(captured, result, now) {
  const previous = captured[BIRD_ID];
  if (previous?.captured) {
    if (previous.bestScore >= result.score) return captured;
    return { ...captured, [BIRD_ID]: { ...previous, bestScore: result.score } };
  }
  return { ...captured, [BIRD_ID]: { captured: true, capturedAt: Number.isFinite(now) ? Math.max(0, now) : 0, bestScore: result.score } };
}

function finishQuiz(save, now) {
  const quiz = save.activeQuiz;
  if (!quiz || quiz.currentIndex !== QUESTIONS.length) return save;
  const result = quizResult(quiz);
  const captured = result.success ? recordCapture(save.captured, result, now) : save.captured;
  return { ...save, captured, activeQuiz: null };
}

export function createExploreState(save = emptySave()) {
  const normalized = normalizeSave(save).save;
  return {
    mode: "exploring",
    save: normalized,
    feedback: null,
    result: null,
    sessionSequence: 0,
  };
}

export function reduceExplore(state, action, { now = 0 } = {}) {
  if (!state || !action || typeof action.type !== "string") return state;
  switch (action.type) {
    case "INTERACT":
      if (state.mode !== "exploring") return state;
      return { ...state, mode: "observing", result: null, feedback: null };
    case "CODEX":
      return state.mode === "exploring" ? { ...state, mode: "codex", result: null, feedback: null } : state;
    case "SYNC_CAPTURE": {
      const captured = mergeCaptured(state.save.captured, action.captured);
      if (sameCaptured(captured, state.save.captured)) return state;
      return { ...state, save: { ...state.save, captured } };
    }
    case "OBSERVE_CONFIRM": {
      if (state.mode !== "observing" || state.save.activeQuiz) return state;
      const sequence = state.sessionSequence + 1;
      const activeQuiz = createGeneralQuiz(state.save, action.difficulty || 'easy', now, sequence);
      if (!activeQuiz) return state;
      return {
        ...state,
        mode: "quiz",
        save: { ...state.save, activeQuiz },
        feedback: null,
        result: null,
        sessionSequence: sequence,
      };
    }
    case "RESUME_QUIZ":
      if (state.mode !== "codex" || !state.save.activeQuiz) return state;
      if (state.save.activeQuiz.format === GENERAL_FORMAT) return { ...state, mode: "quiz", feedback: null, result: null };
      if (state.save.activeQuiz.currentIndex === QUESTIONS.length) {
        const result = quizResult(state.save.activeQuiz);
        result.newlyCaptured = result.success && !state.save.captured[BIRD_ID]?.captured;
        return { ...state, mode: "result", result, feedback: null };
      }
      return { ...state, mode: "quiz", feedback: null, result: null };
    case "ANSWER": {
      const quiz = state.save.activeQuiz;
      if (state.mode !== "quiz" || state.feedback || !quiz) return state;
      if (quiz.format === GENERAL_FORMAT) {
        if (quiz.index >= 3 || action.sessionId !== quiz.sessionId || action.questionId !== quiz.questionIds[quiz.index] || action.questionIndex !== quiz.index) return state;
        const question = GENERAL_QUESTIONS.get(quiz.questionIds[quiz.index]);
        if (!question.choices.some(choice => choice.id === action.choiceId)) return state;
        const firstAnswers = [...quiz.firstAnswers];
        if (firstAnswers[quiz.index] === null) firstAnswers[quiz.index] = action.choiceId;
        if (action.choiceId !== question.answerId) return { ...state, save: { ...state.save, activeQuiz: { ...quiz, firstAnswers, hintShown: true } },
          feedback: { sessionId: quiz.sessionId, questionId: question.id, questionIndex: quiz.index, correct: false, explanation: question.explanation, hint: question.hint } };
        const index = quiz.index + 1, activeQuiz = { ...quiz, index, firstAnswers, answers: [...quiz.answers, { questionId: question.id, choiceId: action.choiceId }], hintShown: false };
        if (index === 3) {
          const completed = completeGeneralQuiz(state.save, activeQuiz, now);
          completed.result.newlyCaptured = !state.save.captured[BIRD_ID]?.captured && !!completed.save.captured[BIRD_ID]?.captured;
          return { ...state, mode: "result", save: completed.save, feedback: null, result: completed.result };
        }
        return { ...state, save: { ...state.save, activeQuiz }, feedback: { sessionId: quiz.sessionId, questionId: question.id, questionIndex: quiz.index, correct: true, explanation: question.explanation } };
      }
      if (quiz.currentIndex >= QUESTIONS.length || action.sessionId !== quiz.sessionId || action.questionId !== quiz.questionIds[quiz.currentIndex]) return state;
      const question = QUESTION_BY_ID.get(action.questionId);
      if (!question.choices.some((choice) => choice.id === action.choiceId)) return state;
      const answer = { questionId: question.id, choiceId: action.choiceId };
      const nextQuiz = { ...quiz, answers: [...quiz.answers, answer], currentIndex: quiz.currentIndex + 1 };
      if (nextQuiz.currentIndex === QUESTIONS.length) {
        const result = quizResult(nextQuiz);
        result.newlyCaptured = result.success && !state.save.captured[BIRD_ID]?.captured;
        const activeSave = { ...state.save, activeQuiz: nextQuiz };
        const nextSave = finishQuiz(activeSave, now);
        return { ...state, mode: "result", save: nextSave, feedback: null, result };
      }
      const feedback = {
        sessionId: quiz.sessionId,
        questionId: question.id,
        correct: question.answerId === answer.choiceId,
        explanation: question.explanation,
      };
      return { ...state, save: { ...state.save, activeQuiz: nextQuiz }, feedback, result: null };
    }
    case "NEXT": {
      const feedback = state.feedback;
      if (state.mode !== "quiz" || !feedback || (feedback.questionIndex !== undefined && !feedback.correct) || action.sessionId !== feedback.sessionId || action.questionId !== feedback.questionId ||
          (feedback.questionIndex !== undefined && action.questionIndex !== feedback.questionIndex)) return state;
      return { ...state, feedback: null };
    }
    case "HINT": {
      const quiz = state.save.activeQuiz;
      if (state.mode !== 'quiz' || state.feedback || quiz?.format !== GENERAL_FORMAT || quiz.hintShown ||
          action.sessionId !== quiz.sessionId || action.questionId !== quiz.questionIds[quiz.index] || action.questionIndex !== quiz.index) return state;
      return { ...state, save: { ...state.save, activeQuiz: { ...quiz, hintShown: true } } };
    }
    case "RETRY": {
      const quiz = state.save.activeQuiz, feedback = state.feedback;
      if (state.mode === 'result' && (!action.sessionId || action.sessionId === state.result?.sessionId)) {
        const save = finishQuiz(state.save, now);
        return { ...state, mode: 'observing', save, feedback: null, result: null };
      }
      if (state.mode !== 'quiz' || quiz?.format !== GENERAL_FORMAT || !feedback || feedback.correct ||
          action.sessionId !== feedback.sessionId || action.questionId !== feedback.questionId || action.questionIndex !== feedback.questionIndex) return state;
      return { ...state, feedback: null };
    }
    case "CLOSE": {
      if (state.mode === "exploring") return state;
      const save = state.mode === "result" ? finishQuiz(state.save, now) : state.save;
      return { ...state, mode: "exploring", save, feedback: null, result: null };
    }
    default:
      return state;
  }
}

export function getView(state) {
  if (!state || state.mode === "exploring") return null;
  if (state.mode === "observing") {
    return {
      title: "물가새를 만났어요",
      body: state.save.activeQuiz ? "진행 중인 문제가 있어요. 새 도감에서 이어 할 수 있어요." : "푸른 깃털과 뾰족한 부리, 가지 위에서 물가를 살펴보는 모습을 관찰해요.",
      icon: "🐦",
      kicker: "새 관찰",
      actions: [
        ...(!state.save.activeQuiz ? [{ label: "함께 배울 문제 시작", action: { type: "OBSERVE_CONFIRM" }, primary: true }] : []),
        { label: "나중에", action: { type: "CLOSE" } },
      ],
    };
  }
  if (state.mode === "codex") {
    const entry = state.save.captured[BIRD_ID];
    return {
      title: "나의 도감",
      body: entry?.captured ? `물가새 · 관찰 기록 완료\n최고 점수 ${entry.bestScore} / ${QUESTIONS.length}` : "아직 도감에 등록한 새가 없어요. 물가새를 만나 관찰해 봐요.",
      icon: "📖",
      kicker: `${Object.keys(state.save.captured).length} / 1 발견`,
      actions: [
        ...(state.save.activeQuiz ? [{ label: '진행 중인 문제 이어하기', action: { type: 'RESUME_QUIZ' }, primary: true }] : []),
        { label: "닫기", action: { type: "CLOSE" }, primary: !state.save.activeQuiz },
      ],
    };
  }
  if (state.mode === "quiz") {
    const quiz = state.save.activeQuiz;
    if (!quiz) return null;
    if (quiz.format === GENERAL_FORMAT) {
      const index = state.feedback?.questionIndex ?? quiz.index;
      const question = GENERAL_QUESTIONS.get(quiz.questionIds[index]);
      if (!question) return null;
      const selectedId = quiz.firstAnswers[index];
      const companionContext = { activity: 'jungle', question: question.prompt, choices: question.choices.map(choice => choice.text),
        selected: question.choices.find(choice => choice.id === selectedId)?.text || '' };
      if (state.feedback) return {
        title: state.feedback.correct ? '잘 풀었어요!' : '괜찮아요, 다시 해봐요',
        body: `${state.feedback.explanation}${state.feedback.correct ? '' : `\n\n힌트: ${state.feedback.hint}`}`,
        icon: state.feedback.correct ? '✨' : '🌱', kicker: `${quiz.difficulty === 'easy' ? '7세 준비' : '초1 도전'} · ${question.subject} · ${index + 1} / 3`, companionContext,
        actions: [{ label: state.feedback.correct ? '다음 문제' : '다시 풀기', action: { type: state.feedback.correct ? 'NEXT' : 'RETRY',
          sessionId: quiz.sessionId, questionId: question.id, questionIndex: index }, primary: true }],
      };
      return { question: true, title: '물가새와 함께 배우기', body: `${question.prompt}${quiz.hintShown ? `\n\n힌트: ${question.hint}` : ''}`,
        icon: '🐦', kicker: `${quiz.difficulty === 'easy' ? '7세 준비' : '초1 도전'} · ${question.subject} · 문제 ${index + 1} / 3`, companionContext,
        actions: [...quiz.choiceOrders[question.id].map(choiceId => ({ label: question.choices.find(choice => choice.id === choiceId).text,
          action: { type: 'ANSWER', sessionId: quiz.sessionId, questionId: question.id, questionIndex: index, choiceId } })),
        ...(!quiz.hintShown ? [{ label: '힌트 보기', action: { type: 'HINT', sessionId: quiz.sessionId, questionId: question.id, questionIndex: index } }] : [])] };
    }
    if (state.feedback) {
      const question = QUESTION_BY_ID.get(state.feedback.questionId);
      return {
        title: state.feedback.correct ? "잘 관찰했어요!" : "다시 살펴봐요",
        body: question.explanation,
        icon: state.feedback.correct ? "✨" : "🌿",
        kicker: "새 관찰",
        actions: [{
          label: "다음 문제",
          action: { type: "NEXT", sessionId: state.feedback.sessionId, questionId: state.feedback.questionId },
          primary: true,
        }],
      };
    }
    if (quiz.currentIndex >= QUESTIONS.length) return null;
    const questionId = quiz.questionIds[quiz.currentIndex];
    const question = QUESTION_BY_ID.get(questionId);
    const choices = new Map(question.choices.map((choice) => [choice.id, choice]));
    return {
      title: "물가새 관찰 퀴즈",
      body: question.prompt,
      icon: "🐦",
      kicker: `문제 ${quiz.currentIndex + 1} / ${QUESTIONS.length}`,
      actions: quiz.choiceOrders[questionId].map((choiceId) => ({
        label: choices.get(choiceId).text,
        action: { type: "ANSWER", sessionId: quiz.sessionId, questionId, choiceId },
      })),
    };
  }
  if (state.mode === "result" && state.result) {
    if (state.result.format === GENERAL_FORMAT) {
      const captured = !!state.save.captured[BIRD_ID]?.captured;
      return { title: state.result.success ? '배운 내용을 기록했어요!' : '조금 더 알아볼까요?',
        body: `세 문제를 모두 풀었어요. 처음에 맞힌 문제 ${state.result.firstTryScore} / 3개예요.${state.result.newlyCaptured ? ' 물가새를 도감에 등록했어요!' : captured ? ' 관찰 기록은 안전하게 남아 있어요.' : ''}`,
        icon: state.result.success ? '📗' : '🌱', kicker: '함께 배운 결과',
        actions: [...(!state.result.success ? [{ label: '새 문제로 다시 시작', action: { type: 'RETRY', sessionId: state.result.sessionId }, primary: true }] : []),
          { label: '탐험으로 돌아가기', action: { type: 'CLOSE' }, primary: state.result.success }] };
    }
    const body = state.result.success
      ? `${state.result.score} / ${state.result.total}개 정답이에요. ${state.result.newlyCaptured ? "물가새를 도감에 등록했어요!" : "물가새는 이미 도감에 있어요."}`
      : `${state.result.score} / ${state.result.total}개 정답이에요. 설명을 떠올리며 다시 관찰해 봐요.`;
    return {
      title: state.result.success ? "관찰 기록을 남겼어요!" : "새를 더 알아볼까요?",
      body,
      icon: state.result.success ? "📗" : "🌿",
      kicker: "관찰 결과",
      actions: [
        ...(!state.result.success ? [{ label: "다시 관찰", action: { type: "RETRY", sessionId: state.result.sessionId }, primary: true }] : []),
        { label: "탐험으로 돌아가기", action: { type: "CLOSE" }, primary: state.result.success },
        ...(state.result.success ? [{ label: "한 번 더 관찰", action: { type: "RETRY", sessionId: state.result.sessionId } }] : []),
      ],
    };
  }
  return null;
}

export function loadExploreSave(storage) {
  if (!storage || typeof storage.getItem !== "function") return { save: emptySave(), warning: null };
  let raw;
  try { raw = storage.getItem(EXPLORE_SAVE_KEY); }
  catch { return { save: emptySave(), warning: "저장 내용을 읽지 못했어요. 이번 탐험은 계속할 수 있어요." }; }
  if (raw === null || raw === undefined || raw === "") return { save: emptySave(), warning: null };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { save: emptySave(), warning: "저장 내용을 확인하지 못해 새 탐험을 시작해요. 원본 기록은 보존했어요." }; }
  return normalizeSave(parsed);
}

export function saveExploreSave(save, storage, expectedActiveQuiz = null) {
  if (!storage || typeof storage.setItem !== "function") return false;
  const normalized = normalizeSave(save);
  if (normalized.warning) return false;
  try {
    if (typeof storage.getItem !== "function") return false;
    const raw = storage.getItem(EXPLORE_SAVE_KEY);
    let persisted = emptySave();
    if (raw !== null && raw !== undefined && raw !== "") {
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== SAVE_VERSION || parsed.regionId !== REGION_ID) return false;
      persisted = normalizeSave(parsed).save;
    }
    const expectedQuiz = expectedActiveQuiz === null ? null : validActiveQuiz(expectedActiveQuiz);
    if (expectedActiveQuiz !== null && !expectedQuiz) return false;
    if (JSON.stringify(persisted.activeQuiz) !== JSON.stringify(expectedQuiz)) return false;
    const nextSave = {
      ...normalized.save,
      captured: mergeCaptured(persisted.captured, normalized.save.captured),
    };
    storage.setItem(EXPLORE_SAVE_KEY, JSON.stringify(nextSave));
    return true;
  } catch {
    return false;
  }
}
