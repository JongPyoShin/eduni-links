import { nextSkyRidgeClueId, canMeetSkyHawk } from "./sky_ridge_chapter.js";

export const SKY_RIDGE_ITEMS = Object.freeze({
  skyGate: { id: "skyGate", type: "skyGate", x: 430, y: 930, radius: 115, label: "하늘 능선 입구" },
  windRibbon: { id: "windRibbon", type: "windRibbon", x: 650, y: 820, radius: 105, label: "바람 리본" },
  cloudShadow: { id: "cloudShadow", type: "cloudShadow", x: 830, y: 690, radius: 105, label: "구름 그림자" },
  windChime: { id: "windChime", type: "windChime", x: 1000, y: 560, radius: 105, label: "바람 종" },
  windFeather: { id: "windFeather", type: "discovery", x: 740, y: 760, radius: 55, label: "바람깃", discoveryText: "바람에 날리는 가벼운 깃털 하나. 하늘매가 지나간 자리에서 떨어진 것 같아!" },
  summitBridge: { id: "summitBridge", type: "summitBridge", x: 1300, y: 420, radius: 125, label: "하늘 다리" },
  hawk: { id: "hawk", type: "hawk", x: 1450, y: 310, radius: 105, label: "하늘매" },
  reward: { id: "reward", type: "reward", x: 1450, y: 310, radius: 125, label: "하늘 능선 탐험 완료" },
});

export function skyRidgeInteractables(state) {
  if (!state.skyGateComplete) return [SKY_RIDGE_ITEMS.skyGate];
  const clue = nextSkyRidgeClueId(state);
  if (clue) {
    const items = [SKY_RIDGE_ITEMS[clue]];
    if (state.skyGateComplete && !state.adventure.birdComplete) items.push(SKY_RIDGE_ITEMS.windFeather);
    return items;
  }
  if (state.adventure.clueQuizzesComplete && !state.summitBridgeComplete) return [SKY_RIDGE_ITEMS.summitBridge];
  if (canMeetSkyHawk(state)) return [SKY_RIDGE_ITEMS.hawk];
  if (state.adventure.birdComplete && !state.rewardComplete) return [SKY_RIDGE_ITEMS.reward];
  return [];
}

export function nearestSkyRidgeInteractable(player, state) {
  return skyRidgeInteractables(state).find((item) => Math.hypot(player.x - item.x, player.y - item.y) <= item.radius) || null;
}
