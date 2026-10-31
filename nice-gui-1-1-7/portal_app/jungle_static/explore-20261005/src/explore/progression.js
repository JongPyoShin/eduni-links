import { MAP_IDS } from './map_content.js?v=maps-20261011e';
import { LEARNING_BIRDS } from './bird_learning_content.js?v=learning-20261015';

export const PROGRESSION_SAVE_KEY = 'eduni.explore.progression.v1';
export const MAX_PHOTO_DISTANCE = 10;
export const MAX_BINOCULAR_DISTANCE = 10;
const mapIds = new Set(MAP_IDS);
const birdIds = new Set(LEARNING_BIRDS.map(bird => bird.id));
const birdMapById = new Map(LEARNING_BIRDS.map(bird => [bird.id, bird.mapId]));
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const emptyJournal = () => ({ version: 1, mapStamps: [], photoIds: [] });

export function normalizeProgressionJournal(value) {
  const keys = record(value) ? Object.keys(value) : [];
  const validIds = (items, allowed) => Array.isArray(items) && items.length <= allowed.size &&
    items.every(id => typeof id === 'string' && allowed.has(id)) && new Set(items).size === items.length;
  if (!record(value) || value.version !== 1 || keys.length !== 3 ||
      keys.some(key => !['version', 'mapStamps', 'photoIds'].includes(key)) ||
      !validIds(value.mapStamps, mapIds) || !validIds(value.photoIds, birdIds)) {
    return { save: emptyJournal(), valid: false, warning: '도구 기록을 확인하지 못했어요. 원본 기록은 그대로 두었어요.' };
  }
  return {
    save: {
      version: 1,
      mapStamps: MAP_IDS.filter(id => value.mapStamps.includes(id)),
      photoIds: LEARNING_BIRDS.map(bird => bird.id).filter(id => value.photoIds.includes(id)),
    },
    valid: true,
    warning: null,
  };
}

export function loadProgressionJournal(storage) {
  if (!storage || typeof storage.getItem !== 'function') {
    return { save: emptyJournal(), valid: false, warning: '도구 기록을 저장할 수 없어 이번 화면에서만 남겨요.' };
  }
  let raw;
  try { raw = storage.getItem(PROGRESSION_SAVE_KEY); }
  catch { return { save: emptyJournal(), valid: false, warning: '도구 기록을 읽을 수 없어 이번 화면에서만 남겨요.' }; }
  if (raw === null || raw === undefined) return { save: emptyJournal(), valid: true, warning: null };
  try { return normalizeProgressionJournal(JSON.parse(raw)); }
  catch { return { save: emptyJournal(), valid: false, warning: '도구 기록을 읽지 못했어요. 원본 기록은 그대로 두었어요.' }; }
}

export function mergeProgressionJournals(left, right) {
  const a = normalizeProgressionJournal(left), b = normalizeProgressionJournal(right);
  if (!a.valid || !b.valid) return a.valid ? a.save : emptyJournal();
  const stamps = new Set([...a.save.mapStamps, ...b.save.mapStamps]);
  const photos = new Set([...a.save.photoIds, ...b.save.photoIds]);
  return {
    version: 1,
    mapStamps: MAP_IDS.filter(id => stamps.has(id)),
    photoIds: LEARNING_BIRDS.map(bird => bird.id).filter(id => photos.has(id)),
  };
}

export function addMapStamp(journal, mapId) {
  const normalized = normalizeProgressionJournal(journal);
  return normalized.valid && mapIds.has(mapId)
    ? mergeProgressionJournals(normalized.save, { ...emptyJournal(), mapStamps: [mapId] })
    : normalized.save;
}

export function addPhotoId(journal, birdId) {
  const normalized = normalizeProgressionJournal(journal);
  return normalized.valid && birdIds.has(birdId)
    ? mergeProgressionJournals(normalized.save, { ...emptyJournal(), photoIds: [birdId] })
    : normalized.save;
}

