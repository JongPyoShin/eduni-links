import { canUseFireflyPattern, nextCaveClueId } from "./cave_chapter.js";

export const CAVE_ITEMS = Object.freeze({
  caveGate: { id: "caveGate", type: "caveGate", x: 420, y: 930, radius: 110, label: "동굴 입구" },
  glowTrail: { id: "glowTrail", type: "glowTrail", x: 620, y: 860, radius: 110, label: "반딧불 길" },
  echoCrystal: { id: "echoCrystal", type: "echoCrystal", x: 780, y: 700, radius: 100, label: "울림 수정" },
  shadowMark: { id: "shadowMark", type: "shadowMark", x: 930, y: 600, radius: 100, label: "벽 그림자" },
  fireflyPattern: { id: "fireflyPattern", type: "fireflyPattern", x: 1080, y: 520, radius: 120, label: "반딧불 깜빡임" },
  crystalBridge: { id: "crystalBridge", type: "crystalBridge", x: 1260, y: 460, radius: 120, label: "수정 다리" },
  bat: { id: "bat", type: "bat", x: 1420, y: 340, radius: 100, label: "작은 박쥐" },
  reward: { id: "reward", type: "reward", x: 1420, y: 340, radius: 120, label: "동굴 탐험 완료" },
});

export function caveInteractables(state) {
  if (!state.caveGateComplete) return [CAVE_ITEMS.caveGate];
  if (!state.glowTrailComplete) return [CAVE_ITEMS.glowTrail];
  const clue = nextCaveClueId(state);
  if (clue) return [CAVE_ITEMS[clue]];
  if (canUseFireflyPattern(state)) return [CAVE_ITEMS.fireflyPattern];
  if (!state.crystalBridgeComplete) return [CAVE_ITEMS.crystalBridge];
  if (!state.batComplete) return [CAVE_ITEMS.bat];
  if (!state.rewardComplete) return [CAVE_ITEMS.reward];
  return [];
}

export function nearestCaveInteractable(player, state) {
  return caveInteractables(state).find((item) => Math.hypot(player.x - item.x, player.y - item.y) <= item.radius) || null;
}
