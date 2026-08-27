import { worldToScreen } from "./transforms.js";
import { WORLD, BLUEBIRD } from "./constants.js";

export const SCENE_IMAGES = {
  hut: "assets/scene/hut.png",
  tree_round: "assets/scene/tree_round.png",
  pine: "assets/scene/pine.png",
  rock: "assets/scene/rock.png",
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

  add("hut", 430, 260, 0.95);
  add("firepit", 990, 935, 1.0);
  add("rock", 180, 1078, 0.8);
  add("rock", 250, 1012, 0.7);
  add("rock", 900, 952, 0.8);
  add("rock", 1230, 360, 0.7);

  add("tree_round", 360, 900, 1.0);
  add("pine", 700, 520, 1.0);
  add("tree_round", 1050, 560, 1.0);
  add("pine", 1450, 900, 1.0);
  add("tree_round", 1470, 640, 1.0);

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
  grd.addColorStop(0, "rgba(32,38,22,0.27)");
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

function drawGroundAccent(ctx, cam, viewW, viewH, x, y, size, color, angle = 0) {
  const s = worldToScreen(x, y, cam, viewW, viewH);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * cam.zoom, size * 0.38 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHutApron(ctx, cam, viewW, viewH, x, y) {
  const s = worldToScreen(x, y + 5, cam, viewW, viewH);
  const grd = ctx.createRadialGradient(s.x, s.y, 8 * cam.zoom, s.x, s.y, 118 * cam.zoom);
  grd.addColorStop(0, "rgba(111,75,43,0.24)");
  grd.addColorStop(0.7, "rgba(145,103,57,0.13)");
  grd.addColorStop(1, "rgba(145,103,57,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 116 * cam.zoom, 34 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  drawGroundAccent(ctx, cam, viewW, viewH, x - 78, y + 8, 7, "rgba(100,85,58,0.45)", -0.2);
  drawGroundAccent(ctx, cam, viewW, viewH, x + 73, y + 12, 5, "rgba(100,85,58,0.36)", 0.3);
}

function drawFirepitGround(ctx, cam, viewW, viewH, x, y) {
  const s = worldToScreen(x, y + 3, cam, viewW, viewH);
  const grd = ctx.createRadialGradient(s.x, s.y, 4 * cam.zoom, s.x, s.y, 70 * cam.zoom);
  grd.addColorStop(0, "rgba(58,43,28,0.42)");
  grd.addColorStop(0.7, "rgba(76,52,29,0.22)");
  grd.addColorStop(1, "rgba(76,52,29,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 68 * cam.zoom, 34 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawProp(ctx, cam, viewW, viewH, prop, images, t = 0) {
  const shadowTypes = new Set(["hut", "tree_round", "pine", "rock", "firepit"]);
  if (shadowTypes.has(prop.type)) {
    drawContactShadow(ctx, cam, viewW, viewH, prop.x, prop.y, prop.type === "hut" ? 60 : 24);
  }
  const s = worldToScreen(prop.x, prop.y, cam, viewW, viewH);
  const img = images[prop.type];

  if (prop.type === "hut") drawHutApron(ctx, cam, viewW, viewH, prop.x, prop.y);

  if (prop.type === "firepit") {
    drawFirepitGround(ctx, cam, viewW, viewH, prop.x, prop.y);
    const r = 34 * cam.zoom;
    ctx.fillStyle = "#6b6b6b";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r * 0.5, 7 * cam.zoom, 5 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(94,61,34,0.8)";
    ctx.lineWidth = 8 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(s.x - 23 * cam.zoom, s.y + 5 * cam.zoom);
    ctx.lineTo(s.x + 23 * cam.zoom, s.y - 5 * cam.zoom);
    ctx.stroke();
    ctx.strokeStyle = "rgba(126,78,39,0.85)";
    ctx.lineWidth = 5 * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(s.x - 21 * cam.zoom, s.y - 6 * cam.zoom);
    ctx.lineTo(s.x + 21 * cam.zoom, s.y + 6 * cam.zoom);
    ctx.stroke();
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
    for (let i = 0; i < 4; i++) {
      const a = -1.9 + i * 0.55;
      const emberX = s.x + Math.cos(a) * (18 + i * 3) * cam.zoom;
      const emberY = s.y - (28 + (i % 2) * 9) * cam.zoom;
      ctx.fillStyle = `rgba(255,196,92,${0.42 + flick * 0.3})`;
      ctx.beginPath();
      ctx.arc(emberX, emberY, 2 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
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

export function drawGroundLayer(ctx, cam, viewW, viewH, geometry) {
  ctx.fillStyle = "#2d4429";
  ctx.fillRect(0, 0, viewW, viewH);
  const tl = worldToScreen(0, 0, cam, viewW, viewH);
  const wW = geometry.world.w * cam.zoom;
  const wH = geometry.world.h * cam.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.rect(tl.x, tl.y, wW, wH);
  ctx.clip();

  const patchStep = 190;
  for (let wx = -patchStep; wx <= geometry.world.w + patchStep; wx += patchStep) {
    for (let wy = -patchStep; wy <= geometry.world.h + patchStep; wy += patchStep) {
      const seed = hash2(wx, wy);
      const px = wx + (seed - 0.5) * 90;
      const py = wy + (hash2(wx + 31, wy - 17) - 0.5) * 90;
      const p = worldToScreen(px, py, cam, viewW, viewH);
      const radius = (110 + seed * 70) * cam.zoom;
      const grd = ctx.createRadialGradient(p.x, p.y, radius * 0.08, p.x, p.y, radius);
      const tone = seed > 0.5 ? "86,111,59" : "31,56,35";
      grd.addColorStop(0, `rgba(${tone},0.13)`);
      grd.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius, radius * (0.72 + hash2(wx - 9, wy + 13) * 0.3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 150; i++) {
    const wx = ((i * 157) % (geometry.world.w + 120)) - 60;
    const wy = ((i * 263) % (geometry.world.h + 120)) - 60;
    const v = hash2(wx + 7, wy - 11);
    const color = v > 0.56 ? "rgba(20,42,27,0.26)" : "rgba(113,132,72,0.20)";
    drawGroundAccent(ctx, cam, viewW, viewH, wx, wy, 1.5 + v * 2.2, color, v * Math.PI);
  }
  ctx.restore();

  const grd = ctx.createLinearGradient(0, tl.y, 0, tl.y + wH);
  grd.addColorStop(0, "rgba(16,30,20,0.16)");
  grd.addColorStop(0.55, "rgba(55,77,43,0.02)");
  grd.addColorStop(1, "rgba(91,106,54,0.10)");
  ctx.fillStyle = grd;
  ctx.fillRect(tl.x, tl.y, wW, wH);

  drawBackdropFoliage(ctx, cam, viewW, viewH, geometry);
}

function drawBackdropFoliage(ctx, cam, viewW, viewH, geometry) {
  const clusters = [
    [-40, 170, 220, 150], [150, -35, 250, 130], [540, -30, 280, 145],
    [1060, -40, 260, 155], [1510, 180, 230, 180], [1560, 760, 240, 190],
    [-45, 840, 240, 210], [480, 1230, 300, 150], [1140, 1230, 330, 165],
  ];
  for (const [x, y, rx, ry] of clusters) {
    const s = worldToScreen(x, y, cam, viewW, viewH);
    const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rx * cam.zoom);
    grd.addColorStop(0, "rgba(20,53,31,0.38)");
    grd.addColorStop(0.68, "rgba(30,64,35,0.18)");
    grd.addColorStop(1, "rgba(30,64,35,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx * cam.zoom, ry * cam.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClearingSurface(ctx, s, clearing, zoom) {
  const radius = clearing.r * zoom;
  const points = 24;
  ctx.beginPath();
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble = 0.9 + hash2(clearing.x + i * 17, clearing.y - i * 23) * 0.14;
    const x = s.x + Math.cos(angle) * radius * wobble;
    const y = s.y + Math.sin(angle) * radius * wobble;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const grd = ctx.createRadialGradient(
    s.x - radius * 0.12,
    s.y - radius * 0.1,
    radius * 0.12,
    s.x,
    s.y,
    radius * 1.02
  );
  grd.addColorStop(0, "rgba(185,138,85,0.42)");
  grd.addColorStop(0.58, "rgba(185,138,85,0.30)");
  grd.addColorStop(0.88, "rgba(185,138,85,0.12)");
  grd.addColorStop(1, "rgba(185,138,85,0)");
  ctx.fillStyle = grd;
  ctx.fill();

  if (clearing.label === "Ridge Lookout") drawRidgeOpening(ctx, s, radius, zoom);
}

function drawRidgeOpening(ctx, s, radius, zoom) {
  const light = ctx.createRadialGradient(s.x - radius * 0.14, s.y - radius * 0.18, 8 * zoom, s.x, s.y, radius * 1.16);
  light.addColorStop(0, "rgba(246,211,139,0.18)");
  light.addColorStop(0.58, "rgba(235,195,117,0.08)");
  light.addColorStop(1, "rgba(235,195,117,0)");
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, radius * 1.04, radius * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPathLayer(ctx, cam, viewW, viewH, geometry) {
  const { paths, clearings, halfWidth } = pathBands(geometry);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const c of clearings) {
    const s = worldToScreen(c.x, c.y, cam, viewW, viewH);
    drawClearingSurface(ctx, s, c, cam.zoom);
  }

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

  strokePoly(0, `rgba(39,57,32,0.42)`, (halfWidth + 30) * 2 * cam.zoom);
  strokePoly(0, `rgba(146,103,58,0.48)`, (halfWidth + 10) * 2 * cam.zoom);
  strokePoly(0, "#b98a55", halfWidth * 2 * cam.zoom);
  strokePoly(0, "rgba(211,164,98,0.42)", (halfWidth - 18) * 2 * cam.zoom);

  drawPathDetails(ctx, cam, viewW, viewH, paths, halfWidth);

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

function drawPathDetails(ctx, cam, viewW, viewH, paths, halfWidth) {
  for (const poly of paths) {
    for (let i = 0; i < poly.length - 1; i++) {
      const a = poly[i];
      const b = poly[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.max(1, Math.floor(len / 58));
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      for (let k = 1; k < steps; k++) {
        const tt = k / steps;
        const px = a.x + (b.x - a.x) * tt;
        const py = a.y + (b.y - a.y) * tt;
        const seed = hash2(Math.round(px) + i * 71, Math.round(py) - k * 37);
        const side = seed > 0.5 ? 1 : -1;
        const edge = halfWidth + 12 + seed * 8;
        const ex = px + nx * edge * side;
        const ey = py + ny * edge * side;
        if (seed > 0.28) {
          drawGroundAccent(ctx, cam, viewW, viewH, ex, ey, 2.5 + seed * 2.5,
            seed > 0.62 ? "rgba(93,78,50,0.48)" : "rgba(77,96,55,0.48)", seed * Math.PI);
        }
        if (seed < 0.48) {
          const ex2 = px - nx * (halfWidth + 9) * side;
          const ey2 = py - ny * (halfWidth + 9) * side;
          drawGroundAccent(ctx, cam, viewW, viewH, ex2, ey2, 2 + seed * 2,
            "rgba(189,150,93,0.34)", -seed * Math.PI);
        }
      }
    }
  }
}
