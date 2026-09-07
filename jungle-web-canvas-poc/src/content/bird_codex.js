export const CODEX_STORAGE_KEY = "eduni.jungle.birdCodex.v1";

export function createEmptyCodex() {
  return Object.freeze({ captured: Object.freeze({}) });
}

export function loadBirdCodex(storage = globalThis.localStorage) {
  if (!storage?.getItem) return createEmptyCodex();
  try {
    const parsed = JSON.parse(storage.getItem(CODEX_STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || !parsed.captured || typeof parsed.captured !== "object") {
      return createEmptyCodex();
    }
    return Object.freeze({ captured: Object.freeze({ ...parsed.captured }) });
  } catch {
    return createEmptyCodex();
  }
}

export function saveBirdCodex(codex, storage = globalThis.localStorage) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(CODEX_STORAGE_KEY, JSON.stringify({ captured: { ...codex.captured } }));
    return true;
  } catch {
    return false;
  }
}

export function hasCapturedBird(codex, birdId) {
  return Boolean(codex?.captured?.[birdId]?.captured);
}

export function birdCodexEntry(codex, birdId) {
  return codex?.captured?.[birdId] || null;
}

export function capturedBirdCount(codex) {
  if (!codex?.captured) return 0;
  return Object.values(codex.captured).filter((e) => e?.captured).length;
}

export function captureBird(codex, birdId, score) {
  const existing = codex?.captured?.[birdId];
  if (existing) {
    const bestScore = Math.max(existing.bestScore || 0, score);
    const attempts = (existing.attempts || 0) + 1;
    return Object.freeze({
      captured: Object.freeze({
        ...codex.captured,
        [birdId]: Object.freeze({ captured: true, capturedAt: existing.capturedAt, bestScore, attempts }),
      }),
    });
  }
  return Object.freeze({
    captured: Object.freeze({
      ...codex.captured,
      [birdId]: Object.freeze({ captured: true, capturedAt: new Date().toISOString(), bestScore: score, attempts: 1 }),
    }),
  });
}
