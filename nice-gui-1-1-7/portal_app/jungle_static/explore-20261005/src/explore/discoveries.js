import { MAP_CONTENT } from './map_content.js?v=maps-20261011e';

export const DISCOVERY_SAVE_KEY = 'eduni.explore.discoveries.v1';
export const DISCOVERY_IDS = Object.freeze(['fernGrove', 'riverTracks', 'lookout']);
export const DISCOVERY_MISSIONS = Object.freeze([
  { id: 'fernGrove', prompt: '잎사귀 숲의 작은 잎은 줄기 둘레로 어떻게 보이나요?', answerId: 'around-stems', explanation: '작은 잎들이 줄기 주변으로 퍼져 있어요. 가까이에서 모양을 살펴봤어요.', choices: [{id:'around-stems',text:'여러 잎이 줄기 둘레로 퍼져 있어요'},{id:'single-leaf',text:'큰 잎 한 장이 땅에 붙어 있어요'}] },
  { id: 'riverTracks', prompt: '강가 발자국은 어느 쪽으로 이어지나요?', answerId: 'toward-water', explanation: '발자국은 물이 있는 방향으로 이어져요. 길을 따라 흔적을 살펴봤어요.', choices: [{id:'toward-water',text:'물이 있는 쪽으로 이어져요'},{id:'toward-forest',text:'물과 반대쪽 숲으로 이어져요'}] },
  { id: 'lookout', prompt: '전망 언덕에서 주변을 살펴보면 무엇이 보이나요?', answerId: 'nearby-forest-paths', explanation: '전망 언덕 주변으로 이어진 숲과 오솔길을 살펴볼 수 있어요.', choices: [{id:'nearby-forest-paths',text:'주변 숲과 오솔길이 보여요'},{id:'distant-water',text:'멀리 떨어진 물가 전체가 보여요'}] },
]);

export function discoveryConfig(mapId = 'river-meadow') {
  const river = mapId === 'river-meadow';
  const content = river ? null : MAP_CONTENT[mapId];
  const missions = river ? DISCOVERY_MISSIONS : content?.discoveries || DISCOVERY_MISSIONS;
  return { mapId: river || !content ? 'river-meadow' : mapId, key: river || !content ? DISCOVERY_SAVE_KEY : `eduni.explore.discoveries.${mapId}.v1`, missions, ids: missions.map(item => item.id) };
}

export function canRecordDiscovery(mapId, mission, choiceId, save) {
  return mapId === 'river-meadow' || save?.visitedIds?.includes(mission?.id) || choiceId === mission?.answerId;
}

const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const empty = config => ({ version: 1, regionId: config.mapId, visitedIds: [] });

export function normalizeDiscoveries(value, mapId = 'river-meadow') {
  const config = discoveryConfig(mapId);
  const keys = isRecord(value) ? Object.keys(value) : [];
  if (!isRecord(value) || value.version !== 1 || value.regionId !== config.mapId || keys.length !== 3 ||
      keys.some(key => !['version','regionId','visitedIds'].includes(key)) || !Array.isArray(value.visitedIds) ||
      value.visitedIds.some(id => typeof id !== 'string' || !config.ids.includes(id)) || new Set(value.visitedIds).size !== value.visitedIds.length) {
    return { save: empty(config), valid: false, warning: '탐험 기록을 읽지 못했어요. 원본 기록은 보존했어요.' };
  }
  return { save: { version: 1, regionId: config.mapId, visitedIds: config.ids.filter(id => value.visitedIds.includes(id)) }, valid: true, warning: null };
}

export function loadDiscoveries(storage, mapId = 'river-meadow') {
  const config = discoveryConfig(mapId);
  if (!storage || typeof storage.getItem !== 'function') return { save: empty(config), valid: true, warning: null };
  let raw;
  try { raw = storage.getItem(config.key); } catch { return { save: empty(config), valid: false, warning: '탐험 기록을 읽지 못했어요. 이번 탐험에서만 기록해요.' }; }
  if (raw === null || raw === undefined) return { save: empty(config), valid: true, warning: null };
  try { return normalizeDiscoveries(JSON.parse(raw), mapId); }
  catch { return { save: empty(config), valid: false, warning: '탐험 기록을 확인하지 못했어요. 원본 기록은 보존했어요.' }; }
}

export function recordDiscovery(save, id, mapId = 'river-meadow') {
  const config = discoveryConfig(mapId), normalized = normalizeDiscoveries(save, mapId);
  if (!normalized.valid || !config.ids.includes(id) || normalized.save.visitedIds.includes(id)) return normalized.save;
  return { ...normalized.save, visitedIds: config.ids.filter(item => normalized.save.visitedIds.includes(item) || item === id) };
}

export function mergeDiscoveries(left, right, mapId = 'river-meadow') {
  const config = discoveryConfig(mapId), a = normalizeDiscoveries(left, mapId), b = normalizeDiscoveries(right, mapId);
  if (!a.valid || !b.valid) return a.valid ? a.save : empty(config);
  const visited = new Set([...a.save.visitedIds, ...b.save.visitedIds]);
  return { version: 1, regionId: config.mapId, visitedIds: config.ids.filter(id => visited.has(id)) };
}

export function saveDiscoveries(save, storage, mapId = 'river-meadow') {
  const config = discoveryConfig(mapId), incoming = normalizeDiscoveries(save, mapId);
  if (!incoming.valid || !storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return false;
  try {
    const raw = storage.getItem(config.key);
    let existing = empty(config);
    if (raw !== null && raw !== undefined) {
      let parsed;
      try { parsed = JSON.parse(raw); } catch { return false; }
      const normalized = normalizeDiscoveries(parsed, mapId);
      if (!normalized.valid) return false;
      existing = normalized.save;
    }
    storage.setItem(config.key, JSON.stringify(mergeDiscoveries(existing, incoming.save, mapId)));
    return true;
  } catch { return false; }
}
