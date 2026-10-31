const LIMIT = 20;
const BOUNDARIES = new Set(['blur', 'visibility', 'modal', 'contextlost', 'restored', 'resize', 'pagehide', 'pageshow', 'focus']);

export function createFrameDiagnostics() {
  const boundaryEvents = [], longGaps = [];
  let eventSequence = 0, frameSequence = 0, previous = null, current = null;
  const stateOf = value => ({ focused: value?.focused === true, visibility: typeof value?.visibility === 'string' ? value.visibility : null });
  const keep20 = (items, value) => { items.push(value); if (items.length > LIMIT) items.shift(); };
  const eventsSince = sequence => boundaryEvents.filter(event => event.sequence > sequence);

  function boundary(reason, time, state) {
    if (!BOUNDARIES.has(reason) || !Number.isFinite(time) || time < 0) return null;
    const event = { sequence: ++eventSequence, reason, time, ...stateOf(state) };
    keep20(boundaryEvents, event);
    return event;
  }

  function begin(timestamp, callbackStart, state) {
    if (!Number.isFinite(timestamp) || timestamp < 0 || !Number.isFinite(callbackStart) || callbackStart < 0 ||
        (previous && (timestamp < previous.timestamp || callbackStart < previous.callbackStart || callbackStart < previous.completedAt))) {
      previous = current = null;
      return null;
    }
    const currentState = stateOf(state), prior = previous;
    const sample = {
      frameSequence: ++frameSequence,
      previousRafDeltaMs: prior ? timestamp - prior.timestamp : null,
      previousStartDeltaMs: prior ? callbackStart - prior.callbackStart : null,
      previousCompleteCpuMs: prior ? prior.completedAt - prior.callbackStart : null,
      previousEndGapMs: prior ? callbackStart - prior.completedAt : null,
      startLagMs: callbackStart - timestamp,
      previousFocusVisibility: prior?.state || null,
      currentFocusVisibility: currentState,
      previousEventSequence: prior?.eventSequence ?? 0,
      eventSequence,
    };
    sample.eventsSincePrevious = eventsSince(sample.previousEventSequence);
    const gapValues = [sample.previousRafDeltaMs, sample.previousStartDeltaMs, sample.previousEndGapMs, sample.startLagMs].filter(Number.isFinite);
    if (gapValues.some(value => value > 50)) keep20(longGaps, { ...sample, eventsSincePrevious: sample.eventsSincePrevious.slice() });
    current = { timestamp, callbackStart, state: currentState, eventSequence };
    return { ...sample, boundaryEvents: boundaryEvents.slice(), longGaps: longGaps.slice() };
  }

  function end(callbackEnd) {
    if (!current || !Number.isFinite(callbackEnd) || callbackEnd < current.callbackStart) {
      previous = current = null;
      return null;
    }
    previous = { ...current, completedAt: callbackEnd };
    current = null;
    return callbackEnd - previous.callbackStart;
  }

  return { begin, boundary, end };
}
