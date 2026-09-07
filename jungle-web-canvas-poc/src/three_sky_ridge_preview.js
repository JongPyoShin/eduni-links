import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SkyRidgeWorldGeometry } from "./geometry.js";
import { getSkyRidgeVisualPhase } from "./content/sky_ridge_visuals.js";

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new SkyRidgeWorldGeometry();

const PHASES = Object.freeze([
  "skyGate", "windRibbon", "cloudShadow", "windChime",
  "summitBridge", "hawk", "reward", "complete",
]);

const PHASE_ANCHORS = Object.freeze({
  skyGate: [430, 930], windRibbon: [650, 820], cloudShadow: [830, 690],
  windChime: [1000, 560], summitBridge: [1300, 420],
  hawk: [1450, 310], reward: [1450, 310], complete: [1450, 310],
});

const PALETTES = Object.freeze({
  "dawn-sky": 0x7aa6bb,
  "wind-teal": 0x6d9fa5,
  "cloud-blue": 0x7898b2,
  "chime-cyan": 0x63aebd,
  "star-indigo": 0x4c5d8b,
  "summit-gold": 0x9b916b,
  "hawk-sky": 0x719bb3,
  "star-gold": 0xa4936e,
});

export function skyRidgeLogicalToThree(x, y, height = 0) {
  return new THREE.Vector3((x - WORLD_CENTER.x) * WORLD_SCALE, height, (y - WORLD_CENTER.y) * WORLD_SCALE);
}

const worldPoint = skyRidgeLogicalToThree;
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, ...extra });

function addGround(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat(0x526a63, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  for (const [x, y, r] of [[430,930,1.25],[1000,560,1.1],[1130,490,1.35],[1450,310,1.25]]) {
    const shelf = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, .24, 28), mat(0x69766d));
    shelf.position.copy(worldPoint(x, y, .1));
    shelf.receiveShadow = true;
    scene.add(shelf);
  }
}

function addRoute(scene) {
  const route = geometryContract.paths[0];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.75;
  const edgeMat = mat(0x445852, { roughness: 1 });
  const routeMat = mat(0x8da49b, { roughness: 1 });
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = worldPoint(route[i].x, route[i].y, .05);
    const b = worldPoint(route[i + 1].x, route[i + 1].y, .05);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const mid = a.clone().add(b).multiplyScalar(.5);
    const angle = -Math.atan2(dz, dx);
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(len + radius, radius * 2.05), edgeMat);
    edge.rotation.set(-Math.PI / 2, 0, angle);
    edge.position.copy(mid);
    edge.position.y = .025;
    scene.add(edge);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * .45, radius * 1.45), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = .048;
    scene.add(strip);
  }
  for (const node of route) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * .78, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, .051));
    scene.add(pad);
  }
}

function addCloud(scene, x, y, z, scale = 1) {
  const group = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xeef7f5, transparent: true, opacity: .72, depthWrite: false });
  for (const [ox, oy, oz, r] of [[0,0,0,.52],[-.42,-.04,.04,.36],[.43,-.02,-.02,.4],[.1,.18,.02,.34]]) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 12, 8), cloudMat.clone());
    puff.position.set(ox * scale, oy * scale, oz * scale);
    group.add(puff);
  }
  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

