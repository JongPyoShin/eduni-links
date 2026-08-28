import { CampWorldGeometry, WaterfallWorldGeometry } from "./geometry.js";
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
import { CLUES, FIRE_PIT_ROUNDS, answerFirePitRound, chapterObjective, collectClue, completeBluebird, startQuest } from "./content/camp_chapter.js";
import { nearestInteractable } from "./content/interactables.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import { drawChapterWorld } from "./content/feedback.js";
import { activeDirection, advanceSequences, beginIntro, beginRewardReveal, beginRidgeArrival, createSequenceState, scriptedCameraFocus } from "./content/sequence_controller.js";
import { AudioManager } from "./audio.js";
import { EffectSystem } from "./effects.js";
import { drawWaterfallWorld, drawKingfisher } from "./waterfall_scene.js";
import { createWaterfallState, resetWaterfall, waterfallObjective, completeStreamGate, completeSteppingStones, collectWaterfallClue, answerLeafMatchRound, completeLookout, completeKingfisher, completeWaterfallReward, LEAF_MATCH_ROUNDS } from "./content/waterfall_chapter.js";
import { nearestWaterfallInteractable } from "./content/waterfall_interactables.js";

export async function start(canvas, modalEl) {
  const ctx = canvas.getContext("2d");
  const waterfallStage = new URLSearchParams(globalThis.location?.search || "").get("stage") === "waterfall";
  const geometry = waterfallStage ? new WaterfallWorldGeometry() : new CampWorldGeometry();
  const camera = new Camera(geometry.world);
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();
  const audio = new AudioManager();
  const effects = new EffectSystem();

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
  let waterfall = createWaterfallState();
  let feedback = null;
  let sequences = createSequenceState();
  let pendingFireAdvanceAt = null;
  let previousDirectionType = null;

  camera.snap(player.x, player.y, canvas.width, canvas.height);

  function updateUi() {
    renderContentPanel(panel, modalEl);
    const hud = document.querySelector("#objective-hud");
    const objective = waterfallStage ? waterfallObjective(waterfall) : chapterObjective(chapter);
    if (hud.textContent !== objective) {
      hud.textContent = objective;
      hud.classList.remove("objective-change");
      void hud.offsetWidth;
      hud.classList.add("objective-change");
    }
  }

  function cue(name, preset, x, y, now, punch = 0) {
    audio.play(name);
    effects.spawn(preset, x, y);
    if (punch) camera.punch(punch, now);
  }

  function clueLabel(id) {
    const clue = CLUES.find((entry) => entry.id === id);
    return clue.title.replace(" 발견!", "").replace("짹짹! ", "").replace("가 들려!", "");
  }

  function openFireRound() {
    const round = FIRE_PIT_ROUNDS[chapter.firePitRound];
    panel.openPanel({
      kind: "firePit",
      title: "흔적 탐정 퀴즈",
      body: round.question,
      progress: `${chapter.firePitRound + 1} / ${FIRE_PIT_ROUNDS.length}`,
      choices: round.choices.map((id) => ({ id, label: clueLabel(id) })),
      choiceMode: "single",
    });
  }

  function openInteraction(item) {
    movement.reset();
    audio.play("uiConfirm");
    if (waterfallStage) {
      if (item.type === "leafMatch") {
        const round = LEAF_MATCH_ROUNDS[waterfall.leafMatchRound];
        panel.openPanel({ kind:"leafMatch", title:"잎사귀 짝 맞추기", body:round.question, progress:`${waterfall.leafMatchRound + 1} / ${LEAF_MATCH_ROUNDS.length}`, choices:round.choices.map((id)=>({id,label:id})), choiceMode:"single" });
      } else panel.openPanel({ kind:item.type, title:item.label, body:waterfallObjective(waterfall), confirmLabel:"계속" });
      updateUi();
      return;
    }
    if (item.type === "hut") {
      panel.openPanel({ kind: "hut", title: "오늘의 탐험", body: "숲에 파랑새가 다녀간 흔적이 있대!\n세 가지 흔적을 찾아보자.", progress: "파랑새의 흔적 0 / 3", confirmLabel: "탐험 시작!" });
    } else if (item.type === "firePit") {
      openFireRound();
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
      if (waterfallStage && result.kind === "leafMatch") {
        const answer = answerLeafMatchRound(waterfall, result.choice.id);
        if (!answer.correct) panel.setResponse("다시 살펴보자!", "gentle");
        else { waterfall = answer.state; cue("correct", "sparkle", 1250, 470, ts || 0, 1); panel.closePanel(); }
        updateUi();
        return;
      }
      if (result.kind === "firePit") {
        const answer = answerFirePitRound(chapter, result.choice.id);
        if (!answer.correct) {
          cue("wrong", "soft-burst", 920, 820, ts || 0, 1.5);
          panel.setResponse("한 번 더 생각해 볼까?", "gentle");
        } else {
          chapter = answer.state;
          cue("correct", "sparkle", 920, 820, ts || 0, 1.5);
          feedback = { x: 990, y: 935, until: ts + 760, style: "embers" };
          panel.openPanel({ kind: "fireFeedback", title: "찾아냈어!", body: answer.feedback, autoProgress: true });
          pendingFireAdvanceAt = ts + 720;
        }
      }
    } else if (result.type === "confirm") {
      if (waterfallStage) {
        const kind = panel.payload?.kind;
        if (kind === "streamGate") waterfall = completeStreamGate(waterfall);
        else if (kind === "steppingStones") waterfall = completeSteppingStones(waterfall);
        else if (kind === "echo") waterfall = collectWaterfallClue(waterfall, "echo");
        else if (kind === "mistTrail") waterfall = collectWaterfallClue(waterfall, "mistTrail");
        else if (kind === "lookout") waterfall = completeLookout(waterfall);
        else if (kind === "kingfisher") waterfall = completeKingfisher(waterfall);
        else if (kind === "reward") waterfall = completeWaterfallReward(waterfall);
        panel.closePanel(); updateUi(); return;
      }
      if (result.kind === "hut") {
        chapter = startQuest(chapter);
        cue("questStart", "soft-burst", 455, 320, ts || 0, 2);
      }
      if (result.kind === "clue") {
        const clue = CLUES.find((entry) => entry.id === panel.payload.clueId);
        chapter = collectClue(chapter, panel.payload.clueId);
        cue("clueFound", panel.payload.clueId === "feather" ? "feather" : "sparkle", clue.x, clue.y, ts || 0, 1);
        feedback = { x: clue.x, y: clue.y, until: ts + 650 };
      }
      if (result.kind === "bluebird") {
        chapter = completeBluebird(chapter);
        cue("bluebird", "sparkle", BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, ts || 0, 2);
        sequences = beginRewardReveal(sequences, ts);
        panel.openPanel({ kind: "reward", title: "탐험 완료!", body: "오늘 발견한 것", badge: true, checklist: ["파란 깃털", "작은 발자국", "새소리", "파랑새"], confirmLabel: "다시 둘러보기", revealReady: false });
        cue("rewardFanfare", "soft-burst", BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, ts || 0, 2);
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

    input.pollGamepad();
    if (input.consumeActivity()) audio.unlock();
    audio.setAmbience("forest", audio.unlocked);
    audio.setAmbience("fire", !waterfallStage && audio.unlocked && Math.hypot(player.x - 990, player.y - 935) < 230);

    if (input.consumeDebug()) debug = !debug;
    if (debug && input.consumeReset()) {
      if (waterfallStage) waterfall = resetWaterfall();
      else chapter = resetChapter();
      sequences = createSequenceState();
      panel.closePanel();
      feedback = null;
      pendingFireAdvanceAt = null;
      effects.particles = [];
      previousDirectionType = null;
      movement.reset();
      updateUi();
    } else {
      input.consumeReset();
    }

    let directing = null;
    if (!waterfallStage) {
      if (sequences.introStartedAt === null && !sequences.introPlayed) sequences = beginIntro(sequences, ts || 0);
      sequences = advanceSequences(sequences, ts || 0);
      if (sequences.rewardShown && panel.payload?.kind === "reward" && !panel.payload.revealReady) {
        panel.payload = { ...panel.payload, revealReady: true };
        updateUi();
      }
      if (!panel.blocksMovement()) sequences = beginRidgeArrival(sequences, chapter, player, ts || 0);
      directing = activeDirection(sequences, ts || 0);
      if (directing?.type === "ridge" && previousDirectionType !== "ridge") {
        cue("ridgeArrival", "leaf", BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, ts || 0, 3);
      }
      previousDirectionType = directing?.type || null;
    }
    document.querySelector("#objective-hud").classList.toggle("softened", Boolean(directing));

    if (!waterfallStage && pendingFireAdvanceAt !== null && (ts || 0) >= pendingFireAdvanceAt) {
      pendingFireAdvanceAt = null;
      if (chapter.firePitComplete) {
        cue("firePitComplete", "ember", 990, 935, ts || 0, 0.8);
        panel.openPanel({ kind: "fireComplete", title: "흔적 탐정 성공!", body: "모닥불이 더 따뜻하게 빛나고 있어.", confirmLabel: "전망대로 가기" });
      } else {
        openFireRound();
      }
      updateUi();
    }

    if (panel.blocksMovement()) {
      const navigate = input.consumeNavigate();
      panel.moveChoice(navigate);
      if (navigate) audio.play("uiNavigate");
      if (navigate) updateUi();
      if (input.consumeClose()) {
        if (!(panel.payload?.kind === "reward" && !panel.payload.revealReady)) {
          panel.closePanel();
          pendingFireAdvanceAt = null;
          updateUi();
        }
      } else if (input.consumeInteract() && panel.payload?.kind !== "fireFeedback") {
        handlePanelActivate(ts || 0);
      }
    } else if (directing) {
      movement.reset();
      input.consumeNavigate();
      input.consumeInteract();
      input.consumeClose();
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
        const item = waterfallStage
          ? nearestWaterfallInteractable(player, waterfall)
          : nearestInteractable(player, chapter, { bluebirdReady: sequences.ridgeArrivalPlayed });
        if (item) openInteraction(item);
      }
      input.consumeClose();
    }

    const cameraFocus = !waterfallStage ? scriptedCameraFocus(directing, player) : null;
    if (cameraFocus) camera.focus(cameraFocus.x, cameraFocus.y, viewW, viewH, 0.12);
    else camera.follow(player.x, player.y, viewW, viewH);

    effects.update(dt);
    const renderCam = camera.renderCamera(ts || 0);
    ctx.clearRect(0, 0, viewW, viewH);
    if (waterfallStage) {
      drawWaterfallWorld(ctx, renderCam, viewW, viewH, ts || 0);
      if (waterfall.lookoutComplete) drawKingfisher(ctx, renderCam, viewW, viewH, ts || 0);
    } else {
      drawGroundLayer(ctx, renderCam, viewW, viewH, geometry);
      drawPathLayer(ctx, renderCam, viewW, viewH, geometry);
      drawChapterWorld(ctx, renderCam, viewW, viewH, chapter, ts || 0, feedback, directing);
    }

    const nearby = !panel.blocksMovement() && !directing
      ? (waterfallStage ? nearestWaterfallInteractable(player, waterfall) : nearestInteractable(player, chapter, { bluebirdReady: sequences.ridgeArrivalPlayed }))
      : null;
    const drawables = [];
    if (!waterfallStage) {
      for (const p of props) {
        drawables.push({
          footY: p.footY,
          draw: () => drawProp(ctx, renderCam, viewW, viewH, p, images, ts || 0),
        });
      }
      drawables.push({
        footY: birdVisual.y,
        draw: () => {
          const birdRender = directing?.type === "ridge" ? { x: birdVisual.x, y: birdVisual.y + Math.sin((ts || 0) / 115) * 5 } : birdVisual;
          drawProp(
            ctx,
            renderCam,
            viewW,
            viewH,
            { type: "rock", x: birdRender.x, y: birdRender.y + 20, scale: 0.9 },
            images,
            ts || 0
          );
          drawContactShadow(ctx, renderCam, viewW, viewH, birdRender.x, birdRender.y, 18);
          drawBluebird(ctx, renderCam, viewW, viewH, birdRender, bluebirdAsset);
        },
      });
    }
    drawables.push({
      footY: player.y,
      draw: () => {
        drawContactShadow(ctx, renderCam, viewW, viewH, player.x, player.y, 16);
        playerSprite.draw(ctx, renderCam, viewW, viewH, player.x, player.y);
      },
    });
    depthSortDraw(ctx, camera.cam, viewW, viewH, drawables);

    if (nearby)
      drawInteractionCue(ctx, renderCam, viewW, viewH, nearby.x, nearby.y, ts || 0);
    effects.draw(ctx, renderCam, viewW, viewH);
    if (debug) drawDebugOverlay(ctx, renderCam, viewW, viewH, geometry, player, movement, geometry.bluebird);

    requestAnimationFrame(loop);
  }

  modalEl.querySelector("#modal-confirm").addEventListener("click", () => handlePanelActivate(performance.now()));
  updateUi();
  requestAnimationFrame(loop);
}
