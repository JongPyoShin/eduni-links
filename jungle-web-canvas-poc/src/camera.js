import { makeCamera, clampCamera } from "./transforms.js";
import { CAMERA } from "./constants.js";

export class Camera {
  constructor(world) {
    this.cam = makeCamera(world.w / 2, world.h / 2, CAMERA.ZOOM);
    this.world = world;
  }

  follow(px, py, viewW, viewH) {
    this.cam.x += (px - this.cam.x) * CAMERA.FOLLOW_LERP;
    this.cam.y += (py - this.cam.y) * CAMERA.FOLLOW_LERP;
    clampCamera(this.cam, this.world, viewW, viewH);
  }

  snap(px, py, viewW, viewH) {
    this.cam.x = px;
    this.cam.y = py;
    clampCamera(this.cam, this.world, viewW, viewH);
  }
}