export function saveProgressionJournal(journal, storage) {
  const incoming = normalizeProgressionJournal(journal);
  if (!incoming.valid) return { saved: false, save: incoming.save, warning: incoming.warning };
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return { saved: false, save: incoming.save, warning: '도구 기록을 저장할 수 없어 이번 화면에서만 남겨요.' };
  }
  let merged = incoming.save;
  try {
    const raw = storage.getItem(PROGRESSION_SAVE_KEY);
    let existing = emptyJournal();
    if (raw !== null && raw !== undefined) {
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return { saved: false, save: incoming.save, warning: '도구 기록이 손상되어 원본을 보존했어요. 이번 화면에서만 남겨요.' }; }
      const current = normalizeProgressionJournal(parsed);
      if (!current.valid) return { saved: false, save: incoming.save, warning: '도구 기록을 확인하지 못해 원본을 보존했어요. 이번 화면에서만 남겨요.' };
      existing = current.save;
    }
    merged = mergeProgressionJournals(existing, incoming.save);
    storage.setItem(PROGRESSION_SAVE_KEY, JSON.stringify(merged));
    // One bounded verification pass folds in a concurrent tab's just-written additions.
    const verifyRaw = storage.getItem(PROGRESSION_SAVE_KEY);
    if (verifyRaw !== null && verifyRaw !== undefined) {
      const verify = normalizeProgressionJournal(JSON.parse(verifyRaw));
      if (verify.valid) {
        const verifiedMerge = mergeProgressionJournals(merged, verify.save);
        if (JSON.stringify(verifiedMerge) !== JSON.stringify(verify.save)) storage.setItem(PROGRESSION_SAVE_KEY, JSON.stringify(verifiedMerge));
        return { saved: true, save: verifiedMerge, warning: null };
      }
      return { saved: false, save: merged, warning: '도구 기록이 다른 화면에서 바뀌어 이번 화면에서만 유지해요.' };
    }
    return { saved: true, save: merged, warning: null };
  } catch {
    return { saved: false, save: merged, warning: '도구 기록을 저장하지 못해 이번 화면에서만 남겨요.' };
  }
}

export function deriveProgression(mapStates, journal) {
  const byId = new Map(mapStates.map(item => [item.id, item]));
  const maps = MAP_IDS.map(id => ({ id, ...(byId.get(id) || { visited: false, complete: false, discoveryCount: 0, animalCaptured: false }) }));
  const recommendedMapId = maps.find(item => !item.complete)?.id || null;
  const hasDiscovery = maps.some(item => item.discoveryCount > 0);
  const hasAnimal = maps.some(item => item.animalCaptured);
  const normalized = normalizeProgressionJournal(journal);
  const mapStamps = MAP_IDS.filter(id => maps.find(item => item.id === id)?.complete || normalized.save.mapStamps.includes(id));
  return {
    maps: maps.map(item => ({
      ...item,
      status: item.current ? 'current' : item.complete ? 'complete' : item.id === recommendedMapId ? 'next' : item.visited ? 'revisit' : 'ahead',
      stamped: item.complete || normalized.save.mapStamps.includes(item.id),
    })),
    recommendedMapId,
    binocularsOwned: hasDiscovery,
    cameraOwned: hasAnimal,
    mapStamps,
    photoIds: normalized.save.photoIds,
  };
}

export function isWithinBinocularRange(distance) {
  return Number.isFinite(distance) && distance >= 0 && distance <= MAX_BINOCULAR_DISTANCE;
}

export function hasPersistedMapCompletion(mapId, { valid, visitedCount, discoveryTotal, animalCaptured } = {}) {
  return mapIds.has(mapId) && valid === true && Number.isInteger(visitedCount) && Number.isInteger(discoveryTotal) &&
    discoveryTotal > 0 && visitedCount === discoveryTotal && animalCaptured === true;
}

export function selectPhotoCandidate(candidates, currentMapId, maxDistance = MAX_PHOTO_DISTANCE) {
  if (!Array.isArray(candidates) || !mapIds.has(currentMapId) || !Number.isFinite(maxDistance) || maxDistance < 0) return null;
  maxDistance = Math.min(maxDistance, MAX_PHOTO_DISTANCE);
  return candidates.filter(item => item && birdIds.has(item.id) && birdMapById.get(item.id) === currentMapId &&
    [item.x, item.y, item.z, item.distance].every(Number.isFinite) &&
    item.distance >= 0 && item.distance <= maxDistance &&
    item.z >= -1 && item.z <= 1 && Math.abs(item.x) <= .18 && Math.abs(item.y) <= .24)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}
