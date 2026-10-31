import * as THREE from 'three';
import { createActor } from './actor.js';
import { createEnvironmentAssets } from './environment_assets.js';
import { createLearningBirds } from './bird_models.js?v=jungle-play-20261015';

export function createForestCanopy(scene, world, trees) {
  if (!trees.length) return [];
  const parts = [
    { offset: [-.20, 1.95, .05], scale: [.67, .60, .65], color: 0x567d48 },
    { offset: [.22, 2.00, -.06], scale: [.67, .61, .66], color: 0x709450 },
    { offset: [0, 2.27, .08], scale: [.58, .60, .56], color: 0x8ea457 },
    { offset: [.02, 2.54, -.02], scale: [.40, .45, .42], color: 0xb8a65f },
  ];
  const placements = trees.flatMap(item => {
    const surface = world.sampleSurface(item.x, item.z);
    return surface ? [{ item, height: surface.height }] : [];
  });
  if (!placements.length) return [];
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const buckets = new Map();
  for (const placement of placements) {
    const bucketX = Math.floor(placement.item.x / 12), bucketZ = Math.floor(placement.item.z / 12);
    const key = `${bucketX},${bucketZ}`;
    if (!buckets.has(key)) buckets.set(key, { bucketX, bucketZ, placements: [] });
    buckets.get(key).placements.push(placement);
  }
  const temporary = new THREE.Object3D();
  return [...buckets.values()].map(({ bucketX, bucketZ, placements: bucketPlacements }) => {
    const mesh = new THREE.InstancedMesh(geometry, material, bucketPlacements.length * parts.length);
    mesh.name = `authored-tree-canopy-${bucketX}-${bucketZ}`;
    let index = 0;
    for (const { item, height } of bucketPlacements) {
      const scale = Number.isFinite(item.scale) && item.scale > 0 ? item.scale : 1;
      const yaw = ((Math.sin(item.x * 31.7 + item.z * 17.3) + 1) * Math.PI);
      const cosine = Math.cos(yaw), sine = Math.sin(yaw);
      for (const part of parts) {
        const x = part.offset[0] * scale, z = part.offset[2] * scale;
        temporary.position.set(item.x + x * cosine + z * sine, height + part.offset[1] * scale, item.z - x * sine + z * cosine);
        temporary.rotation.set(0, yaw, 0);
        temporary.scale.set(part.scale[0] * scale, part.scale[1] * scale, part.scale[2] * scale);
        temporary.updateMatrix(); mesh.setMatrixAt(index, temporary.matrix);
        mesh.setColorAt(index, new THREE.Color(part.color));
        index += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere(); mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  });
}

export function createGroundChunks(world, material) {
  const { minX, maxX, minZ, maxZ } = world.region.bounds;
  const cellSize = world.region.cellSize;
  const columns = Math.round((maxX - minX) / cellSize);
  const rows = Math.round((maxZ - minZ) / cellSize);
  const cellsPerChunk = Math.max(1, Math.round(16 / cellSize));
  const group = new THREE.Group();
  group.name = 'terrain-ground-chunks';
  const { positions, colors, indices } = world.meshData;
  for (let rowStart = 0; rowStart < rows; rowStart += cellsPerChunk) {
    const chunkRows = Math.min(cellsPerChunk, rows - rowStart);
    for (let columnStart = 0; columnStart < columns; columnStart += cellsPerChunk) {
      const chunkColumns = Math.min(cellsPerChunk, columns - columnStart);
      const chunkPositions = new Float32Array(chunkRows * chunkColumns * 12);
      const chunkColors = new Float32Array(chunkPositions.length);
      const chunkIndices = new Uint32Array(chunkRows * chunkColumns * 6);
      let vertexOffset = 0, indexOffset = 0;
      for (let row = rowStart; row < rowStart + chunkRows; row += 1) {
        for (let column = columnStart; column < columnStart + chunkColumns; column += 1) {
          const sourceCell = row * columns + column;
          const targetCell = ((row - rowStart) * chunkColumns) + column - columnStart;
          chunkPositions.set(positions.subarray(sourceCell * 12, sourceCell * 12 + 12), vertexOffset);
          chunkColors.set(colors.subarray(sourceCell * 12, sourceCell * 12 + 12), vertexOffset);
          const sourceBase = sourceCell * 4, targetBase = targetCell * 4;
          for (let index = 0; index < 6; index += 1) chunkIndices[indexOffset + index] = indices[sourceCell * 6 + index] - sourceBase + targetBase;
          vertexOffset += 12; indexOffset += 6;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(chunkPositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(chunkColors, 3));
      geometry.setIndex(new THREE.BufferAttribute(chunkIndices, 1));
      geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `terrain-ground-${rowStart}-${columnStart}`;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
  return group;
}

export function disposeSceneResources(scene) {
  const geometries = new Set(), materials = new Set();
  scene.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

export function createMeadowPlants(scene, world, grass) {
  const placements = grass.flatMap((item, index) => {
    const surface = world.sampleSurface(item.x, item.z);
    return surface ? [{ item, index, height: surface.height }] : [];
  });
  if (!placements.length) return { blades: null, flowers: null };
  const offsets = [
    { x: -.075, z: -.025, tilt: -.35, height: .9 },
    { x: -.025, z: .065, tilt: .24, height: 1.05 },
    { x: .055, z: .035, tilt: .4, height: .82 },
    { x: .045, z: -.065, tilt: -.18, height: 1.12 },
  ];
  const bladeGeometry = new THREE.ConeGeometry(.055, .38, 4);
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const blades = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, placements.length * offsets.length);
  blades.name = 'authored-grass-clumps';
  const colors = [0x5f8847, 0x77994b, 0x8da552, 0x698d4c];
  const temporary = new THREE.Object3D();
  let instance = 0;
  for (const { item, index, height } of placements) {
    const scale = Number.isFinite(item.scale) && item.scale > 0 ? item.scale : 1;
    const yaw = ((Math.sin(item.x * 23.1 + item.z * 13.7) + 1) * Math.PI);
    const cosine = Math.cos(yaw), sine = Math.sin(yaw);
    for (let blade = 0; blade < offsets.length; blade += 1) {
      const offset = offsets[blade], x = offset.x * scale, z = offset.z * scale;
      temporary.position.set(item.x + x * cosine + z * sine, height + .20 * scale * offset.height, item.z - x * sine + z * cosine);
      temporary.rotation.set(0, yaw + blade * .55, offset.tilt);
      temporary.scale.set(scale, scale * offset.height, scale);
      temporary.updateMatrix(); blades.setMatrixAt(instance, temporary.matrix);
      blades.setColorAt(instance, new THREE.Color(colors[(index + blade) % colors.length]));
      instance += 1;
    }
  }
  blades.instanceMatrix.needsUpdate = true; blades.instanceColor.needsUpdate = true; blades.computeBoundingSphere();
  blades.castShadow = false; blades.receiveShadow = true; scene.add(blades);

  const flowerItems = placements.filter(({ index }) => index % 3 === 0);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 5), new THREE.MeshStandardMaterial({ color: 0xf0ca70, roughness: .95 }), flowerItems.length * 2);
  flowers.name = 'authored-meadow-flowers';
  flowerItems.forEach(({ item, height }, index) => {
    const scale = Number.isFinite(item.scale) && item.scale > 0 ? item.scale : 1;
    for (let flower = 0; flower < 2; flower += 1) {
      const side = flower === 0 ? -.08 : .08;
      temporary.position.set(item.x + side * scale, height + .34 * scale, item.z + (flower === 0 ? .045 : -.045) * scale);
      temporary.rotation.set(0, index * .73 + flower, 0);
      temporary.scale.setScalar(scale);
      temporary.updateMatrix(); flowers.setMatrixAt(index * 2 + flower, temporary.matrix);
    }
  });
  flowers.instanceMatrix.needsUpdate = true; flowers.computeBoundingSphere();
  flowers.castShadow = false; flowers.receiveShadow = false; scene.add(flowers);
  return { blades, flowers };
}

function createLandmarkDetails(scene, world) {
  const { fernGrove, riverTracks, lookout } = world.region.landmarks;
  const fernSurface = world.sampleSurface(fernGrove.x, fernGrove.z);
  if (fernSurface) {
    const frondGeometry = new THREE.ConeGeometry(.05, .42, 5);
    const fronds = new THREE.InstancedMesh(frondGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), 18);
    fronds.name = 'fern-grove-visual';
    const colors = [0x477744, 0x5f8d49, 0x779a50];
    const temporary = new THREE.Object3D();
    let instance = 0;
    for (let plant = 0; plant < 3; plant += 1) {
      const centerX = fernGrove.x + (plant - 1) * .34;
      for (let leaf = 0; leaf < 6; leaf += 1) {
        const angle = leaf * Math.PI / 3 + plant * .37;
        temporary.position.set(centerX, fernSurface.height + .21, fernGrove.z + (plant % 2 ? .10 : -.10));
        temporary.rotation.set(Math.sin(angle) * .34, angle, Math.cos(angle) * .38);
        temporary.scale.set(.8, 1.05 + (leaf % 2) * .25, .8);
        temporary.updateMatrix(); fronds.setMatrixAt(instance, temporary.matrix);
        fronds.setColorAt(instance, new THREE.Color(colors[(plant + leaf) % colors.length]));
        instance += 1;
      }
    }
    fronds.instanceMatrix.needsUpdate = true; fronds.instanceColor.needsUpdate = true;
    fronds.computeBoundingSphere(); fronds.castShadow = false; fronds.receiveShadow = false; scene.add(fronds);
  }

  const tracksSurface = world.sampleSurface(riverTracks.x, riverTracks.z);
  if (tracksSurface) {
    const printGeometry = new THREE.CircleGeometry(.075, 10);
    const prints = new THREE.InstancedMesh(printGeometry, new THREE.MeshStandardMaterial({ color: 0x756044, roughness: 1 }), 6);
    prints.name = 'river-track-footprints';
    const temporary = new THREE.Object3D();
    for (let step = 0; step < 3; step += 1) {
      const centerX = riverTracks.x + 1.2 - step * .39;
      const centerZ = riverTracks.z + 1.2 - step * .39;
      for (let foot = 0; foot < 2; foot += 1) {
        const side = foot ? .11 : -.11;
        const x = centerX + side * .71;
        const z = centerZ - side * .71;
        temporary.position.set(x, (world.sampleSurface(x, z)?.height ?? tracksSurface.height) + .012, z);
        temporary.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
        temporary.scale.set(.78, 1.35, 1);
        temporary.updateMatrix(); prints.setMatrixAt(step * 2 + foot, temporary.matrix);
      }
    }
    prints.instanceMatrix.needsUpdate = true; prints.computeBoundingSphere(); prints.castShadow = false; prints.receiveShadow = false; scene.add(prints);
  }

  const lookoutSurface = world.sampleSurface(lookout.x, lookout.z);
  if (lookoutSurface) {
    const marker = new THREE.Group();
    marker.name = 'lookout-trail-marker';
    const ring = new THREE.Mesh(new THREE.RingGeometry(.38, .48, 20), new THREE.MeshStandardMaterial({ color: 0xd7c28d, roughness: 1, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(lookout.x, lookoutSurface.height + .035, lookout.z); marker.add(ring);
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0x8a744a, roughness: 1 });
    const horizontal = new THREE.Mesh(new THREE.BoxGeometry(.62, .012, .07), barMaterial);
    horizontal.position.set(lookout.x, lookoutSurface.height + .04, lookout.z); marker.add(horizontal);
    const vertical = new THREE.Mesh(new THREE.BoxGeometry(.07, .012, .62), barMaterial);
    vertical.position.set(lookout.x, lookoutSurface.height + .04, lookout.z); marker.add(vertical);
    scene.add(marker);
  }
}

function createMapLandmarks(scene, world) {
  const props = world.region.props, group = new THREE.Group();
  group.name = `landmarks-${props}`; scene.add(group);
  const material = (color, extra={}) => new THREE.MeshStandardMaterial({color,roughness:.86,...extra});
  const wood=material(0x795737), pale=material(0xe3c78e), water=material(0x55c6d2,{transparent:true,opacity:.78});
  const rock=material(0x716d70), glow=material(0x8ae8db,{emissive:0x36bba8,emissiveIntensity:1.3}), firefly=material(0x89ef74,{emissive:0x43df35,emissiveIntensity:1.5});
  const gold=material(0xe7bd58), purple=material(0x9b77c9,{emissive:0x62479a,emissiveIntensity:.7});
  const box=new THREE.BoxGeometry(1,1,1), sphere=new THREE.IcosahedronGeometry(1,1), cone=new THREE.ConeGeometry(1,1,7);
  const add=(geometry,mat,x,y,z,sx=1,sy=1,sz=1)=>{const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  for(const [index,item] of Object.values(world.region.landmarks).entries()){
    const x=item.x,z=item.z,y=world.sampleSurface(x,z)?.height||0;
    if(props==='camp'){
      if(item.id==='hut'){const hutX=x-1.8;add(box,wood,hutX,y+.72,z,.95,1.35,.85);add(cone,pale,hutX,y+1.62,z,.88,.65,.88);add(sphere,gold,hutX,y+.78,z+.44,.13,.13,.08);}
      else if(item.id==='feather'){const plume=add(sphere,pale,x,y+.4,z,.2,.82,.08);plume.rotation.z=-.35;const shaft=add(box,gold,x,y+.4,z+.1,.035,1.25,.035);shaft.rotation.z=-.35;}
      else {for(let i=0;i<7;i++){const a=i*Math.PI*2/7;add(sphere,rock,x+Math.cos(a)*.58,y+.12,z+Math.sin(a)*.58,.19,.14,.16);}add(cone,gold,x,y+.48,z,.28,.85,.28);}
    } else if(props==='waterfall'){
      if(item.id==='steppingStones'){for(let i=0;i<5;i++)add(new THREE.CylinderGeometry(.48,.55,.18,8),pale,x-1.2+i*.6,y+.12,z+(i%2)*.18,.9,1,.75);}
      else if(item.id==='echo'){add(box,water,x,y+1.35,z,2.6,2.7,.16);add(sphere,water,x,y+.12,z+.6,2.2,.32,1.2);add(sphere,rock,x-1.3,y+.38,z,.8,.65,.65);add(sphere,rock,x+1.3,y+.38,z,.8,.65,.65);}
      else {add(box,wood,x,y+.55,z,1.8,.18,1.25);for(let i=0;i<3;i++)add(box,wood,x-.62+i*.62,y+.28,z,.08,.5,.08);}
    } else if(props==='cave'){
      if(item.id==='glowTrail'){
        const arch=new THREE.Mesh(new THREE.TorusGeometry(.85,.16,6,12),rock);arch.position.set(x,y+1,z);arch.scale.set(1,1.25,.6);group.add(arch);add(sphere,purple,x-.8,y+.38,z,.55,.7,.5);add(sphere,purple,x+.8,y+.38,z,.55,.7,.5);
        const spawn=world.region.spawn;
        for(let i=0;i<7;i++){const t=(i+1)/8,px=spawn.x+(x-spawn.x)*t,pz=spawn.z+(z-spawn.z)*t,py=world.sampleSurface(px,pz)?.height||0;add(sphere,firefly,px,py+.18+(i%2)*.07,pz,.09,.09,.09);}
      } else if(item.id==='echoCrystal'){for(let i=0;i<5;i++)add(cone,glow,x-1+i*.5,y+.45+(i%2)*.12,z+(i%2)*.25,.18,.9+(i%2)*.35,.18);add(sphere,purple,x,y+.2,z+.5,.55,.24,.45);}
      else {for(let i=0;i<5;i++){const px=x-1.6+i*.8,pz=z-1.35;add(box,rock,px,y+.13,pz,.72,.24,.72);add(cone,glow,px,y+.57,pz,.16,.72+(i%2)*.18,.16);}}
    } else if(props==='giant-tree'){
      if(index===0){add(new THREE.CylinderGeometry(.9,1.5,5,9),wood,x-2,y+2.5,z);for(let i=0;i<4;i++){const a=i*Math.PI/2;add(box,wood,x-2+Math.cos(a)*1.4,y+.3,z+Math.sin(a)*1.4,1.8,.38,.42);}}
      else if(index===1){add(sphere,gold,x,y+.18,z,.25,.18,.24);for(let i=0;i<3;i++)add(sphere,pale,x-.5+i*.5,y+.08,z+.25,.16,.08,.1);}
      else {const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.12,6,16),pale);ring.position.set(x,y+1,z);ring.rotation.x=Math.PI/2;group.add(ring);add(box,wood,x,y+.36,z,1.2,.14,.25);}
    } else if(props==='sky-ridge'){
      if(item.id==='windRibbon'){for(const [i,offset] of [-1.5,-.7,.9].entries())add(cone,rock,x+offset,y+1.2,z,.75,2.4-(i%2)*.4,.65);add(box,pale,x,y+2.4,z,.12,1.7,.12);const ribbon=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.68),gold);ribbon.position.set(x+.55,y+2.05,z);ribbon.rotation.y=.25;group.add(ribbon);}
      else if(item.id==='cloudShadow'){for(let i=0;i<3;i++)add(sphere,pale,x-1+i*.9,y+2.3,z,.65,.35,.55);const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.3,16),material(0x78899a,{transparent:true,opacity:.45,side:THREE.DoubleSide}));shadow.rotation.x=-Math.PI/2;shadow.position.set(x,y+.035,z);shadow.receiveShadow=true;group.add(shadow);}
      else {add(box,wood,x,y+.5,z,1.8,.16,1.05);add(new THREE.TorusGeometry(.34,.06,6,12),gold,x,y+1.25,z,.7,.7,.7);for(let i=0;i<3;i++)add(box,pale,x-.55+i*.55,y+.92,z,.045,.58,.045);}
    }
  }
}

