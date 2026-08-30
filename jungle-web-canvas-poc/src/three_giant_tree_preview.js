import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GiantTreeWorldGeometry } from "./geometry.js";
import { getGiantTreeVisualPhase } from "./content/giant_tree_visuals.js";
import { THREEJSASSETS_FREE_MODELS, threeVendorUrl } from "./three_vendor_manifest.js";

const WORLD_SCALE = 0.01;
const WORLD_CENTER = { x: 800, y: 600 };
const geometryContract = new GiantTreeWorldGeometry();

const PHASES = Object.freeze([
  "rootGate", "barkPattern", "seedTrail", "hollowEcho", "treeRing",
  "canopyStairs", "squirrel", "reward", "complete",
]);

const PHASE_ANCHORS = Object.freeze({
  rootGate: [430, 930], barkPattern: [650, 830], seedTrail: [820, 690],
  hollowEcho: [980, 570], treeRing: [1110, 500], canopyStairs: [1290, 430],
  squirrel: [1440, 320], reward: [1440, 320], complete: [1440, 320],
});

const PALETTES = Object.freeze({
  "root-amber": 0x43513a,
  "bark-olive": 0x3c4d35,
  "moss-gold": 0x4a5637,
  "hollow-teal": 0x344d49,
  "ring-amber": 0x5d4f35,
  "canopy-green": 0x36543a,
  "canopy-sky": 0x587466,
  "seed-gold": 0x786744,
});

const SELECTED_VENDOR_KEYS = Object.freeze(["cypressTree", "floweringTree", "mangroveCluster", "mossyBoulder", "rockCluster", "grassTuft"]);

export function giantTreeLogicalToThree(x, y, height = 0) {
  return new THREE.Vector3((x - WORLD_CENTER.x) * WORLD_SCALE, height, (y - WORLD_CENTER.y) * WORLD_SCALE);
}

const worldPoint = giantTreeLogicalToThree;

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...extra });
}

function addGround(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat(0x314331, { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const moss = new THREE.Mesh(new THREE.CircleGeometry(3.25, 56), mat(0x40573b, { roughness: 1 }));
  moss.rotation.x = -Math.PI / 2;
  moss.scale.set(1.2, 0.72, 1);
  moss.position.copy(worldPoint(1110, 500, 0.012));
  scene.add(moss);
}

function addRoute(scene) {
  const route = geometryContract.paths[0];
  const radius = geometryContract.pathHalfWidth * WORLD_SCALE * 0.75;
  const edgeMat = mat(0x3b392d, { roughness: 1 });
  const routeMat = mat(0x746144, { roughness: 1 });
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
    edge.position.y = 0.025;
    scene.add(edge);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(len + radius * 0.45, radius * 1.5), routeMat);
    strip.rotation.set(-Math.PI / 2, 0, angle);
    strip.position.copy(mid);
    strip.position.y = 0.045;
    scene.add(strip);
  }
  for (const node of route) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.78, 24), routeMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.copy(worldPoint(node.x, node.y, 0.047));
    scene.add(pad);
  }
}

function addRoot(rootGroup, angle, length, width, y = 0.18) {
  const root = new THREE.Mesh(new THREE.CapsuleGeometry(width, length, 5, 10), mat(0x63492e));
  root.rotation.z = Math.PI / 2;
  root.rotation.y = angle;
  root.scale.y = 0.7;
  root.position.set(Math.cos(angle) * length * 0.43, y, Math.sin(angle) * length * 0.43);
  root.castShadow = true;
  root.receiveShadow = true;
  rootGroup.add(root);
  return root;
}

function addAncientTree(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(1120, 500, 0));

  const trunkMat = mat(0x725137, { roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.55, 6.8, 18), trunkMat);
  trunk.position.y = 3.35;
  trunk.scale.z = 0.88;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const crownCore = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 14), mat(0x355d35));
  crownCore.position.y = 6.7;
  crownCore.scale.set(1.4, 0.78, 1.15);
  crownCore.castShadow = true;
  group.add(crownCore);

  const crowns = [];
  const crownOffsets = [[-1.8,6.5,-.5],[1.65,6.7,-.25],[-.8,7.35,.65],[1.0,7.4,.55],[0,6.3,1.15]];
  for (const [x,y,z] of crownOffsets) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), mat(0x447443));
    c.position.set(x,y,z);
    c.scale.set(1.15,0.8,1.0);
    c.castShadow = true;
    group.add(c);
    crowns.push(c);
  }

  const roots = new THREE.Group();
  for (let i = 0; i < 8; i += 1) addRoot(roots, (i / 8) * Math.PI * 2, 2.25 + (i % 3) * .35, .27 + (i % 2) * .05);
  group.add(roots);

  const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ color: 0x20170f, side: THREE.DoubleSide }));
  hollow.position.set(-0.04, 1.6, 0.9);
  hollow.rotation.x = -0.04;
  group.add(hollow);

  const barkMarks = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, .52 + (i % 3) * .16, .03), new THREE.MeshBasicMaterial({ color: 0xd09b59 }));
    mark.position.set(-.55 + (i % 4) * .36, 2.25 + Math.floor(i/4) * .78, .98);
    mark.rotation.z = (i % 2 ? 1 : -1) * .14;
    barkMarks.add(mark);
  }
  group.add(barkMarks);

  scene.add(group);
  return { group, trunk, crownCore, crowns, roots, hollow, barkMarks };
}

