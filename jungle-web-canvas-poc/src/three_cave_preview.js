import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CaveWorldGeometry } from "./geometry.js";
import { getStageVisualPhase } from "./content/stage_manifest.js";
import { THREEJSASSETS_FREE_MODELS, threeVendorUrl } from "./three_vendor_manifest.js";

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new CaveWorldGeometry();

const PHASES = Object.freeze([
  "caveGate",
  "glowTrail",
  "echoCrystal",
  "shadowMark",
  "fireflyPattern",
  "crystalBridge",
  "bat",
  "reward",
  "complete",
]);

const PHASE_ANCHORS = Object.freeze({
  caveGate: [420, 930],
  glowTrail: [620, 860],
  echoCrystal: [780, 700],
  shadowMark: [930, 600],
  fireflyPattern: [1080, 520],
  crystalBridge: [1260, 460],
  bat: [1420, 340],
  reward: [1420, 340],
  complete: [1420, 340],
});

const CAVE_PALETTES = Object.freeze({
  "twilight-violet": 0x26253f,
  "glow-green": 0x243f39,
  "crystal-blue": 0x263d50,
  "indigo-shadow": 0x25233e,
  "firefly-lime": 0x31443a,
  "cyan-crystal": 0x294653,
  "moonlit-indigo": 0x2d3152,
  "aurora-cave": 0x38515a,
});

const SELECTED_VENDOR_KEYS = Object.freeze(["boulder", "rockCluster", "mossyBoulder", "swampMistCloud"]);

export function caveLogicalToThree(x, y, height = 0) {
  return new THREE.Vector3(
    (x - WORLD_CENTER.x) * WORLD_SCALE,
    height,
    (y - WORLD_CENTER.y) * WORLD_SCALE
  );
}

const worldPoint = caveLogicalToThree;

function standardMaterial(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });
}

function addGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    standardMaterial(0x202b31, { roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const chamber = new THREE.Mesh(
    new THREE.CircleGeometry(2.45, 48),
    standardMaterial(0x26343d, { roughness: 0.96 })
  );
  chamber.rotation.x = -Math.PI / 2;
  chamber.scale.set(1.25, 0.7, 1);
  chamber.position.copy(worldPoint(1080, 520, 0.018));
  scene.add(chamber);
  return { ground, chamber };
}

function addRoute(scene) {
  const route = geometryContract.paths[0];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.72;
  const edgeMat = standardMaterial(0x313341, { roughness: 1 });
  const routeMat = standardMaterial(0x625b72, { roughness: 1 });

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = worldPoint(route[i].x, route[i].y, 0.045);
    const b = worldPoint(route[i + 1].x, route[i + 1].y, 0.045);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const angle = -Math.atan2(dz, dx);

    const edge = new THREE.Mesh(new THREE.PlaneGeometry(len + radius, radius * 2.15), edgeMat);
    edge.rotation.set(-Math.PI / 2, 0, angle);
    edge.position.copy(mid);
    edge.position.y = 0.035;
    scene.add(edge);

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * 0.45, radius * 1.48), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = 0.052;
    scene.add(strip);
  }

  for (const node of route) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.76, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, 0.054));
    scene.add(pad);
  }
}

function fallbackRock() {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.58, 0),
    standardMaterial(0x485058, { roughness: 1 })
  );
  rock.scale.set(1.35, 0.8, 1);
  rock.position.y = 0.35;
  rock.castShadow = true;
  rock.receiveShadow = true;
  const group = new THREE.Group();
  group.add(rock);
  return group;
}

async function loadCaveVendorLibrary(onProgress) {
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const library = new Map();
  let loaded = 0;
  let fallbacks = 0;

  await Promise.all(SELECTED_VENDOR_KEYS.map(async (key) => {
    const config = THREEJSASSETS_FREE_MODELS[key];
    try {
      const gltf = await loader.loadAsync(threeVendorUrl(config));
      gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      library.set(key, gltf.scene);
      loaded += 1;
    } catch {
      library.set(key, null);
      fallbacks += 1;
    }
    onProgress?.({ loaded, fallbacks, total: SELECTED_VENDOR_KEYS.length });
  }));
  draco.dispose();
  return { library, loaded, fallbacks, total: SELECTED_VENDOR_KEYS.length };
}

