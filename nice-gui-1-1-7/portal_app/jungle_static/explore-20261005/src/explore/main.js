import { MAPS, getMap } from './region.js?v=maps-20261011e';
import { createWorld } from './world.js?v=maps-20261011f';
import { movePlayer } from './movement.js';
import { createInput } from './input.js?v=jungle-play-20261015';
import { createMinimap } from './minimap.js?v=birds-20261011';
import { createCamera } from './camera.js?v=progression-20261015';
import { createScene } from './scene.js?v=jungle-play-20261015';
import { createUI } from './ui.js?v=progression-20261015';
import { createExploreState, EXPLORE_SAVE_KEY, reduceExplore, getView, loadExploreSave, saveExploreSave } from './encounters.js?v=jungle-play-20261015';
import { createMapEncounterState, reduceMapEncounter, mapEncounterView, loadMapSave, saveMapSave, mapEncounterKey } from './map_encounters.js?v=jungle-play-20261015';
import { loadAvatarSelection, saveAvatarSelection } from './actor.js';
import { canRecordDiscovery, discoveryConfig, loadDiscoveries, mergeDiscoveries, recordDiscovery, saveDiscoveries } from './discoveries.js?v=maps-20261011e';
import { createFrameClock } from './frame_clock.js';
import { createFrameDiagnostics } from './frame_diagnostics.js';
import { classifyCanvasSize, isPrimaryCanvasTap, ownsCanvasTap } from './mobile_events.js';
import { BIRD_LEARNING_KEY, birdSessionVersion, buildBirdSession, canStartBirdSession, getBirdQuestion, getLearningBirds, loadBirdLearning, reduceBirdLearning, saveBirdLearning, setBirdDifficulty } from './bird_learning.js?v=learning-20261015';
import { LEARNING_BIRDS } from './bird_learning_content.js?v=learning-20261015';
import { addMapStamp, addPhotoId, deriveProgression, hasPersistedMapCompletion, isWithinBinocularRange, loadProgressionJournal, MAX_PHOTO_DISTANCE, mergeProgressionJournals, PROGRESSION_SAVE_KEY, saveProgressionJournal, selectPhotoCandidate } from './progression.js?v=progression-20261015';
import { Vector3 } from 'three';

const ROUTE_PARAMS = new URLSearchParams(location.search);
const MAP = getMap(ROUTE_PARAMS.get('map'));
const REGION = MAP.region;
const LEARNING_BIRDS_FOR_MAP = getLearningBirds(REGION);
const LEARNING_BIRD_BY_ID = new Map(LEARNING_BIRDS.map(bird => [bird.id, bird]));
const INITIAL_GUIDE_BIRD = LEARNING_BIRD_BY_ID.get(ROUTE_PARAMS.get('bird'))?.mapId === MAP.id ? ROUTE_PARAMS.get('bird') : null;
const DISCOVERY_MISSIONS = discoveryConfig(MAP.id).missions;
const DISCOVERY_KEY = discoveryConfig(MAP.id).key;
const MAP_ART = {
  'river-meadow': ['🌊', '#d9eee5'], camp: ['🏕️', '#e5efd1'], waterfall: ['💧', '#dcebf4'],
  cave: ['✨', '#e8e2f1'], 'giant-tree': ['🌳', '#e8edcf'], 'sky-ridge': ['⛰️', '#e5e9f1'],
};

const canvas = document.querySelector('#world');
const loading = document.querySelector('#loading');
const interact = document.querySelector('#interact');
const codex = document.querySelector('#codex-button');
const worldmapButton = document.querySelector('#worldmap-button');
const equipmentButton = document.querySelector('#equipment-button');
const guideButton = document.querySelector('#guide-button');
const discoveryCount = document.querySelector('#discovery-count');
const learningCount = document.querySelector('#learning-count');
const learningDifficulty = document.querySelector('#learning-difficulty');
const legacyCount = document.querySelector('#count');
const adventureCounts = document.querySelector('#adventure-counts');
const adventureTarget = document.querySelector('#adventure-target');
const soundToggle = document.querySelector('#sound-toggle');
const toast = document.querySelector('#toast');
const qa = document.querySelector('#qa');
const avatarSelect = document.querySelector('#avatar-select');
const mapSelect = document.querySelector('#map-select');
const avatarStatus = document.querySelector('#avatar-status');
const toolView = document.querySelector('#tool-view');
const toolViewStatus = document.querySelector('#tool-view-status');
const toolViewShutter = document.querySelector('#tool-view-shutter');
const toolViewClose = document.querySelector('#tool-view-close');
const qaEnabled = new URLSearchParams(location.search).get('qa') === '1';
let runtime;
try { runtime = boot(); }
catch (error) {
  console.error('Explore boot failed:', error);
  loading.hidden = false;
  loading.querySelector('h2').textContent = '숲을 열지 못했어요';
  loading.querySelector('p').textContent = '탐험을 시작하지 못했어요. 페이지를 새로고침해 주세요.';
  const reload = document.querySelector('#reload'); reload.hidden = false; reload.onclick = () => location.reload();
}

