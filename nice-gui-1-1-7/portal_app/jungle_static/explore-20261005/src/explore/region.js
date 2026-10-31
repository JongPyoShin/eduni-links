import { MAP_CONTENT, MAP_IDS } from './map_content.js?v=maps-20261011e';

const TRAIL_POINTS = [
  { x: -8, z: 6 },
  { x: -5, z: 4 },
  { x: -2, z: 2 },
  { x: 0, z: 0 },
  { x: 2, z: -3 },
];

const LANDMARKS = {
  fernGrove: { id: "fernGrove", name: "잎사귀 숲", x: -23, z: 12, radius: 2.4, type: "fern" },
  riverTracks: { id: "riverTracks", name: "강가 발자국", x: -17, z: -5, radius: 2.4, type: "tracks" },
  lookout: { id: "lookout", name: "전망 언덕", x: 22, z: 13, radius: 2.4, type: "lookout" },
};

const TRAILS = [
  { id: "fernGrove", width: 2.4, points: [{ x: -8, z: 6 }, { x: -16, z: 9 }, { x: -23, z: 12 }] },
  { id: "riverTracks", width: 2.4, points: [{ x: -8, z: 6 }, { x: -12, z: 0 }, { x: -17, z: -5 }] },
  { id: "lookout", width: 2.4, points: [{ x: 2, z: -3 }, { x: 2, z: -1.8 }, { x: 10, z: 1 }, { x: 16, z: 8 }, { x: 22, z: 13 }] },
];

function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}

function createDecorations(region) {
  const items = [];
  const paths = [region.trail, ...region.trails];
  const trailSegments = paths.flatMap(({ points, width }) => points.slice(1).map((point, index) => ({
    a: points[index], b: point, clearance: (width || 0) / 2,
  })));
  let seed = 0x51a7e;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const landMinZ = Math.max(region.bounds.minZ + 1, region.water.edgeZ + 0.8);
  const place = (type, count, gap, extraTrailClearance) => {
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 240; tries += 1) {
      const x = region.bounds.minX + 1 + random() * (region.bounds.maxX - region.bounds.minX - 2);
      const z = landMinZ + random() * (region.bounds.maxZ - 1 - landMinZ);
      const trailClearance = Math.max(...trailSegments.map((segment) => segment.clearance + extraTrailClearance));
      if (trailSegments.some(({ a, b }) => distanceToSegment(x, z, a, b) < trailClearance)) continue;
      if (Math.hypot(x - region.spawn.x, z - region.spawn.z) < 2.8) continue;
      if (Math.hypot(x - region.bird.x, z - region.bird.z) < 2.8) continue;
      if (Object.values(region.landmarks).some((poi) => Math.hypot(x - poi.x, z - poi.z) < 3.2)) continue;
      if (items.some((item) => Math.hypot(item.x - x, item.z - z) < gap)) continue;
      const scale = type === "tree" ? 0.8 + random() * 0.55 : type === "rock" ? 0.65 + random() * 0.7 : 0.55 + random() * 0.8;
      items.push({ type, x: Number(x.toFixed(2)), z: Number(z.toFixed(2)), scale: Number(scale.toFixed(2)) });
      placed += 1;
    }
    if (placed !== count) throw new Error(`Could not place ${count} ${type} decorations (placed ${placed})`);
  };
  place("tree", 100, 1.25, 0.95);
  place("rock", 28, 0.85, 0.55);
  place("grass", 320, 0.3, 0.15);
  return items;
}

const region = {
  id: "river-meadow",
  props: "river",
  bounds: { minX: -32, maxX: 32, minZ: -24, maxZ: 24 },
  cellSize: 0.5,
  spawn: { x: -8, z: 6 },
  bird: { id: "riverBird", name: "물가새", x: 2, z: -3, radius: 1.8 },
  landmarks: LANDMARKS,
  trails: TRAILS,
  water: { edgeZ: -8, surfaceY: 0.08, bedDepth: 0.55 },
  trail: { points: TRAIL_POINTS, width: 2.4 },
  // Heights are sampled only at mesh vertices; world.js uses those same triangles for grounding.
  heightAtVertex(x, z) {
    const oldHill = 0.7 * Math.exp(-((x - 9) ** 2 + (z - 5) ** 2) / 30);
    const lookoutHill = 0.55 * Math.exp(-((x - 21) ** 2 + (z - 12) ** 2) / 120);
    return 0.035 * Math.sin(x * 0.22) * Math.cos(z * 0.17) + 0.018 * x + 0.01 * z + oldHill + lookoutHill;
  },
};

region.decorations = createDecorations(region);
region.obstacles = region.decorations
  .filter(({ type }) => type === "tree" || type === "rock")
  .map(({ type, x, z, scale }) => ({ x, z, radius: Number((scale * (type === "tree" ? 0.2 : 0.65)).toFixed(3)) }));
region.obstacles.push({ x: 2.65, z: -3, radius: 0.2 }); // visible perch trunk

export const REGION = region;

const LANDMARK_POINTS = [
  { x: -23, z: 12 }, { x: -17, z: -5 }, { x: 12, z: 11 },
];

