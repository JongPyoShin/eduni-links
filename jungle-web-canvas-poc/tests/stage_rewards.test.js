import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_REWARDS,
  REWARD_STORAGE_KEY,
  stageReward,
  createRewardCollection,
  hasStageReward,
  awardStageReward,
  loadRewardCollection,
  saveRewardCollection,
} from "../src/content/stage_rewards.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test("Jungle stages expose distinct collectible badges", () => {
  assert.equal(stageReward("camp").name, "파랑새 깃털 배지");
  assert.equal(stageReward("waterfall").name, "물총새 물방울 배지");
  assert.equal(stageReward("cave").name, "반딧불 수정 배지");
  assert.equal(stageReward("giantTree").name, "고목 씨앗 배지");
  assert.equal(stageReward("skyRidge").name, "하늘별 배지");
  const rewards = Object.values(STAGE_REWARDS);
  assert.equal(rewards.length, 5);
  assert.equal(new Set(rewards.map((reward) => reward.id)).size, rewards.length);
});

test("awarding a stage reward is idempotent", () => {
  const empty = createRewardCollection();
  const once = awardStageReward(empty, "cave");
  const twice = awardStageReward(once, "cave");
  assert.equal(hasStageReward(once, "cave"), true);
  assert.strictEqual(twice, once);
});

test("reward collection persists without requiring browser storage in tests", () => {
  const storage = memoryStorage();
  const earned = awardStageReward(createRewardCollection(), "cave");
  assert.equal(saveRewardCollection(earned, storage), true);
  assert.deepEqual(loadRewardCollection(storage).earned, ["firefly-crystal"]);
  assert.match(storage.getItem(REWARD_STORAGE_KEY), /firefly-crystal/);
});

test("malformed persisted reward data safely falls back to empty", () => {
  const storage = memoryStorage({ [REWARD_STORAGE_KEY]: "not-json" });
  assert.deepEqual(loadRewardCollection(storage).earned, []);
});
