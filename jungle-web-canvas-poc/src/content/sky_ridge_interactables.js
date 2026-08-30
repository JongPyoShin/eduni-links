import { canUseStarPattern, nextSkyRidgeClueId } from "./sky_ridge_chapter.js";

export const SKY_RIDGE_ITEMS = Object.freeze({
  skyGate: { id: "skyGate", type: "skyGate", x: 430, y: 930, radius: 115, label: "하늘 능선 입구" },
  windRibbon: { id: "windRibbon", type: "windRibbon", x: 650, y: 820, radius: 105, label: "바람 리본" },
  cloudShadow: { id: "cloudShadow", type: "cloudShadow", x: 830, y: 690, radius: 105, label: "구름 그림자" },
  windChime: { id: "windChime", type: "windChime", x: 1000, y: 560, radius: 105, label: "바람 종" },
  starPattern: { id: "starPattern", type: "starPattern", x: 1130, y: 490, radius: 120, label: "별빛 무늬" },
  summitBridge: { id: "summitBridge", type: "summitBridge", x: 1300, y: 420, radius: 125, label: "하늘 다리" },
  hawk: { id: "hawk", type: "hawk", x: 1450, y: 310, radius: 105, label: "하늘매" },
  reward: { id: "reward", type: "reward", x: 1450, y: 310, radius: 125, label: "하늘 능선 탐험 완료" },
});

export function skyRidgeInteractables(state) {
  if (!state.skyGateComplete) return [SKY_RIDGE_ITEMS.skyGate];
  const clue = nextSkyRidgeClueId(state);
  if (clue) return [SKY_RIDGE_ITEMS[clue]];
  if (canUseStarPattern(state)) return [SKY_RIDGE_ITEMS.starPattern];
  if (!state.summitBridgeComplete) return [SKY_RIDGE_ITEMS.summitBridge];
  if (!state.hawkComplete) return [SKY_RIDGE_ITEMS.hawk];
  if (!state.rewardComplete) return [SKY_RIDGE_ITEMS.reward];
  return [];
}

export function nearestSkyRidgeInteractable(player, state) {
  return skyRidgeInteractables(state).find((item) => Math.hypot(player.x - item.x, player.y - item.y) <= item.radius) || null;
}
