import * as THREE from "three";
import { SkyRidgeWorldGeometry } from "./geometry.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { PlayerSprite } from "./player.js";
import { frameDelta } from "./loop.js";
import { AudioManager } from "./audio.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import {
  STAR_PATTERN_ROUNDS,
  createSkyRidgeState,
  skyRidgeObjective,
  completeSkyGate,
  collectSkyRidgeClue,
  answerStarPatternRound,
  completeSummitBridge,
  completeSkyHawk,
  completeSkyRidgeReward,
} from "./content/sky_ridge_chapter.js";
import { nearestSkyRidgeInteractable } from "./content/sky_ridge_interactables.js";
import { skyRidgeVisualPhase } from "./content/stage_visual_director.js";
import { stageReward, awardAndSaveStageReward } from "./content/stage_rewards.js";
import { skyRidgeLogicalToThree, startThreeSkyRidgePreview } from "./three_sky_ridge_preview.js";

const PATTERN_LABELS = Object.freeze({ star: "별", moon: "달", cloud: "구름" });

function patternLabel(id) {
  return String(id).split("-").map((part) => PATTERN_LABELS[part] || part).join(" → ");
}

function setObjective(text) {
  const hud = document.querySelector("#objective-hud");
  if (!hud || hud.textContent === text) return;
  hud.textContent = text;
  hud.classList.remove("objective-change");
  void hud.offsetWidth;
  hud.classList.add("objective-change");
}

