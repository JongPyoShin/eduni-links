import * as THREE from 'three';
import { getLearningBirds } from './bird_learning.js?v=learning-20261015';

const palettes = {
  mallard: [0x9a7744, 0xf0dfb2, 0x1e754c, 0xe6a838], wagtail: [0x30383d, 0xf2eee1, 0x171d21, 0xc78c46],
  sparrow: [0x96704f, 0xd9c69d, 0x674b36, 0xd4a565], magpie: [0x222d35, 0xf2f1e7, 0x152534, 0x7d9e9b],
  egret: [0xf1efe2, 0xffffff, 0xe2dfd4, 0x383b3d], mandarin: [0xa87531, 0xe4ca83, 0x354d75, 0xb44b35],
  'eagle-owl': [0x765a42, 0xc9ae81, 0x46372e, 0xc59a48], 'scops-owl': [0x89745d, 0xd4c39d, 0x55483a, 0x987954],
  woodpecker: [0x283239, 0xf0eee0, 0x121719, 0xc94335], 'great-tit': [0x26353a, 0xf4f1e5, 0x111b1f, 0xd7c84d],
  kestrel: [0x9c704a, 0xe1c49d, 0x463d39, 0x6e6873], swallow: [0x31546f, 0xece5d7, 0x182c3c, 0xa9805b],
};

