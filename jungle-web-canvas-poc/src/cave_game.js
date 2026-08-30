import * as THREE from "three";
import { CaveWorldGeometry } from "./geometry.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { PlayerSprite } from "./player.js";
import { frameDelta } from "./loop.js";
import { AudioManager } from "./audio.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import {
  FIREFLY_PATTERN_ROUNDS,
  createCaveState,
  caveObjective,
  completeCaveGate,
  completeGlowTrail,
  collectCaveClue,
  answerFireflyPatternRound,
  completeCrystalBridge,
  completeCaveBat,
  completeCaveReward,
} from "./content/cave_chapter.js";
import { nearestCaveInteractable } from "./content/cave_interactables.js";
import { caveVisualPhase } from "./content/stage_visual_director.js";
import { stageReward, awardAndSaveStageReward } from "./content/stage_rewards.js";
import { caveLogicalToThree, startThreeCavePreview } from "./three_cave_preview.js";

const PATTERN_LABELS = Object.freeze({ amber: "호박빛", cyan: "하늘빛", lime: "연두빛" });

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

export async function startCaveGame(canvas, modalEl, statusEl) {
  const geometry = new CaveWorldGeometry();
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();
  const audio = new AudioManager();
  const playerSprite = new PlayerSprite();
  await playerSprite.load();

  let cave = createCaveState();
  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
  const runtime = await startThreeCavePreview(canvas, statusEl, { phase: "caveGate", debugControls: false });
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
    const p = caveLogicalToThree(player.x, player.y, 0);
    runtime.player.sprite.position.set(p.x, 1.02, p.z);
    runtime.player.glow?.position.set(p.x, 0.82, p.z + 0.08);

    const image = playerSprite.currentImage();
    if (image && runtime.player.sprite.material.map?.image !== image) {
      runtime.player.sprite.material.map = cachePlayerTexture(image);
      runtime.player.sprite.material.needsUpdate = true;
    }

    const targetX = THREE.MathUtils.clamp(p.x, -3.1, 3.1);
    const targetZ = THREE.MathUtils.clamp(p.z * 0.62 - 0.55, -3.0, 3.0);
    runtime.controls.target.x += (targetX - runtime.controls.target.x) * 0.1;
    runtime.controls.target.z += (targetZ - runtime.controls.target.z) * 0.1;
    runtime.camera.position.x = runtime.controls.target.x + 8.0;
    runtime.camera.position.z = runtime.controls.target.z + 9.5;
    runtime.camera.position.y = 11.5;
  }

  function syncPhase() {
    const phase = caveVisualPhase(cave);
    if (phase.phaseId !== lastPhaseId) {
      runtime.setPhase(phase.phaseId);
      lastPhaseId = phase.phaseId;
      syncPlayerVisual();
    }
    if (statusEl) {
      statusEl.dataset.gamePhase = phase.phaseId;
      statusEl.dataset.gameState = JSON.stringify(cave);
    }
  }

  function updateUi() {
    setObjective(caveObjective(cave));
    renderContentPanel(panel, modalEl);
    syncPhase();
  }

  function openPatternRound() {
    const round = FIREFLY_PATTERN_ROUNDS[cave.fireflyPatternRound];
    if (!round) return;
    panel.openPanel({
      kind: "fireflyPattern",
      title: "반딧불 깜빡임 기억",
      body: round.question,
      progress: `${cave.fireflyPatternRound + 1} / ${FIREFLY_PATTERN_ROUNDS.length}`,
      choices: round.choices.map((id) => ({ id, label: patternLabel(id) })),
      choiceMode: "single",
    });
    updateUi();
  }

  function openRewardCeremony() {
    const reward = stageReward("cave");
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
    if (item.type === "fireflyPattern") {
      openPatternRound();
      return;
    }
    if (item.type === "reward") {
      openRewardCeremony();
      return;
    }
    const body = {
      caveGate: "반딧불이 모여 있는 입구야. 안쪽의 불빛을 따라가 보자!",
      glowTrail: "작은 빛들이 길처럼 이어지고 있어.",
      echoCrystal: "수정을 살짝 두드리니 맑은 울림이 퍼져 나가!",
      shadowMark: "벽에 비친 모양이 다음 길을 가리키는 것 같아.",
      crystalBridge: "빛나는 수정들이 발판처럼 이어졌어.",
      bat: "작은 박쥐가 천천히 날갯짓하고 있어. 놀라지 않게 관찰해 보자.",
    }[item.type] || caveObjective(cave);
    panel.openPanel({ kind: item.type, title: item.label, body, confirmLabel: "계속" });
    updateUi();
  }

  function confirmPanel() {
    const result = panel.activate();
    if (result.type === "choice" && result.kind === "fireflyPattern") {
      const answer = answerFireflyPatternRound(cave, result.choice.id);
      if (!answer.correct) {
        audio.play("wrong");
        panel.setResponse("빛 순서를 다시 한번 살펴보자!", "gentle");
      } else {
        audio.play("correct");
        cave = answer.state;
        if (answer.completed) panel.closePanel();
        else openPatternRound();
      }
      updateUi();
      return;
    }
    if (result.type !== "confirm") return;

    const kind = panel.payload?.kind;
    if (kind === "caveGate") cave = completeCaveGate(cave);
    else if (kind === "glowTrail") cave = completeGlowTrail(cave);
    else if (kind === "echoCrystal") cave = collectCaveClue(cave, "echoCrystal");
    else if (kind === "shadowMark") cave = collectCaveClue(cave, "shadowMark");
    else if (kind === "crystalBridge") cave = completeCrystalBridge(cave);
    else if (kind === "bat") {
      cave = completeCaveBat(cave);
      openRewardCeremony();
      return;
    } else if (kind === "reward") {
      cave = completeCaveReward(cave);
      awardAndSaveStageReward("cave");
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
        const item = nearestCaveInteractable(player, cave);
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

  globalThis.__eduniCaveGame = {
    geometry,
    runtime,
    player,
    getState: () => cave,
    getPhase: () => caveVisualPhase(cave).phaseId,
    dispose,
  };
  return globalThis.__eduniCaveGame;
}
