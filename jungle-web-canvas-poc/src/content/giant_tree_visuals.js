export const GIANT_TREE_VISUALS = Object.freeze({
  rootGate: Object.freeze({ palette: "root-amber", fog: 0.16, warmth: 0.58, density: 0.84, cue: "root-lantern", ambience: "forest", landmark: "rootGate", reveal: "trunk-hidden" }),
  barkPattern: Object.freeze({ palette: "bark-olive", fog: 0.13, warmth: 0.5, density: 0.88, cue: "bark-runes", ambience: "forest", landmark: "barkPattern", reveal: "trunk-partial" }),
  seedTrail: Object.freeze({ palette: "moss-gold", fog: 0.12, warmth: 0.56, density: 0.9, cue: "acorn-trail", ambience: "forest", landmark: "seedTrail", reveal: "trunk-partial" }),
  hollowEcho: Object.freeze({ palette: "hollow-teal", fog: 0.2, warmth: 0.3, density: 0.82, cue: "hollow-ripples", ambience: "forest", landmark: "hollowEcho", reveal: "trunk-open" }),
  treeRing: Object.freeze({ palette: "ring-amber", fog: 0.08, warmth: 0.7, density: 0.78, cue: "ring-pulse", ambience: "forest", landmark: "treeRing", reveal: "tree-heart" }),
  canopyStairs: Object.freeze({ palette: "canopy-green", fog: 0.07, warmth: 0.48, density: 0.66, cue: "spiral-light", ambience: "forest", landmark: "canopyStairs", reveal: "canopy-opening" }),
  squirrel: Object.freeze({ palette: "canopy-sky", fog: 0.04, warmth: 0.55, density: 0.56, cue: "squirrel-branch", ambience: "forest", landmark: "squirrel", reveal: "canopy-full" }),
  reward: Object.freeze({ palette: "seed-gold", fog: 0.025, warmth: 0.82, density: 0.6, cue: "seed-celebration", ambience: "forest", landmark: "squirrel", reveal: "reward" }),
  complete: Object.freeze({ palette: "seed-gold", fog: 0.02, warmth: 0.86, density: 0.56, cue: "none", ambience: "forest", landmark: "canopyStairs", reveal: "reward" }),
});

export function getGiantTreeVisualPhase(phaseId) {
  return GIANT_TREE_VISUALS[phaseId] || null;
}
