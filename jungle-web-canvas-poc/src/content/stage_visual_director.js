import { getStageVisualPhase } from "./stage_manifest.js";

const PHASE_CACHE = new Map();

function withPhase(stageId, phaseId) {
  const key = `${stageId}:${phaseId}`;
  if (PHASE_CACHE.has(key)) return PHASE_CACHE.get(key);
  const visual = getStageVisualPhase(stageId, phaseId);
  if (!visual) throw new Error(`Unknown visual phase ${stageId}:${phaseId}`);
  const resolved = Object.freeze({ stageId, phaseId, ...visual });
  PHASE_CACHE.set(key, resolved);
  return resolved;
}

export function campVisualPhase(state, sequence = {}) {
  if (state?.bluebirdComplete) return withPhase("camp", "reward");
  if (state?.firePitComplete) {
    const ridgeComplete = Boolean(sequence?.ridgeArrivalPlayed);
    return withPhase("camp", ridgeComplete ? "bluebird" : "ridge");
  }
  const clues = state?.discoveredClues || [];
  if (clues.length >= 3) return withPhase("camp", "firePit");
  if (!state?.questStarted) return withPhase("camp", "hut");
  if (clues.length === 0) return withPhase("camp", "feather");
  if (clues.length === 1) return withPhase("camp", "footprints");
  return withPhase("camp", "birdcall");
}

export function waterfallVisualPhase(state) {
  const clues = state?.discoveredClues || [];
  if (state?.rewardComplete) return withPhase("waterfall", "complete");
  if (state?.kingfisherComplete) return withPhase("waterfall", "reward");
  if (state?.lookoutComplete) return withPhase("waterfall", "kingfisher");
  if (state?.leafMatchComplete) return withPhase("waterfall", "lookout");
  if (clues.includes("echo") && clues.includes("mistTrail")) return withPhase("waterfall", "leafMatch");
  if (clues.includes("echo")) return withPhase("waterfall", "mistTrail");
  if (state?.steppingStonesComplete) return withPhase("waterfall", "echo");
  if (state?.streamGateComplete) return withPhase("waterfall", "steppingStones");
  return withPhase("waterfall", "streamGate");
}

export function caveVisualPhase(state) {
  const clues = state?.discoveredClues || [];
  if (state?.rewardComplete) return withPhase("cave", "complete");
  if (state?.batComplete) return withPhase("cave", "reward");
  if (state?.crystalBridgeComplete) return withPhase("cave", "bat");
  if (state?.fireflyPatternComplete) return withPhase("cave", "crystalBridge");
  if (clues.includes("echoCrystal") && clues.includes("shadowMark")) return withPhase("cave", "fireflyPattern");
  if (clues.includes("echoCrystal")) return withPhase("cave", "shadowMark");
  if (state?.glowTrailComplete) return withPhase("cave", "echoCrystal");
  if (state?.caveGateComplete) return withPhase("cave", "glowTrail");
  return withPhase("cave", "caveGate");
}

export function stageVisualPhase(stageId, state, context = {}) {
  if (stageId === "camp") return campVisualPhase(state, context.sequence);
  if (stageId === "waterfall") return waterfallVisualPhase(state);
  if (stageId === "cave") return caveVisualPhase(state);
  throw new Error(`Unknown stage visual director: ${stageId}`);
}
