export const PASS_THRESHOLD = 2;

export function createAdventureQuizState(birdId, clueIds) {
  return {
    stageBirdId: birdId,
    clueIds,
    discoveredClues: [],
    clueQuizAnsweredIds: [],
    clueQuizScore: 0,
    clueQuizzesComplete: false,
    birdComplete: false,
  };
}

export function hasAdventureClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function nextAdventureClueId(state) {
  return state.clueIds.find((id) => !hasAdventureClue(state, id)) || null;
}

export function collectAdventureClue(state, clueId) {
  if (nextAdventureClueId(state) !== clueId) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function addAdventureQuizAnswer(state, correct) {
  const score = state.clueQuizScore + (correct ? 1 : 0);
  const complete = state.discoveredClues.length >= state.clueIds.length;
  return { ...state, clueQuizScore: score, clueQuizzesComplete: complete };
}

export function adventureQuizzesComplete(state) {
  return state.clueQuizzesComplete;
}

export function canMeetAdventureBird(state) {
  return state.clueQuizzesComplete && !state.birdComplete;
}

export function completeAdventureBird(state) {
  if (!canMeetAdventureBird(state)) return state;
  return { ...state, birdComplete: true };
}

export function retryAdventureClueQuizzes(state) {
  return { ...state, discoveredClues: [], clueQuizScore: 0, clueQuizzesComplete: false };
}

export function adventureObjective(state, clueDefs, fallbackText) {
  if (state.birdComplete) return "탐험 완료!";
  if (state.clueQuizzesComplete) {
    const birdName = state.stageBirdId === "skyHawk" ? "하늘매" : "물총새";
    return `${birdName}를 찾아가 보자!`;
  }
  const nextId = nextAdventureClueId(state);
  if (nextId) {
    const clue = clueDefs.find((c) => c.id === nextId);
    return clue?.objective || fallbackText;
  }
  return fallbackText;
}
