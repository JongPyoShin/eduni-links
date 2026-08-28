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
    file: "cypress-tree.glb",
    sourceName: "Cypress Tree",
    sourcePack: "Swamp & Bayou",
    fallback: "tree",
  },
  mossyBoulder: {
    file: "mossy-boulder.glb",
    sourceName: "Mossy Boulder",
    sourcePack: "Swamp & Bayou",
    fallback: "rock",
  },
  mangroveCluster: {
    file: "mangrove-cluster.glb",
    sourceName: "Mangrove Cluster",
    sourcePack: "Swamp & Bayou",
    fallback: "shrub",
  },
  cattailReedClump: {
    file: "cattail-reed-clump.glb",
    sourceName: "Cattail Reed Clump",
    sourcePack: "Swamp & Bayou",
    fallback: "reeds",
  },
  swampMistCloud: {
    file: "swamp-mist-cloud.glb",
    sourceName: "Swamp Mist Cloud",
    sourcePack: "Swamp & Bayou",
    fallback: "mist",
  },
  waterOpenBayou: {
    file: "water-open-bayou.glb",
    sourceName: "Water Open Bayou",
    sourcePack: "Swamp & Bayou",
    fallback: "water",
  },
});

export function threeVendorUrl(model) {
  return THREEJSASSETS_VENDOR_ROOT + model.file;
}

export const WATERFALL_THREE_PLACEMENTS = Object.freeze([
  // Entrance framing.
  { model: "cypressTree", x: 270, y: 980, scale: 1.15, rotation: -0.18 },
  { model: "mangroveCluster", x: 470, y: 930, scale: 1.1, rotation: 0.16 },
  { model: "mossyBoulder", x: 565, y: 900, scale: 1.35, rotation: -0.08 },

  // Crossing.
  { model: "cattailReedClump", x: 825, y: 805, scale: 1.2, rotation: -0.1 },
  { model: "mossyBoulder", x: 940, y: 775, scale: 1.1, rotation: 0.15 },
  { model: "cattailReedClump", x: 1120, y: 735, scale: 1.05, rotation: 0.25 },

  // Echo / mist basin.
  { model: "cypressTree", x: 850, y: 560, scale: 0.95, rotation: 0.12 },
  { model: "mangroveCluster", x: 1020, y: 520, scale: 1.0, rotation: -0.22 },
  { model: "swampMistCloud", x: 1120, y: 505, scale: 1.35, rotation: 0 },
  { model: "mossyBoulder", x: 1230, y: 570, scale: 1.0, rotation: -0.15 },

  // Leaf / lookout.
  { model: "mangroveCluster", x: 1260, y: 500, scale: 1.15, rotation: 0.2 },
  { model: "cypressTree", x: 1510, y: 430, scale: 1.05, rotation: -0.1 },
  { model: "mossyBoulder", x: 1435, y: 415, scale: 1.2, rotation: 0.08 },
]);
