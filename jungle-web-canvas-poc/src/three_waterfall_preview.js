import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { WaterfallWorldGeometry } from "./geometry.js";
import {
  THREEJSASSETS_FREE_MODELS,
  WATERFALL_THREE_PLACEMENTS,
  threeVendorUrl,
} from "./three_vendor_manifest.js";
import { sampleHeight, sampleNormal, generateTerrainMesh, getTerrainInfo } from "./terrain.js";

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new WaterfallWorldGeometry();

export function logicalToThree(x, y, height = 0) {
  return new THREE.Vector3(
    (x - WORLD_CENTER.x) * WORLD_SCALE,
    height,
    (y - WORLD_CENTER.y) * WORLD_SCALE
  );
}

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0,
    ...extra,
  });
}

const worldPoint = logicalToThree;

function inspectModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let meshes = 0;
  let triangles = 0;
  let materials = 0;
  let textures = 0;
  const seenMaterials = new Set();
  const seenTextures = new Set();
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    meshes += 1;
    const geometry = obj.geometry;
    if (geometry?.index) triangles += geometry.index.count / 3;
    else if (geometry?.attributes?.position) triangles += geometry.attributes.position.count / 3;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    list.filter(Boolean).forEach((mat) => {
      if (seenMaterials.has(mat)) return;
      seenMaterials.add(mat);
      materials += 1;
      Object.values(mat).forEach((value) => {
        if (value?.isTexture && !seenTextures.has(value)) {
          seenTextures.add(value);
          textures += 1;
        }
      });
    });
  });
  return {
    meshes,
    triangles: Math.round(triangles),
    materials,
    textures,
    dimensions: { x: size.x, y: size.y, z: size.z },
    origin: { x: root.position.x, y: root.position.y, z: root.position.z },
    upAxis: "Y",
  };
}

function addGround(scene) {
  const terrainData = generateTerrainMesh(160, 108);
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute("position", new THREE.Float32BufferAttribute(terrainData.vertices, 3));
  terrainGeo.setAttribute("normal", new THREE.Float32BufferAttribute(terrainData.normals, 3));
  terrainGeo.setAttribute("uv", new THREE.Float32BufferAttribute(terrainData.uvs, 2));
  terrainGeo.setIndex(terrainData.indices);
  terrainGeo.computeBoundingSphere();

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x315c3f,
    roughness: 0.95,
    metalness: 0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  const basin = new THREE.Mesh(
    new THREE.CircleGeometry(4.4, 72),
    new THREE.MeshPhysicalMaterial({
      color: 0x2e9ba9,
      transparent: true,
      opacity: 0.78,
      roughness: 0.16,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
    })
  );
  basin.rotation.x = -Math.PI / 2;
  basin.scale.set(1, 0.55, 1);
  const basinH = sampleHeight(1050, 535);
  basin.position.copy(worldPoint(1050, 535, basinH + 0.025));
  scene.add(basin);

  const stream = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 1.75),
    new THREE.MeshPhysicalMaterial({
      color: 0x287f98,
      transparent: true,
      opacity: 0.73,
      roughness: 0.22,
      clearcoat: 0.3,
    })
  );
  stream.rotation.set(-Math.PI / 2, 0, -0.22);
  const streamH = sampleHeight(820, 760);
  stream.position.copy(worldPoint(820, 760, streamH + 0.03));
  scene.add(stream);

  return { basin, stream, terrain };
}

function addRoute(scene) {
  const route = geometryContract.paths[0] || [];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.72;
  const routeMat = material(0xa99a60, { roughness: 1 });
  const edgeMat = material(0x65734d, { roughness: 1 });

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i];
    const b = route[i + 1];
    const ha = sampleHeight(a.x, a.y) + 0.055;
    const hb = sampleHeight(b.x, b.y) + 0.055;
    const a3 = worldPoint(a.x, a.y, ha);
    const b3 = worldPoint(b.x, b.y, hb);
    const dx = b3.x - a3.x;
    const dz = b3.z - a3.z;
    const len = Math.hypot(dx, dz);
    const mid = a3.clone().add(b3).multiplyScalar(0.5);
    const angle = -Math.atan2(dz, dx);

    const edge = new THREE.Mesh(new THREE.PlaneGeometry(len + radius, radius * 2.2), edgeMat);
    edge.rotation.set(-Math.PI / 2, 0, angle);
    edge.position.copy(mid);
    edge.position.y = mid.y - 0.013;
    scene.add(edge);

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * 0.5, radius * 1.5), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = mid.y + 0.005;
    scene.add(strip);
  }

  for (const node of route) {
    const h = sampleHeight(node.x, node.y) + 0.062;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, h));
    scene.add(pad);
  }
}

