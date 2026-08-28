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
    landmarks: ["entrance", "learningHut", "clueTrail", "firePit", "ridge"],
    ambience: ["forest", "fire"],
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
    landmarks: ["streamGate", "steppingStones", "waterfallBasin", "mistTrail", "lookout"],
    ambience: ["forest", "waterfall", "stream"],
  },
};

export function getStage(id) {
  return STAGES[id] || null;
}

export function getStageScenario(id) {
  return getStage(id)?.scenario || [];
}
