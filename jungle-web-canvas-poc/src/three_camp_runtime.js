import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { CampWorldGeometry } from "./geometry.js";
import { PlayerSprite } from "./player.js";
import { BLUEBIRD } from "./constants.js";
import { getStageVisualPhase } from "./content/stage_manifest.js";
import { THREEJSASSETS_FREE_MODELS, threeVendorUrl } from "./three_vendor_manifest.js";

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new CampWorldGeometry();

const CAMP_PALETTES = Object.freeze({
  "sunlit-olive": 0x77956a,
  "earthy-olive": 0x687b58,
  "leaf-green": 0x5d815e,
  "amber-dusk": 0x775d48,
  "cool-ridge": 0x7594a0,
  "golden-ridge": 0xa78f62,
});

const CAMP_VENDOR_PLACEMENTS = Object.freeze([
  { model: "floweringTree", x: 80, y: 920, scale: 0.56, rotation: -0.2 },
  { model: "cypressTree", x: 300, y: 1010, scale: 0.3, rotation: 0.12 },
  { model: "mangroveCluster", x: 330, y: 890, scale: 0.46, rotation: -0.1 },
  { model: "grassTuft", x: 120, y: 760, scale: 0.88, rotation: 0.2 },
  { model: "rockCluster", x: 350, y: 690, scale: 0.66, rotation: -0.18 },
  { model: "floweringTree", x: 340, y: 510, scale: 0.58, rotation: 0.1 },
  { model: "mossyBoulder", x: 610, y: 430, scale: 0.82, rotation: -0.12 },
  { model: "cypressTree", x: 760, y: 230, scale: 0.3, rotation: 0.15 },
  { model: "mangroveCluster", x: 1030, y: 410, scale: 0.5, rotation: -0.2 },
  { model: "grassTuft", x: 820, y: 510, scale: 0.82, rotation: 0.06 },
  { model: "rockCluster", x: 1040, y: 690, scale: 0.7, rotation: 0.12 },
  { model: "cypressTree", x: 760, y: 900, scale: 0.31, rotation: -0.1 },
  { model: "floweringTree", x: 1080, y: 960, scale: 0.56, rotation: 0.12 },
  { model: "mangroveCluster", x: 1190, y: 730, scale: 0.48, rotation: -0.12 },
  { model: "mossyBoulder", x: 1360, y: 680, scale: 0.86, rotation: 0.08 },
  { model: "grassTuft", x: 1420, y: 560, scale: 0.9, rotation: -0.1 },
  { model: "cypressTree", x: 1500, y: 470, scale: 0.32, rotation: 0.14 },
  { model: "floweringTree", x: 1190, y: 290, scale: 0.6, rotation: -0.14 },
]);

export function campLogicalToThree(x, y, height = 0) {
  return new THREE.Vector3(
    (x - WORLD_CENTER.x) * WORLD_SCALE,
    height,
    (y - WORLD_CENTER.y) * WORLD_SCALE
  );
}

const worldPoint = campLogicalToThree;

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...extra });
}

function addGround(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat(0x35563a, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const entrancePatch = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), mat(0x4d6844, { roughness: 1 }));
  entrancePatch.rotation.x = -Math.PI / 2;
  entrancePatch.position.copy(worldPoint(220, 930, 0.012));
  entrancePatch.scale.set(1.2, 0.72, 1);
  scene.add(entrancePatch);

  const ridgePatch = new THREE.Mesh(new THREE.CircleGeometry(2.5, 48), mat(0x63755d, { roughness: 1 }));
  ridgePatch.rotation.x = -Math.PI / 2;
  ridgePatch.position.copy(worldPoint(1300, 420, 0.013));
  ridgePatch.scale.set(1.25, 0.62, 1);
  scene.add(ridgePatch);
}

