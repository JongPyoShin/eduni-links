import { worldToScreen } from "./transforms.js";
import { PLAYER, BLUEBIRD } from "./constants.js";

export function drawGround(ctx, cam, viewW, viewH, geometry) {
  const tl = screenToWorldTopLeft(cam, viewW, viewH);
  ctx.fillStyle = "#26402b";
  ctx.fillRect(0, 0, viewW, viewH);
  const grid = 80 * cam.zoom;
  ctx.strokeStyle = "rgba(255,255,255,0.05)";

  const g = grid;
  let startX = -((tl.x % (g / cam.zoom)) * cam.zoom);
  for (let x = startX; x < viewW; x += g) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewH);
    ctx.stroke();
  }
  let startY = -((tl.y % (g / cam.zoom)) * cam.zoom);
  for (let y = startY; y < viewH; y += g) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewW, y);
    ctx.stroke();
  }
}

function screenToWorldTopLeft(cam, viewW, viewH) {
  return { x: cam.x - viewW / 2 / cam.zoom, y: cam.y - viewH / 2 / cam.zoom };
}

export function drawWalkablePath(ctx, cam, viewW, viewH, geometry) {
  const { paths, clearings, halfWidth } = geometry.walkableShapes();
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const c of clearings) {
    const s = worldToScreen(c.x, c.y, cam, viewW, viewH);
    ctx.beginPath();
    ctx.fillStyle = "rgba(196,164,98,0.55)";
    ctx.arc(s.x, s.y, c.r * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,90,40,0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  for (const poly of paths) {
    ctx.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const s = worldToScreen(poly[i].x, poly[i].y, cam, viewW, viewH);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.strokeStyle = "rgba(196,164,98,0.55)";
    ctx.lineWidth = halfWidth * 2 * cam.zoom;
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,90,40,0.85)";
    ctx.lineWidth = 3;
    for (let i = 0; i < poly.length - 1; i++) {
      const a = worldToScreen(poly[i].x, poly[i].y, cam, viewW, viewH);
      const b = worldToScreen(poly[i + 1].x, poly[i + 1].y, cam, viewW, viewH);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawBluebird(ctx, cam, viewW, viewH, bird, asset) {
  const s = worldToScreen(bird.x, bird.y, cam, viewW, viewH);
  const size = 64 * cam.zoom;
  if (asset && asset.ok) {
    ctx.drawImage(asset.img, s.x - size / 2, s.y - size, size, size);
  } else {
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(s.x, s.y - size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PROTOTYPE", s.x, s.y - size / 2 + 3);
  }
}

export function drawPlayer(ctx, cam, viewW, viewH, px, py, facing, asset) {
  const s = worldToScreen(px, py, cam, viewW, viewH);
  const w = PLAYER.DISPLAY_W * cam.zoom;
  const h = PLAYER.DISPLAY_H * cam.zoom;
  const pivotX = PLAYER.PIVOT_FRAC.x * w;
  const pivotY = PLAYER.PIVOT_FRAC.y * h;
  const dx = s.x - pivotX;
  const dy = s.y - pivotY;
  if (asset && asset.ok) {
    if (facing < 0) {
      ctx.save();
      ctx.translate(s.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(asset.img, -pivotX, dy, w, h);
      ctx.restore();
    } else {
      ctx.drawImage(asset.img, dx, dy, w, h);
    }
  } else {
    ctx.fillStyle = "#e2b35a";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 26 * cam.zoom, 16 * cam.zoom, 30 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(9, 11 * cam.zoom)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("PROTOTYPE", s.x, s.y - 60 * cam.zoom);
  }
}

export function drawInteractionCue(ctx, cam, viewW, viewH, bx, by, t) {
  const s = worldToScreen(bx, by, cam, viewW, viewH);
  const pulse = (Math.sin((t || 0) / 220) + 1) / 2;
  const baseR = 40 * cam.zoom;
  const ringR = baseR + pulse * 10 * cam.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.12})`;
  ctx.arc(s.x, s.y - baseR * 0.4, ringR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(250,204,21,0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s.x, s.y - baseR * 0.4, ringR, 0, Math.PI * 2);
  ctx.stroke();

  const badgeY = s.y - ringR - 18 * cam.zoom;
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  const text = "A";
  const w = 30;
  ctx.fillStyle = "rgba(34,197,94,0.95)";
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 3;
  roundRect(ctx, s.x - w / 2, badgeY - 16, w, 28, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, s.x, badgeY + 5);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function depthSortDraw(ctx, cam, viewW, viewH, drawables) {
  const sorted = drawables.slice().sort((a, b) => a.footY - b.footY);
  for (const d of sorted) d.draw();
}
