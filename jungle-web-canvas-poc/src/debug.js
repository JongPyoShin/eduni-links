import { worldToScreen } from "./transforms.js";
import { BLUEBIRD, MOVEMENT } from "./constants.js";

export function drawDebugOverlay(ctx, cam, viewW, viewH, geometry, player, movement, bluebird) {
  const { paths, clearings, halfWidth } = geometry.walkableShapes();
  ctx.save();

  ctx.fillStyle = "rgba(0,255,180,0.12)";
  ctx.strokeStyle = "rgba(0,255,180,0.9)";
  ctx.lineWidth = 1.5;
  for (const c of clearings) {
    const s = worldToScreen(c.x, c.y, cam, viewW, viewH);
    ctx.beginPath();
    ctx.arc(s.x, s.y, c.r * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  for (const poly of paths) {
    ctx.beginPath();
    for (let i = 0; i < poly.length; i++) {
      const s = worldToScreen(poly[i].x, poly[i].y, cam, viewW, viewH);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    }
    ctx.stroke();
  }

  const ps = worldToScreen(player.x, player.y, cam, viewW, viewH);
  ctx.fillStyle = "#ff3b3b";
  ctx.beginPath();
  ctx.arc(ps.x, ps.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,59,59,0.8)";
  ctx.beginPath();
  ctx.arc(ps.x, ps.y, halfWidth * cam.zoom, 0, Math.PI * 2);
  ctx.stroke();

  const bs = worldToScreen(bluebird.x, bluebird.y, cam, viewW, viewH);
  ctx.strokeStyle = "rgba(59,130,246,0.9)";
  ctx.beginPath();
  ctx.arc(bs.x, bs.y, BLUEBIRD.INTERACT_RADIUS * cam.zoom, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "#0f172a";
  const lines = [
    `DEBUG  player=(${player.x.toFixed(1)}, ${player.y.toFixed(1)})`,
    `ratio=${movement.ratio.toFixed(3)}  held=${movement.heldMs.toFixed(0)}ms`,
    `halfWidth=${halfWidth}  interactR=${BLUEBIRD.INTERACT_RADIUS}`,
    `PRECISION=${MOVEMENT.PRECISION_RATIO} CRUISE=${MOVEMENT.CRUISE_RATIO}`,
  ];
  const bx = 12;
  let by = viewH - 12 - lines.length * 16;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(bx - 6, by - 14, 320, lines.length * 16 + 8);
  ctx.fillStyle = "#0f172a";
  for (const l of lines) {
    ctx.fillText(l, bx, by);
    by += 16;
  }
  ctx.restore();
}
