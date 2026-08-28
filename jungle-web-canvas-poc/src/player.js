import { loadImage, preload } from "./assets.js";
import { worldToScreen } from "./transforms.js";
import { PLAYER } from "./constants.js";

const DIRS = ["front", "back", "left", "right"];

export function playerFrameUrls(root = PLAYER.ASSET_ROOT) {
  const idle = {};
  const walk = {};
  for (const d of DIRS) idle[d] = `${root}player_${d}_idle_00_v01.png`;
  for (const d of DIRS) {
    walk[d] = [];
    for (let i = 0; i < 4; i++) walk[d].push(`${root}player_${d}_walk_${String(i).padStart(2, "0")}_v01.png`);
  }
  return { idle, walk };
}

export function playerLayout(displayW = PLAYER.DISPLAY_W) {
  const w = displayW;
  const h = displayW * (PLAYER.FRAME_H / PLAYER.FRAME_W);
  const pivotX = (PLAYER.PIVOT.x / PLAYER.FRAME_W) * w;
  const pivotY = (PLAYER.PIVOT.y / PLAYER.FRAME_H) * h;
  return { w, h, pivotX, pivotY };
}

export function directionToFacing(dir) {
  if (Math.abs(dir.x) >= Math.abs(dir.y)) return dir.x < 0 ? "left" : "right";
  return dir.y < 0 ? "back" : "front";
}

export class PlayerSprite {
  constructor(root = PLAYER.ASSET_ROOT) {
    this.root = root;
    this.frames = null;
    this.facing = "front";
    this.moving = false;
    this.animMs = 0;
    this.walkFrame = 0;
  }

  async load() {
    const urls = playerFrameUrls(this.root);
    const allIdle = DIRS.map((d) => urls.idle[d]);
    const allWalk = DIRS.flatMap((d) => urls.walk[d]);
    const loaded = await preload([...allIdle, ...allWalk]);
    this.frames = { idle: {}, walk: {} };
    let i = 0;
    for (const d of DIRS) {
      const r = loaded[i++];
      this.frames.idle[d] = r.ok ? r.img : null;
    }
    for (const d of DIRS) {
      this.frames.walk[d] = [];
      for (let k = 0; k < 4; k++) {
        const r = loaded[i++];
        this.frames.walk[d].push(r.ok ? r.img : null);
      }
    }
    this.loaded = true;
  }

  update(dtMs, isMoving, dir) {
    if (dir.x !== 0 || dir.y !== 0) this.facing = directionToFacing(dir);
    this.moving = !!isMoving;
    if (this.moving) {
      this.animMs += dtMs;
      if (this.animMs >= PLAYER.WALK_STEP_MS) {
        this.animMs -= PLAYER.WALK_STEP_MS;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      this.walkFrame = 0;
      this.animMs = 0;
    }
  }

  currentImage() {
    if (!this.frames) return null;
    if (this.moving && this.frames.walk[this.facing]) {
      const f = this.frames.walk[this.facing][this.walkFrame];
      if (f) return f;
    }
    return this.frames.idle[this.facing] || null;
  }

  draw(ctx, cam, viewW, viewH, px, py) {
    const s = worldToScreen(px, py, cam, viewW, viewH);
    const { w, h, pivotX, pivotY } = playerLayout(PLAYER.DISPLAY_W);
    const img = this.currentImage();
    if (img) {
      // A small warm value halo separates the explorer from dense foliage without
      // changing sprite scale or collision. It is deliberately subtle so it reads
      // as storybook lighting rather than a game-selection ring.
      ctx.save();
      const haloY = s.y - h * 0.42;
      const halo = ctx.createRadialGradient(s.x, haloY, 2, s.x, haloY, w * 0.46);
      halo.addColorStop(0, "rgba(255,246,200,0.20)");
      halo.addColorStop(0.62, "rgba(255,239,174,0.08)");
      halo.addColorStop(1, "rgba(255,239,174,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(s.x, haloY, w * 0.46, h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(img, s.x - pivotX, s.y - pivotY, w, h);
      return;
    }
    ctx.fillStyle = "#e2b35a";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 26, 16, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PROTOTYPE", s.x, s.y - 60);
  }
}
