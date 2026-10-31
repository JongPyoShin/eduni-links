export function isPrimaryCanvasTap(event) {
  return event?.button === 0 && event.isPrimary !== false;
}

export function ownsCanvasTap(pointerId, event) {
  return pointerId !== null && event?.pointerId === pointerId;
}

export function classifyCanvasSize(previous, current) {
  if (!previous) return { changed: false, major: false };
  const widthChange = Math.abs(current.width - previous.width);
  const heightChange = Math.abs(current.height - previous.height);
  const changed = widthChange > 0 || heightChange > 0;
  const major = changed && (widthChange > 64 || heightChange > 160 || (current.width >= current.height) !== (previous.width >= previous.height));
  return { changed, major };
}
