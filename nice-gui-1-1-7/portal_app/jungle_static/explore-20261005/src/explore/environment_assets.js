import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_ROOT = new URL('../../assets/vendor/kenney/nature-kit/Models/GLTF%20format/', import.meta.url);
export const ENVIRONMENT_ASSETS = Object.freeze({
  tree: new URL('tree_detailed.glb', MODEL_ROOT).href,
  rock: new URL('rock_largeA.glb', MODEL_ROOT).href,
  grass: new URL('plant_bushDetailed.glb', MODEL_ROOT).href,
});

const MODEL_SIZE = Object.freeze({ tree: { height: 3, origin: true }, rock: { radius: .65 }, grass: { height: .39 } });

export function createEnvironmentAssets({ scene, world, fallbacks, loader = new GLTFLoader(), enabledTypes = Object.keys(ENVIRONMENT_ASSETS) }) {
  const allTypes = Object.keys(ENVIRONMENT_ASSETS);
  const enabled = new Set(enabledTypes);
  const requestedTypes = allTypes.filter(type => enabled.has(type));
  const status = Object.fromEntries(allTypes.map(type => [type, enabled.has(type) ? 'loading' : 'authored']));
  const loaded = new Map();
  const pending = new Map();
  const disposed = new WeakSet();
  let isDisposed = false;

  function release(resource) {
    if (!resource || disposed.has(resource)) return;
    disposed.add(resource);
    resource.dispose?.();
  }

  function releaseSource(gltf) {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    gltf?.scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach(release);
    materials.forEach(release);
    textures.forEach(release);
  }

  function build(type, gltf) {
    const generated = new Set();
    try { buildLoadedModel(type, gltf, generated); }
    catch (error) {
      generated.forEach(release);
      releaseSource(gltf);
      throw error;
    }
  }

  function buildLoadedModel(type, gltf, generated) {
    const root = gltf?.scene;
    if (!root) throw new Error('GLB has no scene');
    root.updateMatrixWorld(true);
    const sources = [];
    const materials = new Set();
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    root.traverse(object => {
      const attribute = object.isMesh && object.geometry?.getAttribute('position');
      if (!attribute?.count || !object.material) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      generated.add(geometry);
      const position = geometry.getAttribute('position');
      if (!position?.count) { geometry.dispose(); return; }
      for (let i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i);
        if (![point.x, point.y, point.z].every(Number.isFinite)) throw new Error('GLB contains invalid vertices');
        bounds.expandByPoint(point);
      }
      sources.push({ geometry, material: object.material });
    });
    if (!sources.length || !Number.isFinite(bounds.min.y) || bounds.max.y - bounds.min.y < 1e-5) throw new Error('GLB has no usable geometry');
    for (const material of materials) {
      if ('metalness' in material) material.metalness = 0;
      if ('roughness' in material) material.roughness = 1;
      if (type === 'rock' && material.color) material.color.setHex(0xc6a774);
      material.needsUpdate = true;
    }

    const items = world.region.decorations.filter(item => item.type === type);
    if (!items.length) throw new Error('No placement points');
    const spec = MODEL_SIZE[type];
    const centerX = spec.origin ? 0 : (bounds.min.x + bounds.max.x) / 2;
    const centerZ = spec.origin ? 0 : (bounds.min.z + bounds.max.z) / 2;
    let maxRadius = 0;
    if (spec.radius) for (const source of sources) {
      const position = source.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i += 1) {
        point.fromBufferAttribute(position, i);
        maxRadius = Math.max(maxRadius, Math.hypot(point.x - centerX, point.z - centerZ));
      }
    }
    const scale = spec.radius ? spec.radius / Math.max(1e-5, maxRadius) : spec.height / (bounds.max.y - bounds.min.y);
    const normalization = new THREE.Matrix4().set(
      scale, 0, 0, -centerX * scale,
      0, scale, 0, -bounds.min.y * scale,
      0, 0, scale, -centerZ * scale,
      0, 0, 0, 1,
    );
    const temporary = new THREE.Object3D();
    const built = [];
    try {
      for (const source of sources) {
        source.geometry.applyMatrix4(normalization);
        source.geometry.computeBoundingBox();
        source.geometry.computeBoundingSphere();
        const placements = items.flatMap(item => {
          const surface = world.sampleSurface(item.x, item.z);
          return surface ? [{ item, height: surface.height }] : [];
        });
        if (!placements.length) throw new Error('No grounded placement points');
        const mesh = new THREE.InstancedMesh(source.geometry, source.material, placements.length);
        mesh.name = `environment-${type}`;
        placements.forEach(({ item, height }, index) => {
          const yaw = ((Math.sin(item.x * 31.7 + item.z * 17.3) + 1) * Math.PI);
          temporary.position.set(item.x, height, item.z);
          temporary.rotation.set(0, yaw, 0);
          temporary.scale.setScalar(Number.isFinite(item.scale) && item.scale > 0 ? item.scale : 1);
          temporary.updateMatrix();
          mesh.setMatrixAt(index, temporary.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.castShadow = type !== 'grass';
        mesh.receiveShadow = true;
        built.push(mesh);
      }
      for (const mesh of built) scene.add(mesh);
      const fallback = fallbacks[type] || [];
      for (const object of fallback) object.visible = false;
      loaded.set(type, { meshes: built, geometries: sources.map(source => source.geometry), gltf, fallback });
      status[type] = 'loaded';
    } catch (error) {
      for (const mesh of built) {
        mesh.parent?.remove(mesh);
        mesh.dispose?.();
      }
      for (const source of sources) release(source.geometry);
      releaseSource(gltf);
      throw error;
    }
    // Instanced geometry is a clone; source geometry is no longer needed.
    const sourceGeometries = new Set();
    root.traverse(object => { if (object.geometry) sourceGeometries.add(object.geometry); });
    sourceGeometries.forEach(release);
  }

  const readyPromise = Promise.all(requestedTypes.map(type => new Promise(resolve => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      pending.delete(type);
      resolve();
    };
    pending.set(type, finish);
    const fallback = () => {
      if (!isDisposed) status[type] = 'fallback';
      finish();
    };
    try {
      loader.load(ENVIRONMENT_ASSETS[type], gltf => {
        if (isDisposed) { releaseSource(gltf); finish(); return; }
        try { build(type, gltf); }
        catch { if (!isDisposed) status[type] = 'fallback'; }
        finish();
      }, undefined, fallback);
    } catch { fallback(); }
  }))).then(() => status);

  function dispose() {
    if (isDisposed) return;
    isDisposed = true;
    for (const type of Object.keys(ENVIRONMENT_ASSETS)) if (status[type] === 'loading') status[type] = 'fallback';
    for (const finish of [...pending.values()]) finish();
    for (const [type, record] of loaded) {
      for (const mesh of record.meshes) {
        mesh.parent?.remove(mesh);
        mesh.dispose?.();
      }
      record.geometries.forEach(release);
      releaseSource(record.gltf);
      for (const object of record.fallback) object.visible = true;
      loaded.delete(type);
    }
  }

  return { status, readyPromise, dispose };
}