function addRoute(scene) {
  const route = geometryContract.paths[0] || [];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.74;
  const edgeMat = mat(0x43513d, { roughness: 1 });
  const routeMat = mat(0xb19869, { roughness: 1 });

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = worldPoint(route[i].x, route[i].y, 0.04);
    const b = worldPoint(route[i + 1].x, route[i + 1].y, 0.04);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const angle = -Math.atan2(dz, dx);

    const edge = new THREE.Mesh(new THREE.PlaneGeometry(len + radius, radius * 2.15), edgeMat);
    edge.rotation.set(-Math.PI / 2, 0, angle);
    edge.position.copy(mid);
    edge.position.y = 0.028;
    scene.add(edge);

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * 0.45, radius * 1.5), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = 0.047;
    scene.add(strip);
  }

  for (const node of route) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.79, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, 0.049));
    scene.add(pad);
  }
}

function addLearningHut(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(520, 320, 0));
  group.rotation.y = -0.08;

  const wood = mat(0x8e6540);
  const trim = mat(0x5e452f);
  const roofMat = mat(0x4f6741);
  const warmWindow = new THREE.MeshStandardMaterial({
    color: 0xffd989,
    emissive: 0xff9f43,
    emissiveIntensity: 1.45,
    roughness: 0.48,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.65, 1.85), wood);
  body.position.y = 0.88;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const roofLeft = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 2.2), roofMat);
  roofLeft.rotation.z = 0.58;
  roofLeft.position.set(-0.69, 1.92, 0);
  roofLeft.castShadow = true;
  const roofRight = roofLeft.clone();
  roofRight.rotation.z = -0.58;
  roofRight.position.x = 0.69;
  group.add(roofLeft, roofRight);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.05, 0.06), trim);
  door.position.set(0, 0.55, 0.955);
  group.add(door);

  for (const x of [-0.78, 0.78]) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.45, 0.07), warmWindow);
    window.position.set(x, 1.08, 0.96);
    group.add(window);
  }

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), trim);
  chimney.position.set(0.78, 2.12, -0.25);
  group.add(chimney);

  const lantern = new THREE.PointLight(0xffbe66, 2.3, 4.2, 2);
  lantern.position.set(0, 1.25, 1.45);
  group.add(lantern);

  scene.add(group);
  return { group, lantern, windows: warmWindow };
}

function addEntrance(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(200, 1040, 0));
  const wood = mat(0x765439);
  const cloth = mat(0xe2b96d);

  for (const x of [-0.72, 0.72]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.0, 8), wood);
    post.position.set(x, 1.0, 0);
    post.castShadow = true;
    group.add(post);
  }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.42, 0.16), wood);
  sign.position.set(0, 1.72, 0);
  group.add(sign);
  const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.52, 3), cloth);
  pennant.rotation.z = Math.PI / 2;
  pennant.position.set(0, 2.1, 0.02);
  group.add(pennant);

  const light = new THREE.PointLight(0xffd37b, 1.7, 3.0, 2);
  light.position.set(0, 1.6, 0.5);
  group.add(light);
  scene.add(group);
  return { group, light };
}

function addClueCues(scene) {
  const feather = new THREE.Group();
  feather.position.copy(worldPoint(690, 320, 0.32));
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 8), mat(0x3c7ad9, { emissive: 0x173d7a, emissiveIntensity: 0.55 }));
  shaft.rotation.z = -0.5;
  const vaneA = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8), mat(0x79b7ff, { emissive: 0x1d4f91, emissiveIntensity: 0.55 }));
  vaneA.rotation.z = -0.58;
  vaneA.position.set(-0.08, 0.09, 0);
  const vaneB = vaneA.clone();
  vaneB.rotation.z = Math.PI - 0.58;
  vaneB.position.set(0.08, -0.08, 0);
  feather.add(shaft, vaneA, vaneB);
  const featherLight = new THREE.PointLight(0x84c5ff, 2.0, 2.5, 2);
  featherLight.position.y = 0.45;
  feather.add(featherLight);
  scene.add(feather);

  const footprints = new THREE.Group();
  const footprintPoints = [[760,430],[805,490],[850,550],[900,610],[920,680]];
  for (let i = 0; i < footprintPoints.length; i += 1) {
    const [x, y] = footprintPoints[i];
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.095, 12), new THREE.MeshBasicMaterial({ color: 0xd4a05e, transparent: true, opacity: 0.88 }));
    pad.rotation.x = -Math.PI / 2;
    pad.scale.set(0.7, 1.25, 1);
    pad.position.copy(worldPoint(x, y, 0.073));
    pad.rotation.z = (i % 2 ? 1 : -1) * 0.28;
    footprints.add(pad);
  }
  scene.add(footprints);

  const birdcall = new THREE.Group();
  birdcall.position.copy(worldPoint(920, 760, 0.1));
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28 + i * 0.24, 0.32 + i * 0.24, 36),
      new THREE.MeshBasicMaterial({ color: 0xa7e7b5, transparent: true, opacity: 0.48 - i * 0.1, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    birdcall.add(ring);
  }
  scene.add(birdcall);

  return { feather, featherLight, footprints, birdcall };
}

