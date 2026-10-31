import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CHARACTER_ASSET = new URL('../../assets/vendor/quaternius/platformer/Character.gltf', import.meta.url).href;
export const AVATAR_SAVE_KEY = 'eduni.explore.avatar.v1';

const CHARACTER_IDS = new Set(['human', 'rabbit']);
const DEFAULT_CHARACTER_ID = 'rabbit';

function defaultStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

function isCharacterId(characterId) {
  return CHARACTER_IDS.has(characterId);
}

export function loadAvatarSelection(storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(AVATAR_SAVE_KEY);
    if (raw === null || raw === undefined) return { characterId: DEFAULT_CHARACTER_ID, warning: '' };
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2 ||
      value.version !== 1 || !isCharacterId(value.characterId)) {
      return { characterId: DEFAULT_CHARACTER_ID, warning: '탐험가 선택 기록을 읽지 못해 기본 탐험가로 시작해요' };
    }
    return { characterId: value.characterId, warning: '' };
  } catch {
    return { characterId: DEFAULT_CHARACTER_ID, warning: '탐험가 선택 기록을 읽지 못해 기본 탐험가로 시작해요' };
  }
}

export function saveAvatarSelection(characterId, storage = defaultStorage()) {
  if (!isCharacterId(characterId)) return false;
  try {
    if (!storage?.setItem) return false;
    storage.setItem(AVATAR_SAVE_KEY, JSON.stringify({ version: 1, characterId }));
    return true;
  } catch {
    return false;
  }
}

const MODEL_HEIGHT = 1.45;
const WALK_SPEED = 2.2;
const FADE_SECONDS = .18;

function usableClip(clip) {
  return clip && Number.isFinite(clip.duration) && clip.duration > 0 && clip.tracks.length > 0 && clip.tracks.every(track =>
    track.name && track.times?.length > 0 && track.values?.length > 0 &&
    [...track.times, ...track.values].every(Number.isFinite),
  );
}

function releaseModel(model, disposed = new WeakSet()) {
  if (!model) return;
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const resource of [...geometries, ...materials, ...textures, ...skeletons]) {
    if (disposed.has(resource)) continue;
    disposed.add(resource);
    resource.dispose?.();
  }
}

