import * as THREE from "three";

// Shared visual grammar: recessed background, midground islands, and a narrow
// foreground lip keep the authored route readable while palettes stay local.
export function addStageComposition(scene, { backdrop, islands, foreground }) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), new THREE.MeshBasicMaterial({ color: backdrop, transparent: true, opacity: .34, depthWrite: false }));
  back.position.set(0, 3.7, -4.2);
  group.add(back);
  [[-3.8, 2.1, 1.7], [0, .35, 1.45], [3.8, -1.45, 1.55]].forEach(([x, z, radius], index) => {
    const island = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.12, .22, 12), new THREE.MeshStandardMaterial({ color: islands[index % islands.length], roughness: 1 }));
    island.position.set(x, .06, z); island.rotation.y = index * .28; island.receiveShadow = true; group.add(island);
  });
  const start = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.38, .26, 14), new THREE.MeshStandardMaterial({ color: islands[0], roughness: 1 }));
  start.position.set(-5.8, .08, 4.35); start.receiveShadow = true; group.add(start);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(14, .18, .38), new THREE.MeshStandardMaterial({ color: foreground, roughness: 1 }));
  lip.position.set(0, .08, 4.35); lip.receiveShadow = true; group.add(lip);
  scene.add(group);
  return group;
}
