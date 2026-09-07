export function createChapterState() {
  return {
    questStarted: false,
    discoveredClues: [],
    clueQuizScore: 0,
    clueQuizzesComplete: false,
    bluebirdComplete: false,
  };
}

export function resetChapter() {
  return createChapterState();
}

export function hasClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function clueCount(state) {
  return state.discoveredClues.length;
}
