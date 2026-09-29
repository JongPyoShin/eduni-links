// Production Three.js bridge: gameplay remains in game.js/content modules;
// this module only mounts the renderer and supplies read-only state access.
import { startThreeWaterfallPreview, logicalToThree } from "./three_waterfall_preview.js";
import { waterfallVisualPhase } from "./content/stage_visual_director.js";

export { logicalToThree };

const WATERFALL_PALETTES = Object.freeze({
  "misty-cyan": 0x87b9b4,
  "wet-blue": 0x73aeb4,
  "echo-cyan": 0x74b8be,
  "mist-cyan": 0x86bec0,
  "wet-green": 0x80b6a4,
  "open-cyan": 0x8fc8c7,
  "rainbow-mist": 0xb8d8cf,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyStageVisual(runtime, statusEl, phase) {
  if (!runtime?.scene || !phase) return;
  const color = WATERFALL_PALETTES[phase.palette] ?? WATERFALL_PALETTES["misty-cyan"];
  runtime.scene.background?.setHex?.(color);
  runtime.renderer?.setClearColor?.(color, 1);
  if (runtime.renderer?.domElement) runtime.renderer.domElement.style.background = `#${color.toString(16).padStart(6, "0")}`;
  if (runtime.scene.fog?.isFogExp2) {
    runtime.scene.fog.color.setHex(color);
    runtime.scene.fog.density = 0.01 + Math.max(0, Math.min(1, phase.fog || 0)) * 0.035;
  }
  if (runtime.renderer) {
    runtime.renderer.toneMappingExposure = 0.94 + Math.max(0, Math.min(1, phase.warmth || 0)) * 0.22;
  }
  if (statusEl) {
    statusEl.dataset.stageVisual = JSON.stringify({
      phaseId: phase.phaseId,
      palette: phase.palette,
      fog: phase.fog,
      warmth: phase.warmth,
      cue: phase.cue,
      reveal: phase.reveal || null,
    });
  }
}

function installCardinalGameplayCamera(runtime, bridge) {
  if (!runtime?.controls || !runtime?.camera) return;
  if (bridge.enableDiagnostics === true) runtime.cameraDiagnostics = () => ({
    logicalPlayer: bridge.getPlayer?.() || null,
    logicalTarget: bridge.getTarget?.() || null,
    cameraTarget: runtime.controls.target.toArray(),
    cameraPosition: runtime.camera.position.toArray(),
    playerWorld: runtime.player?.sprite?.position?.toArray?.() || null,
    markerVisible: Boolean(runtime.player?.marker),
    canvasSize: [runtime.renderer?.domElement?.width || 0, runtime.renderer?.domElement?.height || 0],
    frame: runtime.renderer?.info?.render?.frame || 0,
    playerNdc: runtime.player?.sprite
      ? runtime.player.sprite.position.clone().project(runtime.camera).toArray()
      : null,
    targetWorld: (bridge.getVisualTarget?.() || bridge.getTarget?.())
      ? logicalToThree((bridge.getVisualTarget?.() || bridge.getTarget()).x, (bridge.getVisualTarget?.() || bridge.getTarget()).y, 0).toArray()
      : null,
    targetNdc: (bridge.getVisualTarget?.() || bridge.getTarget?.())
      ? logicalToThree((bridge.getVisualTarget?.() || bridge.getTarget()).x, (bridge.getVisualTarget?.() || bridge.getTarget()).y, 0).project(runtime.camera).toArray()
      : null,
    markerWorld: runtime.player?.marker?.position?.toArray?.() || null,
    markerNdc: runtime.player?.marker
      ? runtime.player.marker.position.clone().project(runtime.camera).toArray()
      : null,
  });
  const originalUpdate = runtime.controls.update.bind(runtime.controls);
  runtime.controls.update = () => {
    const logical = bridge.getPlayer?.();
    if (logical) {
      const p = logicalToThree(logical.x, logical.y, 0);
      const activeTarget = bridge.getVisualTarget?.() || bridge.getTarget?.();
      const targetPoint = activeTarget
        ? logicalToThree(activeTarget.x, activeTarget.y, 0)
        : { x: p.x + 1.5, z: p.z - 0.45 };
      // Frame the actual gameplay player and current interactable together.
      // The preview no longer owns the camera in production, so this is the
      // only follow filter applied to the scene.
      const framedTargetX = clamp((p.x + targetPoint.x) * 0.5, -5.5, 5.5);
      const framedTargetZ = clamp((p.z + targetPoint.z) * 0.5, -4.6, 4.6);
      // Apply the live frame immediately. A slow filter left the player at
      // NDC x=-0.918 during the first settled mobile frames, clipping the
      // sprite even though the eventual midpoint was correct.
      runtime.controls.target.x = framedTargetX;
      runtime.controls.target.z = framedTargetZ;
      runtime.controls.target.y = 0.3;
      // Gameplay camera has no X offset. World X is screen-horizontal and
      // logical Y/world Z is screen-vertical, so D-pad arrows match the screen.
      runtime.camera.position.set(runtime.controls.target.x, 11.5, runtime.controls.target.z + 8.2);
    }
    const result = originalUpdate();
    const target = runtime.controls.target;
    runtime.camera.position.set(target.x, 11.5, target.z + 8.2);
    runtime.camera.lookAt(target.x, target.y, target.z);
    runtime.camera.updateMatrixWorld(true);
    return result;
  };
}

export async function startThreeWaterfallRuntime(canvas, statusEl, bridge) {
  if (!bridge || typeof bridge.getState !== "function" || typeof bridge.getPlayer !== "function") {
    throw new TypeError("Three Waterfall runtime requires read-only gameplay bridge callbacks");
  }
  const result = await startThreeWaterfallPreview(canvas, statusEl, {
    ...bridge,
    production: true,
  });

  // Keep stage-wide atmosphere in the shared visual director while the
  // preview renderer continues to own per-landmark story objects. Updating at
  // 8 Hz is enough for progression changes and avoids a second render RAF.
  const runtime = globalThis.__eduniThreeWaterfall;
  if (runtime) {
    const diagnosticsEnabled = bridge.enableDiagnostics === true;
    installCardinalGameplayCamera(runtime, bridge);
    runtime.renderProof = diagnosticsEnabled ? () => ({
      rendererCalls: runtime.renderer?.info?.render?.calls || 0,
      renderFrame: runtime.renderer?.info?.render?.frame || 0,
      drawingBuffer: [runtime.renderer?.domElement?.width || 0, runtime.renderer?.domElement?.height || 0],
      sceneChildren: runtime.scene?.children?.length || 0,
      playerVisible: Boolean(runtime.player?.sprite),
      camera: runtime.cameraDiagnostics?.() || null,
    }) : null;
    const publishDiagnostics = () => {
      if (!diagnosticsEnabled) return;
      if (!statusEl) return;
      statusEl.dataset.cameraDiagnostics = JSON.stringify(runtime.cameraDiagnostics?.() || null);
      statusEl.dataset.renderProof = JSON.stringify(runtime.renderProof?.() || null);
    };
    const syncStageVisual = () => applyStageVisual(runtime, statusEl, waterfallVisualPhase(bridge.getState()));
    syncStageVisual();
    publishDiagnostics();
    const visualTimer = globalThis.setInterval?.(() => {
      syncStageVisual();
      publishDiagnostics();
    }, 125);
    const originalDispose = runtime.dispose;
    runtime.dispose = () => {
      if (visualTimer !== undefined) globalThis.clearInterval?.(visualTimer);
      originalDispose?.();
    };
    runtime.stageVisualPhase = () => waterfallVisualPhase(bridge.getState());
  }
  return result;
}