function populateCaveRocks(scene, library) {
  const placements = [
    ["rockCluster", 330, 985, 1.15, -0.2], ["boulder", 455, 1010, 1.0, 0.15],
    ["mossyBoulder", 345, 845, 0.95, 0.1], ["rockCluster", 505, 835, 1.05, -0.15],
    ["boulder", 690, 790, 0.9, 0.3], ["rockCluster", 825, 765, 1.1, -0.25],
    ["mossyBoulder", 850, 625, 0.95, 0.2], ["rockCluster", 990, 670, 1.0, -0.1],
    ["boulder", 1015, 425, 1.15, 0.18], ["rockCluster", 1160, 625, 1.05, -0.22],
    ["mossyBoulder", 1195, 365, 0.9, 0.16], ["rockCluster", 1335, 535, 1.0, -0.2],
    ["boulder", 1350, 275, 1.2, 0.18], ["rockCluster", 1500, 400, 1.12, -0.14],
  ];

  const objects = [];
  for (const [key, x, y, scale, rotation] of placements) {
    const source = library.get(key);
    const object = source ? source.clone(true) : fallbackRock();
    object.position.copy(worldPoint(x, y, 0));
    object.rotation.y = rotation;
    object.scale.multiplyScalar(scale);
    scene.add(object);
    objects.push(object);
  }
  return objects;
}

function crystalMaterial(color, intensity = 1.2) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.22,
    metalness: 0.02,
    transparent: true,
    opacity: 0.92,
  });
}

function addCrystalCluster(scene, x, y, color, scale = 1) {
  const group = new THREE.Group();
  const mat = crystalMaterial(color);
  const heights = [0.8, 1.2, 0.65, 1.0, 0.72];
  heights.forEach((height, index) => {
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.13 + (index % 2) * 0.035, height, 6), mat);
    crystal.position.set((index - 2) * 0.18, height * 0.5, ((index % 2) - 0.5) * 0.16);
    crystal.rotation.z = (index - 2) * 0.055;
    crystal.castShadow = true;
    group.add(crystal);
  });
  group.position.copy(worldPoint(x, y, 0.06));
  group.scale.setScalar(scale);
  scene.add(group);
  return group;
}

function addCrystals(scene) {
  return {
    echo: addCrystalCluster(scene, 780, 700, 0x75d7ff, 1.15),
    chamberA: addCrystalCluster(scene, 1020, 575, 0x87f0ce, 0.9),
    chamberB: addCrystalCluster(scene, 1130, 475, 0xa5ff8d, 1.0),
    bridgeA: addCrystalCluster(scene, 1220, 515, 0x68eaff, 0.72),
    bridgeB: addCrystalCluster(scene, 1315, 405, 0x90dfff, 0.8),
    roost: addCrystalCluster(scene, 1455, 390, 0xb3b8ff, 0.86),
  };
}

function addFireflyCloud(scene, x, y, count, radius, color = 0xdfff75) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.399963;
    const r = radius * (0.3 + ((i * 37) % 100) / 145);
    const p = worldPoint(x, y, 0.35 + (i % 7) * 0.11);
    positions[i * 3] = p.x + Math.cos(a) * r;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z + Math.sin(a) * r * 0.65;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size: 0.085,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

