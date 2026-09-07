import {
  createAdventureQuizState,
  collectAdventureClue,
  addAdventureQuizAnswer,
  canMeetAdventureBird,
  completeAdventureBird,
  retryAdventureClueQuizzes,
  adventureObjective,
} from "./adventure_quiz_state.js";

export const SKY_RIDGE_CLUES = Object.freeze([
  { id: "windRibbon", title: "바람 리본", objective: "바람에 흔들리는 리본을 따라가 보자", quizId: "q019" },
  { id: "cloudShadow", title: "구름 그림자", objective: "바닥을 지나가는 구름 그림자를 찾아보자", quizId: "q015" },
  { id: "windChime", title: "바람 종", objective: "가장 맑게 들리는 바람 종소리를 찾아보자", quizId: "q017" },
]);

export function createSkyRidgeState() {
  return {
    skyGateComplete: false,
    adventure: createAdventureQuizState("skyHawk", SKY_RIDGE_CLUES.map((c) => c.id)),
    summitBridgeComplete: false,
    rewardComplete: false,
  };
}

export function hasSkyRidgeClue(state, clueId) {
  return state.adventure.discoveredClues.includes(clueId);
}

export function nextSkyRidgeClueId(state) {
  if (!state.skyGateComplete) return null;
  return state.adventure.clueIds.find((id) => !hasSkyRidgeClue(state, id)) || null;
}

export function skyRidgeObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.adventure.birdComplete) return "하늘 능선 탐험 보상을 확인해 보자";
  if (state.summitBridgeComplete) return "하늘매를 찾아가 보자!";
  if (state.adventure.clueQuizzesComplete) return "정상으로 이어진 하늘 다리를 건너가 보자";
  if (state.skyGateComplete) {
    const nextId = nextSkyRidgeClueId(state);
    if (nextId) {
      const clue = SKY_RIDGE_CLUES.find((c) => c.id === nextId);
      return clue?.objective || "하늘 능선을 살펴보자";
    }
  }
  return "구름이 가까운 하늘 능선 입구를 찾아가 보자";
}

export function completeSkyGate(state) {
  return state.skyGateComplete ? state : { ...state, skyGateComplete: true };
}

export function collectSkyRidgeClue(state, clueId) {
  if (!state.skyGateComplete) return state;
  const next = nextSkyRidgeClueId(state);
  if (next !== clueId) return state;
  return { ...state, adventure: collectAdventureClue(state.adventure, clueId) };
}

export function addSkyRidgeQuizAnswer(state, correct) {
  return { ...state, adventure: addAdventureQuizAnswer(state.adventure, correct) };
}

export function canMeetSkyHawk(state) {
  return canMeetAdventureBird(state.adventure) && state.summitBridgeComplete;
}

export function completeSkyHawk(state) {
  if (!canMeetSkyHawk(state)) return state;
  return { ...state, adventure: completeAdventureBird(state.adventure) };
}

export function completeSummitBridge(state) {
  if (!state.adventure.clueQuizzesComplete || state.summitBridgeComplete) return state;
  return { ...state, summitBridgeComplete: true };
}

export function completeSkyRidgeReward(state) {
  if (!state.adventure.birdComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}

export function retrySkyRidgeClueQuizzes(state) {
  return { ...state, adventure: retryAdventureClueQuizzes(state.adventure) };
}

export function getSkyRidgeClueQuizId(state, clueId) {
  const clue = SKY_RIDGE_CLUES.find((c) => c.id === clueId);
  return clue?.quizId || null;
}
