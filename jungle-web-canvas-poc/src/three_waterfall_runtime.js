// Production Three.js bridge: gameplay remains in game.js/content modules;
// this module only mounts the renderer and supplies read-only state access.
import { startThreeWaterfallPreview, logicalToThree } from "./three_waterfall_preview.js";

export { logicalToThree };

export async function startThreeWaterfallRuntime(canvas, statusEl, bridge) {
  if (!bridge || typeof bridge.getState !== "function" || typeof bridge.getPlayer !== "function") {
    throw new TypeError("Three Waterfall runtime requires read-only gameplay bridge callbacks");
  }
  return startThreeWaterfallPreview(canvas, statusEl, {
    ...bridge,
    production: true,
  });
}