export function createLearningBirdModel(data, surfaceY, shared) {
  const group = new THREE.Group();
  group.name = `learning-bird-${data.id}`;
  group.position.set(data.x, surfaceY + 1.05, data.z);
  const [bodyColor, paleColor, darkColor, accentColor] = palettes[data.id];
  const feather = shared(bodyColor), pale = shared(paleColor), dark = shared(darkColor), accent = shared(accentColor), eye = shared(0x171713);
  const add = (geometry, material, position, scale, rotation = null) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.scale.set(...scale);
    if (rotation) mesh.rotation.set(...rotation);
    mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh); return mesh;
  };
  const bodyScale = data.shape === 'dabbling' ? [.27, .22, .38] : data.shape === 'wader' ? [.19, .28, .27] : data.shape === 'small-owl' ? [.24, .25, .25] : [.21, .24, .31];
  add(new THREE.IcosahedronGeometry(1, 1), feather, [0, 0, 0], bodyScale);
  const headScale = data.shape === 'ear-tuft' || data.shape === 'small-owl' ? [.17, .18, .17] : [.145, .15, .15];
  const headY = data.shape === 'wader' ? .52 : .20;
  const head = add(new THREE.IcosahedronGeometry(1, 1), data.shape === 'mask' || data.shape === 'dabbling' ? dark : feather, [0, headY, .16], headScale);
  if (data.shape === 'ear-tuft' || data.shape === 'small-owl') add(new THREE.SphereGeometry(.14, 8, 6), pale, [0, .20, .29], [1, .9, .30]);
  const beak = data.shape === 'dabbling' ? new THREE.BoxGeometry(.20, .065, .14) : new THREE.ConeGeometry(data.shape === 'wader' ? .045 : .055, data.shape === 'woodpecker' ? .25 : .16, 5);
  add(beak, accent, [0, data.shape === 'wader' ? headY - .03 : .17, .34], [1, 1, 1], data.shape === 'dabbling' ? null : [Math.PI / 2, 0, 0]);
  const wings = [];
  for (const side of [-1, 1]) {
    if (data.shape === 'ear-tuft' || data.shape === 'small-owl') add(new THREE.SphereGeometry(.034, 6, 5), accent, [side * .075, .23, .335], [1, 1, .65]);
    add(new THREE.SphereGeometry(data.shape === 'ear-tuft' || data.shape === 'small-owl' ? .017 : .025, 6, 5), eye, [side * .075, data.shape === 'wader' ? headY + .025 : .23, data.shape === 'wader' ? .29 : .355], [1, 1, .65]);
  }
  if (data.shape === 'wader') {
    const leg = shared(0x353b3a);
    for (const side of [-1, 1]) add(new THREE.CylinderGeometry(.018, .022, .30, 5), leg, [side * .075, -.27, .02], [1, 1, 1]);
    // Egrets have a visibly upright neck; keep the white breast part of the body, not a button.
    add(new THREE.CylinderGeometry(.055, .075, .52, 6), pale, [0, .34, .13], [1, 1, 1], [.12, 0, 0]);
  } else {
    const bellyZ = data.id === 'magpie' ? .27 : .30;
    const bellyScale = data.id === 'magpie' ? [.14, .17, .045] : [.15, .17, .045];
    add(new THREE.SphereGeometry(1, 7, 5), pale, [0, -.055, bellyZ], bellyScale);
  }
  for (const side of [-1, 1]) {
    const wingShape = data.shape === 'fan-wing' ? [.13, .20, .06] : data.shape === 'hovering-raptor' ? [.68, .31, .09] : [.20, .12, .08];
    const wing = add(data.shape === 'hovering-raptor' ? new THREE.ConeGeometry(.5, 1.2, 3) : new THREE.IcosahedronGeometry(1, 1), data.shape === 'fan-wing' ? accent : feather,
      [side * (data.shape === 'hovering-raptor' ? .38 : .21), data.shape === 'fan-wing' ? .14 : .01, -.01], wingShape,
      data.shape === 'hovering-raptor' ? [0, 0, side * Math.PI / 2] : [0, 0, side * .12]);
    wings.push({ mesh: wing, side, rest: wing.rotation.z });
    if (data.shape === 'fan-wing') wing.position.y = .20;
    if (data.id === 'magpie') add(new THREE.SphereGeometry(.10, 6, 4), pale, [side * .28, .05, .13], [1, .72, .42]);
  }
  if (data.shape === 'ear-tuft') {
    for (const side of [-1, 1]) add(new THREE.ConeGeometry(.055, .21, 5), feather, [side * .09, .36, .13], [1, 1, 1], [0, 0, side * -.18]);
  }
  if (data.shape === 'woodpecker') add(new THREE.SphereGeometry(.07, 6, 5), accent, [0, .33, .13], [1, .7, .55]);
  if (data.shape === 'mask') {
    // Black central bib and pale cheeks distinguish a Korean great tit.
    add(new THREE.BoxGeometry(.055, .16, .035), dark, [0, -.15, .225], [1, 1, 1]);
    for (const side of [-1, 1]) add(new THREE.SphereGeometry(.042, 6, 4), pale, [side * .105, .20, .30], [1.2, .9, .45]);
  }
  if (data.shape === 'fork-tail') {
    // Swallow's unmistakable fork is two long, separated feathers visible from side and rear.
    for (const side of [-1, 1]) {
      const tail = add(new THREE.BoxGeometry(.085, .055, .96), dark, [side * .23, -.035, -.67], [1, 1, 1]);
      tail.rotation.y = side * -.30;
    }
  } else if (data.shape === 'long-tail') {
    // Wagtail and magpie both carry a long tail; magpie's is broad, wagtail's narrow and forked at the tip.
    const width = data.id === 'magpie' ? .27 : .13;
    for (const side of [-1, 1]) {
      const tail = add(new THREE.BoxGeometry(width * .50, .055, data.id === 'magpie' ? .94 : .90), dark, [side * width * .36, -.035, -.66], [1, 1, 1]);
      tail.rotation.y = side * (data.id === 'magpie' ? .04 : -.16);
    }
  } else {
    const tailLength = data.shape === 'hovering-raptor' ? .42 : data.shape === 'fan-wing' ? .22 : .18;
    add(new THREE.ConeGeometry(.065, tailLength, 5), data.shape === 'fan-wing' ? accent : feather, [0, -.02, -.34], [1, 1, 1], [-Math.PI / 2, 0, 0]);
  }
  if (data.shape === 'dabbling') add(new THREE.SphereGeometry(.055, 6, 4), accent, [0, -.19, .02], [1.4, .5, .8]);
  const perch = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .8, 5), shared(0x866642));
  perch.rotation.z = Math.PI / 2; perch.position.set(0, -.43, 0); perch.castShadow = false; group.add(perch);
  const halo = new THREE.Mesh(new THREE.RingGeometry(.28, .36, 16), new THREE.MeshBasicMaterial({ color: 0xffe889, transparent: true, opacity: .76, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.set(data.x, surfaceY + .035, data.z); halo.name = `learning-bird-marker-${data.id}`; halo.userData.anchorMarker = true;
  return { data, group, head, wings, halo, baseY: surfaceY + 1.05, surfaceY, animationPhase: 0, wingRotation: 0 };
}

export function createLearningBirds(scene, world, { reducedMotion = false } = {}) {
  const materials = new Map();
  const shared = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true }));
    return materials.get(color);
  };
  const birds = getLearningBirds(world.region).map(data => {
    const surface = world.sampleSurface(data.x, data.z);
    const model = createLearningBirdModel(data, surface?.height ?? 0, shared);
    scene.add(model.group); scene.add(model.halo); return model;
  });
  return { birds, update(time, nearbyId, motionReduced = reducedMotion) {
    for (const bird of birds) {
      const phase = motionReduced ? 0 : ((time + bird.data.order * 1.3) % 7);
      const flight = motionReduced || phase >= 1.15 ? 0 : Math.sin(Math.PI * phase / 1.15);
      const flap = motionReduced ? 0 : Math.sin(time * 13 + bird.data.order) * .34;
      bird.animationPhase = phase; bird.wingRotation = flap;
      bird.group.position.set(bird.data.x + Math.sin(time * 1.4 + bird.data.order) * .28 * flight,
        bird.baseY + (motionReduced ? 0 : Math.sin(time * 2.4 + bird.data.order) * .025 + .48 * flight),
        bird.data.z + Math.cos(time * 1.1 + bird.data.order) * .20 * flight);
      bird.group.rotation.y = motionReduced ? 0 : Math.sin(time * .35 + bird.data.order) * .14;
      bird.head.rotation.z = motionReduced ? 0 : Math.sin(time * 1.7 + bird.data.order) * .045;
      for (const wing of bird.wings) wing.mesh.rotation.z = wing.rest + wing.side * flap;
      bird.halo.material.opacity = bird.data.id === nearbyId ? .95 : .58;
      bird.halo.scale.setScalar(!motionReduced && bird.data.id === nearbyId ? 1 + Math.sin(time * 3) * .08 : 1);
    }
  }, animationStats() { return birds.map(bird => ({ id: bird.data.id, phase: bird.animationPhase, wingRotation: bird.wingRotation, markerAtAnchor: bird.halo.userData.anchorMarker })); } };
}
