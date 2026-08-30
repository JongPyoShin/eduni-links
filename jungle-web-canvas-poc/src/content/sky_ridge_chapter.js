export const SKY_RIDGE_CLUES = Object.freeze([
  { id: "windRibbon", title: "바람 리본", objective: "바람에 흔들리는 리본을 따라가 보자" },
  { id: "cloudShadow", title: "구름 그림자", objective: "바닥을 지나가는 구름 그림자를 찾아보자" },
  { id: "windChime", title: "바람 종", objective: "가장 맑게 들리는 바람 종소리를 찾아보자" },
]);

export const STAR_PATTERN_ROUNDS = Object.freeze([
  { question: "첫 번째 별빛 순서를 기억해 보자!", choices: ["star-moon-star", "moon-star-cloud", "cloud-star-moon"], correct: "star-moon-star" },
  { question: "두 번째 하늘 무늬는 어떤 순서였을까?", choices: ["cloud-star-star", "star-cloud-moon", "moon-cloud-star"], correct: "cloud-star-star" },
  { question: "마지막 별빛 순서는 무엇이었을까?", choices: ["moon-cloud-star", "star-star-moon", "cloud-moon-cloud"], correct: "moon-cloud-star" },
]);

export function createSkyRidgeState() {
  return {
    skyGateComplete: false,
    discoveredClues: [],
    starPatternRound: 0,
    starPatternComplete: false,
    summitBridgeComplete: false,
    hawkComplete: false,
    rewardComplete: false,
  };
}

export function hasSkyRidgeClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function nextSkyRidgeClueId(state) {
  if (!state.skyGateComplete) return null;
  const next = SKY_RIDGE_CLUES.find((clue) => !hasSkyRidgeClue(state, clue.id));
  return next ? next.id : null;
}

export function skyRidgeObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.hawkComplete) return "하늘 능선 탐험 보상을 확인해 보자";
  if (state.summitBridgeComplete) return "하늘매가 나는 모습을 관찰해 보자";
  if (state.starPatternComplete) return "정상으로 이어진 하늘 다리를 건너가 보자";
  if (state.discoveredClues.length === SKY_RIDGE_CLUES.length) return "별빛 순서를 기억해 보자";
  if (state.skyGateComplete) {
    const next = SKY_RIDGE_CLUES.find((clue) => clue.id === nextSkyRidgeClueId(state));
    return next?.objective || "하늘 능선을 살펴보자";
  }
  return "구름이 가까운 하늘 능선 입구를 찾아가 보자";
}

export function completeSkyGate(state) {
  return state.skyGateComplete ? state : { ...state, skyGateComplete: true };
}

export function collectSkyRidgeClue(state, clueId) {
  if (!state.skyGateComplete || nextSkyRidgeClueId(state) !== clueId) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function canUseStarPattern(state) {
  return state.discoveredClues.length === SKY_RIDGE_CLUES.length && !state.starPatternComplete;
}

export function answerStarPatternRound(state, answerId) {
  if (!canUseStarPattern(state)) return { state, correct: false, completed: false };
  const round = STAR_PATTERN_ROUNDS[state.starPatternRound];
  if (!round || answerId !== round.correct) return { state, correct: false, completed: false };
  const nextRound = state.starPatternRound + 1;
  const nextState = {
    ...state,
    starPatternRound: nextRound,
    starPatternComplete: nextRound === STAR_PATTERN_ROUNDS.length,
  };
  return { state: nextState, correct: true, completed: nextState.starPatternComplete };
}

export function completeSummitBridge(state) {
  if (!state.starPatternComplete || state.summitBridgeComplete) return state;
  return { ...state, summitBridgeComplete: true };
}

export function completeSkyHawk(state) {
  if (!state.summitBridgeComplete || state.hawkComplete) return state;
  return { ...state, hawkComplete: true };
}

export function completeSkyRidgeReward(state) {
  if (!state.hawkComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}
