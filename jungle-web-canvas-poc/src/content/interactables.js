import { CLUES, LANDMARKS, canMeetBluebird, nextClueId } from "./camp_chapter.js";

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function buildInteractables(state, { bluebirdReady = true } = {}) {
  const items = [];
  if (!state.questStarted) items.push({ ...LANDMARKS.hut, label: "오늘의 탐험" });

  const activeClueId = nextClueId(state);
  if (activeClueId) {
    const clue = CLUES.find((entry) => entry.id === activeClueId);
    if (clue) items.push({ ...clue, label: clue.title });
  }

  if (bluebirdReady && canMeetBluebird(state)) items.push({ ...LANDMARKS.bluebird, label: "파랑새 관찰" });
  return items;
}

export function nearestInteractable(player, state, options) {
  return buildInteractables(state, options)
    .filter((item) => distance(player, item) <= item.radius)
    .sort((a, b) => distance(player, a) - distance(player, b))[0] || null;
}
