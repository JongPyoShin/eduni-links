// Local-only third-party model manifest for the optional Three.js Waterfall preview.
//
// Provider: https://threejsassets.com/
// Suggested source pack: Swamp & Bayou
// https://threejsassets.com/packs/swamp-bayou
//
// IMPORTANT: keep downloaded GLB files under assets/vendor/threejsassets/.
// That directory is gitignored because the provider permits use in shipped
// projects but does not permit redistributing the raw model files themselves.

export const THREEJSASSETS_VENDOR_ROOT = "./assets/vendor/threejsassets/";

export const THREEJSASSETS_FREE_MODELS = Object.freeze({
  cypressTree: {
    path: "./assets/vendor/threejsassets/cypress-tree.glb",
    file: "cypress-tree.glb",
    category: "tree",
    scale: 0.28,
    rotationY: -0.12,
    yOffset: 0,
    sourceName: "Cypress Tree",
    sourcePack: "Swamp & Bayou",
    fallback: "tree",
  },
  mossyBoulder: {
    path: "./assets/vendor/threejsassets/mossy-boulder.glb",
    file: "mossy-boulder.glb",
    category: "rock",
    scale: 0.9,
    rotationY: 0.08,
    yOffset: 0,
    sourceName: "Mossy Boulder",
    sourcePack: "Swamp & Bayou",
    fallback: "rock",
  },
  mangroveCluster: {
    path: "./assets/vendor/threejsassets/mangrove-cluster.glb",
    file: "mangrove-cluster.glb",
    category: "bush",
    scale: 0.46,
    rotationY: -0.16,
    yOffset: 0,
    sourceName: "Mangrove Cluster",
    sourcePack: "Swamp & Bayou",
    fallback: "shrub",
  },
  cattailReedClump: {
    path: "./assets/vendor/threejsassets/cattail-reed-clump.glb",
    file: "cattail-reed-clump.glb",
    category: "reeds",
    scale: 0.86,
    rotationY: 0.18,
    yOffset: 0,
    sourceName: "Cattail Reed Clump",
    sourcePack: "Swamp & Bayou",
    fallback: "reeds",
  },
  swampMistCloud: {
    path: "./assets/vendor/threejsassets/swamp-mist-cloud.glb",
    file: "swamp-mist-cloud.glb",
    category: "mist",
    scale: 1.2,
    rotationY: 0,
    yOffset: 0.1,
    sourceName: "Swamp Mist Cloud",
    sourcePack: "Swamp & Bayou",
    fallback: "mist",
  },
  waterOpenBayou: {
    path: "./assets/vendor/threejsassets/water-open-bayou.glb",
    file: "water-open-bayou.glb",
    category: "water",
    scale: 1,
    rotationY: 0,
    yOffset: 0.03,
    sourceName: "Water Open Bayou",
    sourcePack: "Swamp & Bayou",
    fallback: "water",
  },
  boulder: {
    path: "./assets/vendor/threejsassets/boulder.glb",
    file: "boulder.glb",
    category: "rock",
    scale: 0.9,
    rotationY: -0.2,
    yOffset: 0,
    sourceName: "Boulder",
    sourcePack: "Free collection",
    fallback: "rock",
  },
  rockCluster: {
    path: "./assets/vendor/threejsassets/rock-cluster.glb",
    file: "rock-cluster.glb",
    category: "rock",
    scale: 0.8,
    rotationY: 0.14,
    yOffset: 0,
    sourceName: "Rock Cluster",
    sourcePack: "Free collection",
    fallback: "rock",
  },
  floweringTree: {
    path: "./assets/vendor/threejsassets/flowering-tree.glb",
    file: "flowering-tree.glb",
    category: "tree",
    scale: 0.48,
    rotationY: 0.1,
    yOffset: 0,
    sourceName: "Flowering Tree",
    sourcePack: "Free collection",
    fallback: "tree",
  },
  grassTuft: {
    path: "./assets/vendor/threejsassets/grass-tuft.glb",
    file: "grass-tuft.glb",
    category: "grass",
    scale: 0.75,
    rotationY: -0.1,
    yOffset: 0,
    sourceName: "Grass Tuft",
    sourcePack: "Free collection",
    fallback: "shrub",
  },
  lilyPadCluster: {
    path: "./assets/vendor/threejsassets/lily-pad-cluster.glb",
    file: "lily-pad-cluster.glb",
    category: "water",
    scale: 0.7,
    rotationY: 0.25,
    yOffset: 0.04,
    sourceName: "Lily Pad Cluster",
    sourcePack: "Free collection",
    fallback: "water",
  },
  waterPond: {
    path: "./assets/vendor/threejsassets/water-pond-01.glb",
    file: "water-pond-01.glb",
    category: "water",
    scale: 0.9,
    rotationY: -0.08,
    yOffset: 0.03,
    sourceName: "Water Pond",
    sourcePack: "Free collection",
    fallback: "water",
  },
  steppingStones: {
    path: "./assets/vendor/threejsassets/stepping-stones.glb",
    file: "stepping-stones.glb",
    category: "landmark",
    scale: 0.85,
    rotationY: 0.05,
    yOffset: 0,
    sourceName: "Stepping Stones",
    sourcePack: "Free collection",
    fallback: "rock",
  },
  streamBeck: {
    path: "./assets/vendor/threejsassets/stream-beck.glb",
    file: "stream-beck.glb",
    category: "water",
    scale: 0.65,
    rotationY: -0.18,
    yOffset: 0.04,
    sourceName: "Stream Beck",
    sourcePack: "Free collection",
    fallback: "water",
  },
});