function createFeedbackEffects(scene, isReducedMotion) {
  const capacity = 40, positions = new Float32Array(capacity * 3), velocities = new Float32Array(capacity * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  geometry.setDrawRange(0, 0);
  const particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: .15,
    transparent: true, opacity: .9, depthWrite: false, sizeAttenuation: true }));
  particles.name = 'reused-feedback-points'; particles.visible = false; scene.add(particles);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.24, .32, 24), new THREE.MeshBasicMaterial({ color: 0xffe58b, transparent: true, opacity: .8, depthWrite: false }));
  ring.name = 'reused-feedback-ring'; ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const colors = { discovery: 0xffe58b, correct: 0x9de3b0, collection: 0x9edcff };
  const burstCounts = { discovery: 12, correct: 20, collection: 32 };
  let activeCount = 0, elapsed = 1, emittedCount = 0, lastBurstCount = 0, ringStartScale = .55, ringGrowth = 1.15;
  function emit(kind, x, y, z) {
    if (![x, y, z].every(Number.isFinite)) return;
    elapsed = 0;
    const color = colors[kind] || colors.discovery;
    ringStartScale = kind === 'collection' ? 1.05 : .55; ringGrowth = kind === 'collection' ? 2 : 1.15;
    ring.position.set(x, y + .045, z); ring.material.color.setHex(color); ring.material.opacity = .82; ring.scale.setScalar(ringStartScale); ring.visible = true;
    if (isReducedMotion()) { activeCount = 0; lastBurstCount = 0; particles.visible = false; geometry.setDrawRange(0, 0); return; }
    activeCount = Math.min(burstCounts[kind] || burstCounts.discovery, capacity); lastBurstCount = activeCount; emittedCount += activeCount; particles.position.set(x, y + .16, z);
    particles.material.color.setHex(color); particles.material.opacity = .9;
    for (let index = 0; index < activeCount; index += 1) {
      const angle = index * 2.399963 + emittedCount * .13, speed = .35 + (index % 4) * .09, offset = index * 3;
      positions[offset] = 0; positions[offset + 1] = 0; positions[offset + 2] = 0;
      velocities[offset] = Math.cos(angle) * speed; velocities[offset + 1] = .45 + (index % 3) * .12; velocities[offset + 2] = Math.sin(angle) * speed;
    }
    geometry.attributes.position.needsUpdate = true; geometry.setDrawRange(0, activeCount); particles.visible = true;
  }
  function update(dt) {
    if (elapsed >= .75) return;
    elapsed += Math.max(0, dt);
    if (elapsed >= .75) { activeCount = 0; particles.visible = false; geometry.setDrawRange(0, 0); ring.visible = false; return; }
    if (isReducedMotion()) { activeCount = 0; particles.visible = false; geometry.setDrawRange(0, 0); ring.scale.setScalar(ringStartScale); ring.material.opacity = .82; return; }
    const fade = 1 - elapsed / .75;
    if (activeCount) {
      for (let index = 0; index < activeCount; index += 1) {
        const offset = index * 3;
        velocities[offset + 1] -= 1.15 * dt;
        positions[offset] += velocities[offset] * dt; positions[offset + 1] += velocities[offset + 1] * dt; positions[offset + 2] += velocities[offset + 2] * dt;
      }
      geometry.attributes.position.needsUpdate = true; particles.material.opacity = .9 * fade;
    }
    ring.material.opacity = .82 * fade; ring.scale.setScalar(ringStartScale + elapsed * ringGrowth);
  }
  return { emit, update, stats() { return { capacity, activeCount, emittedCount, lastBurstCount, ringVisible: ring.visible }; } };
}