function addStoryEnvironment(scene) {
  const entranceFireflies = addFireflyCloud(scene, 420, 930, 34, 1.05, 0xffe681);
  const trailFireflies = new THREE.Group();
  for (const [x, y] of [[500,900],[565,880],[620,860],[685,805],[735,750]]) {
    const point = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xdfff73 })
    );
    point.position.copy(worldPoint(x, y, 0.55));
    trailFireflies.add(point);
  }
  scene.add(trailFireflies);

  const echoRings = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.34 + i * 0.27, 0.37 + i * 0.27, 32),
      new THREE.MeshBasicMaterial({ color: 0x9feaff, transparent: true, opacity: 0.38 - i * 0.08, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(worldPoint(780, 700, 0.09));
    echoRings.add(ring);
  }
  scene.add(echoRings);

  const shadowMark = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.52, 6),
    new THREE.MeshBasicMaterial({ color: 0x7f80c9, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
  );
  shadowMark.position.copy(worldPoint(930, 600, 0.78));
  shadowMark.rotation.x = -0.25;
  scene.add(shadowMark);

  const chamberFireflies = addFireflyCloud(scene, 1080, 520, 70, 1.45, 0xcfff68);

  const crystalBridge = new THREE.Group();
  const bridgeMat = crystalMaterial(0x6fddff, 0.75);
  const bridgePoints = [[1150,500],[1195,487],[1240,472],[1285,442],[1320,415]];
  bridgePoints.forEach(([x, y], index) => {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.13, 0.42), bridgeMat);
    slab.position.copy(worldPoint(x, y, 0.13));
    slab.rotation.y = -0.18 + index * 0.05;
    crystalBridge.add(slab);
  });
  scene.add(crystalBridge);

  const bat = new THREE.Group();
  const batMat = new THREE.MeshBasicMaterial({ color: 0x1a1a27, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), batMat);
  body.scale.set(0.75, 1.1, 0.6);
  bat.add(body);
  for (const side of [-1, 1]) {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(side * 0.62, 0.18);
    wingShape.lineTo(side * 0.42, -0.08);
    wingShape.lineTo(side * 0.7, -0.22);
    wingShape.lineTo(side * 0.22, -0.18);
    wingShape.closePath();
    const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), batMat);
    wing.position.z = 0.01;
    bat.add(wing);
  }
  bat.position.copy(worldPoint(1420, 340, 2.05));
  bat.rotation.x = -0.12;
  scene.add(bat);

  const reward = addFireflyCloud(scene, 1420, 340, 90, 1.6, 0xffee8b);
  return { entranceFireflies, trailFireflies, echoRings, shadowMark, chamberFireflies, crystalBridge, bat, reward };
}

async function addPlayer(scene) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync("assets/player/player_front_idle_00_v01.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.35, 1.8, 1);
    scene.add(sprite);
    const glow = new THREE.PointLight(0xffd98a, 1.0, 2.1, 2);
    scene.add(glow);
    return { sprite, glow, texture };
  } catch {
    return null;
  }
}

function addAtmosphere(scene) {
  scene.background = new THREE.Color(CAVE_PALETTES["twilight-violet"]);
  scene.fog = new THREE.FogExp2(CAVE_PALETTES["twilight-violet"], 0.022);
  const hemi = new THREE.HemisphereLight(0xa9c6dc, 0x12131d, 1.25);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xbcc8ff, 1.55);
  moon.position.set(-5, 10, 4);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  scene.add(moon);
  const cyanFill = new THREE.DirectionalLight(0x70e1d2, 0.45);
  cyanFill.position.set(8, 4, -6);
  scene.add(cyanFill);
}

function applyPhase(scene, renderer, story, crystals, player, phaseId) {
  const index = Math.max(0, PHASES.indexOf(phaseId));
  const phase = getStageVisualPhase("cave", phaseId) || getStageVisualPhase("cave", "caveGate");
  const color = CAVE_PALETTES[phase.palette] ?? CAVE_PALETTES["twilight-violet"];
  scene.background.setHex(color);
  scene.fog.color.setHex(color);
  scene.fog.density = 0.012 + phase.fog * 0.038;
  renderer.toneMappingExposure = 0.82 + phase.warmth * 0.34;

  story.entranceFireflies.visible = index <= 1;
  story.trailFireflies.visible = index >= 1 && index <= 3;
  story.echoRings.visible = phaseId === "echoCrystal";
  story.shadowMark.visible = phaseId === "shadowMark";
  story.chamberFireflies.visible = index >= 4;
  story.crystalBridge.visible = index >= 5;
  story.bat.visible = index >= 6;
  story.reward.visible = index >= 7;

  crystals.echo.visible = index >= 2;
  crystals.chamberA.visible = index >= 4;
  crystals.chamberB.visible = index >= 4;
  crystals.bridgeA.visible = index >= 5;
  crystals.bridgeB.visible = index >= 5;
  crystals.roost.visible = index >= 6;

  const [x, y] = PHASE_ANCHORS[phaseId] || PHASE_ANCHORS.caveGate;
  if (player?.sprite) {
    const p = worldPoint(x - 55, y + 35, 0);
    player.sprite.position.set(p.x, 1.02, p.z);
    player.glow.position.set(p.x, 0.82, p.z + 0.08);
  }
  return phase;
}