function addSkyEnvironment(scene) {
  const clouds = [addCloud(scene, -4.6, 4.8, -4.0, 1.25), addCloud(scene, 4.2, 5.4, -2.3, .95), addCloud(scene, 1.4, 6.2, 2.8, .8)];

  const ribbons = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const ribbon = new THREE.Mesh(
      new THREE.PlaneGeometry(.16, 1.35 + i * .08),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd782 : 0x8fe4dd, side: THREE.DoubleSide, transparent: true, opacity: .85 })
    );
    const p = worldPoint(610 + i * 24, 842 - i * 10, 1.0 + i * .04);
    ribbon.position.set(p.x, 1.0 + i * .05, p.z);
    ribbon.rotation.z = .18 + i * .08;
    ribbons.add(ribbon);
  }
  scene.add(ribbons);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.35, 40), new THREE.MeshBasicMaterial({ color: 0x334f60, transparent: true, opacity: .28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.6, .65, 1);
  shadow.position.copy(worldPoint(830, 690, .075));
  scene.add(shadow);

  const chime = new THREE.Group();
  chime.position.copy(worldPoint(1000, 560, 0));
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.07,20), mat(0xbcae83, { metalness: .15, roughness: .55 }));
  top.position.y = 1.8;
  chime.add(top);
  for (let i = 0; i < 4; i += 1) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.75 + i * .12,12), mat(0xe6e1c9, { metalness: .5, roughness: .35 }));
    tube.position.set((i - 1.5) * .16, 1.2 - i * .03, 0);
    chime.add(tube);
  }
  scene.add(chime);

  const stars = new THREE.Group();
  stars.position.copy(worldPoint(1130, 490, .3));
  for (let i = 0; i < 12; i += 1) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(.07 + (i % 3) * .012, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff1a8 : 0xcfe9ff }));
    const a = (i / 12) * Math.PI * 2;
    star.position.set(Math.cos(a) * (1.0 + (i % 2) * .25), .85 + (i % 4) * .17, Math.sin(a) * (.55 + (i % 3) * .08));
    stars.add(star);
  }
  scene.add(stars);

  const bridge = new THREE.Group();
  bridge.position.copy(worldPoint(1300, 420, .12));
  for (let i = 0; i < 10; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(.55,.1,.24), mat(0xb6a677));
    plank.position.set((i - 4.5) * .38, .18 + Math.sin(i * .5) * .03, 0);
    plank.castShadow = true;
    bridge.add(plank);
  }
  scene.add(bridge);

  const hawk = new THREE.Group();
  const birdMat = mat(0x5a4638);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.16,10,8), birdMat);
  body.scale.set(1.25,.65,.72);
  hawk.add(body);
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(.72,.26), new THREE.MeshBasicMaterial({ color: 0x654c3b, side: THREE.DoubleSide }));
    wing.position.x = side * .42;
    wing.rotation.z = side * .18;
    hawk.add(wing);
  }
  hawk.position.copy(worldPoint(1450, 310, 2.3));
  scene.add(hawk);

  const reward = new THREE.Group();
  reward.position.copy(worldPoint(1450, 310, .75));
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(.3,0), mat(0xffdf72, { emissive: 0xb87518, emissiveIntensity: 1.1 }));
  reward.add(core);
  for (let i = 0; i < 20; i += 1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(.024,6,5), new THREE.MeshBasicMaterial({ color: 0xfff0a9 }));
    const a = i / 20 * Math.PI * 2;
    spark.position.set(Math.cos(a) * (.45 + (i % 4) * .13), .15 + (i % 5) * .1, Math.sin(a) * (.45 + (i % 4) * .13));
    reward.add(spark);
  }
  scene.add(reward);

  return { clouds, ribbons, shadow, chime, stars, bridge, hawk, reward };
}

async function addPlayer(scene) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync("assets/player/player_front_idle_00_v01.png");
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(1.35, 1.8, 1);
    scene.add(sprite);
    const glow = new THREE.PointLight(0xffe2a3, .95, 2.2, 2);
    scene.add(glow);
    return { sprite, glow, texture };
  } catch {
    return null;
  }
}