function addFirePit(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(920, 820, 0));
  const stoneMat = mat(0x7d786b, { roughness: 1 });
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), stoneMat);
    stone.scale.set(1.05, 0.58, 0.82);
    stone.position.set(Math.cos(a) * 0.58, 0.12, Math.sin(a) * 0.58);
    stone.castShadow = true;
    group.add(stone);
  }

  const logMat = mat(0x674327);
  for (const r of [-0.62, 0.62]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.15, 8), logMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = r;
    log.position.y = 0.18;
    group.add(log);
  }

  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff5a1f, emissiveIntensity: 1.8, transparent: true, opacity: 0.92 });
  const flameOuter = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 10), flameMat);
  flameOuter.position.y = 0.65;
  const flameInner = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.58, 10), new THREE.MeshBasicMaterial({ color: 0xffef93, transparent: true, opacity: 0.95 }));
  flameInner.position.y = 0.58;
  group.add(flameOuter, flameInner);

  const fireLight = new THREE.PointLight(0xff7a33, 3.0, 5.2, 2);
  fireLight.position.y = 1.25;
  group.add(fireLight);
  scene.add(group);
  return { group, flameOuter, flameInner, fireLight };
}

function addRidge(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(1300, 420, 0));
  const wood = mat(0x82613f);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 1.35), wood);
  deck.position.y = 0.18;
  deck.castShadow = true;
  group.add(deck);
  for (const x of [-0.95, 0.95]) {
    for (const z of [-0.48, 0.48]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood);
      post.position.set(x, 0.48, z);
      group.add(post);
    }
  }
  scene.add(group);

  const mountains = new THREE.Group();
  const mountainMat = mat(0x577068, { roughness: 1 });
  const farMat = mat(0x6f8780, { roughness: 1 });
  const configs = [
    [1420, 210, 1.4, 2.9, mountainMat],
    [1260, 170, 1.15, 2.4, farMat],
    [1530, 250, 1.0, 2.1, farMat],
  ];
  for (const [x, y, radius, height, material] of configs) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 5), material);
    mountain.position.copy(worldPoint(x, y, height * 0.5 - 0.25));
    mountain.rotation.y = 0.42;
    mountains.add(mountain);
  }
  scene.add(mountains);

  const ridgeLight = new THREE.DirectionalLight(0xc7e9ff, 1.3);
  ridgeLight.position.set(4, 7, -4);
  scene.add(ridgeLight);
  return { group, mountains, ridgeLight };
}

async function addBluebird(scene) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync("./assets/bluebird.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    const p = worldPoint(BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, 0);
    sprite.position.set(p.x, 1.55, p.z);
    sprite.scale.set(1.05, 1.12, 1);
    scene.add(sprite);
    const halo = new THREE.PointLight(0x7ac9ff, 1.6, 2.8, 2);
    halo.position.set(p.x, 1.4, p.z + 0.05);
    scene.add(halo);
    return { sprite, halo, texture };
  } catch {
    const fallback = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), mat(0x4d9ce6, { emissive: 0x163e78, emissiveIntensity: 0.6 }));
    const p = worldPoint(BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, 1.4);
    fallback.position.copy(p);
    scene.add(fallback);
    return { sprite: fallback, halo: null, texture: null };
  }
}

