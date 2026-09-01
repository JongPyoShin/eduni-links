import { BLUEBIRD } from "../constants.js";
import { clueCount, hasClue } from "./chapter_state.js";

export const CLUES = [
  {
    id: "feather",
    type: "feather",
    x: 690,
    y: 320,
    radius: 78,
    title: "파란 깃털 발견!",
    fact: "새의 깃털은 빛을 받으면 더 반짝여 보일 수 있어.",
    quizId: "q001",
  },
  {
    id: "footprints",
    type: "footprints",
    x: 920,
    y: 570,
    radius: 78,
    title: "작은 발자국 발견!",
    fact: "발자국의 방향을 보면 어디로 갔는지 알 수 있어.",
    quizId: "q004",
  },
  {
    id: "birdcall",
    type: "birdcall",
    x: 1120,
    y: 820,
    radius: 78,
    title: "짹짹! 새소리가 들려!",
    fact: "보이지 않아도 소리를 들으면 근처에 새가 있다는 걸 알 수 있어.",
    quizId: "q005",
  },
];

export const LANDMARKS = {
  hut: { id: "hut", type: "hut", x: 455, y: 320, radius: 88 },
  firePit: { id: "firePit", type: "firePit", x: 990, y: 900, radius: 120 },
  bluebird: { id: "bluebird", type: "bluebird", x: BLUEBIRD.WORLD.x, y: BLUEBIRD.WORLD.y, radius: BLUEBIRD.INTERACT_RADIUS },
};

export function nextClueId(state) {
  if (!state.questStarted) return null;
  const next = CLUES.find((clue) => !hasClue(state, clue.id));
  return next ? next.id : null;
}

export function isClueActive(state, clueId) {
  return nextClueId(state) === clueId;
}

export function chapterObjective(state) {
  if (state.bluebirdComplete) return "탐험 완료!";
  if (state.clueQuizzesComplete) return "전망대에서 파랑새를 찾아가 보자!";
  if (!state.questStarted) return "학습 오두막을 찾아가 보자";

  const missionByClue = {
    feather: "빛나는 깃털을 찾아보자",
    footprints: "발자국을 따라가 보자",
    birdcall: "새소리에 귀 기울여 보자",
  };
  const next = nextClueId(state);
  return `흔적 ${clueCount(state)} / ${CLUES.length} · ${missionByClue[next] || "숲을 살펴보자"}`;
}

export function startQuest(state) {
  return state.questStarted ? state : { ...state, questStarted: true };
}

export function collectClue(state, clueId) {
  if (!state.questStarted || !CLUES.some((clue) => clue.id === clueId) || hasClue(state, clueId)) return state;
  if (!isClueActive(state, clueId)) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function addClueQuizScore(state, correct) {
  const newScore = state.clueQuizScore + (correct ? 1 : 0);
  const newDiscovered = [...state.discoveredClues];
  const allComplete = newDiscovered.length === CLUES.length;
  return { ...state, clueQuizScore: newScore, clueQuizzesComplete: allComplete };
}

export function canMeetBluebird(state) {
  return state.clueQuizzesComplete && !state.bluebirdComplete;
}

export function completeBluebird(state) {
  return canMeetBluebird(state) ? { ...state, bluebirdComplete: true } : state;
}

export function getClueQuizId(state, clueId) {
  const clue = CLUES.find((c) => c.id === clueId);
  return clue ? clue.quizId : null;
}
