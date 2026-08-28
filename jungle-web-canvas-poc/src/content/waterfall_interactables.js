import { WATERFALL_CLUES, canUseLeafMatch, nextWaterfallClueId } from "./waterfall_chapter.js";

const ITEMS = {
  streamGate: { id:"streamGate", type:"streamGate", x:700, y:900, radius:110, label:"계곡 입구" },
  steppingStones: { id:"steppingStones", type:"steppingStones", x:1080, y:700, radius:130, label:"징검다리" },
  echo: { id:"echo", type:"echo", x:1170, y:560, radius:100, label:"폭포 소리" },
  mistTrail: { id:"mistTrail", type:"mistTrail", x:1020, y:480, radius:100, label:"안개 흔적" },
  leafMatch: { id:"leafMatch", type:"leafMatch", x:1250, y:470, radius:110, label:"잎사귀 짝" },
  lookout: { id:"lookout", type:"lookout", x:1450, y:330, radius:120, label:"폭포 전망대" },
  kingfisher: { id:"kingfisher", type:"kingfisher", x:1410, y:400, radius:100, label:"물총새" },
};

export function waterfallInteractables(state) {
  if (!state.streamGateComplete) return [ITEMS.streamGate];
  if (!state.steppingStonesComplete) return [ITEMS.steppingStones];
  const clue = nextWaterfallClueId(state);
  if (clue) return [ITEMS[clue]];
  if (canUseLeafMatch(state)) return [ITEMS.leafMatch];
  if (!state.lookoutComplete) return [ITEMS.lookout];
  if (!state.kingfisherComplete) return [ITEMS.kingfisher];
  if (!state.rewardComplete) return [{ id:"reward", type:"reward", x:1410, y:400, radius:120, label:"폭포 탐험 완료" }];
  return [];
}

export function nearestWaterfallInteractable(player, state) {
  return waterfallInteractables(state).find((item) => Math.hypot(player.x-item.x, player.y-item.y) <= item.radius) || null;
}
