export const STAGES = {
  camp: {
    id: "camp",
    title: "숲속 탐험 캠프",
    theme: "warm-forest",
    entryObjective: "학습 오두막을 찾아가 보자",
    scenario: [
      { id: "hut", kind: "destination", title: "학습 오두막", objective: "오늘의 탐험을 시작하자" },
      { id: "feather", kind: "clue", title: "빛나는 깃털", objective: "빛나는 깃털을 찾아보자" },
      { id: "footprints", kind: "clue", title: "발자국 추적", objective: "발자국을 따라가 보자" },
      { id: "birdcall", kind: "clue", title: "새소리 탐색", objective: "새소리에 귀 기울여 보자" },
      { id: "firePit", kind: "mini-game", title: "모닥불 기억 퀴즈", objective: "단서를 정리해 보자" },
      { id: "ridge", kind: "transition", title: "전망대 오르기", objective: "전망대로 가 보자" },
      { id: "bluebird", kind: "encounter", title: "파랑새 관찰", objective: "파랑새를 관찰해 보자" },
      { id: "reward", kind: "reward", title: "관찰 완료", objective: "탐험 완료!" },
    ],
    gamePattern: ["explore", "observe", "track", "listen", "remember", "climb", "encounter", "reward"],
    landmarks: ["entrance", "learningHut", "clueTrail", "firePit", "ridge"],
    ambience: ["forest", "fire"],
    renderPolicy: { walkableGeometry: "shared", collision: "unchanged" },
    visualPhases: {
      hut: { palette: "sunlit-olive", fog: 0.04, warmth: 0.62, density: 0.72, cue: "hut-lantern", ambience: "forest", landmark: "learningHut" },
      feather: { palette: "sunlit-olive", fog: 0.03, warmth: 0.58, density: 0.76, cue: "blue-feather-glint", ambience: "forest", landmark: "feather" },
      footprints: { palette: "earthy-olive", fog: 0.05, warmth: 0.5, density: 0.8, cue: "footprint-trail", ambience: "forest", landmark: "footprints" },
      birdcall: { palette: "leaf-green", fog: 0.07, warmth: 0.44, density: 0.84, cue: "sound-ripples", ambience: "forest", landmark: "birdcall" },
      firePit: { palette: "amber-dusk", fog: 0.08, warmth: 0.82, density: 0.72, cue: "fire-glow", ambience: "fire", landmark: "firePit" },
      ridge: { palette: "cool-ridge", fog: 0.04, warmth: 0.38, density: 0.52, cue: "ridge-light", ambience: "forest", landmark: "ridge", reveal: "open-sky" },
      bluebird: { palette: "cool-ridge", fog: 0.03, warmth: 0.42, density: 0.5, cue: "bluebird-perch", ambience: "forest", landmark: "bluebird", reveal: "open-sky" },
      reward: { palette: "golden-ridge", fog: 0.02, warmth: 0.76, density: 0.48, cue: "feather-celebration", ambience: "forest", landmark: "bluebird", reveal: "reward" },
    },
  },
  waterfall: {
    id: "waterfall",
    title: "안개 폭포 탐험",
    theme: "cool-waterfall",
    entryObjective: "물소리를 따라가 보자",
    scenario: [
      { id: "streamGate", kind: "destination", title: "계곡 입구", objective: "계곡 입구를 찾아가 보자" },
      { id: "steppingStones", kind: "movement", title: "징검다리 건너기", objective: "물에 빠지지 않고 건너가 보자" },
      { id: "echo", kind: "audio-game", title: "폭포 소리 찾기", objective: "가장 가까운 물소리를 찾아보자" },
      { id: "mistTrail", kind: "clue", title: "안개 흔적", objective: "젖은 바위의 흔적을 따라가 보자" },
      { id: "leafMatch", kind: "mini-game", title: "잎사귀 짝 맞추기", objective: "같은 모양의 잎을 찾아보자" },
      { id: "lookout", kind: "transition", title: "폭포 전망대", objective: "전망대로 올라가 보자" },
      { id: "kingfisher", kind: "encounter", title: "물총새 관찰", objective: "물총새의 움직임을 관찰해 보자" },
      { id: "reward", kind: "reward", title: "폭포 탐험 완료", objective: "탐험 완료!" },
    ],
    gamePattern: ["explore", "cross", "listen", "track", "match", "climb", "observe", "reward"],
    landmarks: ["streamGate", "steppingStones", "waterfallBasin", "mistTrail", "lookout"],
    ambience: ["forest", "waterfall", "stream"],
    renderPolicy: { walkableGeometry: "shared", collision: "unchanged" },
    visualPhases: {
      streamGate: { palette: "misty-cyan", fog: 0.58, warmth: 0.22, density: 0.78, cue: "gate-lantern", ambience: "stream", landmark: "streamGate", reveal: "waterfall-hidden" },
      steppingStones: { palette: "wet-blue", fog: 0.48, warmth: 0.2, density: 0.8, cue: "stone-glow", ambience: "stream", landmark: "steppingStones", reveal: "waterfall-hidden" },
      echo: { palette: "echo-cyan", fog: 0.5, warmth: 0.16, density: 0.82, cue: "sound-ripples", ambience: "waterfall", landmark: "waterfallBasin", reveal: "waterfall-partial" },
      mistTrail: { palette: "mist-cyan", fog: 0.62, warmth: 0.14, density: 0.84, cue: "moving-mist", ambience: "waterfall", landmark: "mistTrail", reveal: "waterfall-partial" },
      leafMatch: { palette: "wet-green", fog: 0.34, warmth: 0.3, density: 0.88, cue: "leaf-focus", ambience: "stream", landmark: "leafMatch", reveal: "waterfall-partial" },
      lookout: { palette: "open-cyan", fog: 0.16, warmth: 0.46, density: 0.58, cue: "lookout-light", ambience: "waterfall", landmark: "lookout", reveal: "waterfall-full" },
      kingfisher: { palette: "open-cyan", fog: 0.12, warmth: 0.42, density: 0.64, cue: "kingfisher-perch", ambience: "waterfall", landmark: "kingfisher", reveal: "waterfall-full" },
      reward: { palette: "rainbow-mist", fog: 0.08, warmth: 0.64, density: 0.6, cue: "waterfall-celebration", ambience: "waterfall", landmark: "kingfisher", reveal: "reward" },
      complete: { palette: "rainbow-mist", fog: 0.06, warmth: 0.68, density: 0.56, cue: "none", ambience: "waterfall", landmark: "lookout", reveal: "reward" },
    },
  },
};

export function getStage(id) {
  return STAGES[id] || null;
}

export function getStageScenario(id) {
  return getStage(id)?.scenario || [];
}

export function getStageVisualPhase(stageId, phaseId) {
  return getStage(stageId)?.visualPhases?.[phaseId] || null;
}
