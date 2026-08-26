import { CampWorldGeometry } from "./geometry.js";
import { Camera } from "./camera.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { ModalController } from "./modal.js";
import { loadImage, preload } from "./assets.js";
import { isInRange } from "./bluebird.js";
import { frameDelta } from "./loop.js";
import { BLUEBIRD, ASSET_ROOT } from "./constants.js";
import {
  drawGround,
  drawWalkablePath,
  drawBluebird,
  drawPlayer,
  drawInteractionCue,
  depthSortDraw,
} from "./render.js";
import { drawDebugOverlay } from "./debug.js";

export async function start(canvas, modalEl) {
  const ctx = canvas.getContext("2d");
  const geometry = new CampWorldGeometry();
  const camera = new Camera(geometry.world);
  const movement = new MovementController();
  const input = new InputController();
  const modal = new ModalController();

  const [playerAsset, bluebirdAsset] = await preload([
    ASSET_ROOT + "player.jpg",
    ASSET_ROOT + "bluebird.png",
  ]);

  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
  let facing = 1;
  let debug = false;
  let discovered = false;

  camera.snap(player.x, player.y, canvas.width, canvas.height);

  function updateModalView() {
    if (modal.open) {
      modalEl.style.display = "flex";
      const p = modal.payload || {};
      modalEl.querySelector("#modal-title").textContent = p.name || "Bluebird";
      modalEl.querySelector("#modal-fact").textContent = p.fact || "";
      const img = modalEl.querySelector("#modal-img");
      if (p.img) img.src = p.img;
      img.style.display = p.img ? "block" : "none";
    } else {
      modalEl.style.display = "none";
    }
  }

  let lastTs = null;

  function loop(ts) {
    const viewW = canvas.width;
    const viewH = canvas.height;
    const dt = frameDelta(lastTs, ts);
    lastTs = ts;

    if (input.consumeDebug()) debug = !debug;

    if (modal.open) {
      if (input.consumeClose() || input.consumeInteract()) {
        modal.closeModal();
        updateModalView();
      }
    } else {
      const dir = input.direction();
      const delta = movement.update(dt, dir);
      if (dir.x !== 0) facing = dir.x < 0 ? -1 : 1;

      const nx = player.x + delta.x;
      if (geometry.isWalkable(nx, player.y)) player.x = nx;
      const ny = player.y + delta.y;
      if (geometry.isWalkable(player.x, ny)) player.y = ny;

      if (input.consumeInteract() && isInRange(player.x, player.y, geometry.bluebird)) {
        discovered = true;
        movement.reset();
        modal.openModal({
          name: BLUEBIRD.NAME,
          fact: BLUEBIRD.FACT,
          img: ASSET_ROOT + "bluebird_portrait.png",
        });
        updateModalView();
      }
      input.consumeClose();
    }

    camera.follow(player.x, player.y, viewW, viewH);

    ctx.clearRect(0, 0, viewW, viewH);
    drawGround(ctx, camera.cam, viewW, viewH, geometry);
    drawWalkablePath(ctx, camera.cam, viewW, viewH, geometry);

    const inRange = !modal.open && isInRange(player.x, player.y, geometry.bluebird);
    depthSortDraw(ctx, camera.cam, viewW, viewH, [
      {
        footY: geometry.bluebird.y,
        draw: () => drawBluebird(ctx, camera.cam, viewW, viewH, geometry.bluebird, bluebirdAsset),
      },
      {
        footY: player.y,
        draw: () => drawPlayer(ctx, camera.cam, viewW, viewH, player.x, player.y, facing, playerAsset),
      },
    ]);

    if (inRange) drawInteractionCue(ctx, camera.cam, viewW, viewH, geometry.bluebird.x, geometry.bluebird.y, ts || 0);
    if (debug) drawDebugOverlay(ctx, camera.cam, viewW, viewH, geometry, player, movement, geometry.bluebird);

    requestAnimationFrame(loop);
  }

  updateModalView();
  requestAnimationFrame(loop);
}
