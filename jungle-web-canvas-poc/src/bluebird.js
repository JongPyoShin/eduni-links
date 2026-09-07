import { BLUEBIRD } from "./constants.js";

export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function isInRange(px, py, bird) {
  return distance(px, py, bird.x, bird.y) <= BLUEBIRD.INTERACT_RADIUS;
}

export function canInteract(px, py, bird, modalOpen) {
  return !modalOpen && isInRange(px, py, bird);
}