export function threeVendorUrl(model) {
  return model.path || THREEJSASSETS_VENDOR_ROOT + model.file;
}

export const WATERFALL_THREE_PLACEMENTS = Object.freeze([
  // Entrance framing.
  { model: "floweringTree", x: 90, y: 830, scale: 0.48, rotation: -0.1 },
  { model: "cypressTree", x: 180, y: 690, scale: 0.24, rotation: 0.16 },
  { model: "mangroveCluster", x: 360, y: 705, scale: 0.42, rotation: -0.22 },
  { model: "rockCluster", x: 415, y: 805, scale: 0.58, rotation: 0.2 },
  { model: "cypressTree", x: 270, y: 980, scale: 0.3, rotation: -0.18 },
  { model: "mangroveCluster", x: 470, y: 930, scale: 0.48, rotation: 0.16 },
  { model: "mossyBoulder", x: 565, y: 900, scale: 0.86, rotation: -0.08 },

  // Crossing.
  { model: "cattailReedClump", x: 825, y: 805, scale: 0.88, rotation: -0.1 },
  { model: "mossyBoulder", x: 940, y: 775, scale: 0.82, rotation: 0.15 },
  { model: "cattailReedClump", x: 1120, y: 735, scale: 0.8, rotation: 0.25 },
  { model: "floweringTree", x: 760, y: 865, scale: 0.5, rotation: 0.08 },
  { model: "grassTuft", x: 810, y: 890, scale: 0.85, rotation: -0.1 },

  // Echo / mist basin.
  { model: "cypressTree", x: 850, y: 560, scale: 0.28, rotation: 0.12 },
  { model: "mangroveCluster", x: 1020, y: 520, scale: 0.46, rotation: -0.22 },
  { model: "swampMistCloud", x: 1120, y: 505, scale: 0.9, rotation: 0 },
  { model: "mossyBoulder", x: 1230, y: 570, scale: 0.78, rotation: -0.15 },
  { model: "cattailReedClump", x: 1330, y: 620, scale: 0.8, rotation: 0.2 },
  { model: "rockCluster", x: 1325, y: 505, scale: 0.65, rotation: -0.18 },

  // Leaf / lookout.
  { model: "mangroveCluster", x: 1260, y: 500, scale: 0.46, rotation: 0.2 },
  { model: "cypressTree", x: 1510, y: 430, scale: 0.28, rotation: -0.1 },
  { model: "mossyBoulder", x: 1435, y: 415, scale: 0.86, rotation: 0.08 },
  { model: "floweringTree", x: 1560, y: 590, scale: 0.5, rotation: -0.14 },
  { model: "grassTuft", x: 1500, y: 525, scale: 0.9, rotation: 0.16 },
  // Additional authored variety, kept off the route centerline.
  { model: "floweringTree", x: 360, y: 720, scale: 0.62, rotation: 0.18 },
  { model: "boulder", x: 650, y: 820, scale: 0.72, rotation: -0.12 },
  { model: "rockCluster", x: 1180, y: 760, scale: 0.65, rotation: 0.2 },
  { model: "grassTuft", x: 760, y: 690, scale: 0.72, rotation: -0.08 },
  { model: "lilyPadCluster", x: 1060, y: 580, scale: 0.62, rotation: 0.1 },
  { model: "waterPond", x: 1010, y: 560, scale: 0.62, rotation: -0.04 },
  { model: "steppingStones", x: 980, y: 720, scale: 0.5, rotation: 0.02 },
  { model: "streamBeck", x: 900, y: 690, scale: 0.55, rotation: -0.15 },
]);