function addRingGallery(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(1110, 500, 0.08));
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .18, 48), mat(0xa87949));
  slab.rotation.z = Math.PI / 2;
  slab.position.set(0, .9, 1.25);
  group.add(slab);
  const rings = [];
  for (let i = 1; i <= 6; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.14 * i, .018, 8, 48), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd68a : 0xe6a94f }));
    ring.position.set(0, .9, 1.36);
    group.add(ring);
    rings.push(ring);
  }
  scene.add(group);
  return { group, rings };
}

function addSeedTrail(scene) {
  const group = new THREE.Group();
  const points = [[720,770],[780,725],[820,690],[875,650],[925,610]];
  for (const [x,y] of points) {
    const acorn = new THREE.Group();
    const nut = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), mat(0x9b6738));
    nut.scale.y = 1.25;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.105, 10, 6, 0, Math.PI * 2, 0, Math.PI * .45), mat(0x5d4428));
    cap.position.y = .09;
    acorn.add(nut, cap);
    acorn.position.copy(worldPoint(x,y,.16));
    group.add(acorn);
  }
  scene.add(group);
  return group;
}

function addHollowEcho(scene) {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(.26 + i*.22,.29+i*.22,36), new THREE.MeshBasicMaterial({ color: 0x9ee8cf, transparent: true, opacity: .42 - i*.08, side: THREE.DoubleSide, depthWrite:false }));
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(worldPoint(980,570,.11));
    group.add(ring);
  }
  scene.add(group);
  return group;
}

function addSpiralStairs(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(1290,430,0));
  const material = mat(0xa77945);
  for (let i = 0; i < 18; i += 1) {
    const a = i * .42;
    const step = new THREE.Mesh(new THREE.BoxGeometry(.75,.12,.28), material);
    step.position.set(Math.cos(a)*1.18, .14 + i*.12, Math.sin(a)*1.18);
    step.rotation.y = -a;
    step.castShadow = true;
    group.add(step);
  }
  scene.add(group);
  return group;
}

function addSquirrel(scene) {
  const group = new THREE.Group();
  const fur = mat(0xc87538);
  const body = new THREE.Mesh(new THREE.SphereGeometry(.24,12,10), fur);
  body.scale.set(.75,1.15,.65);
  body.position.y = .38;
  const head = new THREE.Mesh(new THREE.SphereGeometry(.17,12,10), fur);
  head.position.set(.02,.72,.02);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(.31,.11,8,20,Math.PI*1.45), fur);
  tail.position.set(-.25,.52,-.05);
  tail.rotation.z = -.7;
  group.add(body, head, tail);
  group.position.copy(worldPoint(1440,320,1.0));
  scene.add(group);
  return group;
}

function addReward(scene) {
  const group = new THREE.Group();
  group.position.copy(worldPoint(1440,320,.55));
  const seed = new THREE.Mesh(new THREE.SphereGeometry(.22,16,12), mat(0xf4b35a, { emissive:0xa66822, emissiveIntensity:.8 }));
  seed.scale.set(.85,1.25,.75);
  group.add(seed);
  for (let i=0;i<18;i+=1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(.025,6,5), new THREE.MeshBasicMaterial({color:0xffe6a0}));
    const a = (i/18)*Math.PI*2;
    spark.position.set(Math.cos(a)*(.45+(i%3)*.16), .2+(i%4)*.12, Math.sin(a)*(.45+(i%3)*.16));
    group.add(spark);
  }
  scene.add(group);
  return group;
}

function fallbackObject(kind) {
  const g = new THREE.Group();
  if (kind === "tree") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,1.1,8), mat(0x6f4c2d));
    trunk.position.y=.55;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(.48,10,8), mat(0x447441));
    crown.position.y=1.2;
    crown.scale.y=.8;
    g.add(trunk,crown);
  } else if (kind === "rock") {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.38,0), mat(0x55594c));
    rock.scale.set(1.25,.65,1);
    rock.position.y=.22;
    g.add(rock);
  } else {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(.28,8,6), mat(0x496b3b));
    shrub.position.y=.2;
    shrub.scale.set(1.25,.65,1);
    g.add(shrub);
  }
  return g;
}