function addRewardSparkles(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(BLUEBIRD.VISUAL.x, BLUEBIRD.VISUAL.y, 1.05));
  for (let i = 0; i < 22; i += 1) {
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.04 + (i % 2) * 0.018), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffe89c : 0x9bd7ff, transparent: true, opacity: 0.9 }));
    spark.userData.phase = i * 0.43;
    group.add(spark);
  }
  scene.add(group);
  return group;
}

function fallbackObject(kind) {
  const group = new THREE.Group();
  if (kind === "tree") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.0, 8), mat(0x6f4d30));
    trunk.position.y = 0.5;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(0x47754a));
    crown.position.y = 1.12;
    crown.scale.set(1.05, 0.8, 0.92);
    group.add(trunk, crown);
  } else if (kind === "rock") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), mat(0x6d776b));
    rock.scale.set(1.1, 0.58, 0.88);
    rock.position.y = 0.18;
    group.add(rock);
  } else {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), mat(0x537b4e));
    shrub.scale.set(1.25, 0.62, 1.0);
    shrub.position.y = 0.22;
    group.add(shrub);
  }
  return group;
}

async function populateVendorAssets(scene) {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("./node_modules/three/examples/jsm/libs/draco/");
  loader.setDRACOLoader(draco);
  const library = new Map();
  const keys = [...new Set(CAMP_VENDOR_PLACEMENTS.map((p) => p.model))];

  await Promise.all(keys.map(async (key) => {
    const config = THREEJSASSETS_FREE_MODELS[key];
    if (!config) return;
    try {
      const gltf = await loader.loadAsync(threeVendorUrl(config));
      library.set(key, gltf.scene);
    } catch {
      library.set(key, null);
    }
  }));
  draco.dispose();

  const objects = [];
  for (const placement of CAMP_VENDOR_PLACEMENTS) {
    const config = THREEJSASSETS_FREE_MODELS[placement.model];
    const source = library.get(placement.model);
    const object = source ? source.clone(true) : fallbackObject(config?.fallback || "shrub");
    object.position.copy(worldPoint(placement.x, placement.y, config?.yOffset || 0));
    object.rotation.y = placement.rotation ?? config?.rotationY ?? 0;
    const scale = placement.scale ?? config?.scale ?? 1;
    object.scale.multiplyScalar(scale);
    object.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(object);
    objects.push(object);
  }
  return objects;
}

function addAtmosphere(scene) {
  scene.background = new THREE.Color(CAMP_PALETTES["sunlit-olive"]);
  scene.fog = new THREE.FogExp2(CAMP_PALETTES["sunlit-olive"], 0.018);
  const hemi = new THREE.HemisphereLight(0xfff4c8, 0x24422e, 2.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2a0, 2.8);
  sun.position.set(-6, 11, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fd5c0, 0.8);
  fill.position.set(8, 5, -6);
  scene.add(fill);
  return { hemi, sun, fill };
}

function applyVisualPhase(scene, renderer, phaseId) {
  const phase = getStageVisualPhase("camp", phaseId) || getStageVisualPhase("camp", "hut");
  const color = CAMP_PALETTES[phase.palette] ?? CAMP_PALETTES["sunlit-olive"];
  scene.background.setHex(color);
  if (scene.fog?.isFogExp2) {
    scene.fog.color.setHex(color);
    scene.fog.density = 0.012 + Math.max(0, Math.min(1, phase.fog || 0)) * 0.05;
  }
  renderer.toneMappingExposure = 0.96 + Math.max(0, Math.min(1, phase.warmth || 0)) * 0.2;
  return phase;
}

