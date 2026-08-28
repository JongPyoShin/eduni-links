import { worldToScreen } from "./transforms.js";
import { WaterfallWorldGeometry } from "./geometry.js";

const WATERFALL_GEOMETRY = new WaterfallWorldGeometry();

function blob(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

function drawWalkableRoute(ctx, cam, viewW, viewH) {
  const route = WATERFALL_GEOMETRY.paths[0] || [];
  if (route.length < 2) return;
  const points = route.map((point) => worldToScreen(point.x, point.y, cam, viewW, viewH));

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Dark wet-bank underlay: this is derived directly from WaterfallWorldGeometry,
  // so the route the player sees follows the same source used by collision.
  ctx.strokeStyle = "rgba(25, 58, 61, 0.92)";
  ctx.lineWidth = WATERFALL_GEOMETRY.pathHalfWidth * 2 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(119, 137, 107, 0.72)";
  ctx.lineWidth = WATERFALL_GEOMETRY.pathHalfWidth * 1.55 * cam.zoom;
  ctx.stroke();

  ctx.strokeStyle = "rgba(188, 181, 132, 0.58)";
  ctx.lineWidth = WATERFALL_GEOMETRY.pathHalfWidth * 0.82 * cam.zoom;
  ctx.stroke();

  ctx.setLineDash([18 * cam.zoom, 24 * cam.zoom]);
  ctx.strokeStyle = "rgba(231, 229, 186, 0.14)";
  ctx.lineWidth = 3 * cam.zoom;
  ctx.stroke();
  ctx.restore();
}

function drawWetRock(ctx, p, x, y, r, cam) {
  const s = p(x, y);
  blob(ctx, s.x, s.y, r * cam.zoom, r * 0.55 * cam.zoom, "#4b6972");
  blob(ctx, s.x, s.y - r * 0.35 * cam.zoom, r * 0.65 * cam.zoom, r * 0.3 * cam.zoom, "#8eb0aa");
  blob(ctx, s.x - r * 0.16 * cam.zoom, s.y - r * 0.55 * cam.zoom, r * 0.22 * cam.zoom, r * 0.08 * cam.zoom, "rgba(224,255,247,.24)");
}

export function drawWaterfallWorld(ctx, cam, viewW, viewH, t = 0) {
  ctx.save();
  const p = (x, y) => worldToScreen(x, y, cam, viewW, viewH);
  ctx.fillStyle = "#0d3440"; ctx.fillRect(0, 0, viewW, viewH);

  // The authored trail is rendered first from WaterfallWorldGeometry so the
  // visible travel corridor and movement geometry remain aligned.
  drawWalkableRoute(ctx, cam, viewW, viewH);

  const basin = p(1050, 520);
  const water = ctx.createRadialGradient(basin.x, basin.y, 10, basin.x, basin.y, 430 * cam.zoom);
  water.addColorStop(0, "rgba(94,224,220,.72)"); water.addColorStop(0.62, "rgba(36,151,164,.42)"); water.addColorStop(1, "rgba(22,100,119,.12)");
  ctx.fillStyle = water; ctx.beginPath(); ctx.ellipse(basin.x, basin.y, 430 * cam.zoom, 240 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill();

  const fall = p(1170, 260);
  const fallGlow = ctx.createRadialGradient(fall.x, fall.y, 12, fall.x, fall.y, 210 * cam.zoom);
  fallGlow.addColorStop(0, "rgba(224,255,255,.24)");
  fallGlow.addColorStop(1, "rgba(224,255,255,0)");
  ctx.fillStyle = fallGlow; ctx.beginPath(); ctx.arc(fall.x, fall.y, 210 * cam.zoom, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#dffcff"; ctx.beginPath(); ctx.moveTo(fall.x - 90 * cam.zoom, fall.y - 170 * cam.zoom); ctx.lineTo(fall.x + 90 * cam.zoom, fall.y - 170 * cam.zoom); ctx.lineTo(fall.x + 48 * cam.zoom, fall.y + 90 * cam.zoom); ctx.lineTo(fall.x - 48 * cam.zoom, fall.y + 90 * cam.zoom); ctx.fill();
  for (let i = 0; i < 7; i += 1) {
    const x = fall.x + (i - 3) * 22 * cam.zoom;
    ctx.strokeStyle = `rgba(116,236,240,${0.42 + (i % 2) * .18})`;
    ctx.lineWidth = 6 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(x, fall.y - 145 * cam.zoom);
    ctx.bezierCurveTo(x - 12, fall.y - 15, x + 14, fall.y + 30, x + (i - 3) * 4, fall.y + 95 * cam.zoom);
    ctx.stroke();
  }

  for (const [x, y, r] of [[820,520,34],[930,590,28],[1080,620,38],[1220,570,30],[1350,520,34]]) drawWetRock(ctx, p, x, y, r, cam);

  // Stepping stones follow the movement corridor around the stream crossing.
  const steppingStones = [[860,770],[920,745],[980,720],[1040,705],[1080,700]];
  for (let i = 0; i < steppingStones.length; i += 1) {
    const [x, y] = steppingStones[i];
    const s = p(x, y);
    blob(ctx, s.x, s.y, 31 * cam.zoom, 17 * cam.zoom, "#baa778");
    blob(ctx, s.x - 4 * cam.zoom, s.y - 4 * cam.zoom, 20 * cam.zoom, 7 * cam.zoom, "rgba(231,223,183,.20)");
    const ripple = 24 + ((t / 70 + i * 11) % 18);
    ctx.strokeStyle = "rgba(138,236,235,.16)";
    ctx.lineWidth = 2 * cam.zoom;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 8 * cam.zoom, ripple * cam.zoom, ripple * 0.35 * cam.zoom, 0, 0, Math.PI * 2); ctx.stroke();
  }

  const lookout = p(1450,330);
  ctx.strokeStyle = "#9b6737"; ctx.lineWidth = 7 * cam.zoom;
  for (const dx of [-55,55]) {
    ctx.beginPath(); ctx.moveTo(lookout.x + dx * cam.zoom, lookout.y); ctx.lineTo(lookout.x + dx * cam.zoom, lookout.y - 72 * cam.zoom); ctx.stroke();
  }
  ctx.strokeStyle = "#e2bc7c"; ctx.lineWidth = 3 * cam.zoom;
  ctx.beginPath(); ctx.moveTo(lookout.x - 55 * cam.zoom, lookout.y - 55 * cam.zoom); ctx.quadraticCurveTo(lookout.x, lookout.y - 35 * cam.zoom, lookout.x + 55 * cam.zoom, lookout.y - 55 * cam.zoom); ctx.stroke();

  // Layered mist and droplets keep the Waterfall identity visually distinct.
  for (let i = 0; i < 18; i += 1) {
    const drift = Math.sin(t / 520 + i) * 16;
    const s = p(760 + (i * 83) % 700 + drift, 300 + (i * 47) % 460);
    blob(ctx, s.x, s.y, 5 * cam.zoom, 9 * cam.zoom, "rgba(224,255,255,.26)");
  }
  const mist = ctx.createRadialGradient(basin.x, basin.y, 10, basin.x, basin.y, 300 * cam.zoom);
  mist.addColorStop(0, "rgba(220,255,255,.14)"); mist.addColorStop(1, "rgba(220,255,255,0)");
  ctx.fillStyle = mist; ctx.beginPath(); ctx.arc(basin.x, basin.y, 300 * cam.zoom, 0, Math.PI * 2); ctx.fill();

  const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.22, viewW / 2, viewH / 2, viewW * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)"); vignette.addColorStop(1, "rgba(3,20,27,.30)");
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, viewW, viewH);
  ctx.restore();
}

