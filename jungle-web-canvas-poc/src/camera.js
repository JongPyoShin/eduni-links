import { makeCamera, clampCamera } from "./transforms.js";
import { CAMERA } from "./constants.js";

export class Camera {
  constructor(world) {
    this.cam = makeCamera(world.w / 2, world.h / 2, CAMERA.ZOOM);
    this.world = world;
    this.punchUntil = 0;
    this.punchAmount = 0;
    this.punchSeed = 0;
  }

  follow(px, py, viewW, viewH) {
    this.cam.x += (px - this.cam.x) * CAMERA.FOLLOW_LERP;
    this.cam.y += (py - this.cam.y) * CAMERA.FOLLOW_LERP;
    clampCamera(this.cam, this.world, viewW, viewH);
  }

  focus(px, py, viewW, viewH, strength = 0.1) {
    this.cam.x += (px - this.cam.x) * strength;
    this.cam.y += (py - this.cam.y) * strength;
    clampCamera(this.cam, this.world, viewW, viewH);
  }

  punch(amount, now, duration = 180) {
    this.punchAmount = Math.max(this.punchAmount, amount);
    this.punchUntil = Math.max(this.punchUntil, now + duration);
    this.punchSeed += 1;
  }

  renderCamera(now) {
    if (now >= this.punchUntil || !this.punchAmount) return this.cam;
    const remaining = Math.max(0, (this.punchUntil - now) / 180);
    const phase = this.punchSeed * 1.7 + now / 24;
    return { ...this.cam, x: this.cam.x + Math.sin(phase) * this.punchAmount * remaining, y: this.cam.y + Math.cos(phase * 1.2) * this.punchAmount * remaining };
  }

  snap(px, py, viewW, viewH) {
    this.cam.x = px;
    this.cam.y = py;
    clampCamera(this.cam, this.world, viewW, viewH);
  }
}
