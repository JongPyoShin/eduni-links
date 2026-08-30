export const GIANT_TREE_CLUES = Object.freeze([
  { id: "barkPattern", title: "나무껍질 무늬", objective: "같은 나무껍질 무늬를 찾아보자" },
  { id: "seedTrail", title: "도토리 흔적", objective: "떨어진 도토리를 따라가 보자" },
  { id: "hollowEcho", title: "나무 속 울림", objective: "빈 나무에서 나는 소리를 찾아보자" },
]);

export const TREE_RING_ROUNDS = Object.freeze([
  { question: "밝은 나이테를 몇 줄 찾을 수 있을까?", choices: ["3", "4", "5"], correct: "4" },
  { question: "이번 나무 조각의 굵은 나이테는 몇 줄일까?", choices: ["2", "3", "6"], correct: "3" },
  { question: "마지막 나이테 묶음은 모두 몇 줄일까?", choices: ["5", "6", "7"], correct: "6" },
]);

export function createGiantTreeState() {
  return {
    rootGateComplete: false,
    discoveredClues: [],
    treeRingRound: 0,
    treeRingComplete: false,
    canopyStairsComplete: false,
    squirrelComplete: false,
    rewardComplete: false,
  };
}

export function hasGiantTreeClue(state, clueId) {
  return state.discoveredClues.includes(clueId);
}

export function nextGiantTreeClueId(state) {
  if (!state.rootGateComplete) return null;
  const next = GIANT_TREE_CLUES.find((clue) => !hasGiantTreeClue(state, clue.id));
  return next ? next.id : null;
}

export function giantTreeObjective(state) {
  if (state.rewardComplete) return "탐험 완료!";
  if (state.squirrelComplete) return "고목 탐험 보상을 확인해 보자";
  if (state.canopyStairsComplete) return "다람쥐의 움직임을 관찰해 보자";
  if (state.treeRingComplete) return "나선 계단을 따라 위로 올라가 보자";
  if (state.discoveredClues.length === GIANT_TREE_CLUES.length) return "나이테 수를 세어 보자";
  if (state.rootGateComplete) {
    const next = GIANT_TREE_CLUES.find((clue) => clue.id === nextGiantTreeClueId(state));
    return next?.objective || "거대한 고목 주변을 살펴보자";
  }
  return "거대한 뿌리 사이의 입구를 찾아가 보자";
}

export function completeRootGate(state) {
  return state.rootGateComplete ? state : { ...state, rootGateComplete: true };
}

export function collectGiantTreeClue(state, clueId) {
  if (!state.rootGateComplete || nextGiantTreeClueId(state) !== clueId) return state;
  return { ...state, discoveredClues: [...state.discoveredClues, clueId] };
}

export function canUseTreeRingGame(state) {
  return state.discoveredClues.length === GIANT_TREE_CLUES.length && !state.treeRingComplete;
}

export function answerTreeRingRound(state, answerId) {
  if (!canUseTreeRingGame(state)) return { state, correct: false, completed: false };
  const round = TREE_RING_ROUNDS[state.treeRingRound];
  if (!round || answerId !== round.correct) return { state, correct: false, completed: false };
  const nextRound = state.treeRingRound + 1;
  const nextState = {
    ...state,
    treeRingRound: nextRound,
    treeRingComplete: nextRound === TREE_RING_ROUNDS.length,
  };
  return { state: nextState, correct: true, completed: nextState.treeRingComplete };
}

export function completeCanopyStairs(state) {
  if (!state.treeRingComplete || state.canopyStairsComplete) return state;
  return { ...state, canopyStairsComplete: true };
}

export function completeSquirrel(state) {
  if (!state.canopyStairsComplete || state.squirrelComplete) return state;
  return { ...state, squirrelComplete: true };
}

export function completeGiantTreeReward(state) {
  if (!state.squirrelComplete || state.rewardComplete) return state;
  return { ...state, rewardComplete: true };
}
