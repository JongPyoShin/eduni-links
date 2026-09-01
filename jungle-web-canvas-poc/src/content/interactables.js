import { CLUES, LANDMARKS, canMeetBluebird, nextClueId } from "./camp_chapter.js";

const CAMP_DISCOVERIES = [
  { id: "shinyFeather", type: "discovery", x: 320, y: 960, radius: 60, label: "반짝이는 깃털", discoveryText: " sunlight에 반짝이는 작은 깃털이 바닥에 떨어져 있어. 파랑새가 지나간 흔적이야!" },
];

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

  if (state.questStarted && !state.bluebirdComplete) {
    items.push(CAMP_DISCOVERIES[0]);
  }

  if (bluebirdReady && canMeetBluebird(state)) items.push({ ...LANDMARKS.bluebird, label: "파랑새 관찰" });
  return items;
}

export function nearestInteractable(player, state, options) {
  return buildInteractables(state, options)
    .filter((item) => distance(player, item) <= item.radius)
    .sort((a, b) => distance(player, a) - distance(player, b))[0] || null;
}
