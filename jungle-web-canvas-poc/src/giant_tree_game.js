import * as THREE from "three";
import { GiantTreeWorldGeometry } from "./geometry.js";
import { MovementController } from "./movement.js";
import { InputController } from "./input.js";
import { PlayerSprite } from "./player.js";
import { frameDelta } from "./loop.js";
import { AudioManager } from "./audio.js";
import { ContentPanelController, renderContentPanel } from "./content/content_panel.js";
import {
  TREE_RING_ROUNDS,
  createGiantTreeState,
  giantTreeObjective,
  completeRootGate,
  collectGiantTreeClue,
  answerTreeRingRound,
  completeCanopyStairs,
  completeSquirrel,
  completeGiantTreeReward,
} from "./content/giant_tree_chapter.js";
import { nearestGiantTreeInteractable } from "./content/giant_tree_interactables.js";
import { giantTreeVisualPhase } from "./content/stage_visual_director.js";
import { stageReward, awardAndSaveStageReward } from "./content/stage_rewards.js";
import { giantTreeLogicalToThree, startThreeGiantTreePreview } from "./three_giant_tree_preview.js";

function setObjective(text) {
  const hud = document.querySelector("#objective-hud");
  if (!hud || hud.textContent === text) return;
  hud.textContent = text;
  hud.classList.remove("objective-change");
  void hud.offsetWidth;
  hud.classList.add("objective-change");
}

export async function startGiantTreeGame(canvas, modalEl, statusEl) {
  const geometry = new GiantTreeWorldGeometry();
  const movement = new MovementController();
  const input = new InputController();
  const panel = new ContentPanelController();
  const audio = new AudioManager();
  const playerSprite = new PlayerSprite();
  await playerSprite.load();

  let tree = createGiantTreeState();
  const player = { x: geometry.clearings[0].x, y: geometry.clearings[0].y };
  const runtime = await startThreeGiantTreePreview(canvas, statusEl, { phase: "rootGate", debugControls: false });
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
    const p = giantTreeLogicalToThree(player.x, player.y, 0);
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
    runtime.controls.target.y = 1.0;
    runtime.camera.position.x = runtime.controls.target.x;
    runtime.camera.position.z = runtime.controls.target.z + 8.2;
    runtime.camera.position.y = 12.0;
  }

  function syncPhase() {
    const phase = giantTreeVisualPhase(tree);
    if (phase.phaseId !== lastPhaseId) {
      runtime.setPhase(phase.phaseId);
      lastPhaseId = phase.phaseId;
      syncPlayerVisual();
    }
    if (statusEl) {
      statusEl.dataset.gamePhase = phase.phaseId;
      statusEl.dataset.gameState = JSON.stringify(tree);
      statusEl.dataset.player = JSON.stringify(player);
    }
  }

  function updateUi() {
    setObjective(giantTreeObjective(tree));
    renderContentPanel(panel, modalEl);
    syncPhase();
  }

  function openTreeRingRound() {
    const round = TREE_RING_ROUNDS[tree.treeRingRound];
    if (!round) return;
    panel.openPanel({
      kind: "treeRing",
      title: "나이테 관찰",
      body: round.question,
      progress: `${tree.treeRingRound + 1} / ${TREE_RING_ROUNDS.length}`,
      choices: round.choices.map((id) => ({ id, label: `${id}줄` })),
      choiceMode: "single",
    });
    updateUi();
  }

  function openRewardCeremony() {
    const reward = stageReward("giantTree");
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
    if (item.type === "treeRing") {
      openTreeRingRound();
      return;
    }
    if (item.type === "reward") {
      openRewardCeremony();
      return;
    }
    const body = {
      rootGate: "뿌리가 문처럼 벌어져 있어. 거대한 고목의 이야기를 따라가 보자!",
      barkPattern: "껍질의 굵은 선과 얇은 선이 반복되는 무늬를 찾았어.",
      seedTrail: "도토리들이 길처럼 이어져 있어. 누가 옮겼을까?",
      hollowEcho: "빈 나무 속에서 둥— 하고 울리는 소리가 들려.",
      canopyStairs: "가지와 뿌리가 나선 계단처럼 이어져 위쪽 숲으로 올라갈 수 있어.",
      squirrel: "다람쥐가 도토리를 꼭 안고 가지 사이를 빠르게 움직이고 있어!",
    }[item.type] || giantTreeObjective(tree);
    panel.openPanel({ kind: item.type, title: item.label, body, confirmLabel: "계속" });
    updateUi();
  }

  function confirmPanel() {
    const result = panel.activate();
    if (result.type === "choice" && result.kind === "treeRing") {
      const answer = answerTreeRingRound(tree, result.choice.id);
      if (!answer.correct) {
        audio.play("wrong");
        panel.setResponse("나이테를 천천히 다시 세어 보자!", "gentle");
      } else {
        audio.play("correct");
        tree = answer.state;
        if (answer.completed) panel.closePanel();
        else openTreeRingRound();
      }
      updateUi();
      return;
    }
    if (result.type !== "confirm") return;

    const kind = panel.payload?.kind;
    if (kind === "rootGate") tree = completeRootGate(tree);
    else if (kind === "barkPattern") tree = collectGiantTreeClue(tree, "barkPattern");
    else if (kind === "seedTrail") tree = collectGiantTreeClue(tree, "seedTrail");
    else if (kind === "hollowEcho") tree = collectGiantTreeClue(tree, "hollowEcho");
    else if (kind === "canopyStairs") tree = completeCanopyStairs(tree);
    else if (kind === "squirrel") {
      tree = completeSquirrel(tree);
      openRewardCeremony();
      return;
    } else if (kind === "reward") {
      tree = completeGiantTreeReward(tree);
      awardAndSaveStageReward("giantTree");
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
        const item = nearestGiantTreeInteractable(player, tree);
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

  globalThis.__eduniGiantTreeGame = {
    geometry,
    runtime,
    player,
    getState: () => tree,
    getPhase: () => giantTreeVisualPhase(tree).phaseId,
    dispose,
  };
  return globalThis.__eduniGiantTreeGame;
}