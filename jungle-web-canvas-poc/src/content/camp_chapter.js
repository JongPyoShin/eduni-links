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
  },
  {
    id: "footprints",
    type: "footprints",
    x: 920,
    y: 570,
    radius: 78,
    title: "작은 발자국 발견!",
    fact: "발자국의 방향을 보면 어디로 갔는지 알 수 있어.",
  },
  {
    id: "birdcall",
    type: "birdcall",
    x: 1120,
    y: 820,
    radius: 78,
    title: "짹짹! 새소리가 들려!",
    fact: "보이지 않아도 소리를 들으면 근처에 새가 있다는 걸 알 수 있어.",
  },
];

export const LANDMARKS = {
  hut: { id: "hut", type: "hut", x: 455, y: 320, radius: 88 },
  firePit: { id: "firePit", type: "firePit", x: 920, y: 820, radius: 94 },
  bluebird: { id: "bluebird", type: "bluebird", x: BLUEBIRD.WORLD.x, y: BLUEBIRD.WORLD.y, radius: BLUEBIRD.INTERACT_RADIUS },
};

export function chapterObjective(state) {
  if (state.bluebirdComplete) return "탐험 완료!";
  if (state.firePitComplete) return "전망대로 가 보자!";
  if (clueCount(state) === CLUES.length) return "모닥불로 가 보자!";
  if (state.questStarted) return `파랑새의 흔적 ${clueCount(state)} / ${CLUES.length}`;
  return "학습 오두막을 찾아가 보자";
}

export function startQuest(state) {
  return state.questStarted ? state : { ...state, questStarted: true };
}

export function collectClue(state, clueId) {
  if (!state.questStarted || !CLUES.some((clue) => clue.id === clueId) || hasClue(state, clueId)) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function canUseFirePit(state) {
  return state.questStarted && clueCount(state) === CLUES.length && !state.firePitComplete;
}

export function completeFirePit(state, selected) {
  const allFound = CLUES.every((clue) => selected.includes(clue.id));
  if (!canUseFirePit(state) || !allFound) return state;
  return { ...state, firePitComplete: true };
}

export function canMeetBluebird(state) {
  return state.firePitComplete && !state.bluebirdComplete;
}

export function completeBluebird(state) {
  return canMeetBluebird(state) ? { ...state, bluebirdComplete: true } : state;
}
