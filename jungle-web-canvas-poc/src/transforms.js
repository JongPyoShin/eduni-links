export function makeCamera(x = 0, y = 0, zoom = 1) {
  return { x, y, zoom };
}

export function worldToScreen(wx, wy, cam, viewW, viewH) {
  return {
    x: (wx - cam.x) * cam.zoom + viewW / 2,
    y: (wy - cam.y) * cam.zoom + viewH / 2,
  };
}

export function screenToWorld(sx, sy, cam, viewW, viewH) {
  return {
    x: (sx - viewW / 2) / cam.zoom + cam.x,
    y: (sy - viewH / 2) / cam.zoom + cam.y,
  };
}

export function clampCamera(cam, world, viewW, viewH) {
  const halfW = viewW / 2 / cam.zoom;
  const halfH = viewH / 2 / cam.zoom;
  if (world.w <= halfW * 2) cam.x = world.w / 2;
  else cam.x = Math.max(halfW, Math.min(world.w - halfW, cam.x));
  if (world.h <= halfH * 2) cam.y = world.h / 2;
  else cam.y = Math.max(halfH, Math.min(world.h - halfH, cam.y));
}
