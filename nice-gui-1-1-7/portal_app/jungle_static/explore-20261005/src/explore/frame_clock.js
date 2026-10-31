const STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = .25;

export function createFrameClock() {
  let carry = 0;
  return {
    advance(deltaSeconds) {
      if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
        carry = 0;
        return { acceptedSeconds: 0, droppedSeconds: 0, steps: 0, stepSeconds: STEP_SECONDS, remainder: 0 };
      }
      const acceptedSeconds = Math.min(deltaSeconds, MAX_FRAME_SECONDS);
      const droppedSeconds = deltaSeconds - acceptedSeconds;
      carry += acceptedSeconds;
      const steps = Math.floor((carry + STEP_SECONDS * 1e-9) / STEP_SECONDS);
      carry = Math.max(0, carry - steps * STEP_SECONDS);
      return { acceptedSeconds, droppedSeconds, steps, stepSeconds: STEP_SECONDS, remainder: carry };
    },
    reset() { carry = 0; },
  };
}