export async function startSkyRidgeGame(canvas, modalEl, statusEl) {
  const geometry = new SkyRidgeWorldGeometry();
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();
  const audio = new AudioManager();
  const playerSprite = new PlayerSprite();
  await playerSprite.load();

  let sky = createSkyRidgeState();
  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
  const runtime = await startThreeSkyRidgePreview(canvas, statusEl, { phase: "skyGate", debugControls: false });
  const textureCache = new Map();
  let lastPhaseId = null;
  let lastTs = null;
  let rafId = 0;
  let disposed = false;

  function cachePlayerTexture(image) {
    if (!image) return null;
    if (textureCache.has(image)) return textureCache.get(image);
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(image, texture);
    return texture;
  }

  function syncPlayerVisual() {
    if (!runtime.player?.sprite) return;
    const p = skyRidgeLogicalToThree(player.x, player.y, 0);
    runtime.player.sprite.position.set(p.x, 1.02, p.z);
    runtime.player.glow?.position.set(p.x, 0.82, p.z + 0.08);
    const image = playerSprite.currentImage();
    if (image && runtime.player.sprite.material.map?.image !== image) {
      runtime.player.sprite.material.map = cachePlayerTexture(image);
      runtime.player.sprite.material.needsUpdate = true;
    }
    const targetX = THREE.MathUtils.clamp(p.x, -3.15, 3.15);
    const targetZ = THREE.MathUtils.clamp(p.z, -3.0, 3.0);
    runtime.controls.target.x += (targetX - runtime.controls.target.x) * 0.1;
    runtime.controls.target.z += (targetZ - runtime.controls.target.z) * 0.1;
    runtime.controls.target.y = 1.05;
    runtime.camera.position.x = runtime.controls.target.x;
    runtime.camera.position.z = runtime.controls.target.z + 8.2;
    runtime.camera.position.y = 12.0;
  }

  function syncPhase() {
    const phase = skyRidgeVisualPhase(sky);
    if (phase.phaseId !== lastPhaseId) {
      runtime.setPhase(phase.phaseId);
      lastPhaseId = phase.phaseId;
      syncPlayerVisual();
    }
    if (statusEl) {
      statusEl.dataset.gamePhase = phase.phaseId;
      statusEl.dataset.gameState = JSON.stringify(sky);
      statusEl.dataset.player = JSON.stringify(player);
    }
  }

  function updateUi() {
    setObjective(skyRidgeObjective(sky));
    renderContentPanel(panel, modalEl);
    syncPhase();
  }

  function openStarRound() {
    const round = STAR_PATTERN_ROUNDS[sky.starPatternRound];
    if (!round) return;
    panel.openPanel({
      kind: "starPattern",
      title: "별빛 순서 기억",
      body: round.question,
      progress: `${sky.starPatternRound + 1} / ${STAR_PATTERN_ROUNDS.length}`,
      choices: round.choices.map((id) => ({ id, label: patternLabel(id) })),
      choiceMode: "single",
    });
    updateUi();
  }

  function openRewardCeremony() {
    const reward = stageReward("skyRidge");
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
    audio.play("rewardFanfare");
    updateUi();
  }

  function openInteraction(item) {
    movement.reset();
    audio.play("uiConfirm");
    if (item.type === "starPattern") {
      openStarRound();
      return;
    }
    if (item.type === "reward") {
      openRewardCeremony();
      return;
    }
    const body = {
      skyGate: "구름이 눈높이 가까이 지나가. 바람이 가리키는 길을 따라 정상으로 올라가 보자!",
      windRibbon: "리본이 같은 방향으로 길게 흔들려. 바람이 어디로 부는지 알 수 있어.",
      cloudShadow: "구름 그림자가 바닥을 천천히 지나가고 있어. 빛과 구름이 만든 흔적이야.",
      windChime: "맑은 종소리가 바람을 타고 퍼져 나가. 가장 또렷한 소리를 기억해 보자.",
      summitBridge: "구름 사이로 정상까지 이어지는 하늘 다리가 열렸어.",
      hawk: "하늘매가 날개를 크게 펴고 바람을 타며 거의 날갯짓 없이 미끄러지듯 날고 있어!",
    }[item.type] || skyRidgeObjective(sky);
    panel.openPanel({ kind: item.type, title: item.label, body, confirmLabel: "계속" });
    updateUi();
  }

  function confirmPanel() {
    const result = panel.activate();
    if (result.type === "choice" && result.kind === "starPattern") {
      const answer = answerStarPatternRound(sky, result.choice.id);
      if (!answer.correct) {
        audio.play("wrong");
        panel.setResponse("별빛 순서를 천천히 다시 떠올려 보자!", "gentle");
      } else {
        audio.play("correct");
        sky = answer.state;
        if (answer.completed) panel.closePanel();
        else openStarRound();
      }
      updateUi();
      return;
    }
    if (result.type !== "confirm") return;

    const kind = panel.payload?.kind;
    if (kind === "skyGate") sky = completeSkyGate(sky);
    else if (kind === "windRibbon") sky = collectSkyRidgeClue(sky, "windRibbon");
    else if (kind === "cloudShadow") sky = collectSkyRidgeClue(sky, "cloudShadow");
    else if (kind === "windChime") sky = collectSkyRidgeClue(sky, "windChime");
    else if (kind === "summitBridge") sky = completeSummitBridge(sky);
    else if (kind === "hawk") {
      sky = completeSkyHawk(sky);
      openRewardCeremony();
      return;
    } else if (kind === "reward") {
      sky = completeSkyRidgeReward(sky);
      awardAndSaveStageReward("skyRidge");
    }
    panel.closePanel();
    updateUi();
  }

  modalEl.querySelector("#modal-confirm")?.addEventListener("click", confirmPanel);

  function loop(ts) {
    if (disposed) return;
    const dt = frameDelta(lastTs, ts);
    lastTs = ts;
    input.pollGamepad();
    if (input.consumeActivity()) audio.unlock();

    if (panel.blocksMovement()) {
      const nav = input.consumeNavigate();
      if (nav) {
        panel.moveChoice(nav);
        audio.play("uiNavigate");
        updateUi();
      }
      if (input.consumeClose()) {
        panel.closePanel();
        updateUi();
      } else if (input.consumeInteract()) {
        confirmPanel();
      }
      playerSprite.update(dt, false, { x: 0, y: 0 });
    } else {
      const dir = input.direction();
      const delta = movement.update(dt, dir);
      const moving = Math.abs(delta.x) + Math.abs(delta.y) > 1e-6;
      playerSprite.update(dt, moving, dir);
      const nx = player.x + delta.x;
      if (geometry.isWalkable(nx, player.y)) player.x = nx;
      const ny = player.y + delta.y;
      if (geometry.isWalkable(player.x, ny)) player.y = ny;
      input.consumeNavigate();
      if (input.consumeInteract()) {
        const item = nearestSkyRidgeInteractable(player, sky);
        if (item) openInteraction(item);
      }
      input.consumeClose();
    }

    syncPlayerVisual();
    syncPhase();
    rafId = requestAnimationFrame(loop);
  }

  updateUi();
  syncPlayerVisual();
  rafId = requestAnimationFrame(loop);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    for (const texture of textureCache.values()) texture.dispose();
    textureCache.clear();
    runtime.dispose?.();
  }

  globalThis.__eduniSkyRidgeGame = {
    geometry,
    runtime,
    player,
    getState: () => sky,
    getPhase: () => skyRidgeVisualPhase(sky).phaseId,
    dispose,
  };
  return globalThis.__eduniSkyRidgeGame;
}