import { nextWaterfallClueId, canMeetKingfisher } from "./waterfall_chapter.js";

const ITEMS = {
  streamGate: { id: "streamGate", type: "streamGate", x: 700, y: 900, radius: 110, label: "계곡 입구" },
  steppingStones: { id: "steppingStones", type: "steppingStones", x: 1080, y: 700, radius: 130, label: "징검다리" },
  echo: { id: "echo", type: "echo", x: 1170, y: 560, radius: 100, label: "폭포 소리" },
  mistTrail: { id: "mistTrail", type: "mistTrail", x: 1020, y: 480, radius: 100, label: "안개 흔적" },
  waterDrops: { id: "waterDrops", type: "waterDrops", x: 1250, y: 470, radius: 100, label: "물방울 반짝이" },
  wetFeather: { id: "wetFeather", type: "discovery", x: 1100, y: 620, radius: 55, label: "젖은 깃털", discoveryText: "바위 위에 젖은 깃털 하나가 놓여 있어. 물총새가 물고기 잡으러 왔다 간 흔적이야!" },
  lookout: { id: "lookout", type: "lookout", x: 1450, y: 330, radius: 120, label: "폭포 전망대" },
  kingfisher: { id: "kingfisher", type: "kingfisher", x: 1410, y: 400, radius: 100, label: "물총새" },
};

export function waterfallInteractables(state) {
  if (!state.streamGateComplete) return [ITEMS.streamGate];
  if (!state.steppingStonesComplete) return [ITEMS.steppingStones];
  const clue = nextWaterfallClueId(state);
  if (clue) {
    const items = [ITEMS[clue]];
    if (state.steppingStonesComplete && !state.adventure.birdComplete) items.push(ITEMS.wetFeather);
    return items;
  }
  if (state.adventure.clueQuizzesComplete && !state.lookoutComplete) return [ITEMS.lookout];
  if (canMeetKingfisher(state)) return [ITEMS.kingfisher];
  if (state.adventure.birdComplete && !state.rewardComplete) return [{ id: "reward", type: "reward", x: 1410, y: 400, radius: 120, label: "폭포 탐험 완료" }];
  return [];
}

export function nearestWaterfallInteractable(player, state) {
  return waterfallInteractables(state).find((item) => Math.hypot(player.x - item.x, player.y - item.y) <= item.radius) || null;
}