export function createScene(canvas, world, { quality = 'standard' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'tablet' ? 1 : 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .96;
  const scene = new THREE.Scene();
  const backgroundColor = world.region.backgroundColor ?? 0xa8c4b0;
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, world.region.props === 'cave' ? 14 : 25, world.region.props === 'cave' ? 42 : 65);
  scene.add(new THREE.HemisphereLight(world.region.props === 'cave' ? 0xd9d0ff : world.region.props === 'sky-ridge' ? 0xd9efff : 0xffffdc, world.region.props === 'cave' ? 0x554b68 : 0x72916d, world.region.props === 'cave' ? 1.45 : 1.75));
  const sunlight = new THREE.DirectionalLight(world.region.props === 'cave' ? 0xd9d2ff : 0xfff4d0, world.region.props === 'cave' ? 1.9 : 2.5);
  sunlight.castShadow = true;
  Object.assign(sunlight.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 55 });
  sunlight.shadow.mapSize.set(1024, 1024); sunlight.shadow.normalBias = .025; scene.add(sunlight, sunlight.target);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
  const ground = createGroundChunks(world, mat(0xffffff, { vertexColors: true }));
  scene.add(ground);
  const { bounds } = world.region;
  let lowestTerrainY = Infinity;
  for (let index = 1; index < world.meshData.positions.length; index += 3) lowestTerrainY = Math.min(lowestTerrainY, world.meshData.positions[index]);
  const floorTop = lowestTerrainY - .2;
  const baseHeight = 1.3;
  const base = new THREE.Mesh(new THREE.BoxGeometry(bounds.maxX - bounds.minX, baseHeight, bounds.maxZ - bounds.minZ), mat(0xb29465));
  base.position.set((bounds.minX + bounds.maxX) / 2, floorTop - baseHeight / 2, (bounds.minZ + bounds.maxZ) / 2); base.receiveShadow = true; scene.add(base);
  // Close only the outer boundary, taking the upper edge from the actual terrain vertices.
  const wallVertices=[], terrain=world.meshData.positions, wallBottom=floorTop-.1;
  for(let cell=0;cell<terrain.length;cell+=12) {
    for(const [a,b] of [[0,1],[1,2],[2,3],[3,0]]) {
      const pa=Array.from(terrain.slice(cell+a*3,cell+a*3+3)), pb=Array.from(terrain.slice(cell+b*3,cell+b*3+3));
      const atEdge=(axis,value)=>Math.abs(pa[axis]-value)<1e-6&&Math.abs(pb[axis]-value)<1e-6;
      if(!atEdge(0,bounds.minX)&&!atEdge(0,bounds.maxX)&&!atEdge(2,bounds.minZ)&&!atEdge(2,bounds.maxZ))continue;
      const bottomA=[pa[0],wallBottom,pa[2]], bottomB=[pb[0],wallBottom,pb[2]];
      wallVertices.push(...pa,...bottomA,...pb,...pb,...bottomA,...bottomB);
    }
  }
  const wallGeometry=new THREE.BufferGeometry(); wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(wallVertices,3)); wallGeometry.computeVertexNormals();
  const boundaryWall=new THREE.Mesh(wallGeometry,mat(0xb29465,{side:THREE.DoubleSide})); boundaryWall.receiveShadow=true; scene.add(boundaryWall);
  const waterY = world.region.water?.surfaceY ?? 0;
  const waterDepth = world.region.water ? Math.max(0, world.region.water.edgeZ - bounds.minZ) : 0;
  if (waterDepth > 0) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(bounds.maxX - bounds.minX, waterDepth), mat(0x43aeb5, { metalness: .02, roughness: .48 }));
    water.rotation.x = -Math.PI / 2; water.position.set((bounds.minX + bounds.maxX) / 2, waterY, bounds.minZ + waterDepth / 2); water.receiveShadow = true; scene.add(water);
  }
  const decorations = world.region.decorations || [];
  const trees = decorations.filter(d => d.type === 'tree');
  const rocks = decorations.filter(d => d.type === 'rock');
  const grass = decorations.filter(d => d.type === 'grass');
  const sphere = new THREE.IcosahedronGeometry(1, 1);
  const matrix = new THREE.Matrix4(), temp = new THREE.Object3D();
  function instances(items, geom, material, place, shadow = false) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geom, material, items.length);
    items.forEach((item, index) => {
      const surface = world.sampleSurface(item.x, item.z);
      temp.position.set(item.x, surface?.height || 0, item.z); temp.scale.setScalar(item.scale || 1); temp.rotation.set(0, 0, 0);
      place(temp, item, index); temp.updateMatrix(); matrix.copy(temp.matrix); mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.castShadow = shadow; mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  const treeTrunks = [instances(trees, new THREE.CylinderGeometry(.10, .20, 1.7, 7), mat(0x99714c), (t,d) => { t.position.y += .85 * (d.scale || 1); }, true)];
  if(treeTrunks[0]) treeTrunks[0].name='authored-tree-trunks';
  createForestCanopy(scene, world, trees);
  const rockFallback = [instances(rocks, sphere, mat(0xd1bc84, { flatShading: true }), (t,d,i) => { const s=d.scale||1; t.position.y += .3*s; t.scale.set(.65*s,.50*s,.58*s); t.rotation.y=i*.7; }, true)];
  if(rockFallback[0]) rockFallback[0].name='fallback-rocks';
  createMeadowPlants(scene, world, grass);
  if (world.region.id === 'river-meadow') createLandmarkDetails(scene, world); else createMapLandmarks(scene, world);
  const actor = createActor(); scene.add(actor.root);
  const birdData = world.region.bird;
  const perchY = (world.sampleSurface(birdData.x,birdData.z)?.height||0) + 1.45;
  const bird = new THREE.Group(); bird.position.set(birdData.x,perchY,birdData.z); scene.add(bird);
  const creature = birdData.id === 'littleBat' ? 'bat' : birdData.id === 'squirrel' ? 'squirrel' : 'bird';
  let birdHead = null, mainBirdPhase = 0, mainWingRotation = 0;
  const birdWings = [];
  if (creature === 'squirrel') {
    const brown=mat(0x9a6037), cream=mat(0xe4c18a);
    const body=new THREE.Mesh(new THREE.SphereGeometry(.2,9,7),brown);body.scale.set(.85,1.25,1);bird.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),brown);head.position.set(0,.2,.1);bird.add(head);birdHead=head;
    const tail=new THREE.Mesh(new THREE.IcosahedronGeometry(.2,1),brown);tail.position.set(0,.1,-.28);tail.scale.set(.8,1.3,.9);bird.add(tail);
    const belly=new THREE.Mesh(new THREE.SphereGeometry(.1,7,5),cream);belly.position.set(0,-.04,.12);bird.add(belly);
  } else if (creature === 'bat') {
    const dark=mat(0x45394f), wing=mat(0x705b78);
    const body=new THREE.Mesh(new THREE.SphereGeometry(.17,9,7),dark);bird.add(body);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),dark);head.position.y=.18;bird.add(head);birdHead=head;
    for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.07,.2,5),dark);ear.position.set(side*.09,.32,0);bird.add(ear);const membrane=new THREE.Mesh(new THREE.PlaneGeometry(.55,.35),wing);membrane.position.set(side*.3,.02,0);membrane.rotation.y=side*.2;bird.add(membrane);birdWings.push({mesh:membrane,side,rest:membrane.rotation.z});}
  } else {
    const bodyColor=birdData.id==='hawk'?0x8f6438:birdData.id==='kingfisher'?0x2d8f9e:0x397eb5;
    const birdBody = new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),mat(bodyColor)); birdBody.scale.set(1,1,1.4); bird.add(birdBody);
    const breast = new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat(0xffdfa0)); breast.position.set(0,-.045,.13); bird.add(breast);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),mat(bodyColor)); head.position.set(0,.19,.08); bird.add(head); birdHead=head;
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.04,.17,6),mat(0xcd9343)); beak.rotation.x=Math.PI/2; beak.position.set(0,.18,.24); bird.add(beak);
    for(const side of [-1,1]) {
      const pivot = new THREE.Group(); pivot.position.set(side*.12,.02,-.02); bird.add(pivot);
      const wing = new THREE.Mesh(sphere, mat(bodyColor)); wing.position.x=side*.13; wing.scale.set(.22,.055,.16); pivot.add(wing);
      birdWings.push({mesh:pivot,side,rest:0});
    }
  }
  if (birdData.id !== 'littleBat') {
    const perchMaterial=mat(world.region.props==='sky-ridge'?0x8b8790:0x977650);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,birdData.id==='squirrel'?1.1:1.6,7),perchMaterial); branch.rotation.z=Math.PI/2; branch.position.set(birdData.x,perchY-.25,birdData.z); scene.add(branch);
    if (birdData.id !== 'squirrel') { const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12,.20,1.6,7),perchMaterial); trunk.position.set(birdData.x+.65,perchY-.9,birdData.z); scene.add(trunk); }
    const canopy = new THREE.Mesh(sphere,mat(world.region.props==='sky-ridge'?0xb8becb:0x8caf68)); canopy.position.set(birdData.x+1,perchY+1,birdData.z-.8); canopy.scale.set(1,.85,1); scene.add(canopy);
  } else {
    const ledge=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),mat(0x605b6b));ledge.position.set(birdData.x,perchY-.85,birdData.z);ledge.scale.set(1,.45,.8);scene.add(ledge);
  }
  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  let reducedMotion = !!motionPreference?.matches;
  const onMotionPreference = event => { reducedMotion = !!event.matches; };
  motionPreference?.addEventListener?.('change', onMotionPreference);
  const learningBirds = createLearningBirds(scene, world, { reducedMotion });
  const marker = new THREE.Mesh(new THREE.RingGeometry(.17,.23,24),new THREE.MeshBasicMaterial({color:0xffe8a3,transparent:true,opacity:.8,depthWrite:false}));
  marker.rotation.x=-Math.PI/2; marker.visible=false; scene.add(marker);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.3,.36,24),new THREE.MeshBasicMaterial({color:0xffeea0,transparent:true,opacity:.8,depthWrite:false}));
  halo.rotation.x=-Math.PI/2; halo.position.set(birdData.x,perchY-1.42,birdData.z); scene.add(halo);
  const feedbackEffects = createFeedbackEffects(scene, () => reducedMotion);
  const waterLineCount = world.region.water ? Math.ceil((bounds.maxX - bounds.minX) / 1.35) : 0;
  const waterLines = waterLineCount ? instances(Array.from({length:waterLineCount},(_,i)=>({
    x: bounds.minX + (i + .5) * (bounds.maxX - bounds.minX) / waterLineCount,
    z: world.region.water.edgeZ - 1.6 - (i % 3) * 2.2,
  })),new THREE.BoxGeometry(.8,.008,.018),mat(0xa5d7cb),t=>{t.position.y=waterY+.015;}) : null;
  const environment = createEnvironmentAssets({scene,world,fallbacks:{rock:rockFallback},enabledTypes:['rock']});
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  return {
    renderer, scene, actor, ground, bird, learningBirds: learningBirds.birds,
    emitFeedback: feedbackEffects.emit,
    effectStats: feedbackEffects.stats,
    learningBirdAnimation: learningBirds.animationStats,
    mainBirdAnimation() { return { phase: mainBirdPhase, wingRotation: mainWingRotation }; },
    environmentStatus: environment.status,
    environmentReady: environment.readyPromise,
    pick(event,camera) {
      const rect=canvas.getBoundingClientRect(); ndc.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
      raycaster.setFromCamera(ndc,camera);
      const hit=raycaster.intersectObject(ground,true)[0]; return hit ? {x:hit.point.x,z:hit.point.z} : null;
    },
    setDestination(point) { marker.visible=!!point; if(point) marker.position.set(point.x,(world.sampleSurface(point.x,point.z)?.height||0)+.035,point.z); },
    update(dt,time,near,captured,nearLearningBirdId=null) {
      sunlight.target.position.copy(actor.root.position);
      sunlight.position.set(actor.root.position.x - 10, actor.root.position.y + 20, actor.root.position.z + 8);
      const flightPhase = reducedMotion ? 0 : time % 7;
      const flight = flightPhase < 1.25 ? Math.sin(Math.PI * flightPhase / 1.25) : 0;
      mainBirdPhase = flightPhase;
      const flap = reducedMotion ? 0 : Math.sin(time * 13) * .34;
      mainWingRotation = flap;
      bird.position.set(birdData.x + Math.sin(time * .9) * .42 * flight, perchY + (reducedMotion ? 0 : Math.sin(time * 3) * .025 + (creature === 'squirrel' ? .20 : .58) * flight), birdData.z + Math.cos(time * .75) * .30 * flight);
      bird.rotation.y=reducedMotion ? 0 : Math.sin(time*.35)*.4;
      if (birdHead) birdHead.rotation.z = reducedMotion ? 0 : Math.sin(time * 1.7) * .045;
      for (const wing of birdWings) wing.mesh.rotation.z = wing.rest + wing.side * flap;
      learningBirds.update(time,nearLearningBirdId,reducedMotion);
      feedbackEffects.update(dt);
      halo.visible=near; halo.scale.setScalar(1+Math.sin(time*3)*.09); halo.material.color.setHex(captured?0xb9e49a:0xffeea0);
      if(waterLines) waterLines.position.x=Math.sin(time*.35)*.15;
    },
    resize(w,h) { renderer.setSize(w,h,false); },
    render(camera) {
      // Keep shadow and main passes together in each frame's QA render totals.
      renderer.info.reset();
      renderer.render(scene,camera);
    },
    dispose() {
      motionPreference?.removeEventListener?.('change', onMotionPreference);
      environment.dispose();
      actor.dispose();
      disposeSceneResources(scene); sunlight.shadow.dispose(); renderer.dispose();
    },
  };
}