export function createActor({ loadAsset = true, loader = new GLTFLoader() } = {}) {
  const root = new THREE.Group();
  const fallback = new THREE.Group(); fallback.name = 'procedural-fallback'; root.add(fallback);
  const materials = new Map();
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    return materials.get(color);
  };
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const part = (parent, color, scale, pos, name = '') => {
    const mesh = new THREE.Mesh(sphere, material(color));
    mesh.name = name;
    mesh.scale.set(...scale); mesh.position.set(...pos); mesh.castShadow = true;
    parent.add(mesh); return mesh;
  };
  const body = new THREE.Group(); fallback.add(body);
  body.name = 'human-body';
  part(body, 0xdfb968, [.25, .31, .18], [0, .65, 0]);
  part(body, 0xedd0a1, [.245, .255, .23], [0, 1.12, 0]);
  part(body, 0x704b33, [.255, .15, .235], [0, 1.28, -.025], 'hat-crown');
  part(body, 0x668775, [.27, .10, .25], [0, 1.35, .01], 'hat-band');
  part(body, 0x779789, [.31, .035, .30], [0, 1.29, .08], 'hat-brim');
  part(body, 0xc96843, [.25, .065, .20], [0, .86, 0], 'outfit-tunic');
  part(body, 0x577566, [.23, .22, .11], [0, .64, -.23], 'backpack');
  for (const x of [-.085, .085]) part(body, 0x35423a, [.025, .034, .02], [x, 1.13, .218]);
  part(body, 0xc58966, [.044, .044, .055], [0, 1.05, .224]);
  const legs = [], arms = [];
  for (const sign of [-1, 1]) {
    const leg = new THREE.Group(); leg.name = sign < 0 ? 'fallback-leg-left' : 'fallback-leg-right'; leg.position.set(sign * .125, .43, 0); fallback.add(leg);
    part(leg, 0x596b56, [.09, .20, .10], [0, -.16, 0]);
    part(leg, 0x604b39, [.10, .07, .15], [0, -.35, .055]); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(sign * .27, .83, 0); body.add(arm);
    part(arm, 0xdfb968, [.09, .18, .09], [sign * .025, -.14, 0]);
    part(arm, 0xedd0a1, [.065, .07, .07], [sign * .035, -.31, 0]); arms.push(arm);
  }

  const assetHolder = new THREE.Group(); assetHolder.name = 'rigged-character'; assetHolder.visible = false; root.add(assetHolder);
  const bounds = new THREE.Box3();
  const released = new WeakSet();
  let yaw = 0, phase = 0, disposed = false, model = null, mixer = null, actions = null;
  let assetStatus = loadAsset ? 'loading' : 'fallback';
  let selectedCharacterId = DEFAULT_CHARACTER_ID;
  let animationState = 'idle';
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = () => resolve(assetStatus); });
  const finish = () => { resolveReady?.(); resolveReady = null; };

  function alignFeet() {
    assetHolder.position.y = 0;
    root.updateMatrixWorld(true);
    bounds.makeEmpty().setFromObject(assetHolder, true);
    if (Number.isFinite(bounds.min.y)) assetHolder.position.y += root.position.y - bounds.min.y;
    root.updateMatrixWorld(true);
  }

  function clearAsset() {
    if (mixer && model) { mixer.stopAllAction(); mixer.uncacheRoot(model); }
    mixer = null; actions = null;
    if (model) { assetHolder.remove(model); releaseModel(model, released); }
    model = null; assetHolder.visible = false; fallback.visible = true;
  }

  function effectiveCharacterId() {
    return selectedCharacterId === 'rabbit' && assetStatus === 'loaded' && model ? 'rabbit' : 'human';
  }

  function syncVisibility() {
    const showRabbit = effectiveCharacterId() === 'rabbit';
    fallback.visible = !showRabbit;
    assetHolder.visible = showRabbit;
    if (actions) for (const action of Object.values(actions)) action.paused = !showRabbit;
  }

  function install(gltf) {
    const candidate = gltf?.scene;
    if (!candidate) throw new Error('Character GLTF has no scene');
    let hasSkin = false;
    candidate.traverse(object => { if (object.isSkinnedMesh && object.skeleton?.bones.length) hasSkin = true; });
    const idle = gltf.animations?.find(clip => clip.name === 'Idle');
    const walk = gltf.animations?.find(clip => clip.name === 'Walk');
    if (!hasSkin || !usableClip(idle) || !usableClip(walk)) throw new Error('Character GLTF is missing its rig or locomotion clips');
    candidate.updateMatrixWorld(true);
    bounds.makeEmpty().setFromObject(candidate, true);
    const height = bounds.max.y - bounds.min.y;
    if (!Number.isFinite(height) || height <= 1e-5) throw new Error('Character GLTF has invalid bounds');
    candidate.scale.multiplyScalar(MODEL_HEIGHT / height);
    candidate.updateMatrixWorld(true);
    candidate.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    model = candidate; assetHolder.add(model);
    mixer = new THREE.AnimationMixer(model);
    actions = { idle: mixer.clipAction(idle), walk: mixer.clipAction(walk) };
    actions[animationState].play(); mixer.update(0);
    alignFeet();
    assetStatus = 'loaded';
    syncVisibility();
  }

  function fail(gltf) {
    if (gltf?.scene) releaseModel(gltf.scene, released);
    clearAsset();
    if (!disposed) assetStatus = 'fallback';
    finish();
  }

  if (!loadAsset) finish();
  else {
    try {
      loader.load(CHARACTER_ASSET, gltf => {
        if (disposed) { fail(gltf); return; }
        try { install(gltf); finish(); }
        catch { fail(gltf); }
      }, undefined, () => fail());
    } catch { fail(); }
  }

  return {
    root,
    readyPromise,
    get assetStatus() { return assetStatus; },
    get selectedCharacterId() { return selectedCharacterId; },
    get effectiveCharacterId() { return effectiveCharacterId(); },
    get artStatus() { return effectiveCharacterId() === 'rabbit' ? 'rigged-candidate' : 'procedural-prototype'; },
    get animationState() { return animationState; },
    setCharacter(characterId) {
      if (disposed || !isCharacterId(characterId)) return false;
      selectedCharacterId = characterId;
      syncVisibility();
      return true;
    },
    update(position, groundY, velocity, dt, time) {
      if (disposed) return;
      root.position.set(position.x, groundY + .01, position.z);
      const speed = Math.hypot(velocity.x, velocity.z);
      if (speed > .02) {
        const target = Math.atan2(velocity.x, velocity.z);
        const difference = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
        yaw += difference * (1 - Math.exp(-14 * dt));
        phase += speed * dt * 7;
      }
      root.rotation.y = yaw;
      const nextState = speed > .02 ? 'walk' : 'idle';
      if (nextState !== animationState) {
        if (actions) {
          const next = actions[nextState], previous = actions[animationState];
          next.reset().play(); previous.crossFadeTo(next, FADE_SECONDS, false);
        }
        animationState = nextState;
        syncVisibility();
      }
      const gait = speed > .02 ? Math.sin(phase) * .55 : 0;
      legs[0].rotation.x = gait; legs[1].rotation.x = -gait;
      arms[0].rotation.x = -gait * .8; arms[1].rotation.x = gait * .8;
      body.position.y = speed > .02 ? Math.abs(Math.sin(phase)) * .035 : Math.sin(time * 2.3) * .012;
      if (actions && effectiveCharacterId() === 'rabbit') {
        if (animationState === 'walk') actions.walk.timeScale = speed / WALK_SPEED;
        mixer.update(dt);
        alignFeet();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (assetStatus === 'loading') assetStatus = 'fallback';
      clearAsset(); finish();
    },
  };
}