function boot() {
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  const loadedAvatar = loadAvatarSelection(storage);
  const world = createWorld(REGION);
  const requestedQuality = new URLSearchParams(location.search).get('quality') || document.documentElement.dataset.renderQuality || 'standard';
  const renderProfile = requestedQuality === 'tablet' ? 'tablet' : 'standard';
  const presentation = createScene(canvas, world, { quality: renderProfile });
  presentation.actor.setCharacter(loadedAvatar.characterId);
  avatarSelect.value = loadedAvatar.characterId;
  let gpu = null;
  if(qaEnabled) {
    const gl=presentation.renderer.getContext(), debug=gl.getExtension('WEBGL_debug_renderer_info');
    gpu={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
  }
  const camera = createCamera();
  let position = { ...REGION.spawn }, velocity = { x: 0, z: 0 };
  const minimap = createMinimap(document.querySelector('#minimap'), REGION, LEARNING_BIRDS_FOR_MAP);
  let groundY = world.sampleSurface(position.x, position.z).height;
  let destination = null, destinationPointerId = null, disposed = false, contextLost = false;
  let canvasSize = null;
  let previousTime = null, elapsed = 0, rafId;
  const frameClock = createFrameClock();
  const frameDiagnostics = qaEnabled ? createFrameDiagnostics() : null;
  let messageUntil = 0;
  let hudFocusGuard = false;
  const legacyMap = MAP.id === 'river-meadow';
  const loadEncounter = () => legacyMap ? loadExploreSave(storage) : loadMapSave(storage, MAP);
  const saveEncounter = (save, expectedActiveQuiz = null) => legacyMap ? saveExploreSave(save, storage, expectedActiveQuiz) : saveMapSave(save, storage, MAP, expectedActiveQuiz);
  const reduceEncounter = (current, action, now) => {
    const selected = action.type === 'OBSERVE_CONFIRM' ? { ...action, difficulty: learningSave.difficulty } : action;
    return legacyMap ? reduceExplore(current, selected, { now }) : reduceMapEncounter(current, selected, now, MAP);
  };
  const encounterView = current => legacyMap ? getView(current) : mapEncounterView(current, MAP);
  const loaded = loadEncounter();
  const loadedDiscoveries = loadDiscoveries(storage, MAP.id);
  const loadedLearning = loadBirdLearning(storage);
  const loadedProgression = loadProgressionJournal(storage);
  let discoverySave = loadedDiscoveries.save;
  let learningSave = loadedLearning.save;
  let progressionJournal = loadedProgression.save;
  let progression = null;
  let selectedTargetId = null;
  let guideOpen = false;
  let discoveryPanel = null;
  let learningPanel = null;
  let mapPanel = false, equipmentPanel = null, toolMode = null, binocularTargetId = null, photoCandidate = null;
  let previousToolFocus = null, previousToolHudInert = false, toolWarningShown = false;
  let codexTab = 'birds';
  let selectedLearningBirdId = INITIAL_GUIDE_BIRD;
  let companionOpen = !!document.querySelector('#eduni-companion-panel')?.classList.contains('open');
  let state = legacyMap ? createExploreState(loaded.save) : createMapEncounterState(loaded.save, MAP);
  const ui = createUI(dispatch);
  const input = createInput({ stick: document.querySelector('#stick'), interact,
    onInteract: modal => {
      if (companionOpen) return;
      if (modal === true) document.activeElement?.closest?.('#panel-actions button')?.click();
      else dispatch({type:'INTERACT'});
    },
    onClose: () => { if (!companionOpen && !document.querySelector('#panel').hidden) dispatch({type:'CLOSE'}); },
    onNavigate: direction => {
      if (companionOpen) return;
      const buttons = [...document.querySelectorAll('#panel-actions button:not(:disabled)')];
      if (!buttons.length || document.querySelector('#panel').hidden) return;
      const index = buttons.indexOf(document.activeElement);
      buttons[Math.max(0, Math.min(buttons.length - 1, index < 0 ? (direction > 0 ? 0 : buttons.length - 1) : index + direction))].focus();
    },
    onCodex: () => { if (!companionOpen) dispatch({type:'OPEN_CODEX'}); } });
  function notify(text) { toast.textContent = text; messageUntil = performance.now() + 4500; }
  function recordBoundary(reason) {
    if (frameDiagnostics) frameDiagnostics.boundary(reason, performance.now(), { focused: document.hasFocus(), visibility: document.visibilityState });
  }
  const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  const setDisabled = (element, value) => { if (element.disabled !== value) element.disabled = value; };
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  let audioContext = null, muted = false;
  const activeAudioNodes = new Set();
  function stopCues() {
    for (const node of activeAudioNodes) { try { node.oscillator.stop(); } catch {} try { node.oscillator.disconnect(); node.gain.disconnect(); } catch {} }
    activeAudioNodes.clear();
  }
  function playCue(kind) {
    if (muted || !AudioContextCtor) return;
    try {
      audioContext ||= new AudioContextCtor();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      const now = audioContext.currentTime, notes = kind === 'collection' ? [660, 880] : kind === 'correct' ? [587, 740] : [440, 554];
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(notes[0], now);
      if (notes[1]) oscillator.frequency.setValueAtTime(notes[1], now + .07);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.055, now + .025); gain.gain.exponentialRampToValueAtTime(.0001, now + .2);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      const node = { oscillator, gain }; activeAudioNodes.add(node);
      oscillator.onended = () => { activeAudioNodes.delete(node); try { oscillator.disconnect(); gain.disconnect(); } catch {} };
      oscillator.start(now); oscillator.stop(now + .22);
    } catch { /* sound is optional on unsupported or restricted devices */ }
  }
  const characterLabels = { human: '사람형(임시)', rabbit: '토끼형(후보)' };
  function clearAvatarInteraction() {
    input.clear(); destination = null; destinationPointerId = null; presentation.setDestination(null); velocity = {x:0,z:0};
  }
  function updateAvatarStatus() {
    avatarSelect.value = presentation.actor.selectedCharacterId;
    avatarStatus.textContent = `현재 표시: ${characterLabels[presentation.actor.effectiveCharacterId]}`;
  }
  const isExploring = () => state.mode === 'exploring' && !guideOpen && !discoveryPanel && !learningPanel && !mapPanel && !equipmentPanel && !toolMode && !companionOpen;
  const syncAvatarControl = () => { setDisabled(avatarSelect, !isExploring()); setDisabled(mapSelect, !isExploring()); };
  const onAvatarFocus = () => { if (isExploring()) clearAvatarInteraction(); };
  function onAvatarChange() {
    hudFocusGuard = false; input.releaseGamepad();
    if (!isExploring()) return;
    const characterId = avatarSelect.value;
    if (!presentation.actor.setCharacter(characterId)) { updateAvatarStatus(); return; }
    clearAvatarInteraction();
    if (!saveAvatarSelection(characterId, storage)) notify('탐험가 선택을 저장하지 못해 이 화면에서만 유지돼요');
    updateAvatarStatus();
  }
  mapSelect.value = MAP.id;
  function onMapChange() {
    hudFocusGuard = false; input.releaseGamepad();
    if (!isExploring() || !MAPS[mapSelect.value]) { mapSelect.value=MAP.id; return; }
    const url=new URL(location.href); url.searchParams.set('map',mapSelect.value); location.assign(url.href);
  }
  avatarSelect.addEventListener('focus', onAvatarFocus);
  avatarSelect.addEventListener('change', onAvatarChange);
  mapSelect.addEventListener('focus', onAvatarFocus);
  mapSelect.addEventListener('change', onMapChange);
  const hudDetails = [...document.querySelectorAll('.hud details')];
  const updateHudDetailState = () => document.body.classList.toggle('hud-detail-open', hudDetails.some(details => details.open));
  hudDetails.forEach(details => details.addEventListener('toggle', updateHudDetailState));
  updateHudDetailState();
  document.title = `${MAP.title} — 초록빛 탐험`;
  document.querySelector('#game').setAttribute('aria-label', MAP.title.endsWith('탐험') ? MAP.title : `${MAP.title} 탐험`);
  canvas.setAttribute('aria-label', `${MAP.title}. 방향키나 조이스틱으로 이동하세요`);
  document.querySelector('#minimap').setAttribute('aria-label', `탐험 지도: ${MAP.title}, 파란 점은 현재 위치, 갈색 선은 길, 노란 점은 발견 장소, 주황 점은 새`);
  codex.firstChild.textContent = '📖 도감 ';
  document.querySelector('#map-title').textContent = MAP.title;
  document.querySelector('#objective').textContent = MAP.objective;
  updateAvatarStatus(); syncAvatarControl();
  presentation.actor.readyPromise.then(() => {
    if (disposed) return;
    updateAvatarStatus();
    if (presentation.actor.selectedCharacterId === 'rabbit' && presentation.actor.effectiveCharacterId === 'human') {
      notify('토끼형(후보)을 불러오지 못해 사람형(임시)을 표시해요');
    }
  });
  const isNear = () => Math.hypot(position.x-REGION.bird.x,position.z-REGION.bird.z) <= REGION.bird.radius;
  const animalCaptured = () => legacyMap ? !!state.save.captured[REGION.bird.id]?.captured : !!state.save.captured;
  const discoveryComplete = () => discoverySave.visitedIds.length === DISCOVERY_MISSIONS.length;
  const mapComplete = () => discoveryComplete() && animalCaptured();
  const animalRecordCount = () => legacyMap ? Object.keys(state.save.captured).length : Number(state.save.captured);
  const nextMapId = () => { const ids=Object.keys(MAPS); return ids[ids.indexOf(MAP.id)+1] || null; };
  function readMapProgress() {
    return Object.values(MAPS).map(map => {
      const current = map.id === MAP.id;
      const discoveries = current ? discoverySave : loadDiscoveries(storage, map.id).save;
      const saved = current ? state.save : map.id === 'river-meadow' ? loadExploreSave(storage).save : loadMapSave(storage, map).save;
      const captured = map.id === 'river-meadow' ? !!saved.captured?.[map.region.bird.id]?.captured : !!saved.captured;
      const discoveryCount = discoveries.visitedIds.length;
      return { id: map.id, title: map.title, animalName: map.animal.name, discoveryCount,
        discoveryTotal: discoveryConfig(map.id).ids.length, animalCaptured: captured,
        complete: discoveryCount === discoveryConfig(map.id).ids.length && captured,
        visited: discoveryCount > 0 || captured || !!saved.activeQuiz || (saved.bestScore || 0) > 0, current };
    });
  }
  function refreshProgression() {
    progression = deriveProgression(readMapProgress(), progressionJournal);
    return progression;
  }
  function persistToolJournal(next) {
    const result = saveProgressionJournal(next, storage);
    progressionJournal = result.save;
    if (!result.saved && result.warning && !toolWarningShown) { notify(result.warning); toolWarningShown = true; }
    refreshProgression();
    return result.saved;
  }
  function hasStoredCompletion() {
    const discoveries = loadDiscoveries(storage, MAP.id);
    const saved = loadEncounter();
    const animal = MAP.id === 'river-meadow' ? !!saved.save.captured?.[MAP.region.bird.id]?.captured : !!saved.save.captured;
    return hasPersistedMapCompletion(MAP.id, { valid: discoveries.valid && !saved.warning,
      visitedCount: discoveries.save.visitedIds.length, discoveryTotal: DISCOVERY_MISSIONS.length, animalCaptured: animal });
  }
  function awardMapStamp() {
    if (!mapComplete() || !hasStoredCompletion() || progressionJournal.mapStamps.includes(MAP.id)) return;
    persistToolJournal(addMapStamp(progressionJournal, MAP.id));
    feedbackAt('collection', REGION.bird, { fallbackIfFar: true });
  }
  const missionById = new Map(DISCOVERY_MISSIONS.map((mission) => [mission.id, mission]));
  function nearestEncounter() {
    return [
      { kind: 'bird', id: REGION.bird.id, name: REGION.bird.name, x: REGION.bird.x, z: REGION.bird.z, radius: REGION.bird.radius, order: 0 },
      ...LEARNING_BIRDS_FOR_MAP.map(bird => ({ kind: 'learning-bird', ...bird })),
      ...DISCOVERY_MISSIONS.map((mission, index) => {
        const landmark = REGION.landmarks[mission.id];
        return { kind: 'landmark', id: mission.id, name: landmark.name, x: landmark.x, z: landmark.z, radius: landmark.radius, order: index + 1 };
      }),
    ].map((item) => ({ ...item, distance: Math.hypot(position.x - item.x, position.z - item.z) }))
      .filter((item) => item.distance <= item.radius)
      .sort((a, b) => a.distance - b.distance || a.order - b.order)[0] || null;
  }
  function targetDirection(id) {
    const target = REGION.landmarks[id] || LEARNING_BIRDS_FOR_MAP.find(bird => bird.id === id) || (REGION.bird.id === id ? REGION.bird : null);
    if (!target) return { distance: Infinity, direction: '찾을 수 없어요' };
    const dx = target.x - position.x, dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .05) return { distance, direction: '여기에 있어요' };
    const screenRight = dx * camera.basis.right.x + dz * camera.basis.right.z;
    const screenUp = dx * camera.basis.forward.x + dz * camera.basis.forward.z;
    const directions = ['화면 위', '화면 오른쪽 위', '화면 오른쪽', '화면 오른쪽 아래', '화면 아래', '화면 왼쪽 아래', '화면 왼쪽', '화면 왼쪽 위'];
    const index = (Math.round(Math.atan2(screenRight, screenUp) / (Math.PI / 4)) + 8) % 8;
    return { distance, direction: directions[index] };
  }
  const collectedBirdCount = () => Object.values(learningSave.collected).filter(item => item.observedCount > 0).length;
  const collectedLocalBirdCount = () => LEARNING_BIRDS_FOR_MAP.filter(bird => learningSave.collected[bird.id]?.observedCount > 0).length;
  function nextAdventureTarget() {
    return [
      ...DISCOVERY_MISSIONS.filter(mission => !discoverySave.visitedIds.includes(mission.id)).map(mission => ({ ...REGION.landmarks[mission.id], kind: 'landmark' })),
      ...(!animalCaptured() ? [{ ...REGION.bird, kind: 'bird' }] : []),
      ...LEARNING_BIRDS_FOR_MAP.filter(bird => !learningSave.collected[bird.id]?.observedCount).map(bird => ({ ...bird, kind: 'learning-bird' })),
    ].map(target => ({ ...target, distance: Math.hypot(position.x - target.x, position.z - target.z) }))
      .sort((a, b) => a.distance - b.distance || (a.order || 0) - (b.order || 0))[0] || null;
  }
  function learningPanelView() {
    if (!learningPanel) return null;
    const session = learningSave.activeSession;
    if (learningPanel.kind === 'collection') {
      const tab = learningPanel.tab || codexTab;
      const tabs = [{ label: '새', selected: tab === 'birds', action: { type: 'CODEX_TAB', tab: 'birds' } },
        { label: '동물', selected: tab === 'animals', action: { type: 'CODEX_TAB', tab: 'animals' } }];
      const cards = tab === 'birds' ? LEARNING_BIRDS.map(bird => {
        const record = learningSave.collected[bird.id], seen = !!record?.observedCount, photo = progression.photoIds.includes(bird.id);
        const status = [seen ? `관찰 ${record.observedCount}회` : photo ? '사진 기록 · 학습 전' : `미관찰 · ${MAPS[bird.mapId].title}`, photo ? '게임 사진 기록' : null].filter(Boolean).join(' · ');
        return { icon: bird.icon, title: bird.name, detail: status,
          silhouette: !seen && !photo, tint: `#${bird.color.toString(16).padStart(6, '0')}33`, action: { type: 'CODEX_BIRD_SELECT', id: bird.id } };
      }) : Object.values(MAPS).map(map => {
        const item = progression.maps.find(entry => entry.id === map.id);
        return { icon: map.animal.icon, title: map.animal.name, detail: `${map.title} · ${item.animalCaptured ? '관찰 기록 있음' : '아직 미관찰'}`,
          tint: MAP_ART[map.id][1], action: { type: 'CODEX_ANIMAL_SELECT', mapId: map.id } };
      });
      const animalCount = progression.maps.filter(item => item.animalCaptured).length;
      return { title: tab === 'birds' ? '새 도감' : '동물 도감', icon: '📖', tabs, cards,
        kicker: tab === 'birds' ? `${collectedBirdCount()} / ${LEARNING_BIRDS.length}종 관찰 · 게임 사진 ${progression.photoIds.length}종` : `${animalCount} / ${progression.maps.length}종 관찰 기록`,
        body: tab === 'birds' ? `난이도: ${learningSave.difficulty === 'easy' ? '7세 준비' : '초1 도전'} · 배운 내용은 언제든 다시 풀어볼 수 있어요.` : '각 지역의 대표 동물 기록과 진행 중인 관찰 문제를 살펴봐요.',
        actions: [...(session ? [{ label: `${LEARNING_BIRD_BY_ID.get(session.birdId).name} 문제 이어하기`, action: { type: 'LEARN_RESUME', sessionId: session.id, primary: true } }] : []),
          { label: '닫기', action: { type: 'CLOSE' } }] };
    }
    if (learningPanel.kind === 'bird-detail') {
      const bird = LEARNING_BIRD_BY_ID.get(learningPanel.birdId), record = learningSave.collected[bird.id];
      const photo = progression.photoIds.includes(bird.id), localBird = LEARNING_BIRDS_FOR_MAP.find(item => item.id === bird.id);
      const nearby = localBird && Math.hypot(position.x - localBird.x, position.z - localBird.z) <= localBird.radius;
      const actions = session?.birdId === bird.id ? [{ label: '진행 중인 문제 이어하기', action: { type: 'LEARN_RESUME', sessionId: session.id }, primary: true }]
        : record?.observedCount ? [{ label: '도감 복습', action: { type: 'LEARN_SPECIES', id: bird.id, review: true }, primary: true }]
          : nearby ? [{ label: '관찰 문제 시작', action: { type: 'CODEX_BIRD_START', id: bird.id }, primary: true }]
            : [{ label: '사는 지도에서 찾기', action: { type: 'CODEX_BIRD_FIND', id: bird.id }, primary: true }];
      return { title: bird.name, icon: bird.icon, kicker: `${MAPS[bird.mapId].title} · ${record?.observedCount ? `관찰 ${record.observedCount}회` : '아직 관찰 전'}`,
        body: `${bird.description}\n\n${photo ? '게임 사진 기록이 있어요. 종 이름만 저장돼요.' : '게임 사진 기록은 아직 없어요.'}`,
        tabs: [{ label: '새', selected: true, action: { type: 'CODEX_TAB', tab: 'birds' } }, { label: '동물', action: { type: 'CODEX_TAB', tab: 'animals' } }],
        actions: [...actions, { label: '새 목록', action: { type: 'CODEX_BACK' } }] };
    }
    if (learningPanel.kind === 'animal-detail') {
      const map = MAPS[learningPanel.mapId], item = progression.maps.find(entry => entry.id === map.id);
      const local = map.id === MAP.id, activeQuiz = local ? state.save.activeQuiz : (map.id === 'river-meadow' ? loadExploreSave(storage).save.activeQuiz : loadMapSave(storage, map).save.activeQuiz);
      const nearby = local && isNear();
      const actions = activeQuiz && local ? [{ label: '진행 중인 문제 이어하기', action: { type: 'CODEX_ANIMAL_RESUME' }, primary: true }]
        : !item.animalCaptured && nearby ? [{ label: '동물 관찰하기', action: { type: 'CODEX_ANIMAL_OBSERVE' }, primary: true }]
          : [{ label: local ? '동물에게 다가가기' : '이 동물의 지도 열기', action: { type: 'SELECT_MAP', mapId: map.id }, primary: true }];
      return { title: map.animal.name, icon: map.animal.icon, kicker: `${map.title} · ${item.animalCaptured ? '관찰 기록 완료' : '아직 관찰 전'}`,
        body: `${map.animal.description}\n\n${item.animalCaptured ? `최고 점수 ${local ? state.save.bestScore : (map.id === 'river-meadow' ? loadExploreSave(storage).save.bestScore : loadMapSave(storage, map).save.bestScore)} / 3` : '가까이 다가가 관찰 문제를 풀면 기록돼요.'}`,
        tabs: [{ label: '새', action: { type: 'CODEX_TAB', tab: 'birds' } }, { label: '동물', selected: true, action: { type: 'CODEX_TAB', tab: 'animals' } }],
        actions: [...actions, { label: '동물 목록', action: { type: 'CODEX_BACK' } }] };
    }
    if (learningPanel.kind === 'intro') {
      const bird = LEARNING_BIRD_BY_ID.get(learningPanel.birdId);
      return { title: bird.name, body: learningPanel.review ? '세 문제를 다시 풀어 볼까요?' : '세 문제를 풀고 새를 도감에 담아요!',
        icon: bird.icon, kicker: learningPanel.review ? '도감 복습' : '새 관찰', actions: [
          { label: learningPanel.review ? '복습 시작' : '학습 문제 풀기', action: { type: 'LEARN_START', birdId: bird.id, review: learningPanel.review }, primary: true },
          { label: '나중에', action: { type: 'CLOSE' } },
        ] };
    }
    if (learningPanel.kind === 'session-blocked' && session) {
      const bird = LEARNING_BIRD_BY_ID.get(session.birdId);
      return { title: '이어 할 문제가 있어요', body: `${bird.name} 문제 ${session.index + 1} / 3을 풀고 있어요. ${MAPS[session.mapId].title}에서 시작한 기록이에요. 이 기록을 이어서 풀거나 나중에 계속할 수 있어요.`,
        icon: bird.icon, kicker: '진행 중인 문제는 그대로 저장돼요', actions: [
          { label: `${bird.name} 문제 이어하기`, action: { type: 'LEARN_RESUME', sessionId: session.id }, primary: true },
          { label: '나중에', action: { type: 'CLOSE' } },
        ] };
    }
    if (learningPanel.kind === 'session' && session) {
      const bird = LEARNING_BIRD_BY_ID.get(session.birdId);
      if (session.status === 'complete') {
        const firstCorrect = session.firstTry.filter(Boolean).length;
        return { title: `${bird.name} 관찰 기록`, body: `${bird.name}의 세 문제를 마쳤어요.${session.review ? '\n복습 기록을 남겼어요.' : '\n도감에 관찰 기록을 추가했어요.'}\n처음 답에서 맞힌 문제 ${firstCorrect}개 · 다시 시도한 문제 ${3 - firstCorrect}개`,
          icon: '📗', kicker: '점수나 등급은 매기지 않아요', actions: [
            { label: '도감 보기', action: { type: 'LEARN_DONE', sessionId: session.id, questionId: session.questionIds[session.index], index: session.index } },
          ] };
      }
      const question = getBirdQuestion(session.questionIds[session.index]);
      const isObservation = question.subject === '관찰';
      if (session.status === 'feedback') {
        const selected = question.choices.find(choice => choice.id === session.lastChoiceId);
        const correct = question.answerId === session.lastChoiceId;
        return { title: correct ? '잘 풀었어요!' : '괜찮아요, 다시 해봐요', body: `${selected?.text || ''}\n\n${correct ? '맞았어요!' : '이번에는 다른 답을 골랐어요. 힌트를 보고 다시 도전해요.'}\n${question.explanation}${correct ? '' : `\n힌트: ${question.hint}`}`,
          icon: correct ? '✨' : '🌱', kicker: `${bird.name} · ${session.index + 1} / 3`, companionContext: { activity: 'jungle', question: question.prompt,
            choices: session.choiceOrder[session.index].map(id => question.choices.find(choice => choice.id === id).text), selected: selected?.text || '' }, actions: [
            { label: correct ? session.index === 2 ? '마치기' : '다음 문제' : '다시 풀기', action: { type: correct ? 'LEARN_CONTINUE' : 'LEARN_RETRY', sessionId: session.id, questionId: question.id, index: session.index }, primary: true },
          ] };
      }
      return { question: true, title: isObservation ? `${bird.name} 관찰` : `${question.subject === '수학' ? '산수' : question.subject} 도전`, body: `${question.prompt}${session.hintShown ? `\n\n힌트: ${question.hint}` : ''}`,
        icon: bird.icon, kicker: `${session.difficulty === 'easy' ? '7세 준비' : '초1 도전'} · ${isObservation ? '새 관찰' : question.subject} · ${session.index + 1} / 3 · ${MAPS[session.mapId].title}`,
        companionContext: { activity: 'jungle', question: question.prompt, choices: session.choiceOrder[session.index].map(id => question.choices.find(choice => choice.id === id).text), selected: '' }, actions: [
          ...session.choiceOrder[session.index].map(id => ({ label: question.choices.find(choice => choice.id === id).text,
            action: { type: 'LEARN_ANSWER', sessionId: session.id, questionId: question.id, index: session.index, choiceId: id } })),
          ...(!session.hintShown ? [{ label: '힌트 보기', action: { type: 'LEARN_HINT', sessionId: session.id, questionId: question.id, index: session.index } }] : []),
        ] };
    }
    return null;
  }
  function activePanelView() {
    if (mapPanel) {
      const cards = progression.maps.map(item => {
        const map = MAPS[item.id], [icon, tint] = MAP_ART[item.id];
        const status = item.complete ? '탐험 완료 · 도장 기록' : item.current ? '지금 탐험 중' : item.id === progression.recommendedMapId ? '다음 추천' : item.visited ? '다시 둘러보기' : '자유롭게 선택 가능';
        return { icon, title: map.title, detail: `${status} · 발견 ${item.discoveryCount}/${item.discoveryTotal} · 동물 ${item.animalCaptured ? '관찰' : '미관찰'}`,
          selected: item.current, tint, action: { type: 'SELECT_MAP', mapId: item.id } };
      });
      return { title: '숲 지도', icon: '🗺️', kicker: `${progression.mapStamps.length} / ${progression.maps.length} 지역 도장`,
        body: `모든 지역을 자유롭게 둘러볼 수 있어요. 다음 추천: ${MAPS[progression.recommendedMapId]?.title || '모든 지역 탐험 완료'}${progression.mapStamps.length ? `\n도장: ${progression.mapStamps.map(id => MAPS[id].title).join(' · ')}` : ''}`,
        cards, actions: [{ label: '닫기', action: { type: 'CLOSE' } }] };
    }
    if (equipmentPanel) {
      const localBirds = LEARNING_BIRDS_FOR_MAP.map(bird => {
        const info = targetDirection(bird.id), seen = !!learningSave.collected[bird.id]?.observedCount;
        return { icon: bird.icon, title: bird.name, detail: `${info.direction} · ${info.distance.toFixed(1)}m · ${seen ? '관찰 기록 있음' : '관찰 전'}`,
          tint: `#${bird.color.toString(16).padStart(6, '0')}33`, action: { type: 'BINOCULAR_TARGET', id: bird.id } };
      });
      return { title: '탐험 도구', icon: '🎒', kicker: `쌍안경 ${progression.binocularsOwned ? '사용 가능' : '발견 기록 후 사용'} · 카메라 ${progression.cameraOwned ? '사용 가능' : '동물 관찰 기록 후 사용'}`,
        body: '쌍안경은 현재 지역의 새를 가까이 살펴보고 방향을 안내해요. 게임 사진 기록은 중앙에 보이는 가까운 새의 종 이름만 저장해요. 실제 사진이나 업로드는 없어요.',
        tabs: [{ label: '도구', selected: true, action: { type: 'EQUIPMENT_TAB' } }, { label: '지역 도장', action: { type: 'EQUIPMENT_STAMPS' } }],
        cards: equipmentPanel === 'stamps' ? progression.maps.map(item => ({ icon: MAP_ART[item.id][0], title: MAPS[item.id].title,
          detail: item.stamped ? '완료 도장 있음' : '아직 완료 전', tint: MAP_ART[item.id][1], action: { type: 'SELECT_MAP', mapId: item.id } })) : [
          { icon: '🔭', title: '쌍안경', detail: progression.binocularsOwned ? '지역의 새를 선택해 자세히 살펴보기' : '어느 지역에서든 발견을 기록하면 사용할 수 있어요', tint: '#e2efd3', action: { type: 'EQUIPMENT_BINOCULARS' } },
          { icon: '📸', title: '게임 카메라', detail: progression.cameraOwned ? `종 이름 기록 ${progression.photoIds.length}종 · ${MAX_PHOTO_DISTANCE}m 안쪽` : '어느 지역에서든 대표 동물을 관찰하면 사용할 수 있어요', tint: '#e3edf3', action: { type: 'EQUIPMENT_CAMERA' } },
          ...localBirds,
        ], actions: [{ label: '닫기', action: { type: 'CLOSE' } }] };
    }
    if (learningPanel) return learningPanelView();
    if (discoveryPanel) {
      const mission = missionById.get(discoveryPanel.id);
      const landmark = REGION.landmarks[mission.id];
      if (discoveryPanel.kind === 'question') return {
        title: landmark.name,
        body: mission.prompt,
        icon: MAP.id === 'river-meadow' ? (mission.id === 'fernGrove' ? '🌿' : mission.id === 'riverTracks' ? '🐾' : '🧭') : MAP.animal.icon,
        kicker: '주변을 살펴보고 골라요',
        companionContext: { activity: 'jungle', question: mission.prompt, choices: mission.choices.map(choice => choice.text), selected: '' },
        actions: mission.choices.map((choice) => ({ label: choice.text, action: { type: 'DISCOVERY_ANSWER', id: mission.id, choiceId: choice.id } })),
      };
      const choice = mission.choices.find((item) => item.id === discoveryPanel.choiceId);
      const correct = choice?.id === mission.answerId;
      const alreadyVisited = discoverySave.visitedIds.includes(mission.id);
      return {
        title: correct ? '잘 살펴봤어요!' : '함께 다시 살펴봐요',
        body: `${choice?.text || ''}\n\n${mission.explanation}${alreadyVisited ? '\n\n이 장소는 이미 기록했어요.' : ''}`,
        icon: correct ? '✨' : '🌱',
        kicker: '관찰 결과',
        companionContext: { activity: 'jungle', question: mission.prompt, choices: mission.choices.map(item => item.text), selected: choice?.text || '' },
        actions: !canRecordDiscovery(MAP.id, mission, discoveryPanel.choiceId, discoverySave)
          ? [{ label: '다시 살펴보기', action: { type: 'DISCOVERY_RETRY', id: mission.id }, primary: true }]
          : [{ label: alreadyVisited ? '기록 확인하고 돌아가기' : '발견 기록하기', action: { type: 'DISCOVERY_RECORD', id: mission.id }, primary: true }],
      };
    }
    if (guideOpen) {
      const discovered = discoverySave.visitedIds;
      const rows = DISCOVERY_MISSIONS.map((mission) => {
        const landmark = REGION.landmarks[mission.id];
        const info = targetDirection(mission.id);
        return `${discovered.includes(mission.id) ? '✓' : '○'} ${landmark.name} · ${discovered.includes(mission.id) ? '기록 완료' : '아직 미발견'}\n   ${info.distance.toFixed(1)}m · ${info.direction}`;
      });
      const birdRows = LEARNING_BIRDS_FOR_MAP.map(bird => {
        const info = targetDirection(bird.id), seen = !!learningSave.collected[bird.id]?.observedCount;
        return `${seen ? '✓' : '○'} ${bird.name} · ${seen ? '도감 기록' : '새 관찰'}\n   ${info.distance.toFixed(1)}m · ${info.direction}`;
      });
      const selectedId = selectedTargetId || selectedLearningBirdId;
      const selected = selectedId ? REGION.landmarks[selectedId]?.name || LEARNING_BIRD_BY_ID.get(selectedId)?.name : null;
      return {
        title: '탐험 안내와 기록',
        body: `${discovered.length} / ${DISCOVERY_MISSIONS.length}곳 발견 · ${animalCaptured() ? `${MAP.animal.name} 관찰 완료` : `${MAP.animal.name} 미관찰`} · 새 ${LEARNING_BIRDS_FOR_MAP.filter(bird => learningSave.collected[bird.id]?.observedCount).length} / 2종 관찰${mapComplete() ? `\n\n탐험 완료! ${nextMapId() ? '다음 지도로 가거나 ' : ''}이 지도를 다시 둘러볼 수 있어요.` : ''}${selected ? `\n안내 중: ${selected}` : '\n안내할 장소를 골라요.'}\n길을 따라가세요. 안내는 방향만 보여줘요.\n\n${rows.join('\n\n')}\n\n${birdRows.join('\n\n')}`,
        icon: '🧭',
        kicker: '방향과 거리는 화면 기준이에요',
        actions: [
          ...DISCOVERY_MISSIONS.map((mission) => ({
            label: `${REGION.landmarks[mission.id].name}${selectedTargetId === mission.id ? ' · 안내 중' : ' 안내'}`,
            action: { type: 'GUIDE_TARGET', id: mission.id },
          })),
          ...LEARNING_BIRDS_FOR_MAP.map(bird => ({ label: `${bird.name}${selectedLearningBirdId === bird.id ? ' · 안내 중' : ' 안내'}`, action: { type: 'GUIDE_BIRD', id: bird.id } })),
          ...(selectedTargetId ? [{ label: '안내 해제', action: { type: 'GUIDE_CLEAR' } }] : []),
          ...(selectedLearningBirdId ? [{ label: '새 안내 해제', action: { type: 'GUIDE_BIRD_CLEAR' } }] : []),
          ...(mapComplete() ? [{ label: '다시 둘러보기', action: { type: 'REVISIT_MAP' } }, ...(nextMapId() ? [{ label: '다음 지도', action: { type: 'NEXT_MAP' }, primary: true }] : [])] : []),
          { label: '닫기', action: { type: 'CLOSE' }, primary: true },
        ],
      };
    }
    const view=encounterView(state);
    if (mapComplete() && state.mode==='result' && view) return {...view,title:'탐험 완료!',body:`${view.body}\n\n세 장소와 ${MAP.animal.name} 관찰을 모두 기록했어요.`,actions:[...view.actions,...(nextMapId()?[{label:'다음 지도',action:{type:'NEXT_MAP'},primary:true}]:[]),{label:'이 지도 다시 둘러보기',action:{type:'REVISIT_MAP'}}]};
    return view;
  }
  function feedbackAt(kind, target, { fallbackIfFar = false } = {}) {
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return;
    let x = target.x, z = target.z;
    if (fallbackIfFar) {
      const targetSurface = world.sampleSurface(x, z);
      const projected = new Vector3(x, targetSurface?.height || 0, z).project(camera.camera);
      const onScreen = Math.abs(projected.x) <= .9 && Math.abs(projected.y) <= .9 && projected.z >= -1 && projected.z <= 1;
      if (!onScreen || Math.hypot(position.x - x, position.z - z) > 12) { x = position.x; z = position.z; }
    }
    const surface = world.sampleSurface(x, z);
    presentation.emitFeedback?.(kind, x, surface?.height || 0, z);
    playCue(kind);
  }
  function samplePhotoCandidate() {
    const samples = presentation.learningBirds.map(({ data, group }) => {
      const projected = group.position.clone().project(camera.camera);
      return { id: data.id, x: projected.x, y: projected.y, z: projected.z,
        distance: Math.hypot(position.x - data.x, position.z - data.z) };
    });
    return selectPhotoCandidate(samples, MAP.id, MAX_PHOTO_DISTANCE);
  }
  function updateToolView() {
    if (toolMode !== 'camera') return;
    photoCandidate = samplePhotoCandidate();
    const bird = photoCandidate && LEARNING_BIRD_BY_ID.get(photoCandidate.id);
    setText(toolViewStatus, bird
      ? `${bird.name} · ${photoCandidate.distance.toFixed(1)}m · 중앙에 보여요. 종 이름만 게임 기록에 남겨요.`
      : `새를 눌러 구도를 맞춘 뒤 사진 기록을 눌러요. 현재 지역의 ${MAX_PHOTO_DISTANCE}m 안쪽 새만 가능해요.`);
    toolViewShutter.disabled = !bird;
    toolViewShutter.hidden = !progression.cameraOwned;
  }
  function showToolView(mode) {
    toolMode = mode;
    toolView.hidden = false;
    toolView.dataset.mode = mode;
    toolView.setAttribute('aria-label', mode === 'camera' ? '게임 카메라 화면' : '쌍안경 관찰 화면');
    previousToolHudInert = hud.inert;
    hud.inert = true;
    document.body.classList.add('tool-mode');
    pause(mode === 'camera' ? 'camera-open' : 'binoculars-open');
    syncHud(); updateToolView();
    toolViewClose.focus({ preventScroll: true });
  }
  function openCamera() {
    refreshProgression();
    if (!progression.cameraOwned) { notify('어느 지역에서든 대표 동물을 관찰하면 카메라를 사용할 수 있어요'); return; }
    learningPanel = null; discoveryPanel = null; guideOpen = false; mapPanel = false; equipmentPanel = null;
    previousToolFocus = document.activeElement;
    camera.clearFocus(); renderPanel(); showToolView('camera');
  }
  function openBinoculars(birdId) {
    refreshProgression();
    const bird = LEARNING_BIRDS_FOR_MAP.find(item => item.id === birdId);
    if (!progression.binocularsOwned) { notify('어느 지역에서든 발견을 기록하면 쌍안경을 사용할 수 있어요'); return; }
    if (!bird) { notify('쌍안경은 현재 지역의 새를 안내해요'); return; }
    const distance = Math.hypot(position.x - bird.x, position.z - bird.z);
    if (!isWithinBinocularRange(distance)) { selectedLearningBirdId = bird.id; notify(`${bird.name} · ${targetDirection(bird.id).direction} · ${distance.toFixed(1)}m. 가까이 가면 자세히 볼 수 있어요.`); renderPanel(); return; }
    const target = presentation.learningBirds.find(item => item.data.id === bird.id)?.group.position;
    if (!target || !camera.setFocus(target, 2.4)) { notify('새를 자세히 보여줄 수 없어요. 다시 시도해 주세요'); return; }
    learningPanel = null; discoveryPanel = null; guideOpen = false; mapPanel = false; equipmentPanel = null;
    binocularTargetId = bird.id; previousToolFocus = document.activeElement;
    renderPanel(); showToolView('binoculars');
    setText(toolViewStatus, `${bird.name} · ${targetDirection(bird.id).direction} · ${distance.toFixed(1)}m\n쌍안경으로 새를 가까이 살펴봐요. 기록하거나 사진을 찍지는 않아요.`);
    toolViewShutter.hidden = true;
  }
  function closeToolView(restoreFocus = true) {
    if (!toolMode) return;
    camera.clearFocus();
    toolMode = null; binocularTargetId = null; photoCandidate = null;
    toolView.hidden = true; delete toolView.dataset.mode; document.body.classList.remove('tool-mode');
    hud.inert = previousToolHudInert;
    pause('tool-close'); syncHud(); renderPanel();
    if (restoreFocus && !companionOpen) (previousToolFocus?.isConnected ? previousToolFocus : equipmentButton).focus?.({ preventScroll: true });
    previousToolFocus = null;
  }
  let lastCompanionContextSignature = '';
  function renderPanel() {
    const view = activePanelView();
    ui.render(view);
    const provided = view?.companionContext;
    const context = { activity: 'jungle', question: String(provided?.question || '').slice(0, 600),
      choices: Array.isArray(provided?.choices) ? provided.choices.slice(0, 10).map(choice => String(choice).slice(0, 60)) : [],
      selected: String(provided?.selected || '').slice(0, 60) };
    const signature = JSON.stringify(context);
    if (signature === lastCompanionContextSignature) return;
    lastCompanionContextSignature = signature;
    window.EDUNICompanionPendingContext = context;
    window.EDUNICompanion?.setContext(context);
  }
  function syncProgressCount() { setText(discoveryCount, `${discoverySave.visitedIds.length} / ${DISCOVERY_MISSIONS.length} 발견`); }
  function syncLegacyCount() { if (legacyCount) setText(legacyCount, `${animalRecordCount()} / 1`); }
  function syncAdventureProgress() {
    setText(adventureCounts, `발견 ${discoverySave.visitedIds.length}/${DISCOVERY_MISSIONS.length} · 동물 ${animalCaptured() ? 1 : 0}/1 · 새 ${collectedLocalBirdCount()}/2`);
    const target = nextAdventureTarget();
    if (!target) { setText(adventureTarget, '모두 기록했어요!'); return; }
    const info = targetDirection(target.id);
    const name = target.kind === 'landmark' ? REGION.landmarks[target.id].name : target.name;
    setText(adventureTarget, `다음: ${name} · ${info.direction} · ${info.distance.toFixed(1)}m`);
  }
  function syncLearningCount() {
    setText(learningCount, `${collectedBirdCount()} / ${LEARNING_BIRDS.length} 기록`);
    learningDifficulty.value = learningSave.difficulty;
  }
  function syncHud() {
    const canExplore = isExploring();
    const nearby = nearestEncounter();
    syncAvatarControl();
    setDisabled(guideButton, !canExplore);
    setDisabled(codex, !canExplore);
    setDisabled(worldmapButton, !canExplore);
    setDisabled(equipmentButton, !canExplore);
    setDisabled(learningDifficulty, !canExplore || !!learningSave.activeSession);
    setDisabled(interact, !canExplore || !nearby);
    setText(interact, nearby?.kind === 'bird' || nearby?.kind === 'learning-bird' ? '새 관찰' : nearby ? '발견 관찰' : '관찰하기');
    syncProgressCount();
    syncLearningCount();
    syncAdventureProgress();
    if (!canExplore) return;
    if (selectedTargetId || selectedLearningBirdId) {
      const targetId = selectedTargetId || selectedLearningBirdId;
      const target = REGION.landmarks[targetId] || LEARNING_BIRDS_FOR_MAP.find(bird => bird.id === targetId);
      const info = targetDirection(targetId);
      setText(document.querySelector('#objective'), info.distance <= target.radius
        ? `${target.name} 가까이에 있어요. 주변을 살펴봐요.`
        : `${target.name} · ${info.direction} · ${info.distance.toFixed(1)}m`);
    } else if (nearby?.kind === 'landmark') {
      setText(document.querySelector('#objective'), `${nearby.name}에 도착했어요. 주변을 살펴봐요.`);
    } else if (nearby?.kind === 'learning-bird') {
      setText(document.querySelector('#objective'), `${nearby.name}를 발견했어요! 다가가서 이름과 특징을 살펴봐요.`);
    } else if (nearby?.kind === 'bird') {
      setText(document.querySelector('#objective'), animalCaptured()
        ? `${MAP.animal.name}를 만났어요! 지도를 더 둘러보세요`
        : `${MAP.animal.name}를 발견했어요! 관찰해 볼까요?`);
    } else {
      setText(document.querySelector('#objective'), MAP.objective);
    }
  }
  function dispatch(action) {
    if (disposed || contextLost || !action) return;
    const now=Date.now();
    const encountered = action.type === 'INTERACT' ? nearestEncounter() : null;
    if (action.type === 'CLOSE' && toolMode) { closeToolView(); return; }
    if (action.type === 'CLOSE' && (mapPanel || equipmentPanel)) {
      mapPanel = false; equipmentPanel = null; pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'OPEN_MAP' && isExploring()) { refreshProgression(); mapPanel = true; pause(); syncHud(); renderPanel(); return; }
    if (action.type === 'OPEN_CODEX' && isExploring()) { refreshProgression(); codexTab = 'birds'; learningPanel = { kind: 'collection', tab: codexTab }; pause(); syncHud(); renderPanel(); return; }
    if (action.type === 'OPEN_EQUIPMENT' && isExploring()) { refreshProgression(); equipmentPanel = 'tools'; pause(); syncHud(); renderPanel(); return; }
    if (action.type === 'SELECT_MAP' && MAPS[action.mapId]) {
      const url = new URL(location.href); url.searchParams.set('map', action.mapId); url.searchParams.delete('bird'); location.assign(url.href); return;
    }
    if (action.type === 'CODEX_TAB' && ['birds', 'animals'].includes(action.tab) && learningPanel) {
      codexTab = action.tab; learningPanel = { kind: 'collection', tab: codexTab }; renderPanel(); return;
    }
    if (action.type === 'CODEX_BIRD_SELECT' && learningPanel?.kind === 'collection' && LEARNING_BIRD_BY_ID.has(action.id)) {
      learningPanel = { kind: 'bird-detail', birdId: action.id }; renderPanel(); return;
    }
    if (action.type === 'CODEX_ANIMAL_SELECT' && learningPanel?.kind === 'collection' && MAPS[action.mapId]) {
      learningPanel = { kind: 'animal-detail', mapId: action.mapId }; renderPanel(); return;
    }
    if (action.type === 'CODEX_BACK' && learningPanel) { learningPanel = { kind: 'collection', tab: codexTab }; renderPanel(); return; }
    if (action.type === 'CODEX_BIRD_FIND' && LEARNING_BIRD_BY_ID.has(action.id)) {
      const bird = LEARNING_BIRD_BY_ID.get(action.id);
      if (bird.mapId !== MAP.id) { const url = new URL(location.href); url.searchParams.set('map', bird.mapId); url.searchParams.set('bird', bird.id); location.assign(url.href); return; }
      learningPanel = null; selectedLearningBirdId = bird.id; guideOpen = true; pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'CODEX_BIRD_START' && learningPanel?.kind === 'bird-detail' && action.id === learningPanel.birdId) {
      const bird = LEARNING_BIRD_BY_ID.get(action.id);
      if (!bird || bird.mapId !== MAP.id) return;
      learningPanel = learningSave.activeSession ? { kind: 'session-blocked' } : { kind: 'intro', birdId: bird.id, review: false };
      renderPanel(); return;
    }
    if (action.type === 'CODEX_ANIMAL_OBSERVE' && learningPanel?.kind === 'animal-detail' && learningPanel.mapId === MAP.id && isNear()) {
      learningPanel = null; state = reduceEncounter(state, { type: 'INTERACT' }, now); pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'CODEX_ANIMAL_RESUME' && learningPanel?.kind === 'animal-detail' && learningPanel.mapId === MAP.id && state.save.activeQuiz) {
      learningPanel = null; state = reduceEncounter(reduceEncounter(state, { type: 'CODEX' }, now), { type: 'RESUME_QUIZ' }, now); pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'EQUIPMENT_TAB') { equipmentPanel = 'tools'; refreshProgression(); renderPanel(); return; }
    if (action.type === 'EQUIPMENT_STAMPS') { equipmentPanel = 'stamps'; refreshProgression(); renderPanel(); return; }
    if (action.type === 'EQUIPMENT_CAMERA') { openCamera(); return; }
    if (action.type === 'EQUIPMENT_BINOCULARS') {
      const bird = [...LEARNING_BIRDS_FOR_MAP].sort((a, b) => Math.hypot(position.x - a.x, position.z - a.z) - Math.hypot(position.x - b.x, position.z - b.z))[0];
      if (bird) openBinoculars(bird.id); else notify('현재 지역에 안내할 새가 없어요'); return;
    }
    if (action.type === 'BINOCULAR_TARGET') { openBinoculars(action.id); return; }
    if (action.type === 'PHOTO_SHUTTER' && toolMode === 'camera') {
      const candidate = samplePhotoCandidate();
      if (!candidate) { notify('새를 화면 중앙에 맞추고 가까이에서 기록해요'); updateToolView(); return; }
      const alreadyRecorded = progression.photoIds.includes(candidate.id);
      progressionJournal = addPhotoId(progressionJournal, candidate.id);
      persistToolJournal(progressionJournal);
      if (!alreadyRecorded) {
        const target = LEARNING_BIRDS_FOR_MAP.find(bird => bird.id === candidate.id);
        feedbackAt('collection', target, { fallbackIfFar: true });
        notify(`${LEARNING_BIRD_BY_ID.get(candidate.id).name} 종 이름을 게임 사진 기록에 남겼어요`);
      } else notify('이 새의 종 이름은 이미 기록되어 있어요');
      updateToolView(); return;
    }
    if (action.type==='NEXT_MAP' && mapComplete() && nextMapId()) {
      const url=new URL(location.href); url.searchParams.set('map',nextMapId()); location.assign(url.href); return;
    }
    if (action.type==='REVISIT_MAP' && mapComplete()) {
      guideOpen=false; discoveryPanel=null; selectedTargetId=null; selectedLearningBirdId=null;
      if(state.mode!=='exploring') { const oldSave=state.save; state=reduceEncounter(state,{type:'CLOSE'},now); if(state.save!==oldSave) saveEncounter(state.save,oldSave.activeQuiz); }
      pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'SYNC_CAPTURE') {
      const latest = loadEncounter().save;
      const wasComplete = mapComplete();
      const next = reduceEncounter(state, legacyMap ? { type: 'SYNC_CAPTURE', captured: latest.captured } : { type: 'SYNC_CAPTURE', save: latest }, now);
      if (next !== state) { state = next; if (!wasComplete && mapComplete()) awardMapStamp(); syncLegacyCount(); refreshProgression(); if (!guideOpen && !discoveryPanel) renderPanel(); }
      return;
    }
    if (action.type === 'LEARN_SPECIES' && ['collection', 'bird-detail'].includes(learningPanel?.kind) && LEARNING_BIRD_BY_ID.has(action.id) && action.review && learningSave.collected[action.id]?.observedCount) {
      learningPanel = learningSave.activeSession ? { kind: 'session-blocked' } : { kind: 'intro', birdId: action.id, review: true };
      renderPanel(); return;
    }
    if (action.type === 'LEARN_START' && learningPanel?.kind === 'intro') {
      const bird = LEARNING_BIRD_BY_ID.get(action.birdId);
      const nearbyBird = nearestEncounter();
      const canStart = bird && canStartBirdSession(learningSave, bird.id, MAP.id, {
        review: !!action.review, nearbyBirdId: nearbyBird?.kind === 'learning-bird' ? nearbyBird.id : null,
      });
      const next = canStart && !learningSave.activeSession
        ? buildBirdSession(learningSave, bird.id, bird.mapId, { review: !!action.review }) : null;
      if (!next) { learningPanel = learningSave.activeSession ? { kind: 'session-blocked' } : learningPanel; renderPanel(); return; }
      const expectedSession = learningSave.activeSession;
      learningSave = next;
      if (!saveBirdLearning(learningSave, storage, expectedSession)) notify('새 문제를 저장하지 못해 이번 화면에서만 이어갈 수 있어요');
      learningPanel = { kind: 'session' }; pause(); syncHud(); renderPanel(); return;
    }
    if (action.type === 'LEARN_RESUME' && action.sessionId === learningSave.activeSession?.id) {
      learningPanel = { kind: 'session' }; pause(); syncHud(); renderPanel(); return;
    }
    if (learningPanel) {
      if (action.type === 'CLOSE') {
        learningPanel = null; pause(); syncHud(); renderPanel(); return;
      }
      if (action.type === 'LEARN_HINT' || action.type === 'LEARN_ANSWER' || action.type === 'LEARN_RETRY' || action.type === 'LEARN_CONTINUE' || action.type === 'LEARN_DONE') {
        const previous = learningSave.activeSession;
        if (!previous) return;
        const types = { LEARN_HINT: 'HINT', LEARN_ANSWER: 'ANSWER', LEARN_RETRY: 'RETRY', LEARN_CONTINUE: 'CONTINUE', LEARN_DONE: 'DONE' };
        const next = reduceBirdLearning(learningSave, { ...action, type: types[action.type] }, now);
        if (next === learningSave) return;
        learningSave = next;
        const expected = birdSessionVersion(previous);
        if (!saveBirdLearning(learningSave, storage, expected)) notify('새 학습 기록을 저장하지 못해 이 화면에서만 유지돼요');
        const effectTarget = LEARNING_BIRDS_FOR_MAP.find(bird => bird.id === previous.birdId) || position;
        if (action.type === 'LEARN_ANSWER' && getBirdQuestion(previous.questionIds[previous.index]).answerId === action.choiceId) feedbackAt('correct', effectTarget, { fallbackIfFar: true });
        if (action.type === 'LEARN_CONTINUE' && next.activeSession?.status === 'complete') feedbackAt('collection', effectTarget, { fallbackIfFar: true });
        if (action.type === 'LEARN_DONE') learningPanel = { kind: 'collection' };
        else learningPanel = { kind: 'session' };
        syncHud(); renderPanel(); return;
      }
      return;
    }
    if (discoveryPanel) {
      if (action.type === 'DISCOVERY_ANSWER' && action.id === discoveryPanel.id && discoveryPanel.kind === 'question' &&
          missionById.get(action.id)?.choices.some((choice) => choice.id === action.choiceId)) {
        if (missionById.get(action.id).answerId === action.choiceId) feedbackAt('correct', REGION.landmarks[action.id]);
        discoveryPanel = { kind: 'feedback', id: action.id, choiceId: action.choiceId };
        renderPanel();
      } else if (action.type === 'DISCOVERY_RETRY' && action.id === discoveryPanel.id && discoveryPanel.kind === 'feedback' && !discoverySave.visitedIds.includes(action.id)) {
        discoveryPanel = { kind: 'question', id: action.id };
        renderPanel();
      } else if (action.type === 'DISCOVERY_RECORD' && action.id === discoveryPanel.id && discoveryPanel.kind === 'feedback') {
        if (!canRecordDiscovery(MAP.id, missionById.get(action.id), discoveryPanel.choiceId, discoverySave)) return;
        const firstRecord = !discoverySave.visitedIds.includes(action.id);
        if (!discoverySave.visitedIds.includes(action.id)) {
          discoverySave = recordDiscovery(discoverySave, action.id, MAP.id);
          if (!saveDiscoveries(discoverySave, storage, MAP.id)) notify('기록을 저장하지 못해 이번 탐험에서만 남겨요');
          else {
            const latest = loadDiscoveries(storage, MAP.id);
            if (latest.valid) discoverySave = mergeDiscoveries(discoverySave, latest.save, MAP.id);
          }
        }
        if (firstRecord) feedbackAt('collection', REGION.landmarks[action.id]);
        if (selectedTargetId === action.id) selectedTargetId = null;
        discoveryPanel = null; if(mapComplete()) guideOpen=true; awardMapStamp(); refreshProgression(); pause(); syncHud(); renderPanel();
      } else if (action.type === 'CLOSE') {
        discoveryPanel = null; pause(); syncHud(); renderPanel();
      }
      return;
    }
    if (guideOpen) {
      if (action.type === 'GUIDE_TARGET' && missionById.has(action.id)) { selectedTargetId = action.id; selectedLearningBirdId = null; renderPanel(); }
      else if (action.type === 'GUIDE_CLEAR') { selectedTargetId = null; renderPanel(); }
      else if (action.type === 'GUIDE_BIRD' && LEARNING_BIRDS_FOR_MAP.some(bird => bird.id === action.id)) { selectedTargetId = null; selectedLearningBirdId = action.id; renderPanel(); }
      else if (action.type === 'GUIDE_BIRD_CLEAR') { selectedLearningBirdId = null; renderPanel(); }
      else if (action.type === 'CLOSE') { guideOpen = false; pause(); syncHud(); renderPanel(); }
      return;
    }
    if (action.type === 'GUIDE_OPEN') {
      if (!isExploring()) return;
      guideOpen = true; pause(); renderPanel(); syncHud(); return;
    }
    if (action.type === 'INTERACT') {
      if (!isExploring()) return;
      const nearby = encountered;
      if (!nearby) return;
      if (nearby.kind === 'landmark') { discoveryPanel = { kind: 'question', id: nearby.id }; feedbackAt('discovery', nearby); pause(); renderPanel(); syncHud(); return; }
      if (nearby.kind === 'learning-bird') {
        learningPanel = learningSave.activeSession ? { kind: 'session-blocked' } : { kind: 'intro', birdId: nearby.id, review: false };
        feedbackAt('discovery', nearby); pause(); renderPanel(); syncHud(); return;
      }
    }
    if (action.type === 'CODEX' && !isExploring()) return;
    const latest = loadEncounter().save;
    const synchronized=reduceEncounter(state,legacyMap ? {type:'SYNC_CAPTURE',captured:latest.captured} : {type:'SYNC_CAPTURE',save:latest},now);
    const next = reduceEncounter(synchronized, action, now);
    if (next === state) return;
    const oldSave = state.save;
    const wasComplete = mapComplete();
    state = next;
    pause();
    if (action.type!=='SYNC_CAPTURE' && state.save !== oldSave && !saveEncounter(state.save,oldSave.activeQuiz)) notify('저장할 수 없어 이번 탐험에서만 기록돼요');
    if (action.type === 'INTERACT' && encountered?.kind === 'bird') feedbackAt('discovery', encountered);
    if (action.type === 'ANSWER' && next.feedback?.correct) feedbackAt('correct', REGION.bird, { fallbackIfFar: true });
    if (action.type === 'ANSWER' && next.result?.format === 'general-v1') {
      feedbackAt('correct', REGION.bird, { fallbackIfFar: true });
      if (next.result.newlyCaptured) feedbackAt('collection', REGION.bird, { fallbackIfFar: true });
    }
    if (!wasComplete && mapComplete()) awardMapStamp();
    refreshProgression();
    syncHud();
    renderPanel();
    syncLegacyCount();
  }
  const onCodex = () => dispatch({type:'OPEN_CODEX'});
  const onGuide = () => dispatch({type:'GUIDE_OPEN'});
  const onWorldmap = () => dispatch({ type: 'OPEN_MAP' });
  const onEquipment = () => dispatch({ type: 'OPEN_EQUIPMENT' });
  const onToolClose = () => dispatch({ type: 'CLOSE' });
  const onShutter = () => dispatch({ type: 'PHOTO_SHUTTER' });
  const onSoundToggle = () => {
    muted = !muted; soundToggle.setAttribute('aria-pressed', String(muted));
    setText(soundToggle, muted ? '🔕 소리 끔' : '🔔 소리 켜짐');
    if (muted) stopCues();
  };
  const onDifficultyChange = () => {
    if (!isExploring() || learningSave.activeSession) { syncLearningCount(); return; }
    const next = setBirdDifficulty(learningSave, learningDifficulty.value);
    if (next === learningSave) return;
    learningSave = next;
    if (!saveBirdLearning(learningSave, storage, null)) notify('난이도를 저장하지 못해 이 화면에서만 유지돼요');
    syncLearningCount();
  };
  codex.addEventListener('click', onCodex);
  worldmapButton.addEventListener('click', onWorldmap);
  equipmentButton.addEventListener('click', onEquipment);
  toolViewClose.addEventListener('click', onToolClose);
  toolViewShutter.addEventListener('click', onShutter);
  guideButton.addEventListener('click', onGuide);
  soundToggle.addEventListener('click', onSoundToggle);
  learningDifficulty.addEventListener('change', onDifficultyChange);
  const onGround = event => {
    if (!isPrimaryCanvasTap(event) || disposed || contextLost) return;
    if (toolMode === 'camera') {
      const rect = canvas.getBoundingClientRect();
      const target = presentation.learningBirds.map(({ data, group }) => {
        const projected = group.position.clone().project(camera.camera);
        const x = (projected.x + 1) * rect.width / 2 + rect.left;
        const y = (1 - projected.y) * rect.height / 2 + rect.top;
        return { data, group, projected, screenDistance: Math.hypot(event.clientX - x, event.clientY - y),
          worldDistance: Math.hypot(position.x - data.x, position.z - data.z) };
      }).filter(item => [item.projected.x, item.projected.y, item.projected.z, item.screenDistance, item.worldDistance].every(Number.isFinite) &&
        item.projected.x >= -1 && item.projected.x <= 1 && item.projected.y >= -1 && item.projected.y <= 1 &&
        item.projected.z >= -1 && item.projected.z <= 1 && item.worldDistance <= MAX_PHOTO_DISTANCE && item.screenDistance <= 44)
        .sort((a, b) => a.screenDistance - b.screenDistance)[0];
      if (target && camera.setFocus(target.group.position, 1.4)) {
        event.preventDefault(); photoCandidate = null;
        setText(toolViewStatus, `${target.data.name}를 맞췄어요. 중앙에 보이면 사진 기록을 눌러요.`);
      }
      return;
    }
    if (!isExploring()) return;
    hudFocusGuard = false;
    canvas.focus({ preventScroll: true });
    const point = presentation.pick(event,camera.camera);
    if (!point || !world.canStand(point.x,point.z,.25)) return;
    destination = point; destinationPointerId = event.pointerId ?? null; presentation.setDestination(point);
  };
  const onDestinationCancel = event => {
    if (!ownsCanvasTap(destinationPointerId, event)) return;
    destination = null; destinationPointerId = null; presentation.setDestination(null);
  };
  canvas.addEventListener('pointerdown', onGround);
  canvas.addEventListener('pointercancel', onDestinationCancel);
  function pause(reason = 'modal') { recordBoundary(reason); input.clear(); destination = null; destinationPointerId = null; velocity = {x:0,z:0}; previousTime = null; frameClock.reset(); presentation.setDestination(null); }
  const onCompanionVisibility = event => {
    const open = !!event.detail?.open;
    if (companionOpen === open) return;
    companionOpen = open;
    if (open && toolMode) closeToolView(false);
    input.clear(); input.releaseGamepad(); pause(open ? 'companion-open' : 'companion-close');
    syncHud();
  };
  window.addEventListener('eduni-companion-visibility', onCompanionVisibility);
  const hud = document.querySelector('.hud');
  const onToolKeydown = event => {
    if (!toolMode) return;
    if (event.key === 'Escape') { event.preventDefault(); closeToolView(); return; }
    if (event.key !== 'Tab') return;
    const controls = [toolViewShutter, toolViewClose].filter(button => !button.hidden && !button.disabled);
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    else if (!controls.includes(document.activeElement)) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onToolKeydown);
  const onHudFocus = () => { hudFocusGuard = true; input.releaseGamepad(); pause('hud'); };
  hud.addEventListener('focusin', onHudFocus);
  hud.addEventListener('pointerdown', onHudFocus);
  const onBlur = () => pause('blur');
  const onFocus = () => recordBoundary('focus');
  const onVisibility = () => { pause('visibility'); if (document.hidden) input.releaseGamepad(); };
  const onLost = event => { event.preventDefault(); contextLost=true; pause('contextlost'); notify('화면이 잠시 멈췄어요. 복구를 기다려 주세요.'); };
  const onRestored = () => { contextLost=false; pause('restored'); notify('다시 탐험할 수 있어요'); };
  const onResize = () => {
    const width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const sizeChange = classifyCanvasSize(canvasSize, { width, height });
    if (sizeChange.changed) { if (sizeChange.major) pause('resize'); else recordBoundary('resize'); }
    canvasSize = { width, height };
    presentation.resize(width,height); camera.resize(width,height); camera.update(position,groundY,0);
  };
  const onPageHide = () => { recordBoundary('pagehide'); dispose(); };
  const onPageShow = event => { recordBoundary('pageshow'); if(event.persisted && disposed) location.reload(); };
  const onStorage = event => {
    if (event.key === 'eduni.explore.save.v1' || event.key === mapEncounterKey(MAP)) dispatch({type:'SYNC_CAPTURE'});
    if (event.key === DISCOVERY_KEY) {
      const latest = loadDiscoveries(storage, MAP.id);
      if (latest.valid) {
        discoverySave = mergeDiscoveries(discoverySave, latest.save, MAP.id);
        syncProgressCount();
        if (guideOpen || discoveryPanel?.kind === 'feedback') {
          const closeWasFocused = document.activeElement?.id === 'panel-close';
          const focusedLabel = document.activeElement?.textContent;
          renderPanel();
          if (closeWasFocused) document.querySelector('#panel-close').focus();
          else [...document.querySelectorAll('#panel-actions button')].find((button) => button.textContent === focusedLabel)?.focus();
        }
      }
      else if (latest.warning) notify(latest.warning);
    }
    if (event.key === BIRD_LEARNING_KEY) {
      const latest = loadBirdLearning(storage);
      if (latest.valid) {
        learningSave = latest.save;
        if (learningPanel?.kind === 'session') learningPanel = learningSave.activeSession ? { kind: 'session' } : null;
        syncHud();
        if (learningPanel) renderPanel();
      } else if (latest.warning) notify(latest.warning);
    }
    if (event.key === PROGRESSION_SAVE_KEY) {
      const latest = loadProgressionJournal(storage);
      if (latest.valid) {
        const merged = mergeProgressionJournals(progressionJournal, latest.save);
        progressionJournal = merged;
        if (JSON.stringify(merged) !== JSON.stringify(latest.save)) persistToolJournal(merged);
      }
      else if (latest.warning) notify(latest.warning);
    }
    const anyMapKey = event.key === null || Object.values(MAPS).some(map => event.key === (map.id === 'river-meadow' ? EXPLORE_SAVE_KEY : mapEncounterKey(map)) || event.key === discoveryConfig(map.id).key);
    if (anyMapKey || event.key === PROGRESSION_SAVE_KEY) {
      refreshProgression();
      if (mapPanel || equipmentPanel || ['collection', 'bird-detail', 'animal-detail'].includes(learningPanel?.kind)) renderPanel();
    }
  };
  window.addEventListener('resize',onResize); window.addEventListener('blur',onBlur); window.addEventListener('focus',onFocus);
  window.visualViewport?.addEventListener('resize',onResize);
  document.addEventListener('visibilitychange',onVisibility);
  canvas.addEventListener('webglcontextlost',onLost); canvas.addEventListener('webglcontextrestored',onRestored);
  window.addEventListener('pagehide',onPageHide); window.addEventListener('pageshow',onPageShow);
  window.addEventListener('storage',onStorage);
  refreshProgression(); onResize(); renderPanel(); syncHud(); syncLegacyCount();
  loading.hidden=true;
  if (loaded.warning) notify(loaded.warning);
  if (loadedAvatar.warning) notify(loadedAvatar.warning);
  if (loadedDiscoveries.warning) notify(loadedDiscoveries.warning);
  if (loadedLearning.warning) notify(loadedLearning.warning);
  if (loadedProgression.warning) notify(loadedProgression.warning);
  const frameTimes = [];
  let frameMetrics = { averageMs: null, p95Ms: null }, measuredFrames = 0, longFrames = 0, maxFrameMs = 0;
  function frame(timestamp) {
    if(disposed) return;
    const workStart=qaEnabled?performance.now():0;
    const diagnosticsSample=frameDiagnostics?.begin(timestamp,workStart,{focused:document.hasFocus(),visibility:document.visibilityState})||null;
    const realDt=previousTime===null ? 0 : (timestamp-previousTime)/1000; previousTime=timestamp;
    const activeFrame=!document.hidden && !contextLost;
    const hudOwnsFocus = hudFocusGuard && document.activeElement?.matches?.('select, input, textarea, [contenteditable="true"]');
    input.pollGamepad({ modal: !isExploring(), enabled: activeFrame && document.hasFocus() && !companionOpen && (!hudOwnsFocus || !isExploring()), now: timestamp });
    if(!activeFrame) frameClock.reset();
    const framePlan=frameClock.advance(activeFrame ? realDt : 0), dt=framePlan.acceptedSeconds;
    elapsed+=dt;
    if(activeFrame) {
      for(let step=0;step<framePlan.steps;step++) {
        const canExplore=isExploring();
        const intent=canExplore?input.direction():{x:0,y:0};
        if(intent.x || intent.y) { destination=null; destinationPointerId=null; presentation.setDestination(null); }
        const before=position;
        let stepIntent=intent;
        let options={speed:2.2,radius:.25};
        if(destination) {
          const dx=destination.x-position.x, dz=destination.z-position.z, distance=Math.hypot(dx,dz);
          if(distance<.07) { destination=null; destinationPointerId=null; presentation.setDestination(null); }
          else {
            stepIntent={x:(dx*camera.basis.right.x+dz*camera.basis.right.z)/distance,y:-(dx*camera.basis.forward.x+dz*camera.basis.forward.z)/distance};
            options.speed=Math.min(2.2,distance*60);
          }
        }
        if(canExplore) {
          const moved=movePlayer(world,position,stepIntent,camera.basis,1/60,options);
          position=moved.position; groundY=moved.groundY;
          velocity={x:(position.x-before.x)*60,z:(position.z-before.z)*60};
          if(destination && moved.movedDistance<.0001) { destination=null; destinationPointerId=null; presentation.setDestination(null); }
        } else velocity={x:0,z:0};
      }
      const simulationEnd=qaEnabled?performance.now():0;
      const near=isNear(), captured=animalCaptured(), nearby=nearestEncounter();
      syncHud();
      minimap.update(position, timestamp);
      presentation.actor.update(position,groundY,velocity,dt,elapsed);
      camera.update(position,groundY,dt); presentation.update(dt,elapsed,near,captured,nearby?.kind === 'learning-bird' ? nearby.id : null); presentation.render(camera.camera); updateToolView();
      if(qaEnabled) {
        const renderEnd=performance.now();
        if(realDt>0) { frameTimes.push(realDt*1000); measuredFrames++; if(realDt>.05)longFrames++; maxFrameMs=Math.max(maxFrameMs,realDt*1000); if(frameTimes.length>3600)frameTimes.shift(); }
        if(frameTimes.length && measuredFrames%60===0) {
          const sorted=[...frameTimes].sort((a,b)=>a-b);
          frameMetrics={averageMs:frameTimes.reduce((sum,value)=>sum+value,0)/frameTimes.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1]};
        }
        const screenPoint=point=>{const projected=point.project(camera.camera);return {x:(projected.x+1)*canvas.clientWidth/2,y:(1-projected.y)*canvas.clientHeight/2};};
        const landmarkGroundScreens=Object.fromEntries(DISCOVERY_MISSIONS.map(({id})=>{const landmark=REGION.landmarks[id];const surface=world.sampleSurface(landmark.x,landmark.z);return[id,screenPoint(new Vector3(landmark.x,surface?.height||0,landmark.z))];}));
        const learningBirdScreens=Object.fromEntries(presentation.learningBirds.map(({data,group})=>[data.id,{ground:screenPoint(new Vector3(data.x,world.sampleSurface(data.x,data.z)?.height||0,data.z)),bird:screenPoint(group.position.clone())}]));
        qa.dataset.renderProfile=renderProfile;
        qa.dataset.state=JSON.stringify({mapId:MAP.id,mapComplete:mapComplete(),animalCaptured:animalCaptured(),position,groundY,mode:state.mode,panelKind:learningPanel?.kind||discoveryPanel?.kind||(guideOpen?'guide':state.mode==='exploring'?'none':state.mode),companionOpen,learningDifficulty:learningSave.difficulty,learningCollectedBirdIds:Object.keys(learningSave.collected).filter(id=>learningSave.collected[id].observedCount>0),learningSession:learningSave.activeSession?{id:learningSave.activeSession.id,birdId:learningSave.activeSession.birdId,index:learningSave.activeSession.index,status:learningSave.activeSession.status,questionId:learningSave.activeSession.questionIds[learningSave.activeSession.index],choiceOrder:learningSave.activeSession.choiceOrder[learningSave.activeSession.index]}:null,learningBirdScreens,learningBirdAnimation:presentation.learningBirdAnimation?.(),effects:presentation.effectStats?.(),near,captured,nearestEncounter:nearby?{kind:nearby.kind,id:nearby.id,distance:nearby.distance}:null,bounds:REGION.bounds,landmarkGroundScreens,visitedDiscoveryIds:discoverySave.visitedIds,selectedTargetId,selectedLearningBirdId,focused:document.hasFocus(),visibility:document.visibilityState,gpu,renderProfile,timing:{simulationMs:simulationEnd-workStart,presentationMs:renderEnd-simulationEnd,totalWorkMs:renderEnd-workStart},diagnostics:diagnosticsSample,selectedCharacterId:presentation.actor.selectedCharacterId,effectiveCharacterId:presentation.actor.effectiveCharacterId,artStatus:presentation.actor.artStatus,actorAssetStatus:presentation.actor.assetStatus,actorAnimation:presentation.actor.animationState,environmentStatus:presentation.environmentStatus,drawCalls:presentation.renderer.info.render.calls,triangles:presentation.renderer.info.render.triangles,frames:frameTimes.length,frameMetrics:{...frameMetrics,longFrames,maxFrameMs},frameClock:{steps:framePlan.steps,droppedSeconds:framePlan.droppedSeconds,remainder:framePlan.remainder},birdGroundScreen:screenPoint(new Vector3(REGION.bird.x,world.sampleSurface(REGION.bird.x,REGION.bird.z).height,REGION.bird.z)),birdScreen:screenPoint(presentation.bird.position.clone()),css:{width:canvas.clientWidth,height:canvas.clientHeight},buffer:{width:canvas.width,height:canvas.height}});
        const qaState = JSON.parse(qa.dataset.state);
        Object.assign(qaState, { panelKind: mapPanel ? 'map' : equipmentPanel ? 'equipment' : qaState.panelKind,
          progression: { mapStamps: progression.mapStamps, photoIds: progression.photoIds, binocularsOwned: progression.binocularsOwned, cameraOwned: progression.cameraOwned,
            maps: progression.maps.map(({ id, status, stamped, complete }) => ({ id, status, stamped, complete })) }, toolMode,
          photoCandidate: photoCandidate ? { id: photoCandidate.id, distance: photoCandidate.distance, x: photoCandidate.x, y: photoCandidate.y, z: photoCandidate.z } : null,
          photoEligible: !!photoCandidate });
        qa.dataset.state = JSON.stringify(qaState);
      }
    }
    if(toast.textContent && timestamp>messageUntil) toast.textContent='';
    rafId=requestAnimationFrame(frame);
    if(frameDiagnostics) frameDiagnostics.end(performance.now());
  }
  rafId=requestAnimationFrame(frame);
  function dispose() {
    if(disposed)return; disposed=true; cancelAnimationFrame(rafId); input.dispose(); ui.dispose();
    window.removeEventListener('resize',onResize); window.removeEventListener('blur',onBlur); window.removeEventListener('focus',onFocus);
    document.removeEventListener('keydown', onToolKeydown);
    avatarSelect.removeEventListener('focus',onAvatarFocus);
    avatarSelect.removeEventListener('change',onAvatarChange); mapSelect.removeEventListener('focus',onAvatarFocus); mapSelect.removeEventListener('change',onMapChange);
    hud.removeEventListener('focusin', onHudFocus); hud.removeEventListener('pointerdown', onHudFocus);
    document.removeEventListener('visibilitychange',onVisibility);
    canvas.removeEventListener('pointerdown',onGround); canvas.removeEventListener('pointercancel',onDestinationCancel); codex.removeEventListener('click',onCodex); worldmapButton.removeEventListener('click',onWorldmap); equipmentButton.removeEventListener('click',onEquipment); toolViewClose.removeEventListener('click',onToolClose); toolViewShutter.removeEventListener('click',onShutter); guideButton.removeEventListener('click',onGuide); learningDifficulty.removeEventListener('change',onDifficultyChange);
    canvas.removeEventListener('webglcontextlost',onLost); canvas.removeEventListener('webglcontextrestored',onRestored);
    window.removeEventListener('pagehide',onPageHide); window.visualViewport?.removeEventListener('resize',onResize); presentation.dispose();
    window.removeEventListener('eduni-companion-visibility', onCompanionVisibility);
    hudDetails.forEach(details => details.removeEventListener('toggle', updateHudDetailState));
    soundToggle.removeEventListener('click', onSoundToggle); stopCues();
    if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
    window.removeEventListener('storage',onStorage);
    // pageshow must survive pagehide so a bfcache restore can reopen the disposed scene.
  }
  return {dispose};
}
