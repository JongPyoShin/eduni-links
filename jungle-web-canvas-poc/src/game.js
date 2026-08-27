import { CampWorldGeometry } from "./geometry.js";
import { Camera } from "./camera.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { ModalController } from "./modal.js";
import { preload } from "./assets.js";
import { isInRange } from "./bluebird.js";
import { frameDelta } from "./loop.js";
import { BLUEBIRD, ASSET_ROOT } from "./constants.js";
import { drawBluebird, drawInteractionCue, depthSortDraw } from "./render.js";
import { PlayerSprite } from "./player.js";
import {
  drawGroundLayer,
  drawPathLayer,
  buildProps,
  drawProp,
  drawContactShadow,
  SCENE_IMAGES,
} from "./scene.js";
import { drawDebugOverlay } from "./debug.js";

export async function start(canvas, modalEl) {
  const ctx = canvas.getContext("2d");
  const geometry = new CampWorldGeometry();
  const camera = new Camera(geometry.world);
  const movement = new MovementController();
  const input = new InputController();
  const modal = new ModalController();

  const [bluebirdAsset, ...sceneImgs] = await preload([
    ASSET_ROOT + "bluebird.png",
    ...Object.values(SCENE_IMAGES),
  ]);
  const images = {};
  Object.keys(SCENE_IMAGES).forEach((k, i) => {
    images[k] = sceneImgs[i] && sceneImgs[i].ok ? sceneImgs[i].img : null;
  });
  const playerSprite = new PlayerSprite();
  await playerSprite.load();
  const props = buildProps();
  const birdVisual = { x: BLUEBIRD.VISUAL.x, y: BLUEBIRD.VISUAL.y };

  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
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
      const isMoving = Math.abs(delta.x) + Math.abs(delta.y) > 1e-6;
      playerSprite.update(dt, isMoving, dir);

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
    drawGroundLayer(ctx, camera.cam, viewW, viewH, geometry);
    drawPathLayer(ctx, camera.cam, viewW, viewH, geometry);

    const inRange = !modal.open && isInRange(player.x, player.y, geometry.bluebird);
    const drawables = [];
    for (const p of props) {
      drawables.push({
        footY: p.footY,
        draw: () => drawProp(ctx, camera.cam, viewW, viewH, p, images, ts || 0),
      });
    }
    drawables.push({
      footY: birdVisual.y,
      draw: () => {
        drawProp(
          ctx,
          camera.cam,
          viewW,
          viewH,
          { type: "rock", x: birdVisual.x, y: birdVisual.y + 20, scale: 0.9 },
          images,
          ts || 0
        );
        drawContactShadow(ctx, camera.cam, viewW, viewH, birdVisual.x, birdVisual.y, 18);
        drawBluebird(ctx, camera.cam, viewW, viewH, birdVisual, bluebirdAsset);
      },
    });
    drawables.push({
      footY: player.y,
      draw: () => {
        drawContactShadow(ctx, camera.cam, viewW, viewH, player.x, player.y, 16);
        playerSprite.draw(ctx, camera.cam, viewW, viewH, player.x, player.y);
      },
    });
    depthSortDraw(ctx, camera.cam, viewW, viewH, drawables);

    if (inRange)
      drawInteractionCue(ctx, camera.cam, viewW, viewH, birdVisual.x, birdVisual.y, ts || 0);
    if (debug) drawDebugOverlay(ctx, camera.cam, viewW, viewH, geometry, player, movement, geometry.bluebird);

    requestAnimationFrame(loop);
  }

  updateModalView();
  requestAnimationFrame(loop);
}
