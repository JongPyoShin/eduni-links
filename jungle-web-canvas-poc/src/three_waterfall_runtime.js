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

function applyStageVisual(runtime, statusEl, phase) {
  if (!runtime?.scene || !phase) return;
  const color = WATERFALL_PALETTES[phase.palette] ?? WATERFALL_PALETTES["misty-cyan"];
  runtime.scene.background?.setHex?.(color);
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
    const syncStageVisual = () => applyStageVisual(runtime, statusEl, waterfallVisualPhase(bridge.getState()));
    syncStageVisual();
    const visualTimer = globalThis.setInterval?.(syncStageVisual, 125);
    const originalDispose = runtime.dispose;
    runtime.dispose = () => {
      if (visualTimer !== undefined) globalThis.clearInterval?.(visualTimer);
      originalDispose?.();
    };
    runtime.stageVisualPhase = () => waterfallVisualPhase(bridge.getState());
  }
  return result;
}