async function addPlayer(scene) {
  const playerSprite = new PlayerSprite();
  await playerSprite.load();
  const textureCache = new Map();
  const image = playerSprite.currentImage();
  const texture = image ? new THREE.Texture(image) : null;
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textureCache.set(image, texture);
  }
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.35, 1.8, 1);
  scene.add(sprite);
  const glow = new THREE.PointLight(0xffd98a, 1.2, 2.1, 2);
  scene.add(glow);

  function textureFor(nextImage) {
    if (!nextImage) return null;
    if (textureCache.has(nextImage)) return textureCache.get(nextImage);
    const next = new THREE.Texture(nextImage);
    next.colorSpace = THREE.SRGBColorSpace;
    next.needsUpdate = true;
    textureCache.set(nextImage, next);
    return next;
  }

  return {
    sprite,
    glow,
    playerSprite,
    update(dt, logical, previous) {
      const dx = logical.x - previous.x;
      const dy = logical.y - previous.y;
      const moving = Math.abs(dx) + Math.abs(dy) > 0.001;
      const magnitude = Math.hypot(dx, dy) || 1;
      const direction = moving ? { x: dx / magnitude, y: dy / magnitude } : { x: 0, y: 0 };
      playerSprite.update(dt, moving, direction);
      const frame = playerSprite.currentImage();
      if (frame && sprite.material.map?.image !== frame) {
        sprite.material.map = textureFor(frame);
        sprite.material.needsUpdate = true;
      }
      const p = worldPoint(logical.x, logical.y, 0);
      sprite.position.set(p.x, 1.02, p.z);
      glow.position.set(p.x, 0.82, p.z + 0.08);
    },
    dispose() {
      for (const cached of textureCache.values()) cached.dispose();
      textureCache.clear();
    },
  };
}

function disposeScene(scene) {
  const seenMaterials = new Set();
  const seenTextures = new Set();
  scene.traverse((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      if (seenMaterials.has(material)) continue;
      seenMaterials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture && !seenTextures.has(value)) {
          seenTextures.add(value);
          value.dispose();
        }
      }
      material.dispose?.();
    }
  });
}