function addWaterfall(scene) {
  const cliffMat = material(0x45564c, { roughness: 0.94 });
  const cliffH = sampleHeight(1170, 210);
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(4.1, 4.4, 0.72), cliffMat);
  cliff.position.copy(worldPoint(1170, 210, cliffH + 1.82));
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  scene.add(cliff);

  const fallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x72dff2,
    transparent: true,
    opacity: 0.72,
    roughness: 0.05,
    transmission: 0.12,
    clearcoat: 0.8,
    side: THREE.DoubleSide,
  });
  const waterfallH = sampleHeight(1170, 350);
  const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 4.2, 1, 16), fallMaterial);
  // Pull the animated sheet slightly toward the camera so the landmark stays
  // visible above the basin and vendor props.
  waterfall.position.copy(worldPoint(1170, 350, waterfallH + 2.15));
  waterfall.rotation.y = 0;
  scene.add(waterfall);

  const streaks = [];
  for (let i = 0; i < 5; i += 1) {
    const streak = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14 + (i % 2) * 0.05, 2.7 + (i % 3) * 0.35),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0xe7ffff : 0x63d9f1,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
      })
    );
    const x = 1169 + (i - 2) * 38;
    const y = 350 + (i % 2) * 8;
    const streakH = sampleHeight(x, y);
    streak.position.copy(worldPoint(x, y, streakH + 2.2));
    streak.position.x += (i - 2) * 0.22;
    scene.add(streak);
    streaks.push(streak);
  }

  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe7ffff,
    transparent: true,
    opacity: 0.55,
    roughness: 0.4,
  });
  const foamH = sampleHeight(1170, 465);
  const foam = new THREE.Mesh(new THREE.CircleGeometry(1.55, 36), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.scale.set(1.25, 0.55, 1);
  foam.position.copy(worldPoint(1170, 465, foamH + 0.08));
  scene.add(foam);

  return { waterfall, streaks, foam };
}

function addSteppingStones(scene) {
  const points = [[860,770],[920,745],[980,720],[1040,705],[1080,700]];
  const moss = material(0x78876a, { roughness: 0.96 });
  const wet = material(0x9da79b, { roughness: 0.62 });
  const stones = [];

  points.forEach(([x, y], index) => {
    const h = sampleHeight(x, y) + 0.18;
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.33 + (index % 2) * 0.04, 0), index % 3 === 0 ? moss : wet);
    mesh.scale.set(1.1, 0.36 + (index % 2) * 0.08, 0.8 + (index % 3) * 0.08);
    mesh.rotation.y = index * 0.47;
    mesh.position.copy(worldPoint(x, y, h));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    stones.push(mesh);
  });

  return stones;
}

function addGate(scene) {
  const wood = material(0x775033);
  const moss = material(0x56704a);
  const group = new THREE.Group();
  const left = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), wood);
  const right = left.clone();
  left.position.set(-0.7, 1.2, 0);
  right.position.set(0.7, 1.2, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.24, 0.26), wood);
  top.position.set(0, 2.25, 0);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 6, 20, Math.PI), moss);
  crown.rotation.z = Math.PI;
  crown.position.set(0, 2.22, 0);
  group.add(left, right, top, crown);
  const gateH = sampleHeight(700, 900);
  group.position.copy(worldPoint(700, 900, gateH));
  group.rotation.y = -0.12;
  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
  scene.add(group);
}

function addLookout(scene) {
  const group = new THREE.Group();
  const wood = material(0x8b603c);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.35), wood);
  deck.position.y = 0.78;
  group.add(deck);
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.48, 0.48]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), wood);
      post.position.set(x, 0.3, z);
      group.add(post);
    }
  }
  const lookoutH = sampleHeight(1450, 330);
  group.position.copy(worldPoint(1450, 330, lookoutH));
  group.rotation.y = 0.12;
  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
  scene.add(group);
}

