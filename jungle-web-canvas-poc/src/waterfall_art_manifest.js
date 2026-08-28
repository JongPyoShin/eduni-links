export const WATERFALL_ART_IMAGES = Object.freeze({
  backdrop: "assets/waterfall/waterfall_backdrop.svg",
  foliage: "assets/waterfall/foliage_cluster.svg",
  cliff: "assets/waterfall/cliff_terrace.svg",
  foregroundVines: "assets/waterfall/foreground_vines.svg",
});

export const WATERFALL_ART_PROPS = Object.freeze([
  { id: "entrance-left", asset: "foliage", x: 285, y: 990, scale: 0.90, layer: "mid" },
  { id: "entrance-right", asset: "foliage", x: 520, y: 900, scale: 0.72, layer: "mid" },
  { id: "crossing-bank", asset: "foliage", x: 900, y: 790, scale: 0.68, layer: "mid" },
  { id: "echo-cliff", asset: "cliff", x: 1155, y: 610, scale: 0.58, layer: "mid" },
  { id: "mist-left", asset: "foliage", x: 930, y: 520, scale: 0.60, layer: "mid" },
  { id: "leaf-bank", asset: "foliage", x: 1260, y: 525, scale: 0.70, layer: "mid" },
  { id: "lookout-cliff", asset: "cliff", x: 1440, y: 385, scale: 0.66, layer: "mid" },
  { id: "ridge-foliage", asset: "foliage", x: 1530, y: 430, scale: 0.76, layer: "mid" },
]);

export const WATERFALL_FOREGROUND = Object.freeze([
  { id: "foreground-left", asset: "foregroundVines", anchor: "top-left", alpha: 0.88 },
  { id: "foreground-right", asset: "foregroundVines", anchor: "top-right", alpha: 0.82, mirrorX: true },
]);
