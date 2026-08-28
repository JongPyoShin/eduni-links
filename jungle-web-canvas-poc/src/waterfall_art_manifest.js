export const WATERFALL_ART_IMAGES = Object.freeze({
  backdrop: "assets/waterfall/waterfall_backdrop.svg",
  foliage: "assets/waterfall/foliage_cluster.svg",
  cliff: "assets/waterfall/cliff_terrace.svg",
  gate: "assets/waterfall/gate_arch.svg",
  lookout: "assets/waterfall/lookout_platform.svg",
  boulders: "assets/waterfall/wet_boulder_cluster.svg",
  flowers: "assets/waterfall/flower_bank.svg",
  foregroundVines: "assets/waterfall/foreground_vines.svg",
});

// Pure presentation data. Gameplay/collision coordinates remain owned by
// WaterfallWorldGeometry and waterfall_interactables.js.
export const WATERFALL_ART_PROPS = Object.freeze([
  { id: "entrance-cliff", asset: "cliff", x: 175, y: 1100, scale: 0.58, width: 620, layer: "back", alpha: 0.88 },
  { id: "entrance-left", asset: "foliage", x: 285, y: 990, scale: 0.96, width: 420, layer: "mid" },
  { id: "entrance-gate", asset: "gate", x: 675, y: 930, scale: 0.78, width: 360, layer: "front" },
  { id: "entrance-flowers", asset: "flowers", x: 520, y: 980, scale: 0.66, width: 440, layer: "front" },

  { id: "crossing-bank-left", asset: "foliage", x: 835, y: 815, scale: 0.72, width: 420, layer: "mid", mirrorX: true },
  { id: "crossing-rocks", asset: "boulders", x: 970, y: 770, scale: 0.56, width: 480, layer: "front" },
  { id: "crossing-bank-right", asset: "flowers", x: 1120, y: 755, scale: 0.52, width: 440, layer: "front" },

  { id: "echo-cliff", asset: "cliff", x: 1155, y: 610, scale: 0.62, width: 620, layer: "back" },
  { id: "echo-rocks", asset: "boulders", x: 1180, y: 630, scale: 0.52, width: 480, layer: "mid" },
  { id: "mist-left", asset: "foliage", x: 930, y: 520, scale: 0.64, width: 420, layer: "mid" },
  { id: "mist-flowers", asset: "flowers", x: 1020, y: 525, scale: 0.55, width: 440, layer: "front" },

  { id: "leaf-bank", asset: "foliage", x: 1260, y: 525, scale: 0.74, width: 420, layer: "mid", mirrorX: true },
  { id: "leaf-flowers", asset: "flowers", x: 1285, y: 535, scale: 0.64, width: 440, layer: "front" },

  { id: "lookout-cliff", asset: "cliff", x: 1440, y: 385, scale: 0.72, width: 620, layer: "back" },
  { id: "lookout-platform", asset: "lookout", x: 1450, y: 360, scale: 0.72, width: 520, layer: "front" },
  { id: "ridge-foliage", asset: "foliage", x: 1530, y: 430, scale: 0.82, width: 420, layer: "mid" },
  { id: "ridge-rocks", asset: "boulders", x: 1370, y: 450, scale: 0.46, width: 480, layer: "mid", mirrorX: true },
]);

export const WATERFALL_FOREGROUND = Object.freeze([
  { id: "foreground-left", asset: "foregroundVines", anchor: "top-left", alpha: 0.90 },
  { id: "foreground-right", asset: "foregroundVines", anchor: "top-right", alpha: 0.84, mirrorX: true },
]);