async function addStoryEnvironment(scene) {
  const glowMat = (color, opacity) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
  });
  const gateLanterns = new THREE.Group();
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xb85d18, emissiveIntensity: 0.9 });
  for (const x of [650, 750]) {
    const h = sampleHeight(x, 900);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), lanternMat);
    lantern.position.copy(worldPoint(x, 900, h + 1.75));
    gateLanterns.add(lantern);
  }
  scene.add(gateLanterns);

  const crossingGlow = new THREE.Group();
  for (const [x, y] of [[860, 770], [960, 720], [1080, 700]]) {
    const h = sampleHeight(x, y);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), glowMat(0xffdc73, 0.28));
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(x, y, h + 0.075));
    crossingGlow.add(pad);
  }
  scene.add(crossingGlow);

  const mist = new THREE.Group();
  const mistMat = new THREE.MeshBasicMaterial({ color: 0xd9ffff, transparent: true, opacity: 0.14, depthWrite: false });
  for (let i = 0; i < 8; i += 1) {
    const x = 1010 + (i % 4) * 85;
    const y = 470 + Math.floor(i / 4) * 75;
    const h = sampleHeight(x, y);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.42 + (i % 3) * 0.12, 14, 10), mistMat);
    puff.scale.y = 0.28;
    puff.position.copy(worldPoint(x, y, h + 0.38 + (i % 2) * 0.1));
    mist.add(puff);
  }
  scene.add(mist);

  const leafGlow = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x8fd971, emissive: 0x255a31, emissiveIntensity: 0.28, roughness: 0.75 });
  for (let i = 0; i < 14; i += 1) {
    const x = 1185 + (i % 5) * 30;
    const y = 440 + Math.floor(i / 5) * 26;
    const h = sampleHeight(x, y);
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.06 + (i % 3) * 0.018, 8), leafMat);
    leaf.rotation.x = -Math.PI / 2;
    leaf.position.copy(worldPoint(x, y, h + 0.13));
    leafGlow.add(leaf);
  }
  scene.add(leafGlow);

  const lookoutGlowH = sampleHeight(1450, 330);
  const lookoutGlow = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.64, 32), glowMat(0xffd27a, 0.3));
  lookoutGlow.rotation.x = -Math.PI / 2;
  lookoutGlow.position.copy(worldPoint(1450, 330, lookoutGlowH + 0.1));
  scene.add(lookoutGlow);

  const rewardH = sampleHeight(1410, 400);
  const reward = new THREE.Group();
  const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xfff3a8, transparent: true, opacity: 0.86 });
  for (let i = 0; i < 16; i += 1) {
    const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.055 + (i % 2) * 0.025), sparkleMat);
    sparkle.userData.phase = i * 0.52;
    reward.add(sparkle);
  }
  reward.position.copy(worldPoint(1410, 400, rewardH + 1.25));
  scene.add(reward);

  let kingfisher = null;
  try {
    const texture = await new THREE.TextureLoader().loadAsync("assets/bluebird.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    kingfisher = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    kingfisher.scale.set(0.86, 0.86, 1);
    const kingfisherH = sampleHeight(1410, 400);
    kingfisher.position.copy(worldPoint(1410, 400, kingfisherH + 2.15));
    scene.add(kingfisher);
  } catch {
    const kingfisherH = sampleHeight(1410, 400);
    kingfisher = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x3c7bea }));
    kingfisher.position.copy(worldPoint(1410, 400, kingfisherH + 2.15));
    scene.add(kingfisher);
  }
  return { gateLanterns, crossingGlow, mist, leafGlow, lookoutGlow, kingfisher, reward };
}

