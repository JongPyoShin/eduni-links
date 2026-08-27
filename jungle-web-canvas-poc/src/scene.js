import { worldToScreen } from "./transforms.js";
import { WORLD, BLUEBIRD } from "./constants.js";

export const SCENE_IMAGES = {
  hut: "assets/scene/hut.png",
  tree_round: "assets/scene/tree_round.png",
  pine: "assets/scene/pine.png",
  rock: "assets/scene/rock.png",
  grass: "assets/scene/grass.png",
  flower_bed: "assets/scene/flower_bed.png",
  tall_grass: "assets/scene/tall_grass.png",
};

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) % 2147483647;
  if (h < 0) h += 2147483647;
  return h / 2147483647;
}

export function buildProps() {
  const props = [];
  const add = (type, x, y, scale, footY) => props.push({ type, x, y, scale, footY: footY === undefined ? y : footY });

  add("hut", 520, 320, 0.95);
  add("firepit", 920, 820, 1.0);
  add("rock", 1385, 428, 0.9);
  add("rock", 180, 1078, 0.8);
  add("rock", 250, 1012, 0.7);
  add("rock", 900, 952, 0.8);
  add("rock", 1230, 360, 0.7);

  add("tree_round", 320, 700, 1.0);
  add("pine", 700, 520, 1.0);
  add("tree_round", 1050, 560, 1.0);
  add("pine", 1180, 860, 1.0);
  add("tree_round", 1392, 640, 1.0);

  add("grass", 260, 940, 1.0);
  add("grass", 620, 420, 1.0);
  add("grass", 980, 720, 1.0);
  add("grass", 1340, 520, 1.0);
  add("flower_bed", 560, 250, 0.9);

  add("tall_grass", 700, 1120, 1.1);
  add("tall_grass", 1100, 1145, 1.1);

  return props;
}

export function pathBands(geometry) {
  return geometry.walkableShapes();
}

function drawShadow(ctx, cam, viewW, viewH, wx, wy, rx, ry) {
  const s = worldToScreen(wx, wy, cam, viewW, viewH);
  const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rx);
  grd.addColorStop(0, "rgba(0,0,0,0.33)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawContactShadow(ctx, cam, viewW, viewH, wx, wy, radiusWorld = 26) {
  drawShadow(ctx, cam, viewW, viewH, wx, wy, radiusWorld * cam.zoom, radiusWorld * 0.45 * cam.zoom);
}

function spriteBottom(ctx, img, s, scale, zoom) {
  const w = img.width * scale * zoom;
  const h = img.height * scale * zoom;
  ctx.drawImage(img, s.x - w / 2, s.y - h, w, h);
}