async function loadVendor(onProgress) {
  const draco = new DRACOLoader();
  draco.setDecoderPath("./node_modules/three/examples/jsm/libs/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const library = new Map();
  let loaded=0, fallbacks=0;
  await Promise.all(SELECTED_VENDOR_KEYS.map(async (key) => {
    const config = THREEJSASSETS_FREE_MODELS[key];
    try {
      const gltf = await loader.loadAsync(threeVendorUrl(config));
      gltf.scene.traverse((obj)=>{ if(obj.isMesh){ obj.castShadow=true; obj.receiveShadow=true; }});
      library.set(key,gltf.scene); loaded += 1;
    } catch {
      library.set(key,null); fallbacks += 1;
    }
    onProgress?.({loaded,fallbacks,total:SELECTED_VENDOR_KEYS.length});
  }));
  draco.dispose();
  return {library,loaded,fallbacks,total:SELECTED_VENDOR_KEYS.length};
}

function populateForest(scene, library) {
  const placements = [
    ["floweringTree",250,930,.6,-.12],["cypressTree",350,790,.34,.18],["mangroveCluster",520,890,.48,-.2],
    ["mossyBoulder",590,760,.75,.1],["grassTuft",700,900,.8,-.1],["rockCluster",760,610,.62,.2],
    ["cypressTree",880,820,.32,-.14],["mangroveCluster",930,450,.46,.12],["mossyBoulder",1180,650,.7,-.08],
    ["floweringTree",1350,600,.55,.16],["grassTuft",1390,460,.8,-.2],["rockCluster",1510,410,.66,.1],
  ];
  const objects=[];
  for (const [key,x,y,scale,rot] of placements) {
    const source=library.get(key);
    const config=THREEJSASSETS_FREE_MODELS[key];
    const object=source ? source.clone(true) : fallbackObject(config?.fallback || "shrub");
    object.position.copy(worldPoint(x,y,0)); object.rotation.y=rot; object.scale.multiplyScalar(scale);
    scene.add(object); objects.push(object);
  }
  return objects;
}

async function addPlayer(scene) {
  try {
    const texture=await new THREE.TextureLoader().loadAsync("assets/player/player_front_idle_00_v01.png");
    texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
    sprite.scale.set(1.35,1.8,1); scene.add(sprite);
    const glow=new THREE.PointLight(0xffd98a,1.05,2.2,2); scene.add(glow);
    return {sprite,glow,texture};
  } catch { return null; }
}

function addAtmosphere(scene) {
  scene.background=new THREE.Color(PALETTES["root-amber"]);
  scene.fog=new THREE.FogExp2(PALETTES["root-amber"],.018);
  const hemi=new THREE.HemisphereLight(0xcbe3af,0x1d251c,1.45); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe1a3,1.7); sun.position.set(-5,11,4); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
  const fill=new THREE.DirectionalLight(0x83c9aa,.42); fill.position.set(7,5,-5); scene.add(fill);
}

function applyPhase(scene, renderer, story, player, phaseId) {
  const phase=getGiantTreeVisualPhase(phaseId) || getGiantTreeVisualPhase("rootGate");
  const index=Math.max(0,PHASES.indexOf(phaseId));
  const color=PALETTES[phase.palette] ?? PALETTES["root-amber"];
  scene.background.setHex(color); scene.fog.color.setHex(color); scene.fog.density=.009+phase.fog*.055;
  renderer.toneMappingExposure=.82+phase.warmth*.4;

  story.tree.barkMarks.visible=index>=1;
  story.seedTrail.visible=index>=2 && index<=4;
  story.echo.visible=phaseId==="hollowEcho";
  story.rings.group.visible=index>=4;
  story.stairs.visible=index>=5;
  story.squirrel.visible=index>=6;
  story.reward.visible=index>=7;

  const [x,y]=PHASE_ANCHORS[phaseId] || PHASE_ANCHORS.rootGate;
  if(player?.sprite){ const p=worldPoint(x-48,y+34,0); player.sprite.position.set(p.x,1.02,p.z); player.glow.position.set(p.x,.82,p.z+.08); }
  return phase;
}