function fallbackObject(kind) {
  const group = new THREE.Group();
  if (kind === "tree") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.8, 7), material(0x6b4a31));
    trunk.position.y = 0.9;
    const crownA = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.8, 9), material(0x356b45));
    crownA.position.y = 2.2;
    const crownB = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.45, 9), material(0x4d8250));
    crownB.position.y = 3.0;
    group.add(trunk, crownA, crownB);
  } else if (kind === "rock") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), material(0x65746c));
    rock.scale.set(1.25, 0.65, 0.9);
    rock.position.y = 0.35;
    group.add(rock);
  } else if (kind === "reeds") {
    for (let i = 0; i < 9; i += 1) {
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.9 + (i % 3) * 0.15, 5), material(0x648657));
      reed.position.set((i % 3) * 0.14 - 0.14, 0.45, Math.floor(i / 3) * 0.12 - 0.12);
      group.add(reed);
    }
  } else if (kind === "mist") {
    const mistMat = new THREE.MeshBasicMaterial({ color: 0xdffcff, transparent: true, opacity: 0.14, depthWrite: false });
    for (let i = 0; i < 5; i += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.45 + i * 0.05, 12, 8), mistMat);
      puff.scale.y = 0.38;
      puff.position.set((i - 2) * 0.42, 0.55 + (i % 2) * 0.08, (i % 3 - 1) * 0.18);
      group.add(puff);
    }
  } else if (kind === "water") {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshPhysicalMaterial({ color: 0x2f9daa, transparent: true, opacity: 0.6, roughness: 0.18 }));
    water.rotation.x = -Math.PI / 2;
    group.add(water);
  } else {
    const base = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), material(0x416b48));
    base.scale.set(1.3, 0.8, 1.1);
    base.position.y = 0.45;
    group.add(base);
  }
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return group;
}

async function loadVendorLibrary(onProgress) {
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const entries = Object.entries(THREEJSASSETS_FREE_MODELS);
  const library = new Map();
  let loaded = 0;
  let fallbacks = 0;

  await Promise.all(entries.map(async ([key, config]) => {
    try {
      const gltf = await loader.loadAsync(threeVendorUrl(config));
      const root = gltf.scene;
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      library.set(key, root);
      root.userData.vendorConfig = config;
      root.userData.sanity = inspectModel(root);
      loaded += 1;
    } catch {
      library.set(key, null);
      fallbacks += 1;
    }
    onProgress?.({ loaded, fallbacks, total: entries.length });
  }));

  draco.dispose();
  const report = Object.fromEntries(entries.map(([key, config]) => [
    key,
    { ...config, loaded: !!library.get(key), sanity: library.get(key)?.userData?.sanity || null },
  ]));
  return { library, loaded, fallbacks, total: entries.length, report };
}

function populateVendorAssets(scene, library) {
  const objects = [];
  for (const placement of WATERFALL_THREE_PLACEMENTS) {
    const config = THREEJSASSETS_FREE_MODELS[placement.model];
    const source = library.get(placement.model);
    const object = source ? source.clone(true) : fallbackObject(config?.fallback || "shrub");
    object.position.copy(worldPoint(placement.x, placement.y, config?.yOffset || 0));
    object.rotation.y = placement.rotation ?? config?.rotationY ?? 0;
    const scale = placement.scale ?? config?.scale ?? 1;
    object.scale.multiplyScalar(scale);
    scene.add(object);
    objects.push({ object, placement });
  }
  return objects;
}

async function addPlayerBillboard(scene) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync("assets/player/player_front_idle_00_v01.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    const textureCache = new Map();
    const cacheTexture = (image, sourceTexture = null) => {
      if (!image) return null;
      if (textureCache.has(image)) return textureCache.get(image);
      const cached = sourceTexture || new THREE.Texture(image);
      cached.colorSpace = THREE.SRGBColorSpace;
      cached.needsUpdate = true;
      textureCache.set(image, cached);
      return cached;
    };
    cacheTexture(texture.image, texture);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }));
    const anchor = worldPoint(700, 930, 0);
    sprite.position.set(anchor.x, 1.02, anchor.z);
    sprite.scale.set(1.35, 1.8, 1);
    scene.add(sprite);
    const glow = new THREE.PointLight(0xffd98a, 1.4, 2.2, 2);
    glow.position.set(anchor.x, 0.85, anchor.z + 0.08);
    scene.add(glow);
    return {
      sprite,
      glow,
      textureCache,
      cacheTexture,
      disposeTextures() {
        for (const cached of textureCache.values()) cached.dispose();
        textureCache.clear();
      },
    };
  } catch {
    return null;
  }
}

