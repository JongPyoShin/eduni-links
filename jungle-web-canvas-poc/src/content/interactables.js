import { CLUES, LANDMARKS, canUseFirePit } from "./camp_chapter.js";
import { hasClue } from "./chapter_state.js";

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildInteractables(state) {
  const items = [];
  if (!state.questStarted) items.push({ ...LANDMARKS.hut, label: "오늘의 탐험" });
  if (state.questStarted) {
    for (const clue of CLUES) {
      if (!hasClue(state, clue.id)) items.push({ ...clue, label: clue.title });
    }
  }
  if (canUseFirePit(state)) items.push({ ...LANDMARKS.firePit, label: "기억해 보기" });
  if (state.firePitComplete && !state.bluebirdComplete) items.push({ ...LANDMARKS.bluebird, label: "파랑새" });
  return items;
}

export function nearestInteractable(player, state) {
  return buildInteractables(state)
    .filter((item) => distance(player, item) <= item.radius)
    .sort((a, b) => distance(player, a) - distance(player, b))[0] || null;
}
