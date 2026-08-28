export const WATERFALL_CLUES = [
  {
    id: "echo",
    title: "폭포 소리 찾기",
    objective: "가장 가까운 물소리를 찾아보자",
  },
  {
    id: "mistTrail",
    title: "안개 흔적",
    objective: "젖은 바위의 흔적을 따라가 보자",
  },
];

export const LEAF_MATCH_ROUNDS = [
  {
    question: "폭포 옆에서 본 둥근 잎과 같은 모양은?",
    choices: ["round", "needle", "split"],
    correct: "round",
  },
  {
    question: "길쭉한 잎과 같은 모양을 골라보자!",
    choices: ["fan", "long", "round"],
    correct: "long",
  },
  {
    question: "끝이 세 갈래로 나뉜 잎과 같은 모양은?",
    choices: ["split", "round", "long"],
    correct: "split",
  },
];

export function createWaterfallState() {
  return {
    streamGateComplete: false,
    steppingStonesComplete: false,
    discoveredClues: [],
    leafMatchRound: 0,
    leafMatchComplete: false,
    lookoutComplete: false,
    kingfisherComplete: false,
    rewardComplete: false,
  };
}

export function resetWaterfall() {
  return createWaterfallState();
}

export function hasWaterfallClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function nextWaterfallClueId(state) {
  if (!state.steppingStonesComplete) return null;
  const next = WATERFALL_CLUES.find((clue) => !hasWaterfallClue(state, clue.id));
  return next ? next.id : null;
}

export function waterfallObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.kingfisherComplete) return "폭포 탐험 보상을 확인해 보자";
  if (state.lookoutComplete) return "물총새의 움직임을 관찰해 보자";
  if (state.leafMatchComplete) return "전망대로 올라가 보자";
  if (state.discoveredClues.length === WATERFALL_CLUES.length) return "같은 모양의 잎을 찾아보자";
  if (state.steppingStonesComplete) {
    const next = WATERFALL_CLUES.find((clue) => clue.id === nextWaterfallClueId(state));
    return next?.objective || "폭포 주변을 살펴보자";
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
  if (nextWaterfallClueId(state) !== clueId) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function canUseLeafMatch(state) {
  return state.discoveredClues.length === WATERFALL_CLUES.length && !state.leafMatchComplete;
}

export function answerLeafMatchRound(state, answerId) {
  if (!canUseLeafMatch(state)) return { state, correct: false, completed: false };
  const round = LEAF_MATCH_ROUNDS[state.leafMatchRound];
  if (!round || answerId !== round.correct) return { state, correct: false, completed: false };
  const nextRound = state.leafMatchRound + 1;
  const nextState = {
    ...state,
    leafMatchRound: nextRound,
    leafMatchComplete: nextRound === LEAF_MATCH_ROUNDS.length,
  };
  return { state: nextState, correct: true, completed: nextState.leafMatchComplete };
}

export function completeLookout(state) {
  if (!state.leafMatchComplete || state.lookoutComplete) return state;
  return { ...state, lookoutComplete: true };
}

export function completeKingfisher(state) {
  if (!state.lookoutComplete || state.kingfisherComplete) return state;
  return { ...state, kingfisherComplete: true };
}

export function completeWaterfallReward(state) {
  if (!state.kingfisherComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}
