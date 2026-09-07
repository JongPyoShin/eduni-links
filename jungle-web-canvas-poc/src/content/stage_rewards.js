export const STAGE_REWARDS = Object.freeze({
  camp: Object.freeze({
    id: "bluebird-feather",
    stageId: "camp",
    name: "파랑새 깃털 배지",
    icon: "🪶",
    message: "파랑새 깃털 배지를 얻었어!",
    discoveries: Object.freeze(["파란 깃털", "작은 발자국", "새소리", "파랑새"]),
  }),
  waterfall: Object.freeze({
    id: "kingfisher-drop",
    stageId: "waterfall",
    name: "물총새 물방울 배지",
    icon: "💧",
    message: "물총새 물방울 배지를 얻었어!",
    discoveries: Object.freeze(["징검다리", "폭포 소리", "안개 흔적", "잎사귀", "물총새"]),
  }),
  cave: Object.freeze({
    id: "firefly-crystal",
    stageId: "cave",
    name: "반딧불 수정 배지",
    icon: "💎",
    message: "반딧불 수정 배지를 얻었어!",
    discoveries: Object.freeze(["반딧불 길", "울림 수정", "벽 그림자", "깜빡임 순서", "수정 다리", "작은 박쥐"]),
  }),
  giantTree: Object.freeze({
    id: "ancient-seed",
    stageId: "giantTree",
    name: "고목 씨앗 배지",
    icon: "🌰",
    message: "고목 씨앗 배지를 얻었어!",
    discoveries: Object.freeze(["나무껍질 무늬", "도토리 흔적", "나무 속 울림", "나이테", "나선 계단", "다람쥐"]),
  }),
  skyRidge: Object.freeze({
    id: "sky-star",
    stageId: "skyRidge",
    name: "하늘별 배지",
    icon: "⭐",
    message: "하늘별 배지를 얻었어!",
    discoveries: Object.freeze(["바람 리본", "구름 그림자", "바람 종", "별빛 순서", "하늘 다리", "하늘매"]),
  }),
});

export const REWARD_STORAGE_KEY = "eduni.jungle.stageRewards.v1";

export function stageReward(stageId) {
  return STAGE_REWARDS[stageId] || null;
}

export function createRewardCollection(earned = []) {
  return Object.freeze({ earned: Object.freeze([...new Set(earned.filter(Boolean))]) });
}

export function hasStageReward(collection, stageId) {
  const reward = stageReward(stageId);
  return Boolean(reward && collection?.earned?.includes(reward.id));
}

export function awardStageReward(collection, stageId) {
  const reward = stageReward(stageId);
  if (!reward) return collection || createRewardCollection();
  if (collection?.earned?.includes(reward.id)) return collection;
  return createRewardCollection([...(collection?.earned || []), reward.id]);
}

export function loadRewardCollection(storage = globalThis.localStorage) {
  if (!storage?.getItem) return createRewardCollection();
  try {
    const parsed = JSON.parse(storage.getItem(REWARD_STORAGE_KEY) || "null");
    return createRewardCollection(Array.isArray(parsed?.earned) ? parsed.earned : []);
  } catch {
    return createRewardCollection();
  }
}

export function saveRewardCollection(collection, storage = globalThis.localStorage) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(REWARD_STORAGE_KEY, JSON.stringify({ earned: [...(collection?.earned || [])] }));
    return true;
  } catch {
    return false;
  }
}

export function awardAndSaveStageReward(stageId, storage = globalThis.localStorage) {
  const next = awardStageReward(loadRewardCollection(storage), stageId);
  saveRewardCollection(next, storage);
  return next;
}