export async function startThreeGiantTreePreview(canvas,statusEl,options={}) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene(); addAtmosphere(scene); addGround(scene); addRoute(scene);
  const tree=addAncientTree(scene); const rings=addRingGallery(scene); const seedTrail=addSeedTrail(scene); const echo=addHollowEcho(scene); const stairs=addSpiralStairs(scene); const squirrel=addSquirrel(scene); const reward=addReward(scene);

  const camera=new THREE.OrthographicCamera(-8,8,5,-5,.1,70); camera.position.set(8.5,12.5,11.0); camera.lookAt(1.2,1.2,-.6);
  const controls=new OrbitControls(camera,renderer.domElement); controls.enabled=options.debugControls??true; controls.enableDamping=true; controls.enablePan=false; controls.minZoom=.8; controls.maxZoom=1.6; controls.target.set(1.2,1.1,-.6); controls.update();

  const setStatus=(text)=>{ if(statusEl) statusEl.textContent=text; };
  setStatus("거대한 고목 · 로컬 숲 GLB 로딩 중…");
  const vendor=await loadVendor(({loaded,fallbacks,total})=>setStatus(`고목 숲 GLB ${loaded}/${total} · fallback ${fallbacks}`));
  const forest=populateForest(scene,vendor.library);
  const player=await addPlayer(scene);
  const story={tree,rings,seedTrail,echo,stairs,squirrel,reward};

  let phaseIndex=Math.max(0,PHASES.indexOf(options.phase||"rootGate"));
  let currentPhase=applyPhase(scene,renderer,story,player,PHASES[phaseIndex]);

  function resize(){ const width=canvas.clientWidth||globalThis.innerWidth||1280; const height=canvas.clientHeight||globalThis.innerHeight||720; renderer.setSize(width,height,false); const aspect=width/Math.max(1,height); const viewHeight=10.8; camera.left=-(viewHeight*aspect)/2; camera.right=(viewHeight*aspect)/2; camera.top=viewHeight/2; camera.bottom=-viewHeight/2; camera.updateProjectionMatrix(); }
  resize(); globalThis.addEventListener("resize",resize);

  const setPhase=(value)=>{ if(typeof value==="number") phaseIndex=THREE.MathUtils.clamp(Math.round(value),0,PHASES.length-1); else { const requested=PHASES.indexOf(value); if(requested>=0) phaseIndex=requested; } currentPhase=applyPhase(scene,renderer,story,player,PHASES[phaseIndex]); setStatus(`단계 ${phaseIndex+1}/${PHASES.length} · ${currentPhase.phaseId} · GLB ${vendor.loaded}/${vendor.total} · fallback ${vendor.fallbacks}`); if(statusEl) statusEl.dataset.stageVisual=JSON.stringify(currentPhase); return currentPhase; };
  setPhase(phaseIndex);

  const clock=new THREE.Clock(); let rafId=0; let disposed=false;
  function frame(){ if(disposed)return; const t=clock.getElapsedTime();
    story.tree.crowns.forEach((c,i)=>{ c.rotation.y=Math.sin(t*.35+i)*.035; c.position.y += Math.sin(t*.8+i)*.0008; });
    story.rings.rings.forEach((r,i)=>{ r.material.opacity=.76+Math.sin(t*2+i*.4)*.18; r.material.transparent=true; });
    story.seedTrail.children.forEach((a,i)=>{ a.position.y=.16+Math.sin(t*2.2+i*.5)*.025; });
    story.echo.children.forEach((r,i)=>{ r.scale.setScalar(.9+((t*.28+i*.22)%1)*.42); });
    if(story.squirrel.visible){ story.squirrel.position.y=1+Math.sin(t*2.5)*.05; story.squirrel.rotation.y=Math.sin(t*1.4)*.18; }
    if(story.reward.visible) story.reward.rotation.y=t*.55;
    controls.update(); renderer.render(scene,camera);
    if(statusEl) statusEl.dataset.rendererInfo=JSON.stringify({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});
    rafId=requestAnimationFrame(frame);
  }
  rafId=requestAnimationFrame(frame);

  const dispose=()=>{ if(disposed)return; disposed=true; cancelAnimationFrame(rafId); globalThis.removeEventListener("resize",resize); controls.dispose(); scene.traverse((obj)=>{ obj.geometry?.dispose?.(); const materials=Array.isArray(obj.material)?obj.material:[obj.material]; materials.filter(Boolean).forEach((m)=>{ Object.values(m).forEach((v)=>v?.isTexture&&v.dispose()); m.dispose?.(); }); }); player?.texture?.dispose?.(); renderer.dispose(); };
  const api={scene,camera,renderer,controls,geometryContract,vendor,forest,story,player,phases:PHASES,setPhase,getPhase:()=>PHASES[phaseIndex],dispose};
  globalThis.__eduniThreeGiantTree=api; return api;
}
