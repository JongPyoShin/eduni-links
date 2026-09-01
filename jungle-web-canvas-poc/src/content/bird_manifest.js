export const BIRD_MANIFEST = Object.freeze({
  bluebird: Object.freeze({
    id: "bluebird",
    name: "파랑새",
    icon: "🐦",
    stageId: "camp",
    habitat: "숲",
    description: "푸른 깃털이 아름다운 작은 새. 숲속 나무 사이를 반짝이며 날아다녀.",
  }),
  kingfisher: Object.freeze({
    id: "kingfisher",
    name: "물총새",
    icon: "🐦",
    stageId: "waterfall",
    habitat: "계곡과 물가",
    description: "푸른빛과 갈색이 섞인 깃털을 가진 빠른 새. 물 위를 날며 물고기를 잡아.",
  }),
  skyHawk: Object.freeze({
    id: "skyHawk",
    name: "하늘매",
    icon: "🦅",
    stageId: "skyRidge",
    habitat: "높은 산과 하늘 능선",
    description: "넓은 날개를 펴고 바람을 타며 높이 나는 커다란 맹금류.",
  }),
});

export const BIRD_IDS = Object.freeze(Object.keys(BIRD_MANIFEST));

export function getBirdData(birdId) {
  return BIRD_MANIFEST[birdId] || null;
}
