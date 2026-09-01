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
import { CLUES, chapterObjective, collectClue, completeBluebird, startQuest, addClueQuizScore, getClueQuizId, canMeetBluebird } from "./content/camp_chapter.js";
import { BIRD_QUIZ_BANK } from "./content/bird_quiz_bank.js";
import { createBirdQuizSession, currentQuestion, answerBirdQuiz, isQuizComplete, isCaptureSuccess } from "./content/bird_quiz.js";
import { loadBirdCodex, saveBirdCodex, captureBird, hasCapturedBird } from "./content/bird_codex.js";
import { getBirdData } from "./content/bird_manifest.js";
import { buildInteractables, nearestInteractable } from "./content/interactables.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import { drawChapterWorld } from "./content/feedback.js";
import { activeDirection, advanceSequences, beginIntro, beginRewardReveal, beginRidgeArrival, createSequenceState, scriptedCameraFocus } from "./content/sequence_controller.js";
import { AudioManager } from "./audio.js";
import { EffectSystem } from "./effects.js";
import { drawWaterfallWorld, drawWaterfallForeground, drawKingfisher } from "./waterfall_scene.js";
import { createWaterfallState, resetWaterfall, waterfallObjective, completeStreamGate, completeSteppingStones, collectWaterfallClue, addWaterfallQuizAnswer, completeLookout, completeKingfisher, completeWaterfallReward, canMeetKingfisher, retryWaterfallClueQuizzes, getWaterfallClueQuizId, WATERFALL_CLUES } from "./content/waterfall_chapter.js";
import { nearestWaterfallInteractable, waterfallInteractables } from "./content/waterfall_interactables.js";
import { WATERFALL_ART_IMAGES } from "./waterfall_art_manifest.js";
import { stageReward, awardAndSaveStageReward } from "./content/stage_rewards.js";
import { campVisualPhase, waterfallVisualPhase } from "./content/stage_visual_director.js";

