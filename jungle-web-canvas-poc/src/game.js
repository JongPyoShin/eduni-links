import { CampWorldGeometry } from "./geometry.js";
import { Camera } from "./camera.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { preload } from "./assets.js";
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
import { createChapterState, resetChapter } from "./content/chapter_state.js";
import { CLUES, chapterObjective, collectClue, completeBluebird, completeFirePit, startQuest } from "./content/camp_chapter.js";
import { nearestInteractable } from "./content/interactables.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import { drawChapterWorld } from "./content/feedback.js";

export async function start(canvas, modalEl) {
  const ctx = canvas.getContext("2d");
  const geometry = new CampWorldGeometry();
  const camera = new Camera(geometry.world);
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();

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
  let chapter = createChapterState();
  let feedback = null;

  camera.snap(player.x, player.y, canvas.width, canvas.height);

  function updateUi() {
    renderContentPanel(panel, modalEl);
    document.querySelector("#objective-hud").textContent = chapterObjective(chapter);
  }

  function openInteraction(item) {
    movement.reset();
    if (item.type === "hut") {
      panel.openPanel({ kind: "hut", title: "오늘의 탐험", body: "숲에 파랑새가 다녀간 흔적이 있대!\n세 가지 흔적을 찾아보자.", progress: "파랑새의 흔적 0 / 3", confirmLabel: "탐험 시작!" });
    } else if (item.type === "firePit") {
      panel.openPanel({ kind: "firePit", title: "우리가 찾은 흔적은?", body: "찾은 흔적을 모두 골라 보자.", choices: CLUES.map((clue) => ({ id: clue.id, label: clue.title.replace(" 발견!", "").replace("짹짹! ", "").replace("가 들려!", "") })) });
    } else if (item.type === "bluebird") {
      panel.openPanel({ kind: "bluebird", title: "파랑새를 만났어!", body: "깃털, 발자국, 새소리.\n숲의 작은 흔적을 잘 관찰했구나!", img: ASSET_ROOT + "bluebird_portrait.png", confirmLabel: "만나서 반가워!" });
    } else {
      panel.openPanel({ kind: "clue", clueId: item.id, title: item.title, body: item.fact, progress: `${chapter.discoveredClues.length + 1} / ${CLUES.length}`, confirmLabel: "기억할게!" });
    }
    updateUi();
  }

  function handlePanelActivate(ts) {
    const result = panel.activate();
    if (result.type === "choice") {
      if (result.complete) {
        chapter = completeFirePit(chapter, [...panel.selected]);
        feedback = { x: 920, y: 820, until: ts + 650 };
        panel.openPanel({ kind: "fireComplete", title: "모두 기억했구나!", body: "모닥불이 더 따뜻하게 빛나고 있어.", confirmLabel: "전망대로 가기" });
      }
    } else if (result.type === "confirm") {
      if (result.kind === "hut") chapter = startQuest(chapter);
      if (result.kind === "clue") {
        const clue = CLUES.find((entry) => entry.id === panel.payload.clueId);
        chapter = collectClue(chapter, panel.payload.clueId);
        feedback = { x: clue.x, y: clue.y, until: ts + 650 };
      }
      if (result.kind === "bluebird") {
        chapter = completeBluebird(chapter);
        panel.openPanel({ kind: "reward", title: "탐험 완료!", body: "오늘 발견한 것\n✓ 파란 깃털\n✓ 작은 발자국\n✓ 새소리\n✓ 파랑새", badge: true, confirmLabel: "다시 둘러보기" });
        updateUi();
        return;
      }
      panel.closePanel();
    }
    updateUi();
  }

  let lastTs = null;

  function loop(ts) {
    const viewW = canvas.width;
    const viewH = canvas.height;
    const dt = frameDelta(lastTs, ts);
    lastTs = ts;

    if (input.consumeDebug()) debug = !debug;
    if (debug && input.consumeReset()) {
      chapter = resetChapter();
      panel.closePanel();
      feedback = null;
      movement.reset();
      updateUi();
    } else {
      input.consumeReset();
    }

    if (panel.blocksMovement()) {
      const navigate = input.consumeNavigate();
      panel.moveChoice(navigate);
      if (navigate) updateUi();
      if (input.consumeClose()) {
        panel.closePanel();
        updateUi();
      } else if (input.consumeInteract()) {
        handlePanelActivate(ts || 0);
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

      input.consumeNavigate();
      if (input.consumeInteract()) {
        const item = nearestInteractable(player, chapter);
        if (item) openInteraction(item);
      }
      input.consumeClose();
    }

    camera.follow(player.x, player.y, viewW, viewH);

    ctx.clearRect(0, 0, viewW, viewH);
    drawGroundLayer(ctx, camera.cam, viewW, viewH, geometry);
    drawPathLayer(ctx, camera.cam, viewW, viewH, geometry);

    drawChapterWorld(ctx, camera.cam, viewW, viewH, chapter, ts || 0, feedback);
    const nearby = !panel.blocksMovement() ? nearestInteractable(player, chapter) : null;
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

    if (nearby)
      drawInteractionCue(ctx, camera.cam, viewW, viewH, nearby.x, nearby.y, ts || 0);
    if (debug) drawDebugOverlay(ctx, camera.cam, viewW, viewH, geometry, player, movement, geometry.bluebird);

    requestAnimationFrame(loop);
  }

  modalEl.querySelector("#modal-confirm").addEventListener("click", () => handlePanelActivate(performance.now()));
  updateUi();
  requestAnimationFrame(loop);
}
