import { BLUEBIRD } from "../constants.js";
import { LANDMARKS } from "./camp_chapter.js";

export const INTRO_DURATION_MS = 2200;
export const RIDGE_DURATION_MS = 2400;
export const REWARD_REVEAL_MS = 2200;
const RIDGE_ARRIVAL_RADIUS = 112;

export function createSequenceState() {
  return {
    introStartedAt: null,
    introPlayed: false,
    ridgeArrivalStartedAt: null,
    ridgeArrivalPlayed: false,
    rewardStartedAt: null,
    rewardShown: false,
  };
}

export function beginIntro(state, now) {
  return state.introStartedAt === null && !state.introPlayed ? { ...state, introStartedAt: now } : state;
}

export function beginRidgeArrival(state, chapter, player, now) {
  const closeEnough = Math.hypot(player.x - LANDMARKS.bluebird.x, player.y - LANDMARKS.bluebird.y) <= RIDGE_ARRIVAL_RADIUS;
  if (!chapter.clueQuizzesComplete || !closeEnough || state.ridgeArrivalPlayed || state.ridgeArrivalStartedAt !== null) return state;
  return { ...state, ridgeArrivalStartedAt: now };
}

export function beginRewardReveal(state, now) {
  return state.rewardShown || state.rewardStartedAt !== null ? state : { ...state, rewardStartedAt: now };
}

export function advanceSequences(state, now) {
  let next = state;
  if (next.introStartedAt !== null && now - next.introStartedAt >= INTRO_DURATION_MS) next = { ...next, introStartedAt: null, introPlayed: true };
  if (next.ridgeArrivalStartedAt !== null && now - next.ridgeArrivalStartedAt >= RIDGE_DURATION_MS) next = { ...next, ridgeArrivalStartedAt: null, ridgeArrivalPlayed: true };
  if (next.rewardStartedAt !== null && now - next.rewardStartedAt >= REWARD_REVEAL_MS) next = { ...next, rewardStartedAt: null, rewardShown: true };
  return next;
}

export function activeDirection(state, now) {
  if (state.introStartedAt !== null) return { type: "intro", elapsed: now - state.introStartedAt };
  if (state.ridgeArrivalStartedAt !== null) return { type: "ridge", elapsed: now - state.ridgeArrivalStartedAt };
  return null;
}

export function scriptedCameraFocus(direction, player) {
  if (!direction) return null;
  const target = direction.type === "intro" ? { x: 430, y: 260 } : BLUEBIRD.VISUAL;
  const duration = direction.type === "intro" ? INTRO_DURATION_MS : RIDGE_DURATION_MS;
  const ratio = direction.elapsed / duration;
  const holdStart = direction.type === "intro" ? 0.32 : 0.25;
  const holdEnd = direction.type === "intro" ? 0.64 : 0.7;
  const amount = ratio < holdStart ? ratio / holdStart : ratio > holdEnd ? 1 - (ratio - holdEnd) / (1 - holdEnd) : 1;
  return { x: player.x + (target.x - player.x) * Math.max(0, Math.min(1, amount)), y: player.y + (target.y - player.y) * Math.max(0, Math.min(1, amount)) };
}