export async function startThreeCavePreview(canvas, statusEl, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvas.clientWidth || globalThis.innerWidth || 1280, canvas.clientHeight || globalThis.innerHeight || 720, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;

  const scene = new THREE.Scene();
  addAtmosphere(scene);
  addGround(scene);
  addRoute(scene);

  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 60);
  camera.position.set(8.5, 11.8, 10.6);
  camera.lookAt(0.8, 0.2, -0.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = options.debugControls ?? true;
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minZoom = 0.8;
  controls.maxZoom = 1.55;
  controls.target.set(0.8, 0.35, -0.5);
  controls.update();

  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };
  setStatus("반딧불 동굴 · 로컬 암석 GLB 로딩 중…");
  const vendor = await loadCaveVendorLibrary(({ loaded, fallbacks, total }) => {
    setStatus(`동굴 암석 GLB ${loaded}/${total} · fallback ${fallbacks}`);
  });
  const rocks = populateCaveRocks(scene, vendor.library);
  const crystals = addCrystals(scene);
  const story = addStoryEnvironment(scene);
  const player = await addPlayer(scene);

  let phaseIndex = Math.max(0, PHASES.indexOf(options.phase || "caveGate"));
  let currentPhase = applyPhase(scene, renderer, story, crystals, player, PHASES[phaseIndex]);

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
  resize();
  globalThis.addEventListener("resize", resize);

  const setPhase = (value) => {
    if (typeof value === "number") phaseIndex = THREE.MathUtils.clamp(Math.round(value), 0, PHASES.length - 1);
    else {
      const requested = PHASES.indexOf(value);
      if (requested >= 0) phaseIndex = requested;
    }
    currentPhase = applyPhase(scene, renderer, story, crystals, player, PHASES[phaseIndex]);
    setStatus(`단계 ${phaseIndex + 1}/${PHASES.length} · ${PHASES[phaseIndex]} · GLB ${vendor.loaded}/${vendor.total} · fallback ${vendor.fallbacks}`);
    if (statusEl) statusEl.dataset.stageVisual = JSON.stringify(currentPhase);
    return currentPhase;
  };

  setPhase(phaseIndex);
  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;
  function frame() {
    if (disposed) return;
    const t = clock.getElapsedTime();
    story.entranceFireflies.material.opacity = 0.68 + Math.sin(t * 2.2) * 0.2;
    story.chamberFireflies.material.opacity = 0.7 + Math.sin(t * 2.8) * 0.18;
    story.reward.material.opacity = 0.72 + Math.sin(t * 3.1) * 0.2;
    story.trailFireflies.children.forEach((light, index) => {
      light.position.y = 0.55 + Math.sin(t * 2.4 + index * 0.65) * 0.12;
      light.scale.setScalar(0.85 + Math.sin(t * 3 + index) * 0.22);
    });
    story.echoRings.children.forEach((ring, index) => {
      ring.scale.setScalar(0.88 + ((t * 0.35 + index * 0.24) % 1) * 0.42);
    });
    if (story.bat.visible) {
      story.bat.position.y = 2.05 + Math.sin(t * 2.4) * 0.08;
      story.bat.rotation.z = Math.sin(t * 3.1) * 0.06;
    }
    crystals.echo.rotation.y = t * 0.16;
    crystals.chamberA.rotation.y = -t * 0.1;
    crystals.chamberB.rotation.y = t * 0.12;
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
    scene.traverse((obj) => {
      obj.geometry?.dispose?.();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.filter(Boolean).forEach((mat) => {
        Object.values(mat).forEach((value) => value?.isTexture && value.dispose());
        mat.dispose?.();
      });
    });
    player?.texture?.dispose?.();
    renderer.dispose();
  };

  const api = { scene, camera, renderer, controls, geometryContract, vendor, rocks, crystals, story, player, phases: PHASES, setPhase, getPhase: () => PHASES[phaseIndex], dispose };
  globalThis.__eduniThreeCave = api;
  return api;
}