export async function startThreeCampRuntime(baseCanvas, bridge) {
  if (!bridge || bridge.stageId !== "camp" || typeof bridge.getState !== "function" || typeof bridge.getPhase !== "function") {
    throw new TypeError("Three Camp runtime requires the Camp gameplay bridge");
  }

  const canvas = document.createElement("canvas");
  canvas.id = "three-camp-runtime";
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:1;touch-action:none;pointer-events:none;";
  baseCanvas.parentElement?.appendChild(canvas);
  baseCanvas.style.visibility = "hidden";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  addAtmosphere(scene);
  addGround(scene);
  addRoute(scene);
  const entrance = addEntrance(scene);
  const hut = addLearningHut(scene);
  const clues = addClueCues(scene);
  const fire = addFirePit(scene);
  const ridge = addRidge(scene);
  const bluebird = await addBluebird(scene);
  const rewardSparkles = addRewardSparkles(scene);
  const vendorObjects = await populateVendorAssets(scene);
  const player = await addPlayer(scene);

  const interactionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.34, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdf78, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false })
  );
  interactionRing.rotation.x = -Math.PI / 2;
  scene.add(interactionRing);

  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 60);
  camera.position.set(8.6, 11.5, 10.0);
  camera.lookAt(0, 0.2, 0);

  function resize() {
    const width = canvas.clientWidth || globalThis.innerWidth || 1280;
    const height = canvas.clientHeight || globalThis.innerHeight || 720;
    renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    const viewHeight = 10.6;
    camera.left = -(viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }
  resize();
  globalThis.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  let previousLogical = { ...bridge.player };
  let lastPhase = null;
  let rafId = 0;
  let disposed = false;

  function frame() {
    if (disposed) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    const logical = bridge.player;
    const state = bridge.getState();
    const phaseId = bridge.getPhase();

    if (phaseId !== lastPhase) {
      applyVisualPhase(scene, renderer, phaseId);
      lastPhase = phaseId;
    }

    const discovered = state?.discoveredClues || [];
    hut.group.visible = true;
    entrance.group.visible = !state?.questStarted;
    clues.feather.visible = Boolean(state?.questStarted && !discovered.includes("feather"));
    clues.footprints.visible = Boolean(discovered.includes("feather") && !discovered.includes("footprints"));
    clues.birdcall.visible = Boolean(discovered.includes("footprints") && !discovered.includes("birdcall"));
    fire.group.visible = Boolean(discovered.length >= 3 || state?.firePitComplete);
    ridge.group.visible = Boolean(state?.firePitComplete);
    ridge.mountains.visible = Boolean(state?.firePitComplete);
    bluebird.sprite.visible = phaseId === "bluebird" || phaseId === "reward";
    if (bluebird.halo) bluebird.halo.visible = bluebird.sprite.visible;
    rewardSparkles.visible = phaseId === "reward";

    hut.lantern.intensity = state?.questStarted ? 1.35 : 2.3 + Math.sin(t * 2.1) * 0.25;
    entrance.light.intensity = 1.55 + Math.sin(t * 2.3) * 0.18;
    clues.feather.rotation.y = Math.sin(t * 1.4) * 0.28;
    clues.feather.position.y = worldPoint(690, 320, 0.32).y + Math.sin(t * 2.4) * 0.08;
    clues.featherLight.intensity = 1.75 + Math.sin(t * 3.2) * 0.4;
    clues.birdcall.children.forEach((ring, index) => {
      const pulse = 1 + ((t * 0.45 + index * 0.28) % 1) * 0.55;
      ring.scale.setScalar(pulse);
      ring.material.opacity = 0.5 - ((t * 0.45 + index * 0.28) % 1) * 0.34;
    });
    fire.flameOuter.scale.y = 0.92 + Math.sin(t * 6.3) * 0.12;
    fire.flameInner.scale.y = 0.9 + Math.sin(t * 7.4 + 1.2) * 0.1;
    fire.fireLight.intensity = 2.8 + Math.sin(t * 8.0) * 0.35;
    if (bluebird.sprite.visible) bluebird.sprite.position.y = 1.55 + Math.sin(t * 2.8) * 0.08;
    rewardSparkles.children.forEach((spark, index) => {
      const a = t * 1.6 + spark.userData.phase;
      spark.position.set(Math.cos(a) * (0.5 + (index % 4) * 0.11), 0.28 + Math.sin(a * 1.4) * 0.42, Math.sin(a) * 0.42);
    });

    player.update(dt, logical, previousLogical);
    previousLogical = { x: logical.x, y: logical.y };

    const p = worldPoint(logical.x, logical.y, 0);
    const focusX = THREE.MathUtils.clamp(p.x, -3.2, 3.2);
    const focusZ = THREE.MathUtils.clamp(p.z * 0.62 - 0.45, -3.1, 3.1);
    const look = new THREE.Vector3(focusX, 0.3, focusZ);
    camera.position.set(focusX + 8.1, 11.3, focusZ + 9.5);
    camera.lookAt(look);

    const target = bridge.getTarget?.() || null;
    interactionRing.visible = Boolean(target);
    if (target) {
      interactionRing.position.copy(worldPoint(target.x, target.y, 0.09));
      interactionRing.scale.setScalar(1 + Math.sin(t * 3.0) * 0.13);
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    globalThis.removeEventListener("resize", resize);
    player.dispose();
    bluebird.texture?.dispose?.();
    disposeScene(scene);
    renderer.dispose();
    canvas.remove();
    baseCanvas.style.visibility = "visible";
  }

  const runtime = Object.freeze({
    scene,
    camera,
    renderer,
    canvas,
    geometryContract,
    vendorObjects,
    getPhase: () => bridge.getPhase(),
    dispose,
  });
  globalThis.__eduniThreeCamp = runtime;
  return runtime;
}