export function drawProp(ctx, cam, viewW, viewH, prop, images, t = 0) {
  const shadowTypes = new Set(["hut", "tree_round", "pine", "rock", "firepit"]);
  if (shadowTypes.has(prop.type)) {
    drawContactShadow(ctx, cam, viewW, viewH, prop.x, prop.y, prop.type === "hut" ? 60 : 24);
  }
  const s = worldToScreen(prop.x, prop.y, cam, viewW, viewH);
  const img = images[prop.type];

  if (prop.type === "firepit") {
    const r = 34 * cam.zoom;
    ctx.fillStyle = "#6b6b6b";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.5, 7 * cam.zoom, 5 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const flick = (Math.sin((t || 0) / 110) + 1) / 2;
    const grd = ctx.createRadialGradient(s.x, s.y - 6 * cam.zoom, 2, s.x, s.y - 6 * cam.zoom, 46 * cam.zoom);
    grd.addColorStop(0, `rgba(255,180,80,${0.35 + flick * 0.2})`);
    grd.addColorStop(1, "rgba(255,150,40,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 6 * cam.zoom, 46 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a3c";
    ctx.beginPath();
    ctx.moveTo(s.x - 8 * cam.zoom, s.y - 4 * cam.zoom);
    ctx.quadraticCurveTo(s.x, s.y - (30 + flick * 12) * cam.zoom, s.x + 8 * cam.zoom, s.y - 4 * cam.zoom);
    ctx.quadraticCurveTo(s.x, s.y - 14 * cam.zoom, s.x - 8 * cam.zoom, s.y - 4 * cam.zoom);
    ctx.fill();
    return;
  }

  if (img && img.width) {
    spriteBottom(ctx, img, s, prop.scale || 1, cam.zoom);
  } else {
    ctx.fillStyle = "#7a8a5a";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 20 * cam.zoom, 18 * cam.zoom, 28 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

let groundTile = null;
function getGroundTile() {
  if (groundTile) return groundTile;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#3a5230";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    const x = (i * 73) % 256;
    const y = (i * 131) % 256;
    const v = hash2(x, y);
    g.fillStyle = v > 0.5 ? "rgba(70,96,52,0.5)" : "rgba(44,62,32,0.5)";
    g.fillRect(x, y, 3, 3);
  }
  groundTile = c;
  return c;
}

export function drawGroundLayer(ctx, cam, viewW, viewH, geometry) {
  ctx.fillStyle = "#243018";
  ctx.fillRect(0, 0, viewW, viewH);
  const tl = worldToScreen(0, 0, cam, viewW, viewH);
  const wW = geometry.world.w * cam.zoom;
  const wH = geometry.world.h * cam.zoom;

  const tile = getGroundTile();
  const pat = ctx.createPattern(tile, "repeat");
  ctx.save();
  ctx.fillStyle = pat;
  ctx.translate(tl.x, tl.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-tl.x / cam.zoom, -tl.y / cam.zoom);
  ctx.fillRect(tl.x / cam.zoom, tl.y / cam.zoom, geometry.world.w, geometry.world.h);
  ctx.restore();

  const grd = ctx.createLinearGradient(0, tl.y, 0, tl.y + wH);
  grd.addColorStop(0, "rgba(20,32,14,0.18)");
  grd.addColorStop(1, "rgba(60,82,44,0.10)");
  ctx.fillStyle = grd;
  ctx.fillRect(tl.x, tl.y, wW, wH);
}

export function drawPathLayer(ctx, cam, viewW, viewH, geometry) {
  const { paths, clearings, halfWidth } = pathBands(geometry);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const strokePoly = (w, color, width) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (const poly of paths) {
      ctx.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const s = worldToScreen(poly[i].x, poly[i].y, cam, viewW, viewH);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      }
      ctx.stroke();
    }
  };

  strokePoly(0, `rgba(36,50,26,0.55)`, (halfWidth + 18) * 2 * cam.zoom);
  strokePoly(0, "#b98a55", halfWidth * 2 * cam.zoom);
  strokePoly(0, "rgba(150,110,68,0.45)", (halfWidth - 16) * 2 * cam.zoom);

  for (const c of clearings) {
    const s = worldToScreen(c.x, c.y, cam, viewW, viewH);
    ctx.fillStyle = "rgba(150,110,68,0.35)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, c.r * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(70,52,30,0.8)";
    ctx.lineWidth = 3 * cam.zoom;
    ctx.stroke();
  }

  for (const poly of paths) {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i];
      const b = poly[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(len / 60));
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      for (let k = 1; k < steps; k++) {
        const tt = k / steps;
        const px = a.x + (b.x - a.x) * tt;
        const py = a.y + (b.y - a.y) * tt;
        const side = hash2(Math.round(px), Math.round(py)) > 0.5 ? 1 : -1;
        const ex = px + nx * (halfWidth + 8) * side;
        const ey = py + ny * (halfWidth + 8) * side;
        const sp = worldToScreen(ex, ey, cam, viewW, viewH);
        ctx.fillStyle = "rgba(54,78,38,0.85)";
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, 4 * cam.zoom, 2.4 * cam.zoom, 0, 0, Math.PI * 2);
        ctx.fill();
        const sx2 = px - nx * (halfWidth + 6) * side;
        const sy2 = py - ny * (halfWidth + 6) * side;
        const sp2 = worldToScreen(sx2, sy2, cam, viewW, viewH);
        ctx.fillStyle = "rgba(120,120,120,0.5)";
        ctx.beginPath();
        ctx.ellipse(sp2.x, sp2.y, 3 * cam.zoom, 2 * cam.zoom, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
