import { MOVEMENT } from "./constants.js";

export function speedRatio(heldMs) {
  const { PRECISION_RATIO, CRUISE_RATIO, PRECISION_HOLD_MS, ACCELERATION_MS } = MOVEMENT;
  if (heldMs <= PRECISION_HOLD_MS) return PRECISION_RATIO;
  const t = (heldMs - PRECISION_HOLD_MS) / ACCELERATION_MS;
  if (t >= 1) return CRUISE_RATIO;
  return PRECISION_RATIO + (CRUISE_RATIO - PRECISION_RATIO) * t;
}

export class MovementController {
  constructor() {
    this.heldMs = 0;
    this.lastSig = "0,0";
    this.vx = 0;
    this.vy = 0;
    this.ratio = 0;
  }

  update(dtMs, dir) {
    const sig = `${Math.sign(dir.x)},${Math.sign(dir.y)}`;
    if (sig === "0,0") {
      this.heldMs = 0;
      this.lastSig = "0,0";
      this.vx = 0;
      this.vy = 0;
      this.ratio = 0;
      return { x: 0, y: 0 };
    }
    if (sig !== this.lastSig) {
      this.heldMs = 0;
      this.lastSig = sig;
    }
    this.heldMs += dtMs;
    const ratio = speedRatio(this.heldMs);
    this.ratio = ratio;
    const len = Math.hypot(dir.x, dir.y) || 1;
    const ux = dir.x / len;
    const uy = dir.y / len;
    const speed = MOVEMENT.SPEED_MAX * ratio;
    this.vx = ux * speed;
    this.vy = uy * speed;
    const dt = dtMs / 1000;
    return { x: ux * speed * dt, y: uy * speed * dt };
  }
}
