export const MAX_FRAME_MS = 50;
export const DEFAULT_FRAME_MS = 16.7;

export function frameDelta(prevTs, ts) {
  if (prevTs === null || prevTs === undefined || !Number.isFinite(prevTs)) {
    if (ts !== undefined && Number.isFinite(ts)) return 0;
    return DEFAULT_FRAME_MS;
  }
  if (ts === undefined || !Number.isFinite(ts)) return DEFAULT_FRAME_MS;
  let dt = ts - prevTs;
  if (dt < 0) dt = DEFAULT_FRAME_MS;
  if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS;
  return dt;
}