function createMapRegion(content) {
  const layouts = {
    camp: [{x:-22,z:13},{x:-14,z:-4},{x:13,z:10}],
    waterfall: [{x:-23,z:12},{x:-15,z:-5},{x:14,z:10}],
    cave: [{x:-23,z:12},{x:-15,z:-5},{x:14,z:10}],
    'giant-tree': [{x:-21,z:13},{x:-13,z:-5},{x:13,z:10}],
    'sky-ridge': [{x:-23,z:12},{x:-15,z:-5},{x:14,z:10}],
  };
  const landmarks = Object.fromEntries(content.discoveries.map((mission, index) => {
    const point = layouts[content.id][index] || LANDMARK_POINTS[index];
    return [mission.id, { id: mission.id, name: mission.title || mission.id, ...point, radius: 2.4, type: content.props }];
  }));
  // Put each new-map spawn beside its signature landmark; keep the shared scale/camera.
  const firstLandmark = Object.values(landmarks)[0];
  const spawn = { x: firstLandmark.x + 4, z: firstLandmark.z + 2 };
  // Branch routes are authored from the local spawn to every activity.
  const trails = content.discoveries.map((item, index) => {
    const target = landmarks[item.id];
    const bend = index === 0 ? { x: (spawn.x + target.x) / 2, z: (spawn.z + target.z) / 2 } : index === 1 ? { x: -12, z: 0 } : content.props === 'cave' ? { x: target.x + 5, z: target.z } : { x: 10, z: 2 };
    const approach = { x: target.x + 1.6, z: target.z + (content.props === 'cave' && index === 2 ? 2.8 : 1.2) };
    const points = [spawn, bend, approach];
    if (index === 2) points.push(content.animalAt);
    return { id: item.id, width: 2.8, points };
  });
  const baseTrail = { points: TRAIL_POINTS, width: 2.4 };
  const region = {
    id: content.id,
    title: content.title,
    props: content.props,
    backgroundColor: ({camp:0xb8c99a,waterfall:0x9fbfc4,cave:0x77718d,'giant-tree':0xabbf88,'sky-ridge':0xc7e3f4})[content.props],
    bounds: { minX: -32, maxX: 32, minZ: -24, maxZ: 24 },
    cellSize: .5,
    spawn,
    bird: { ...content.animalAt, ...content.animal, radius: 1.8 },
    landmarks,
    trails,
    trail: baseTrail,
    water: content.waterEdge === null ? null : { edgeZ: content.waterEdge, surfaceY: .08, bedDepth: .55 },
    heightAtVertex(x, z) {
      const rolling = .035 * Math.sin(x * .22) * Math.cos(z * .17);
      const slope = content.props === 'sky-ridge' ? .018 * x + .025 * z : .01 * x + .008 * z;
      let height = rolling + slope;
      for (const hill of content.hills) height += hill.height * Math.exp(-((x - hill.x) ** 2 + (z - hill.z) ** 2) / (content.props === 'giant-tree' ? 110 : 70));
      if (content.props === 'waterfall') height += .35 * Math.sin(z * .19);
      return height;
    },
  };
  const items = [];
  let seed = content.id.split('').reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
  const segments = [region.trail, ...region.trails].flatMap(path => path.points.slice(1).map((point, index) => ({ a: path.points[index], b: point, clearance: path.width / 2 + .9 })));
  const nearSegment = (x, z, { a, b, clearance }) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x-a.x)*dx + (z-a.z)*dz) / (dx*dx + dz*dz || 1)));
    return Math.hypot(x-a.x-t*dx, z-a.z-t*dz) < clearance;
  };
  const treeCount = content.props === 'cave' ? 0 : content.props === 'giant-tree' ? 24 : 48;
  const rockCount = content.props === 'cave' || content.props === 'sky-ridge' ? 32 : 18;
  for (const [type, count] of [['tree', treeCount], ['rock', rockCount], ['grass', content.props === 'cave' ? 20 : 100]]) {
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 160; tries += 1) {
      const x = -31 + random() * 62, z = Math.max(content.waterEdge === null ? -23 : content.waterEdge + .9, -23) + random() * (content.waterEdge === null ? 46 : 22 - content.waterEdge);
      if (segments.some(segment => nearSegment(x, z, segment)) || Math.hypot(x-spawn.x,z-spawn.z)<3.5 || Math.hypot(x-content.animalAt.x,z-content.animalAt.z)<3.4 || Object.values(landmarks).some(item=>Math.hypot(x-item.x,z-item.z)<3.4) || items.some(item=>Math.hypot(x-item.x,z-item.z)<(type==='grass'?.35:1.4))) continue;
      const scale = type === 'tree' ? .8 + random()*.6 : type === 'rock' ? .6 + random()*.7 : .55 + random()*.8;
      items.push({ type, x, z, scale }); placed += 1;
    }
  }
  region.decorations = items;
  region.obstacles = items.filter(item => item.type !== 'grass').map(item => ({ x:item.x, z:item.z, radius:item.scale*(item.type==='tree'?.2:.65) }));
  if(content.props==='camp') region.obstacles.push({x:firstLandmark.x-1.8,z:firstLandmark.z,radius:.75});
  if(content.props==='giant-tree') region.obstacles.push({x:firstLandmark.x-2,z:firstLandmark.z,radius:.9});
  if(content.props==='sky-ridge') for(const offset of [-1.5,-.7,.9]) region.obstacles.push({x:firstLandmark.x+offset,z:firstLandmark.z,radius:.3});
  if(content.props==='cave') {const bridge=landmarks.crystalBridge;for(let i=0;i<5;i++)region.obstacles.push({x:bridge.x-1.6+i*.8,z:bridge.z-1.35,radius:.34});}
  return region;
}

export const MAPS = Object.freeze(Object.fromEntries(MAP_IDS.map(id => {
  if (id === 'river-meadow') return [id, { ...MAP_CONTENT[id], region: REGION, discoveries: undefined }];
  const content = MAP_CONTENT[id];
  return [id, { ...content, region: createMapRegion(content) }];
})));

export function getMap(id) {
  return MAPS[id] || MAPS['river-meadow'];
}
