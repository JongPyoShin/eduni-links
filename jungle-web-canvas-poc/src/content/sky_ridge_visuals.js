export const SKY_RIDGE_VISUALS = Object.freeze({
  skyGate: Object.freeze({ palette: "dawn-sky", fog: 0.18, warmth: 0.52, density: 0.66, cue: "ridge-gate-light", ambience: "wind", landmark: "skyGate", reveal: "summit-hidden" }),
  windRibbon: Object.freeze({ palette: "wind-teal", fog: 0.14, warmth: 0.42, density: 0.72, cue: "ribbon-flow", ambience: "wind", landmark: "windRibbon", reveal: "summit-hidden" }),
  cloudShadow: Object.freeze({ palette: "cloud-blue", fog: 0.2, warmth: 0.34, density: 0.74, cue: "cloud-shadow", ambience: "wind", landmark: "cloudShadow", reveal: "summit-partial" }),
  windChime: Object.freeze({ palette: "chime-cyan", fog: 0.12, warmth: 0.38, density: 0.68, cue: "chime-ripples", ambience: "wind-chime", landmark: "windChime", reveal: "summit-partial" }),
  summitBridge: Object.freeze({ palette: "summit-gold", fog: 0.05, warmth: 0.6, density: 0.54, cue: "bridge-sunbeam", ambience: "high-wind", landmark: "summitBridge", reveal: "summit-full" }),
  hawk: Object.freeze({ palette: "hawk-sky", fog: 0.035, warmth: 0.5, density: 0.5, cue: "hawk-glide", ambience: "high-wind", landmark: "hawk", reveal: "summit-full" }),
  reward: Object.freeze({ palette: "star-gold", fog: 0.02, warmth: 0.82, density: 0.5, cue: "sky-star-celebration", ambience: "high-wind", landmark: "hawk", reveal: "reward" }),
  complete: Object.freeze({ palette: "star-gold", fog: 0.015, warmth: 0.86, density: 0.46, cue: "none", ambience: "high-wind", landmark: "summitBridge", reveal: "reward" }),
});

export function getSkyRidgeVisualPhase(phaseId) {
  return SKY_RIDGE_VISUALS[phaseId] || null;
}
