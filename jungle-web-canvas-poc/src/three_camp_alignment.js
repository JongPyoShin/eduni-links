import { CLUES, LANDMARKS } from "./content/camp_chapter.js";
import { campLogicalToThree } from "./three_camp_runtime.js";

const EPSILON = 0.001;
const LEGACY_BLUEBIRD_VISUAL = Object.freeze({ x: 1410, y: 400 });

function clue(id) {
  return CLUES.find((entry) => entry.id === id);
}

function near(a, b) {
  return Math.abs(a - b) <= EPSILON;
}

function findTopLevelAt(scene, logicalX, logicalY, height = 0, predicate = () => true) {
  const anchor = campLogicalToThree(logicalX, logicalY, height);
  return scene.children.find((object) =>
    predicate(object) &&
    near(object.position.x, anchor.x) &&
    near(object.position.y, anchor.y) &&
    near(object.position.z, anchor.z)
  ) || null;
}

function findTopLevelGroupAt(scene, logicalX, logicalY, height = 0) {
  return findTopLevelAt(scene, logicalX, logicalY, height, (object) => object?.isGroup);
}

function moveTopLevelGroup(scene, from, to, height = 0) {
  const group = findTopLevelGroupAt(scene, from.x, from.y, height);
  if (!group) return false;
  group.position.copy(campLogicalToThree(to.x, to.y, height));
  return true;
}

function moveTopLevelObject(scene, from, to, height, predicate) {
  const object = findTopLevelAt(scene, from.x, from.y, height, predicate);
  if (!object) return false;
  object.position.copy(campLogicalToThree(to.x, to.y, height));
  return true;
}

function alignFootprintTrail(scene) {
  const target = clue("footprints");
  if (!target) return false;

  const trail = scene.children.find((object) =>
    object?.isGroup &&
    object.position.lengthSq() <= EPSILON &&
    object.children.length === 5 &&
    object.children.every((child) => child?.isMesh && child.geometry?.type === "CircleGeometry")
  );
  if (!trail) return false;

  const last = trail.children[trail.children.length - 1];
  const desired = campLogicalToThree(target.x, target.y, last.position.y);
  trail.position.x += desired.x - last.position.x;
  trail.position.z += desired.z - last.position.z;
  return true;
}

function alignBluebird(scene) {
  const target = LANDMARKS.bluebird;
  const sprite = moveTopLevelObject(
    scene,
    LEGACY_BLUEBIRD_VISUAL,
    target,
    1.55,
    (object) => object?.isSprite || object?.isMesh
  );
  const halo = moveTopLevelObject(
    scene,
    LEGACY_BLUEBIRD_VISUAL,
    target,
    1.4,
    (object) => object?.isPointLight
  );
  const reward = moveTopLevelObject(
    scene,
    LEGACY_BLUEBIRD_VISUAL,
    target,
    1.05,
    (object) => object?.isGroup
  );
  return Boolean(sprite && reward && (halo || sprite));
}

/**
 * Compatibility alignment for the first Three Camp presentation slice.
 * Gameplay remains authoritative: these visual landmarks are snapped to the
 * exact interaction coordinates exported by camp_chapter.js.
 */
export function alignCampLandmarks(runtime) {
  if (!runtime?.scene) throw new TypeError("Camp landmark alignment requires a Three runtime scene");

  const birdcall = clue("birdcall");
  const footprints = clue("footprints");
  const aligned = {
    hut: moveTopLevelGroup(runtime.scene, { x: 520, y: 320 }, LANDMARKS.hut),
    firePit: moveTopLevelGroup(runtime.scene, { x: 920, y: 820 }, LANDMARKS.firePit),
    birdcall: birdcall ? moveTopLevelGroup(runtime.scene, { x: 920, y: 760 }, birdcall, 0.1) : false,
    footprints: alignFootprintTrail(runtime.scene),
    bluebird: alignBluebird(runtime.scene),
  };

  runtime.scene.userData.campLandmarkAlignment = Object.freeze({
    hut: { x: LANDMARKS.hut.x, y: LANDMARKS.hut.y },
    firePit: { x: LANDMARKS.firePit.x, y: LANDMARKS.firePit.y },
    footprints: footprints ? { x: footprints.x, y: footprints.y } : null,
    birdcall: birdcall ? { x: birdcall.x, y: birdcall.y } : null,
    bluebird: { x: LANDMARKS.bluebird.x, y: LANDMARKS.bluebird.y },
    aligned,
  });

  return runtime.scene.userData.campLandmarkAlignment;
}
