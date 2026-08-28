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

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new WaterfallWorldGeometry();

function worldPoint(x, y, height = 0) {
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

function addGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    material(0x315c3f, { roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

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
  basin.position.copy(worldPoint(1050, 535, 0.025));
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
  stream.position.copy(worldPoint(820, 760, 0.03));
  scene.add(stream);

  return { basin, stream };
}

function addRoute(scene) {
  const route = geometryContract.paths[0] || [];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.72;
  const routeMat = material(0xa99a60, { roughness: 1 });
  const edgeMat = material(0x65734d, { roughness: 1 });

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = worldPoint(route[i].x, route[i].y, 0.055);
    const b = worldPoint(route[i + 1].x, route[i + 1].y, 0.055);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const angle = -Math.atan2(dz, dx);

    const edge = new THREE.Mesh(new THREE.PlaneGeometry(len + radius, radius * 2.2), edgeMat);
    edge.rotation.set(-Math.PI / 2, 0, angle);
    edge.position.copy(mid);
    edge.position.y = 0.042;
    scene.add(edge);

    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * 0.5, radius * 1.5), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = 0.06;
    scene.add(strip);
  }

  for (const node of route) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, 0.062));
    scene.add(pad);
  }
}

function addWaterfall(scene) {
  const cliffMat = material(0x45564c, { roughness: 0.94 });
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.7, 0.8), cliffMat);
  cliff.position.copy(worldPoint(1170, 220, 1.85));
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  scene.add(cliff);

  const fallMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc8fbff,
    transparent: true,
    opacity: 0.8,
    roughness: 0.05,
    transmission: 0.12,
    clearcoat: 0.8,
    side: THREE.DoubleSide,
  });
  const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6, 1, 12), fallMaterial);
  waterfall.position.copy(worldPoint(1170, 285, 1.95));
  waterfall.rotation.y = 0;
  scene.add(waterfall);

  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xe7ffff,
    transparent: true,
    opacity: 0.55,
    roughness: 0.4,
  });
  const foam = new THREE.Mesh(new THREE.CircleGeometry(1.55, 36), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.scale.set(1.25, 0.55, 1);
  foam.position.copy(worldPoint(1170, 465, 0.08));
  scene.add(foam);

  return { waterfall, foam };
}

function addSteppingStones(scene) {
  const points = [[860,770],[920,745],[980,720],[1040,705],[1080,700]];
  const moss = material(0x78876a, { roughness: 0.96 });
  const wet = material(0x9da79b, { roughness: 0.62 });
  const stones = [];

  points.forEach(([x, y], index) => {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.33 + (index % 2) * 0.04, 0), index % 3 === 0 ? moss : wet);
    mesh.scale.set(1.1, 0.36 + (index % 2) * 0.08, 0.8 + (index % 3) * 0.08);
    mesh.rotation.y = index * 0.47;
    mesh.position.copy(worldPoint(x, y, 0.18));
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
  group.position.copy(worldPoint(700, 900, 0));
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
  group.position.copy(worldPoint(1450, 350, 0));
  group.rotation.y = 0.12;
  group.traverse((obj) => { if (obj.isMesh) obj.castShadow = true; });
  scene.add(group);
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
      loaded += 1;
    } catch {
      library.set(key, null);
      fallbacks += 1;
    }
    onProgress?.({ loaded, fallbacks, total: entries.length });
  }));

  draco.dispose();
  return { library, loaded, fallbacks, total: entries.length };
}

function populateVendorAssets(scene, library) {
  for (const placement of WATERFALL_THREE_PLACEMENTS) {
    const config = THREEJSASSETS_FREE_MODELS[placement.model];
    const source = library.get(placement.model);
    const object = source ? source.clone(true) : fallbackObject(config?.fallback || "shrub");
    object.position.copy(worldPoint(placement.x, placement.y, 0));
    object.rotation.y = placement.rotation || 0;
    const scale = placement.scale || 1;
    object.scale.multiplyScalar(scale);
    scene.add(object);
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

export async function startThreeWaterfallPreview(canvas, statusEl) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
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

  const controls = new OrbitControls(camera, renderer.domElement);
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
  populateVendorAssets(scene, vendor.library);
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
  resize();
  globalThis.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    fall.waterfall.material.opacity = 0.74 + Math.sin(t * 2.2) * 0.06;
    fall.foam.material.opacity = 0.45 + Math.sin(t * 1.7) * 0.08;
    water.basin.material.opacity = 0.72 + Math.sin(t * 0.9) * 0.03;
    stones.forEach((stone, index) => {
      stone.position.y = 0.18 + Math.sin(t * 1.5 + index * 0.7) * 0.012;
    });
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  globalThis.__eduniThreeWaterfall = { scene, camera, renderer, controls, vendor };
}
