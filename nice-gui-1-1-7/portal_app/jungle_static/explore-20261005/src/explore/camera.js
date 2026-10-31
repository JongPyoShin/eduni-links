import * as THREE from 'three';

export function createCamera() {
  const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, .1, 100);
  const target = new THREE.Vector3();
  const right = { x: Math.SQRT1_2, z: -Math.SQRT1_2 };
  const forward = { x: -Math.SQRT1_2, z: -Math.SQRT1_2 };
  let initialized = false;
  let focusTarget = null;
  return {
    camera, basis: { right, forward },
    resize(width, height) {
      const span = height > width ? 8 : 6.4;
      const aspect = width / Math.max(1, height);
      camera.left = -span * aspect; camera.right = span * aspect;
      camera.top = span; camera.bottom = -span;
      camera.updateProjectionMatrix(); initialized = false;
    },
    setFocus(point, zoom = 2.4) {
      if (!point || ![point.x, point.y, point.z, zoom].every(Number.isFinite) || zoom < 1 || zoom > 4) return false;
      focusTarget = point; camera.zoom = zoom; camera.updateProjectionMatrix(); initialized = false; return true;
    },
    clearFocus() { focusTarget = null; camera.zoom = 1; camera.updateProjectionMatrix(); initialized = false; },
    update(position, groundY, dt) {
      const focus = focusTarget && [focusTarget.x, focusTarget.y, focusTarget.z].every(Number.isFinite) ? focusTarget : null;
      const desired = focus
        ? new THREE.Vector3(focus.x, focus.y, focus.z)
        : new THREE.Vector3(position.x + forward.x * .9, groundY + .1, position.z + forward.z * .9);
      if (!initialized) { target.copy(desired); initialized = true; }
      else target.lerp(desired, 1 - Math.exp(-7 * dt));
      camera.position.copy(target).add(new THREE.Vector3(9, 14, 9));
      camera.lookAt(target); camera.updateMatrixWorld(true);
    },
  };
}
