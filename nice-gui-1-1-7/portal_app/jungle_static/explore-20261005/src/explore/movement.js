const FIXED_STEP_SECONDS = 1 / 60;
const MAX_STEPS = 5;

const finite = (value) => Number.isFinite(value) ? value : 0;

export function movePlayer(world, position, intent, basis, dtSeconds, options = {}) {
  const speedLimit = Math.max(0, finite(options.speed ?? 2.2));
  const radius = Math.max(0, finite(options.radius ?? 0.25));
  const elapsed = Math.max(0, Math.min(MAX_STEPS * FIXED_STEP_SECONDS, finite(dtSeconds)));
  const inputX = finite(intent?.x);
  const inputY = finite(intent?.y);
  const inputLength = Math.hypot(inputX, inputY);
  const inputScale = inputLength > 1 ? 1 / inputLength : 1;
  const screenX = inputX * inputScale;
  const screenUp = -inputY * inputScale;
  const right = basis?.right || { x: 1, z: 0 };
  const forward = basis?.forward || { x: 0, z: -1 };
  let worldX = finite(right.x) * screenX + finite(forward.x) * screenUp;
  let worldZ = finite(right.z) * screenX + finite(forward.z) * screenUp;
  const directionLength = Math.hypot(worldX, worldZ);
  if (directionLength > 1) {
    worldX /= directionLength;
    worldZ /= directionLength;
  }

  let current = { x: finite(position?.x), z: finite(position?.z), groundY: finite(position?.groundY) };
  let movedDistance = 0;
  const stepCount = elapsed > 0 && directionLength > 0 && speedLimit > 0
    ? Math.ceil(elapsed / FIXED_STEP_SECONDS)
    : 0;
  for (let step = 0; step < stepCount; step += 1) {
    const stepSeconds = Math.min(FIXED_STEP_SECONDS, elapsed - step * FIXED_STEP_SECONDS);
    const result = world.resolveMove(current, {
      x: worldX * speedLimit * stepSeconds,
      z: worldZ * speedLimit * stepSeconds,
    }, radius);
    movedDistance += result.movedDistance;
    current = { ...result.position, groundY: result.groundY };
  }
  if (!stepCount) {
    const surface = world.sampleSurface?.(current.x, current.z);
    current.groundY = surface?.height ?? current.groundY;
  }
  return { position: { x: current.x, z: current.z }, groundY: current.groundY, movedDistance, speed: elapsed ? movedDistance / elapsed : 0 };
}