function addAtmosphere(scene) {
  scene.background = new THREE.Color(0x88bfb8);
  scene.fog = new THREE.FogExp2(0x88bfb8, 0.027);

  const hemi = new THREE.HemisphereLight(0xd9ffff, 0x244632, 2.25);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffedbd, 3.2);
  sun.position.set(-7, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x8fe6e4, 1.1);
  fill.position.set(8, 6, -7);
  scene.add(fill);
}

export async function startThreeWaterfallPreview(canvas, statusEl, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  addAtmosphere(scene);
  const water = addGround(scene);
  addRoute(scene);
  const fall = addWaterfall(scene);
  const stones = addSteppingStones(scene);
  addGate(scene);
  addLookout(scene);

  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 60);
  camera.position.set(8.8, 11.5, 10.2);
  camera.lookAt(0.8, 0.2, -0.4);

  const debugControls = new URLSearchParams(globalThis.location?.search || "").get("threeDebug") === "1";
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = debugControls;
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minZoom = 0.78;
  controls.maxZoom = 1.6;
  controls.target.set(0.8, 0.3, -0.5);
  controls.update();

  const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
  };
  setStatus("Three.js scene ready · loading local threejsassets GLBs…");

  const vendor = await loadVendorLibrary(({ loaded, fallbacks, total }) => {
    setStatus(`threejsassets: ${loaded}/${total} local GLB · fallback ${fallbacks}`);
  });
  const vendorObjects = populateVendorAssets(scene, vendor.library);
  const player = await addPlayerBillboard(scene);
  const story = await addStoryEnvironment(scene);
  if (statusEl) statusEl.dataset.vendorReport = JSON.stringify(vendor.report);
  setStatus(
    vendor.loaded
      ? `threejsassets local GLB ${vendor.loaded}/${vendor.total} loaded · fallback ${vendor.fallbacks}`
      : "Three.js hybrid preview · vendor GLBs not present, using low-poly fallbacks"
  );

  function resize() {
    const width = canvas.clientWidth || globalThis.innerWidth || 1280;
    const height = canvas.clientHeight || globalThis.innerHeight || 720;
    renderer.setSize(width, height, false);
    const aspect = width / Math.max(1, height);
    const viewHeight = 10.8;
    camera.left = -(viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  const cueAnchors = [
    { key: "streamGateComplete", point: [700, 900] },
    { key: "steppingStonesComplete", point: [1080, 700] },
    { key: "echo", point: [1170, 560] },
    { key: "mistTrail", point: [1020, 480] },
    { key: "waterDrops", point: [1250, 470] },
    { key: "lookoutComplete", point: [1450, 330] },
    { key: "kingfisherComplete", point: [1410, 400] },
    { key: "rewardComplete", point: [1410, 400] },
  ].map((cue) => {
    const h = sampleHeight(cue.point[0], cue.point[1]);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.27, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(worldPoint(...cue.point, h + 0.08));
    scene.add(ring);
    return { ...cue, ring };
  });
  resize();
  globalThis.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;
  function frame() {
    if (disposed) return;
    const t = clock.getElapsedTime();
    fall.waterfall.material.opacity = 0.74 + Math.sin(t * 2.2) * 0.06;
    fall.streaks.forEach((streak, index) => {
      streak.material.opacity = 0.38 + Math.sin(t * 2.4 + index) * 0.08;
      streak.position.y += Math.sin(t * 1.3 + index * 0.6) * 0.00025;
    });
    fall.foam.material.opacity = 0.45 + Math.sin(t * 1.7) * 0.08;
    water.basin.material.opacity = 0.72 + Math.sin(t * 0.9) * 0.03;
    stones.forEach((stone, index) => {
      const baseH = sampleHeight(
        [860, 920, 980, 1040, 1080][index],
        [770, 745, 720, 705, 700][index]
      );
      stone.position.y = baseH + 0.18 + Math.sin(t * 1.5 + index * 0.7) * 0.012;
    });
    const state = options.getState?.() || null;
    const clues = state?.adventure?.discoveredClues || [];
    const productionState = options.production ? state : {
      streamGateComplete: true,
      steppingStonesComplete: true,
      adventure: { discoveredClues: ["echo", "mistTrail", "waterDrops"], clueQuizzesComplete: true, birdComplete: false },
      lookoutComplete: true,
      rewardComplete: false,
    };
    const storyClues = productionState?.adventure?.discoveredClues || [];
    story.gateLanterns.visible = !productionState?.streamGateComplete;
    story.crossingGlow.visible = Boolean(productionState?.streamGateComplete && !productionState?.steppingStonesComplete);
    story.mist.visible = Boolean(storyClues.includes("echo") && !storyClues.includes("mistTrail"));
    story.leafGlow.visible = Boolean(storyClues.includes("echo") && storyClues.includes("mistTrail") && !storyClues.includes("waterDrops"));
    story.lookoutGlow.visible = Boolean(productionState?.adventure?.clueQuizzesComplete && !productionState?.lookoutComplete);
    story.kingfisher.visible = Boolean(productionState?.lookoutComplete && !productionState?.adventure?.birdComplete);
    story.reward.visible = Boolean(productionState?.adventure?.birdComplete && !productionState?.rewardComplete);
    if (story.kingfisher.visible) story.kingfisher.position.y = 2.15 + Math.sin(t * 2.8) * 0.09;
    story.reward.children.forEach((sparkle, index) => {
      const a = t * 1.7 + sparkle.userData.phase;
      sparkle.position.set(Math.cos(a) * (0.55 + (index % 3) * 0.12), 0.35 + Math.sin(a * 1.6) * 0.42, Math.sin(a) * 0.38);
    });
    cueAnchors.forEach((cue, index) => {
      const unlocked = [
        !state?.streamGateComplete,
        Boolean(state?.streamGateComplete && !state?.steppingStonesComplete),
        Boolean(state?.steppingStonesComplete && !clues.includes("echo")),
        Boolean(clues.includes("echo") && !clues.includes("mistTrail")),
        Boolean(clues.includes("echo") && clues.includes("mistTrail") && !clues.includes("waterDrops")),
        Boolean(state?.adventure?.clueQuizzesComplete && !state?.lookoutComplete),
        Boolean(state?.lookoutComplete && !state?.adventure?.birdComplete),
        Boolean(state?.adventure?.birdComplete && !state?.rewardComplete),
      ][index];
      cue.ring.visible = Boolean(options.production && unlocked && !state?.rewardComplete);
      cue.ring.scale.setScalar(1 + Math.sin(t * 2.1 + index) * 0.12);
    });
    if (options.production) {
      const logical = options.getPlayer?.();
      if (logical) {
        const p = worldPoint(logical.x, logical.y, 0);
        const playerH = sampleHeight(logical.x, logical.y);
        const targetX = THREE.MathUtils.clamp(p.x, -3.1, 3.1);
        const targetZ = THREE.MathUtils.clamp(p.z * 0.62 - 0.55, -3.0, 3.0);
        controls.target.x += (targetX - controls.target.x) * 0.08;
        controls.target.z += (targetZ - controls.target.z) * 0.08;
        camera.position.x = controls.target.x + 8.0;
        camera.position.z = controls.target.z + 9.5;
        camera.position.y = 11.5;
        if (player?.sprite) {
          player.sprite.position.copy(p);
          player.sprite.position.y = playerH + 1.02;
          player.glow.position.set(p.x, playerH + 0.85, p.z + 0.08);
          const image = options.getPlayerImage?.();
          if (image && player.sprite.material.map?.image !== image) {
            player.sprite.material.map = player.cacheTexture(image);
            player.sprite.material.needsUpdate = true;
          }
        }
      }
    }
    controls.update();
    renderer.render(scene, camera);
    if (statusEl) statusEl.dataset.rendererInfo = JSON.stringify({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    });
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(rafId);
    globalThis.removeEventListener("resize", resize);
    player?.disposeTextures?.();
    scene.traverse((obj) => {
      if (obj.geometry?.dispose) obj.geometry.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.filter(Boolean).forEach((mat) => {
        Object.values(mat).forEach((value) => value?.isTexture && value.dispose());
        mat.dispose?.();
      });
    });
    renderer.dispose();
  };

  globalThis.__eduniThreeWaterfall = { scene, camera, renderer, controls, vendor, player, vendorObjects, geometryContract, dispose };
}
