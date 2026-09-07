import {
  createAdventureQuizState,
  collectAdventureClue,
  addAdventureQuizAnswer,
  canMeetAdventureBird,
  completeAdventureBird,
  retryAdventureClueQuizzes,
  adventureObjective,
} from "./adventure_quiz_state.js";

export const WATERFALL_CLUES = [
  { id: "echo", title: "폭포 소리 찾기", objective: "가장 가까운 물소리를 찾아보자", quizId: "q008" },
  { id: "mistTrail", title: "안개 흔적", objective: "젖은 바위의 흔적을 따라가 보자", quizId: "q002" },
  { id: "waterDrops", title: "물방울 반짝이", objective: "반짝이는 물방울 자국을 찾아보자", quizId: "q039" },
];

export function createWaterfallState() {
  return {
    streamGateComplete: false,
    steppingStonesComplete: false,
    adventure: createAdventureQuizState("kingfisher", WATERFALL_CLUES.map((c) => c.id)),
    lookoutComplete: false,
    rewardComplete: false,
  };
}

export function resetWaterfall() {
  return createWaterfallState();
}

export function hasWaterfallClue(state, clueId) {
  return state.adventure.discoveredClues.includes(clueId);
}

export function nextWaterfallClueId(state) {
  if (!state.steppingStonesComplete) return null;
  return state.adventure.clueIds.find((id) => !hasWaterfallClue(state, id)) || null;
}

export function waterfallObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.adventure.birdComplete) return "폭포 탐험 보상을 확인해 보자";
  if (state.lookoutComplete) return "물총새를 찾아가 보자!";
  if (state.adventure.clueQuizzesComplete) return "전망대로 올라가 보자";
  if (state.steppingStonesComplete) {
    const nextId = nextWaterfallClueId(state);
    if (nextId) {
      const clue = WATERFALL_CLUES.find((c) => c.id === nextId);
      return clue?.objective || "폭포 주변을 살펴보자";
    }
  }
  if (state.streamGateComplete) return "물에 빠지지 않고 징검다리를 건너가 보자";
  return "계곡 입구를 찾아가 보자";
}

export function completeStreamGate(state) {
  return state.streamGateComplete ? state : { ...state, streamGateComplete: true };
}

export function completeSteppingStones(state) {
  if (!state.streamGateComplete || state.steppingStonesComplete) return state;
  return { ...state, steppingStonesComplete: true };
}

export function collectWaterfallClue(state, clueId) {
  if (!state.steppingStonesComplete) return state;
  const next = nextWaterfallClueId(state);
  if (next !== clueId) return state;
  return { ...state, adventure: collectAdventureClue(state.adventure, clueId) };
}

export function addWaterfallQuizAnswer(state, correct) {
  return { ...state, adventure: addAdventureQuizAnswer(state.adventure, correct) };
}

export function canMeetKingfisher(state) {
  return canMeetAdventureBird(state.adventure) && state.lookoutComplete;
}

export function completeKingfisher(state) {
  if (!canMeetKingfisher(state)) return state;
  return { ...state, adventure: completeAdventureBird(state.adventure) };
}

export function completeLookout(state) {
  if (!state.adventure.clueQuizzesComplete || state.lookoutComplete) return state;
  return { ...state, lookoutComplete: true };
}

export function completeWaterfallReward(state) {
  if (!state.adventure.birdComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}

export function retryWaterfallClueQuizzes(state) {
  return { ...state, adventure: retryAdventureClueQuizzes(state.adventure) };
}

export function getWaterfallClueQuizId(state, clueId) {
  const clue = WATERFALL_CLUES.find((c) => c.id === clueId);
  return clue?.quizId || null;
}