function addAtmosphere(scene) {
  scene.background = new THREE.Color(PALETTES["dawn-sky"]);
  scene.fog = new THREE.FogExp2(PALETTES["dawn-sky"], .018);
  scene.add(new THREE.HemisphereLight(0xe9f6ff, 0x56635f, 1.55));
  const sun = new THREE.DirectionalLight(0xffedbd, 1.7);
  sun.position.set(-5, 11, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  scene.add(sun);
}

function applyPhase(scene, renderer, story, player, phaseId) {
  const index = Math.max(0, PHASES.indexOf(phaseId));
  const phase = getSkyRidgeVisualPhase(phaseId) || getSkyRidgeVisualPhase("skyGate");
  const color = PALETTES[phase.palette] ?? PALETTES["dawn-sky"];
  scene.background.setHex(color);
  scene.fog.color.setHex(color);
  scene.fog.density = .008 + phase.fog * .045;
  renderer.toneMappingExposure = .9 + phase.warmth * .32;

  story.ribbons.visible = index >= 1;
  story.shadow.visible = index >= 2;
  story.chime.visible = index >= 3;
  story.stars.visible = index >= 4;
  story.bridge.visible = index >= 5;
  story.hawk.visible = index >= 6;
  story.reward.visible = index >= 7;

  const [x, y] = PHASE_ANCHORS[phaseId] || PHASE_ANCHORS.skyGate;
  if (player?.sprite) {
    const p = worldPoint(x - 55, y + 35, 0);
    player.sprite.position.set(p.x, 1.02, p.z);
    player.glow.position.set(p.x, .82, p.z + .08);
  }
  return { stageId: "skyRidge", phaseId, ...phase };
}

export async function startThreeSkyRidgePreview(canvas, statusEl, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvas.clientWidth || globalThis.innerWidth || 1280, canvas.clientHeight || globalThis.innerHeight || 720, false);
  renderer.shadowMap.enabled = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  addAtmosphere(scene);
  addGround(scene);
  addRoute(scene);
  const story = addSkyEnvironment(scene);
  const player = await addPlayer(scene);

  const camera = new THREE.OrthographicCamera(-8,8,5,-5,.1,60);
  camera.position.set(8.5,12.2,10.8);
  camera.lookAt(.8,.3,-.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = options.debugControls ?? true;
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(.8,.5,-.5);
  controls.update();

  const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };
  let phaseIndex = Math.max(0, PHASES.indexOf(options.phase || "skyGate"));
  let currentPhase = applyPhase(scene, renderer, story, player, PHASES[phaseIndex]);

  function resize() {
    const width = canvas.clientWidth || globalThis.innerWidth || 1280;
    const height = canvas.clientHeight || globalThis.innerHeight || 720;
    renderer.setSize(width, height, false);
    const aspect = width / Math.max(1,height);
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
    if (typeof value === "number") phaseIndex = THREE.MathUtils.clamp(Math.round(value),0,PHASES.length-1);
    else {
      const requested = PHASES.indexOf(value);
      if (requested >= 0) phaseIndex = requested;
    }
    currentPhase = applyPhase(scene, renderer, story, player, PHASES[phaseIndex]);
    setStatus(`단계 ${phaseIndex + 1}/${PHASES.length} · ${currentPhase.phaseId}`);
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
    story.clouds.forEach((cloud, index) => { cloud.position.x += Math.sin(t * .22 + index) * .0008; });
    story.ribbons.children.forEach((ribbon,index) => { ribbon.rotation.y = Math.sin(t * 2 + index) * .22; ribbon.rotation.z = .2 + Math.sin(t * 1.7 + index) * .08; });
    story.chime.children.slice(1).forEach((tube,index) => { tube.rotation.z = Math.sin(t * 2.4 + index) * .08; });
    story.stars.children.forEach((star,index) => { star.scale.setScalar(.8 + Math.sin(t * 3 + index) * .22); star.rotation.y = t * .8; });
    if (story.hawk.visible) { story.hawk.position.y = 2.3 + Math.sin(t * 1.6) * .14; story.hawk.rotation.y = Math.sin(t * .7) * .25; }
    if (story.reward.visible) { story.reward.rotation.y = t * .5; story.reward.children[0].scale.setScalar(.92 + Math.sin(t * 3.2) * .1); }
    controls.update();
    renderer.render(scene,camera);
    if (statusEl) statusEl.dataset.rendererInfo = JSON.stringify({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures });
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
      materials.filter(Boolean).forEach((m) => { Object.values(m).forEach((v) => v?.isTexture && v.dispose()); m.dispose?.(); });
    });
    player?.texture?.dispose?.();
    renderer.dispose();
  };

  const api = { scene, camera, renderer, controls, geometryContract, story, player, phases: PHASES, setPhase, getPhase: () => PHASES[phaseIndex], dispose };
  globalThis.__eduniThreeSkyRidge = api;
  return api;
}
