export const CAVE_CLUES = [
  {
    id: "echoCrystal",
    title: "울림 수정",
    objective: "맑게 울리는 수정을 찾아보자",
  },
  {
    id: "shadowMark",
    title: "벽 그림자",
    objective: "벽에 비친 그림자 모양을 따라가 보자",
  },
];

export const FIREFLY_PATTERN_ROUNDS = [
  {
    question: "반딧불이 어떤 순서로 빛났을까?",
    choices: ["amber-cyan-amber", "cyan-amber-cyan", "lime-amber-cyan"],
    correct: "amber-cyan-amber",
  },
  {
    question: "두 번째 반딧불 무리의 빛 순서를 기억해 보자!",
    choices: ["lime-lime-cyan", "cyan-lime-lime", "amber-cyan-lime"],
    correct: "cyan-lime-lime",
  },
  {
    question: "마지막 빛 순서는 무엇이었을까?",
    choices: ["lime-amber-cyan", "cyan-cyan-amber", "amber-lime-amber"],
    correct: "lime-amber-cyan",
  },
];

export function createCaveState() {
  return {
    caveGateComplete: false,
    glowTrailComplete: false,
    discoveredClues: [],
    fireflyPatternRound: 0,
    fireflyPatternComplete: false,
    crystalBridgeComplete: false,
    batComplete: false,
    rewardComplete: false,
  };
}

export function resetCave() {
  return createCaveState();
}

export function hasCaveClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function nextCaveClueId(state) {
  if (!state.glowTrailComplete) return null;
  const next = CAVE_CLUES.find((clue) => !hasCaveClue(state, clue.id));
  return next ? next.id : null;
}

export function caveObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.batComplete) return "동굴 탐험 보상을 확인해 보자";
  if (state.crystalBridgeComplete) return "박쥐가 움직이는 모습을 관찰해 보자";
  if (state.fireflyPatternComplete) return "빛나는 수정 다리를 건너가 보자";
  if (state.discoveredClues.length === CAVE_CLUES.length) return "반딧불의 빛 순서를 기억해 보자";
  if (state.glowTrailComplete) {
    const next = CAVE_CLUES.find((clue) => clue.id === nextCaveClueId(state));
    return next?.objective || "동굴 안을 살펴보자";
  }
  if (state.caveGateComplete) return "반딧불 불빛을 따라 안쪽으로 가 보자";
  return "반딧불이 모여 있는 동굴 입구를 찾아가 보자";
}

export function completeCaveGate(state) {
  return state.caveGateComplete ? state : { ...state, caveGateComplete: true };
}

export function completeGlowTrail(state) {
  if (!state.caveGateComplete || state.glowTrailComplete) return state;
  return { ...state, glowTrailComplete: true };
}

export function collectCaveClue(state, clueId) {
  if (!state.glowTrailComplete || nextCaveClueId(state) !== clueId) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function canUseFireflyPattern(state) {
  return state.discoveredClues.length === CAVE_CLUES.length && !state.fireflyPatternComplete;
}

export function answerFireflyPatternRound(state, answerId) {
  if (!canUseFireflyPattern(state)) return { state, correct: false, completed: false };
  const round = FIREFLY_PATTERN_ROUNDS[state.fireflyPatternRound];
  if (!round || answerId !== round.correct) return { state, correct: false, completed: false };
  const nextRound = state.fireflyPatternRound + 1;
  const nextState = {
    ...state,
    fireflyPatternRound: nextRound,
    fireflyPatternComplete: nextRound === FIREFLY_PATTERN_ROUNDS.length,
  };
  return { state: nextState, correct: true, completed: nextState.fireflyPatternComplete };
}

export function completeCrystalBridge(state) {
  if (!state.fireflyPatternComplete || state.crystalBridgeComplete) return state;
  return { ...state, crystalBridgeComplete: true };
}

export function completeCaveBat(state) {
  if (!state.crystalBridgeComplete || state.batComplete) return state;
  return { ...state, batComplete: true };
}

export function completeCaveReward(state) {
  if (!state.batComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}