export async function start(canvas, modalEl) {
  const ctx = canvas.getContext("2d");
  // Some chat/browser link renderers preserve an escaped ampersand (\\&).
  // Normalize it so the explicit Three query cannot silently fall back to Canvas.
  const query = (globalThis.location?.search || "").replaceAll("\\&", "&");
  const params = new URLSearchParams(query);
  const waterfallStage = params.get("stage") === "waterfall";
  const geometry = waterfallStage ? new WaterfallWorldGeometry() : new CampWorldGeometry();
  const camera = new Camera(geometry.world);
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();
  const audio = new AudioManager();
  const effects = new EffectSystem();

  // Gameplay state and the read-only QA bridge are created before presentation
  // assets are awaited. Missing or slow art must never make gameplay state
  // unobservable or make optional Three.js presentation a startup dependency.
  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
  let debug = false;
  let chapter = createChapterState();
  let waterfall = createWaterfallState();
  let feedback = null;
  let sequences = createSequenceState();
  let pendingFireAdvanceAt = null;
  let previousDirectionType = null;
  let birdQuiz = null;

  function openBirdQuizQuestion() {
    const q = currentQuestion(birdQuiz);
    if (!q) return;
    panel.openPanel({
      kind: "birdQuiz",
      title: `퀴즈 ${q.number} / ${q.total}`,
      body: q.question,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
      choiceMode: "single",
      confirmLabel: "답하기",
    });
  }

  const startup = Object.seal({
    phase: "preloading-scene-assets",
    lastCompletedStep: "gameplay-bridge",
    error: null,
    presentationError: null,
  });
  globalThis.__eduniJungleStartup = startup;
  globalThis.__eduniJungleGame = Object.freeze({
    stageId: waterfallStage ? "waterfall" : "camp",
    player,
    geometry,
    getState: () => waterfallStage ? waterfall : chapter,
    getPhase: qaPhase,
    getTarget: qaTarget,
    getObjective: () => waterfallStage ? waterfallObjective(waterfall) : chapterObjective(chapter),
  });

  let bluebirdAsset;
  let sceneImgs;
  const playerSprite = new PlayerSprite();
  try {
    [bluebirdAsset, ...sceneImgs] = await preload([
      ASSET_ROOT + "bluebird.png",
      ...Object.values(SCENE_IMAGES),
      ...Object.values(WATERFALL_ART_IMAGES),
    ]);
    startup.lastCompletedStep = "scene-assets";
    startup.phase = "preloading-player-sprites";
    await playerSprite.load();
    startup.lastCompletedStep = "player-sprites";
    startup.phase = "initializing-gameplay";
  } catch (error) {
    startup.phase = "error";
    startup.error = error instanceof Error ? error.message : String(error);
    console.error("[eduni] gameplay startup failed", error);
    throw error;
  }

  const images = {};
  Object.keys(SCENE_IMAGES).forEach((k, i) => {
    images[k] = sceneImgs[i] && sceneImgs[i].ok ? sceneImgs[i].img : null;
  });
  const waterfallArtImages = {};
  Object.keys(WATERFALL_ART_IMAGES).forEach((k, i) => {
    const result = sceneImgs[Object.keys(SCENE_IMAGES).length + i];
    waterfallArtImages[k] = result && result.ok ? result.img : null;
  });
  const props = buildProps();
  const birdVisual = { x: BLUEBIRD.VISUAL.x, y: BLUEBIRD.VISUAL.y };

  let threeMode = waterfallStage && params.get("renderer") === "three";
  let threeCanvas = null;
  let threeStatus = null;
  if (threeMode) {
    canvas.style.visibility = "hidden";
    threeCanvas = document.createElement("canvas");
    threeCanvas.id = "three-waterfall-runtime";
    threeCanvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;touch-action:none;";
    canvas.parentElement?.appendChild(threeCanvas);
    threeStatus = document.createElement("div");
    threeStatus.id = "three-runtime-status";
    threeStatus.hidden = true;
    document.body.appendChild(threeStatus);
  }

  camera.snap(player.x, player.y - 80, canvas.width, canvas.height);

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
    const ctxHint = document.querySelector("#context-hint");
    if (ctxHint && !panel.blocksMovement()) {
      const nearItem = waterfallStage
        ? nearestWaterfallInteractable(player, waterfall)
        : nearestInteractable(player, chapter, { bluebirdReady: sequences.ridgeArrivalPlayed });
      if (nearItem && nearItem.type !== "discovery") {
        const labels = {
          echo: "A 물소리 듣기",
          mistTrail: "A 흔적 살펴보기",
          waterDrops: "A 물방울 확인",
          feather: "A 깃털 살펴보기",
          footprints: "A 발자국 확인",
          birdcall: "A 새 소리 듣기",
          kingfisher: "A 물총새 관찰",
          bluebird: "A 파랑새 관찰",
        };
        const hint = labels[nearItem.type] || `A ${nearItem.label}`;
        if (ctxHint.textContent !== hint) ctxHint.textContent = hint;
        ctxHint.classList.add("visible");
      } else if (nearItem && nearItem.type === "discovery") {
        const hint = `A ${nearItem.label}`;
        if (ctxHint.textContent !== hint) ctxHint.textContent = hint;
        ctxHint.classList.add("visible");
      } else {
        ctxHint.classList.remove("visible");
      }
    } else if (ctxHint) {
      ctxHint.classList.remove("visible");
    }
  }

  function cue(name, preset, x, y, now, punch = 0) {
    audio.play(name);
    effects.spawn(preset, x, y);
    if (punch) camera.punch(punch, now);
  }

  function openClueWithQuiz(clueId, clueDefs, getQuizIdFn, discoveredCount, totalCount) {
    const clue = clueDefs.find((c) => c.id === clueId);
    if (!clue) return;
    const quizId = getQuizIdFn(clueId);
    const quizQuestion = BIRD_QUIZ_BANK.find((q) => q.id === quizId);
    if (!quizQuestion) return;
    birdQuiz = createBirdQuizSession("clue_" + clueId, [quizQuestion], Math.random);
    panel.openPanel({
      kind: "clueQuiz",
      clueId,
      title: clue.title,
      body: (clue.fact || clue.objective) + "\n\n" + quizQuestion.question,
      choices: quizQuestion.choices.map((c) => ({ id: c.id, label: c.label })),
      choiceMode: "single",
      progress: `흔적 ${discoveredCount + 1} / ${totalCount}`,
      confirmLabel: "답하기",
    });
  }

  function openWaterfallRewardCeremony(ts = performance.now()) {
    const reward = stageReward("waterfall");
    panel.openPanel({
      kind: "reward",
      title: reward.name,
      body: reward.message,
      badge: true,
      badgeIcon: reward.icon,
      badgeLabel: reward.name,
      checklist: reward.discoveries,
      confirmLabel: "배지 받기",
      revealReady: true,
    });
    cue("rewardFanfare", "soft-burst", 1410, 400, ts || 0, 2);
    updateUi();
  }

  function openKingfisherEncounter() {
    const score = waterfall.adventure.clueQuizScore;
    const codex = loadBirdCodex();
    const alreadyCaptured = hasCapturedBird(codex, "kingfisher");
    if (alreadyCaptured) {
      panel.openPanel({ kind: "kingfisher", title: "물총새를 만났어!", body: `관찰 결과 ${score} / 3 정답!\n물총새가 반짝이며 나타났어!`, confirmLabel: "만나서 반가워!" });
    } else {
      panel.openPanel({ kind: "kingfisher", title: "물총새를 만났어!", body: `관찰 결과 ${score} / 3 정답!\n이제 물총새를 관찰해 보자!`, confirmLabel: "관찰 완료!" });
    }
    updateUi();
  }

  function openInteraction(item) {
    movement.reset();
    audio.play("uiConfirm");
    if (waterfallStage) {
      if (item.type === "discovery") {
        panel.openPanel({ kind: "discovery", title: item.label, body: item.discoveryText, confirmLabel: "\uCC3D\uAE30\uD574!" });
        cue("discovery", "sparkle", item.x, item.y, performance.now(), 0.6);
        updateUi();
        return;
      }
      if (item.type === "kingfisher") {
        openKingfisherEncounter();
        return;
      } else if (item.type === "reward") {
        openWaterfallRewardCeremony();
        return;
      } else if (waterfall.adventure.clueIds.includes(item.type)) {
        const discovered = waterfall.adventure.discoveredClues.length;
        openClueWithQuiz(item.id, WATERFALL_CLUES, (id) => getWaterfallClueQuizId(waterfall, id), discovered, WATERFALL_CLUES.length);
      } else {
        panel.openPanel({ kind: item.type, title: item.label, body: waterfallObjective(waterfall), confirmLabel: "계속" });
      }
      updateUi();
      return;
    }
    if (item.type === "discovery") {
      panel.openPanel({ kind: "discovery", title: item.label, body: item.discoveryText, confirmLabel: "\uCC3D\uAE30\uD574!" });
      cue("discovery", "sparkle", item.x, item.y, performance.now(), 0.6);
      updateUi();
      return;
    }
    if (item.type === "hut") {
      panel.openPanel({ kind: "hut", title: "오늘의 탐험", body: "숲에 파랑새가 다녀간 흔적이 있대!\n세 가지 흔적을 찾아보자.", progress: "파랑새의 흔적 0 / 3", confirmLabel: "탐험 시작!" });
    } else if (item.type === "bluebird") {
      const codex = loadBirdCodex();
      const alreadyCaptured = hasCapturedBird(codex, "bluebird");
      const score = chapter.clueQuizScore;
      if (alreadyCaptured) {
        panel.openPanel({ kind: "bluebird", title: "파랑새를 만났어!", body: `관찰 결과 ${score} / 3 정답!\n파랑새가 반짝이며 나타났어!`, img: ASSET_ROOT + "bluebird_portrait.png", confirmLabel: "만나서 반가워!" });
      } else {
        panel.openPanel({ kind: "bluebird", title: "파랑새를 만났어!", body: `관찰 결과 ${score} / 3 정답!\n이제 파랑새를 관찰해 보자!`, img: ASSET_ROOT + "bluebird_portrait.png", confirmLabel: "관찰 완료!" });
      }
    } else {
      const discovered = chapter.discoveredClues.length;
      openClueWithQuiz(item.id, CLUES, (id) => getClueQuizId(chapter, id), discovered, CLUES.length);
    }
    updateUi();
  }

  function handlePanelActivate(ts) {
    const result = panel.activate();
    if (result.type === "choice") {
      if (result.kind === "clueQuiz") {
        const answer = answerBirdQuiz(birdQuiz, result.choice.id);
        birdQuiz = answer.session;
        if (!answer.correct) {
          cue("wrong", "soft-burst", 920, 820, ts || 0, 1);
          panel.setResponse(`아쉬워! ${answer.lastAnswer.explanation}`, "gentle");
        } else {
          cue("correct", "sparkle", 920, 820, ts || 0, 1);
          panel.setResponse("정답!", "gentle");
        }
        if (waterfallStage) {
          waterfall = collectWaterfallClue(waterfall, panel.payload.clueId);
          waterfall = addWaterfallQuizAnswer(waterfall, answer.correct);
          const clueDef = WATERFALL_CLUES.find((c) => c.id === panel.payload.clueId);
          feedback = { x: clueDef?.x || 0, y: clueDef?.y || 0, until: ts + 650 };
        } else {
          chapter = collectClue(chapter, panel.payload.clueId);
          chapter = addClueQuizScore(chapter, answer.correct);
          feedback = { x: CLUES.find((c) => c.id === panel.payload.clueId)?.x || 0, y: CLUES.find((c) => c.id === panel.payload.clueId)?.y || 0, until: ts + 650 };
        }
        setTimeout(() => panel.closePanel(), 600);
        updateUi();
        return;
      }
    } else if (result.type === "confirm") {
      if (waterfallStage) {
        const kind = panel.payload?.kind;
        if (kind === "streamGate") {
          waterfall = completeStreamGate(waterfall);
          cue("waterGate", "soft-burst", 700, 900, ts || 0, 1.2);
        } else if (kind === "steppingStones") {
          waterfall = completeSteppingStones(waterfall);
          cue("steppingStone", "sparkle", 1080, 700, ts || 0, 1);
        } else if (kind === "echo") {
          waterfall = collectWaterfallClue(waterfall, "echo");
          cue("echoFound", "glow-pulse", 1170, 560, ts || 0, 1.1);
        } else if (kind === "mistTrail") {
          waterfall = collectWaterfallClue(waterfall, "mistTrail");
          cue("mistFound", "leaf", 1020, 480, ts || 0, 0.8);
        } else if (kind === "waterDrops") {
          waterfall = collectWaterfallClue(waterfall, "waterDrops");
          cue("waterDropsFound", "sparkle", 1250, 470, ts || 0, 0.9);
        } else if (kind === "lookout") {
          waterfall = completeLookout(waterfall);
          cue("lookoutFound", "soft-burst", 1450, 330, ts || 0, 1.5);
          openKingfisherEncounter();
          return;
        } else if (kind === "kingfisher") {
          const score = waterfall.adventure.clueQuizScore;
          const codex = loadBirdCodex();
          if (score >= 2) {
            const newCodex = captureBird(codex, "kingfisher", score);
            saveBirdCodex(newCodex);
            waterfall = completeKingfisher(waterfall);
            awardAndSaveStageReward("waterfall");
            const reward = stageReward("waterfall");
            cue("kingfisher", "sparkle", 1410, 400, ts || 0, 1.4);
            sequences = beginRewardReveal(sequences, ts);
            panel.openPanel({
              kind: "reward",
              title: "포획 성공!",
              body: `관찰 결과 ${score} / 3 정답으로 물총새를 발견했어!`,
              badge: true,
              badgeIcon: reward.icon,
              badgeLabel: reward.name,
              checklist: reward.discoveries,
              confirmLabel: "다시 둘러보기",
              revealReady: false,
            });
            cue("rewardFanfare", "soft-burst", 1410, 400, ts || 0, 2);
          } else {
            panel.openPanel({
              kind: "birdRetry",
              title: "아쉬워!",
              body: `관찰 결과 ${score} / 3 정답.\n물총새가 폭포 뒤로 숨었어.\n다시 흔적을 찾아서 도전해 보자!`,
              confirmLabel: "다시 도전",
            });
          }
          updateUi();
          return;
        } else if (kind === "birdRetry") {
          waterfall = retryWaterfallClueQuizzes(waterfall);
          panel.closePanel();
          updateUi();
          return;
        } else if (kind === "reward") {
          waterfall = completeWaterfallReward(waterfall);
          awardAndSaveStageReward("waterfall");
        }
        panel.closePanel();
        updateUi();
        return;
      }
      if (result.kind === "hut") {
        chapter = startQuest(chapter);
        cue("questStart", "soft-burst", 455, 320, ts || 0, 2);
      }
      if (result.kind === "bluebird") {
        const score = chapter.clueQuizScore;
        const codex = loadBirdCodex();
        if (score >= 2) {
          const newCodex = captureBird(codex, "bluebird", score);
          saveBirdCodex(newCodex);
          chapter = completeBluebird(chapter);
          awardAndSaveStageReward("camp");
          const reward = stageReward("camp");
          cue("bluebird", "sparkle", BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, ts || 0, 2);
          sequences = beginRewardReveal(sequences, ts);
          panel.openPanel({
            kind: "reward",
            title: "포획 성공!",
            body: `관찰 결과 ${score} / 3 정답으로 파랑새를 발견했어!`,
            badge: true,
            badgeIcon: reward.icon,
            badgeLabel: reward.name,
            checklist: reward.discoveries,
            confirmLabel: "다시 둘러보기",
            revealReady: false,
          });
          cue("rewardFanfare", "soft-burst", BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, ts || 0, 2);
        } else {
          panel.openPanel({
            kind: "birdRetry",
            title: "아쉬워!",
            body: `관찰 결과 ${score} / 3 정답.\n파랑새가 숲 속으로 숨었어.\n다시 흔적을 찾아서 도전해 보자!`,
            confirmLabel: "다시 도전",
          });
        }
        updateUi();
        return;
      }
      if (result.kind === "birdRetry") {
        chapter = { ...chapter, clueQuizzesComplete: false, discoveredClues: [], clueQuizScore: 0 };
        panel.closePanel();
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
    audio.setAmbience("forest", !waterfallStage && audio.unlocked);
    audio.setAmbience("waterfall", waterfallStage && audio.unlocked);
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
    const nearby = !panel.blocksMovement() && !directing
      ? (waterfallStage ? nearestWaterfallInteractable(player, waterfall) : nearestInteractable(player, chapter, { bluebirdReady: sequences.ridgeArrivalPlayed }))
      : null;
    if (!threeMode) {
      ctx.clearRect(0, 0, viewW, viewH);
      if (waterfallStage) {
        drawWaterfallWorld(ctx, renderCam, viewW, viewH, ts || 0, { ...images, waterfallArt: waterfallArtImages }, waterfall);
        if (waterfall.lookoutComplete) drawKingfisher(ctx, renderCam, viewW, viewH, ts || 0);
      } else {
        drawGroundLayer(ctx, renderCam, viewW, viewH, geometry);
        drawPathLayer(ctx, renderCam, viewW, viewH, geometry);
        drawChapterWorld(ctx, renderCam, viewW, viewH, chapter, ts || 0, feedback, directing);
      }

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
            drawProp(ctx, renderCam, viewW, viewH, { type: "rock", x: birdRender.x, y: birdRender.y + 20, scale: 0.9 }, images, ts || 0);
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
      if (nearby) drawInteractionCue(ctx, renderCam, viewW, viewH, nearby.x, nearby.y, ts || 0);
      effects.draw(ctx, renderCam, viewW, viewH);
      if (debug) drawDebugOverlay(ctx, renderCam, viewW, viewH, geometry, player, movement, geometry.bluebird);
      if (waterfallStage) drawWaterfallForeground(ctx, viewW, viewH, waterfallArtImages, ts || 0);
    }

    requestAnimationFrame(loop);
  }

  function qaTarget() {
    if (panel.blocksMovement()) return null;
    if (waterfallStage) return waterfallInteractables(waterfall)[0] || null;
    return buildInteractables(chapter, { bluebirdReady: sequences.ridgeArrivalPlayed })[0] || null;
  }

  function qaPhase() {
    return waterfallStage
      ? waterfallVisualPhase(waterfall).phaseId
      : campVisualPhase(chapter, { ridgeArrivalPlayed: sequences.ridgeArrivalPlayed }).phaseId;
  }

  modalEl.querySelector("#modal-confirm").addEventListener("click", () => handlePanelActivate(performance.now()));
  updateUi();
  startup.lastCompletedStep = "gameplay-ui";
  startup.phase = "gameplay-ready";

  if (threeMode) {
    try {
      const { startThreeWaterfallRuntime } = await import("./three_waterfall_runtime.js");
      await startThreeWaterfallRuntime(threeCanvas, threeStatus, {
        geometry,
        getState: () => waterfall,
        getPlayer: () => player,
        getPlayerImage: () => playerSprite.currentImage(),
      });
      startup.lastCompletedStep = "three-waterfall-runtime";
    } catch (error) {
      startup.presentationError = error instanceof Error ? error.message : String(error);
      console.error("Three Waterfall runtime failed; keeping Canvas fallback", error);
      threeMode = false;
      threeCanvas?.remove();
      threeStatus?.remove();
      canvas.style.visibility = "visible";
    }
  }

  requestAnimationFrame(loop);
  startup.lastCompletedStep = "game-loop";
  startup.phase = "ready";
}