export function drawKingfisher(ctx, cam, viewW, viewH, t = 0) {
  const s = worldToScreen(1410, 400 + Math.sin(t / 260) * 4, cam, viewW, viewH);
  const z = cam.zoom;
  ctx.save();

  // Simple perch so the interaction target reads as a staged encounter rather than a floating icon.
  ctx.strokeStyle = "#5d412d";
  ctx.lineWidth = 8 * z;
  ctx.beginPath(); ctx.moveTo(s.x - 52 * z, s.y + 12 * z); ctx.quadraticCurveTo(s.x, s.y - 4 * z, s.x + 50 * z, s.y + 8 * z); ctx.stroke();

  ctx.fillStyle = "rgba(103,220,236,.12)";
  ctx.beginPath(); ctx.arc(s.x, s.y - 25 * z, 54 * z + Math.sin(t / 240) * 4 * z, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#168aad"; ctx.beginPath(); ctx.ellipse(s.x, s.y - 22*z, 22*z, 28*z, -0.15, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#f28f3b"; ctx.beginPath(); ctx.ellipse(s.x, s.y - 8*z, 13*z, 18*z, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#123047"; ctx.beginPath(); ctx.arc(s.x+10*z,s.y-40*z,10*z,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#f7d154"; ctx.beginPath(); ctx.moveTo(s.x+18*z,s.y-39*z); ctx.lineTo(s.x+42*z,s.y-34*z); ctx.lineTo(s.x+18*z,s.y-30*z); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x+13*z,s.y-43*z,3*z,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "#17354a"; ctx.beginPath(); ctx.arc(s.x+14*z,s.y-43*z,1.4*z,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
