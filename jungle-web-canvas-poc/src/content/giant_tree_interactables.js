import { canUseTreeRingGame, nextGiantTreeClueId } from "./giant_tree_chapter.js";

export const GIANT_TREE_ITEMS = Object.freeze({
  rootGate: { id: "rootGate", type: "rootGate", x: 430, y: 930, radius: 115, label: "거대한 뿌리 입구" },
  barkPattern: { id: "barkPattern", type: "barkPattern", x: 650, y: 830, radius: 105, label: "나무껍질 무늬" },
  seedTrail: { id: "seedTrail", type: "seedTrail", x: 820, y: 690, radius: 105, label: "도토리 흔적" },
  hollowEcho: { id: "hollowEcho", type: "hollowEcho", x: 980, y: 570, radius: 105, label: "나무 속 울림" },
  treeRing: { id: "treeRing", type: "treeRing", x: 1110, y: 500, radius: 120, label: "나이테 관찰" },
  canopyStairs: { id: "canopyStairs", type: "canopyStairs", x: 1290, y: 430, radius: 125, label: "나선 계단" },
  squirrel: { id: "squirrel", type: "squirrel", x: 1440, y: 320, radius: 105, label: "다람쥐" },
  reward: { id: "reward", type: "reward", x: 1440, y: 320, radius: 125, label: "고목 탐험 완료" },
});

export function giantTreeInteractables(state) {
  if (!state.rootGateComplete) return [GIANT_TREE_ITEMS.rootGate];
  const clue = nextGiantTreeClueId(state);
  if (clue) return [GIANT_TREE_ITEMS[clue]];
  if (canUseTreeRingGame(state)) return [GIANT_TREE_ITEMS.treeRing];
  if (!state.canopyStairsComplete) return [GIANT_TREE_ITEMS.canopyStairs];
  if (!state.squirrelComplete) return [GIANT_TREE_ITEMS.squirrel];
  if (!state.rewardComplete) return [GIANT_TREE_ITEMS.reward];
  return [];
}

export function nearestGiantTreeInteractable(player, state) {
  return giantTreeInteractables(state).find((item) => Math.hypot(player.x - item.x, player.y - item.y) <= item.radius) || null;
}
