import { CLUES, LANDMARKS } from "./content/camp_chapter.js";
import { campLogicalToThree } from "./three_camp_runtime.js";

const EPSILON = 0.001;

function clue(id) {
  return CLUES.find((entry) => entry.id === id);
}

function near(a, b) {
  return Math.abs(a - b) <= EPSILON;
}

function findTopLevelGroupAt(scene, logicalX, logicalY, height = 0) {
  const anchor = campLogicalToThree(logicalX, logicalY, height);
  return scene.children.find((object) =>
    object?.isGroup &&
    near(object.position.x, anchor.x) &&
    near(object.position.y, anchor.y) &&
    near(object.position.z, anchor.z)
  ) || null;
}

function moveTopLevelGroup(scene, from, to, height = 0) {
  const group = findTopLevelGroupAt(scene, from.x, from.y, height);
  if (!group) return false;
  group.position.copy(campLogicalToThree(to.x, to.y, height));
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

/**
 * Compatibility alignment for the first Three Camp presentation slice.
 * Gameplay remains authoritative: these visual landmarks are snapped to the
 * exact interaction coordinates exported by camp_chapter.js.
 */
export function alignCampLandmarks(runtime) {
  if (!runtime?.scene) throw new TypeError("Camp landmark alignment requires a Three runtime scene");

  const birdcall = clue("birdcall");
  const aligned = {
    hut: moveTopLevelGroup(runtime.scene, { x: 520, y: 320 }, LANDMARKS.hut),
    firePit: moveTopLevelGroup(runtime.scene, { x: 920, y: 820 }, LANDMARKS.firePit),
    birdcall: birdcall ? moveTopLevelGroup(runtime.scene, { x: 920, y: 760 }, birdcall, 0.1) : false,
    footprints: alignFootprintTrail(runtime.scene),
  };

  runtime.scene.userData.campLandmarkAlignment = Object.freeze({
    hut: { x: LANDMARKS.hut.x, y: LANDMARKS.hut.y },
    firePit: { x: LANDMARKS.firePit.x, y: LANDMARKS.firePit.y },
    footprints: clue("footprints") ? { x: clue("footprints").x, y: clue("footprints").y } : null,
    birdcall: birdcall ? { x: birdcall.x, y: birdcall.y } : null,
    aligned,
  });

  return runtime.scene.userData.campLandmarkAlignment;
}
