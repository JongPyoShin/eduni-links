import { worldToScreen } from "./transforms.js";
import { WaterfallWorldGeometry } from "./geometry.js";
import {
  WATERFALL_ART_BACK,
  WATERFALL_ART_FRONT,
  WATERFALL_ART_MID,
  WATERFALL_FOREGROUND,
  WATERFALL_VALID_LAYERS,
} from "./waterfall_art_manifest.js";

const WATERFALL_GEOMETRY = new WaterfallWorldGeometry();

const ART_PROPS = [
  // Far / ridge framing.
  { type: "pine", x: 470, y: 245, width: 210, alpha: 0.78 },
  { type: "tree_round", x: 700, y: 225, width: 235, alpha: 0.82 },
  { type: "pine", x: 920, y: 210, width: 180, alpha: 0.72 },
  { type: "tree_round", x: 1370, y: 215, width: 250, alpha: 0.84 },
  { type: "pine", x: 1545, y: 280, width: 210, alpha: 0.78 },

  // Left bank / entrance cluster.
  { type: "tree_round", x: 85, y: 1010, width: 270, alpha: 1 },
  { type: "pine", x: 300, y: 920, width: 210, alpha: 0.95 },
  { type: "rock", x: 500, y: 910, width: 120, alpha: 0.96 },
  { type: "tall_grass", x: 540, y: 860, width: 140, alpha: 0.92 },
  { type: "tall_grass", x: 655, y: 955, width: 155, alpha: 0.95 },

  // Basin edges.
  { type: "rock", x: 730, y: 575, width: 130, alpha: 0.95 },
  { type: "tall_grass", x: 710, y: 535, width: 150, alpha: 0.9 },
  { type: "rock", x: 1315, y: 610, width: 145, alpha: 0.95 },
  { type: "tall_grass", x: 1375, y: 590, width: 155, alpha: 0.9 },

  // Upper trail / lookout framing.
  { type: "tree_round", x: 930, y: 380, width: 225, alpha: 0.9 },
  { type: "tall_grass", x: 1070, y: 425, width: 130, alpha: 0.92 },
  { type: "tree_round", x: 1510, y: 455, width: 260, alpha: 0.96 },
  { type: "rock", x: 1510, y: 350, width: 105, alpha: 0.9 },
  { type: "tall_grass", x: 1360, y: 405, width: 125, alpha: 0.9 },
];

function blob(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function pathStroke(ctx, points, width, color, dash = null) {
  if (!points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawSpriteBottom(ctx, img, s, widthWorld, cam, alpha = 1, rot = 0) {
  if (!img || !img.width || !img.height) return false;
  const width = widthWorld * cam.zoom;
  const height = width * (img.height / img.width);
  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (rot) {
    ctx.translate(s.x, s.y);
    ctx.rotate(rot);
    ctx.drawImage(img, -width / 2, -height, width, height);
  } else {
    ctx.drawImage(img, s.x - width / 2, s.y - height, width, height);
  }
  ctx.restore();
  return true;
}

function drawParallaxBackdrop(ctx, cam, viewW, viewH, t, backdrop = null) {
  if (backdrop?.width && backdrop?.height) {
    ctx.drawImage(backdrop, 0, 0, viewW, viewH);
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, viewH);
  sky.addColorStop(0, "#8fc8bf");
  sky.addColorStop(0.42, "#567f76");
  sky.addColorStop(1, "#183e3e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, viewW, viewH);

  const shift = (cam.x - 800) * 0.08;
  const horizon = viewH * 0.32 - (cam.y - 600) * 0.025;
  const layers = [
    { y: horizon - 48, amp: 44, step: 150, fill: "rgba(38,85,72,.42)" },
    { y: horizon + 8, amp: 62, step: 128, fill: "rgba(27,70,61,.58)" },
    { y: horizon + 70, amp: 74, step: 115, fill: "rgba(20,56,51,.72)" },
  ];
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const layer = layers[layerIndex];
    ctx.fillStyle = layer.fill;
    ctx.beginPath();
    ctx.moveTo(-80, viewH);
    ctx.lineTo(-80, layer.y);
    for (let x = -80; x <= viewW + 160; x += layer.step) {
      const wave = Math.sin((x + shift * (layerIndex + 1)) / 155 + layerIndex * 1.6) * layer.amp;
      const secondary = Math.sin((x - shift) / 73 + t / 12000) * 12;
      ctx.lineTo(x, layer.y - wave - secondary);
    }
    ctx.lineTo(viewW + 160, viewH);
    ctx.closePath();
    ctx.fill();
  }

  // Soft sunrise shafts. Screen-space treatment keeps the stage luminous without
  // affecting gameplay geometry or requiring large background textures.
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 4; i += 1) {
    const x = viewW * (0.28 + i * 0.09) + Math.sin(t / 2600 + i) * 12;
    const beam = ctx.createLinearGradient(x, 0, x + 170, viewH * 0.85);
    beam.addColorStop(0, "rgba(247,238,175,.15)");
    beam.addColorStop(1, "rgba(247,238,175,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x - 28, 0);
    ctx.lineTo(x + 55, 0);
    ctx.lineTo(x + 235, viewH);
    ctx.lineTo(x + 135, viewH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Render a pre-bucketed layer of authored props. Every prop in the manifest is
// honored: width, scale, alpha, mirrorX, and the layer bucket it was filed in.
// Unknown / missing assets are skipped so a stale manifest cannot crash the
// render loop.
function drawAuthoredArtLayer(ctx, p, cam, art, layer) {
  if (!art) return;
  for (const prop of layer) {
    if (!WATERFALL_VALID_LAYERS.has(prop.layer)) continue;
    const img = art[prop.asset];
    if (!img || !img.width || !img.height) continue;
    const scale = Number.isFinite(prop.scale) ? prop.scale : 1;
    const width = (prop.width || img.width) * scale * cam.zoom;
    const height = width * (img.height / img.width);
    const s = p(prop.x, prop.y);
    const alpha = Number.isFinite(prop.alpha) ? prop.alpha : 1;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (prop.mirrorX) {
      ctx.translate(s.x, s.y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -width / 2, -height, width, height);
    } else {
      ctx.drawImage(img, s.x - width / 2, s.y - height, width, height);
    }
    ctx.restore();
  }
}

function drawAuthoredForeground(ctx, viewW, viewH, art) {
  const img = art?.foregroundVines;
  if (!img?.width || !img.height) return;
  for (const prop of WATERFALL_FOREGROUND) {
    const width = Math.min(viewW * 0.62, img.width);
    const height = width * img.height / img.width;
    const x = prop.anchor === "top-right" ? viewW - width : 0;
    ctx.save();
    ctx.globalAlpha = prop.alpha;
    if (prop.mirrorX) {
      ctx.translate(x + width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, width, height);
    } else {
      ctx.drawImage(img, x, 0, width, height);
    }
    ctx.restore();
  }
}

function drawCliffTerraces(ctx, p, cam) {
  const terraces = [
    { x: 1145, y: 405, rx: 265, ry: 95, fill: "#3f5d4f", rim: "#789169" },
    { x: 1325, y: 475, rx: 190, ry: 72, fill: "#385548", rim: "#6f8962" },
    { x: 820, y: 450, rx: 180, ry: 70, fill: "#314f47", rim: "#64806a" },
    { x: 1470, y: 300, rx: 150, ry: 58, fill: "#334d43", rim: "#6f845e" },
  ];

  for (const terrace of terraces) {
    const s = p(terrace.x, terrace.y);
    blob(ctx, s.x, s.y + 22 * cam.zoom, terrace.rx * cam.zoom, terrace.ry * cam.zoom, "rgba(15,36,34,.48)");
    blob(ctx, s.x, s.y, terrace.rx * cam.zoom, terrace.ry * cam.zoom, terrace.fill);
    blob(ctx, s.x, s.y - terrace.ry * 0.38 * cam.zoom, terrace.rx * 0.92 * cam.zoom, terrace.ry * 0.58 * cam.zoom, terrace.rim);

    ctx.strokeStyle = "rgba(188,211,173,.16)";
    ctx.lineWidth = 3 * cam.zoom;
    for (let i = -2; i <= 2; i += 1) {
      const px = s.x + i * terrace.rx * 0.28 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(px, s.y - 10 * cam.zoom);
      ctx.lineTo(px + 12 * cam.zoom, s.y + terrace.ry * 0.54 * cam.zoom);
      ctx.stroke();
    }
  }
}

function drawWaterSystem(ctx, p, cam, t) {
  const basin = p(1050, 535);
  const water = ctx.createRadialGradient(basin.x, basin.y, 12, basin.x, basin.y, 470 * cam.zoom);
  water.addColorStop(0, "rgba(112,229,219,.82)");
  water.addColorStop(0.52, "rgba(44,157,161,.64)");
  water.addColorStop(1, "rgba(15,84,101,.30)");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(basin.x, basin.y, 470 * cam.zoom, 245 * cam.zoom, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // A second stream lobe gives the water a winding river silhouette rather than
  // one large geometric oval.
  const lower = p(820, 760);
  const lowerWater = ctx.createLinearGradient(lower.x - 240 * cam.zoom, lower.y, lower.x + 280 * cam.zoom, lower.y - 110 * cam.zoom);
  lowerWater.addColorStop(0, "rgba(26,112,128,.70)");
  lowerWater.addColorStop(0.55, "rgba(65,190,186,.72)");
  lowerWater.addColorStop(1, "rgba(30,126,143,.48)");
  ctx.fillStyle = lowerWater;
  ctx.beginPath();
  ctx.ellipse(lower.x, lower.y, 290 * cam.zoom, 108 * cam.zoom, -0.23, 0, Math.PI * 2);
  ctx.fill();

  // Moving highlights.
  ctx.save();
  ctx.strokeStyle = "rgba(206,255,248,.24)";
  ctx.lineWidth = 2 * cam.zoom;
  for (let i = 0; i < 8; i += 1) {
    const phase = (t / 95 + i * 41) % 150;
    const s = p(760 + i * 72 + phase * 0.5, 665 - i * 13);
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, (20 + i % 3 * 9) * cam.zoom, 5 * cam.zoom, -0.16, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  return basin;
}

function drawWalkableRoute(ctx, cam, viewW, viewH) {
  const route = WATERFALL_GEOMETRY.paths[0] || [];
  if (route.length < 2) return;
  const points = route.map((point) => worldToScreen(point.x, point.y, cam, viewW, viewH));
  const halfW = WATERFALL_GEOMETRY.pathHalfWidth;

  // The visible trail is derived directly from WaterfallWorldGeometry, preserving
  // the core invariant that the painted route and collision route share one
  // source. No new geometry is added; this is purely a presentation stack
  // built on top of the same path points.
  // 1. Dark earth outer bank (gives the trail a soft, mossy edge).
  pathStroke(ctx, points, halfW * 2.05 * cam.zoom, "rgba(28,46,36,.78)");
  // 2. Muted mossy mid band.
  pathStroke(ctx, points, halfW * 1.68 * cam.zoom, "rgba(94,114,72,.85)");
  // 3. Warm sandy inner trail.
  pathStroke(ctx, points, halfW * 1.18 * cam.zoom, "rgba(178,150,90,.82)");
  // 4. Slightly darker wheel-track centerline.
  pathStroke(ctx, points, halfW * 0.42 * cam.zoom, "rgba(124,98,56,.55)");
  // 5. Sparse gold accent dashes.
  pathStroke(ctx, points, 3 * cam.zoom, "rgba(247,227,151,.16)", [18 * cam.zoom, 28 * cam.zoom]);

  // Edge pebble accents. These are derived from the route's own segments so
  // they always sit on the actual walkable geometry, never on free world.
  drawRouteEdgeAccents(ctx, route, cam, viewW, viewH, halfW);
}

// A tiny deterministic PRNG so the same path always paints the same pebbles.
function routeHash(seed) {
  let x = (seed * 9301 + 49297) % 233280;
  let y = (seed * 4093 + 21389) % 23321;
  return () => {
    const t = (x = (x * 9301 + 49297) % 233280) / 233280;
    const u = (y = (y * 4093 + 21389) % 23321) / 23321;
    return { t, u };
  };
}

function drawRouteEdgeAccents(ctx, route, cam, viewW, viewH, halfW) {
  // Walk each segment, place a sparse set of small pebbles and leaf-litter
  // marks on alternating sides of the trail. Off-side alternates per stone
  // so the same stretch does not look like a beaded necklace.
  const p = (x, y) => worldToScreen(x, y, cam, viewW, viewH);
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i];
    const b = route[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy) || 1;
    const nx = -dy / segLen;
    const ny = dx / segLen;
    const rng = routeHash((i + 1) * 73 + Math.round(a.x + a.y));
    if (segLen < 40) continue;
    const step = 26;
    let t = step;
    let side = -1;
    while (t < segLen - 12) {
      const { u } = rng();
      const along = 1 - (u * 0.7 + 0.15);
      const cx = a.x + dx * along;
      const cy = a.y + dy * along;
      const offset = halfW * 0.92 + (rng().t * 6 - 3);
      const wx = cx + nx * offset * side;
      const wy = cy + ny * offset * side;
      const ss = p(wx, wy);
      const pebbleR = (2 + rng().t * 1.6) * cam.zoom;
      ctx.fillStyle = i % 2 === 0 ? "rgba(60,52,40,.78)" : "rgba(90,82,62,.7)";
      ctx.beginPath();
      ctx.ellipse(ss.x, ss.y, pebbleR, pebbleR * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (rng().t > 0.62) {
        const off2 = halfW * 0.6 + rng().t * 4;
        const lx = cx - nx * off2 * side;
        const ly = cy - ny * off2 * side;
        const ll = p(lx, ly);
        ctx.fillStyle = "rgba(40,72,42,.7)";
        ctx.beginPath();
        ctx.ellipse(ll.x, ll.y, pebbleR * 0.9, pebbleR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      t += step + rng().t * 8;
      side = -side;
    }
  }
}

function drawWetRock(ctx, p, x, y, r, cam) {
  const s = p(x, y);
  blob(ctx, s.x + 5 * cam.zoom, s.y + 8 * cam.zoom, r * 1.08 * cam.zoom, r * 0.52 * cam.zoom, "rgba(7,34,40,.30)");
  blob(ctx, s.x, s.y, r * cam.zoom, r * 0.55 * cam.zoom, "#4b6972");
  blob(ctx, s.x, s.y - r * 0.35 * cam.zoom, r * 0.65 * cam.zoom, r * 0.3 * cam.zoom, "#91aaa1");
  blob(ctx, s.x - r * 0.16 * cam.zoom, s.y - r * 0.55 * cam.zoom, r * 0.22 * cam.zoom, r * 0.08 * cam.zoom, "rgba(224,255,247,.28)");
}

function drawWaterfall(ctx, p, cam, t) {
  const fall = p(1170, 260);
  const cliffTop = p(1170, 115);

  // Rock face behind the waterfall.
  ctx.fillStyle = "#304a46";
  ctx.beginPath();
  ctx.moveTo(cliffTop.x - 145 * cam.zoom, cliffTop.y - 35 * cam.zoom);
  ctx.lineTo(cliffTop.x + 150 * cam.zoom, cliffTop.y - 28 * cam.zoom);
  ctx.lineTo(fall.x + 118 * cam.zoom, fall.y + 118 * cam.zoom);
  ctx.lineTo(fall.x - 120 * cam.zoom, fall.y + 118 * cam.zoom);
  ctx.closePath();
  ctx.fill();

  const fallGlow = ctx.createRadialGradient(fall.x, fall.y, 12, fall.x, fall.y, 235 * cam.zoom);
  fallGlow.addColorStop(0, "rgba(225,255,251,.36)");
  fallGlow.addColorStop(1, "rgba(225,255,251,0)");
  ctx.fillStyle = fallGlow;
  ctx.beginPath();
  ctx.arc(fall.x, fall.y, 235 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  // Multiple translucent ribbons produce a fuller, less geometric fall.
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 10; i += 1) {
    const phase = Math.sin(t / 390 + i * 0.8) * 6;
    const x = fall.x + (i - 4.5) * 18 * cam.zoom;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(236,255,255,.88)" : "rgba(129,234,233,.64)";
    ctx.lineWidth = (8 + (i % 3) * 3) * cam.zoom;
    ctx.beginPath();
    ctx.moveTo(x, fall.y - 158 * cam.zoom);
    ctx.bezierCurveTo(
      x - (14 + i) * cam.zoom,
      fall.y - 70 * cam.zoom,
      x + (phase + 10) * cam.zoom,
      fall.y + 20 * cam.zoom,
      x + phase * cam.zoom,
      fall.y + 105 * cam.zoom
    );
    ctx.stroke();
  }
  ctx.restore();

  // Foam and spray at the base.
  for (let i = 0; i < 17; i += 1) {
    const a = (i / 17) * Math.PI * 2 + t / 1800;
    const rx = 85 + (i % 4) * 14;
    const s = {
      x: fall.x + Math.cos(a) * rx * cam.zoom,
      y: fall.y + 100 * cam.zoom + Math.sin(a) * 24 * cam.zoom,
    };
    blob(ctx, s.x, s.y, (9 + i % 3 * 4) * cam.zoom, (4 + i % 2 * 2) * cam.zoom, "rgba(231,255,255,.34)");
  }
}

function drawSteppingStones(ctx, p, cam, t, active) {
  // Three shape variants give the crossing an authored look instead of five
  // identical ellipses. Coordinates are unchanged so the interaction/collision
  // surface is preserved.
  const steppingStones = [
    { x: 860, y: 770, shape: "rocky", rot: 0.12 },
    { x: 920, y: 745, shape: "slab", rot: -0.18 },
    { x: 980, y: 720, shape: "rocky", rot: 0.06 },
    { x: 1040, y: 705, shape: "rounded", rot: -0.08 },
    { x: 1080, y: 700, shape: "slab", rot: 0.14 },
  ];
  for (let i = 0; i < steppingStones.length; i += 1) {
    const stone = steppingStones[i];
    const s = p(stone.x, stone.y);
    drawSteppingStone(ctx, s, stone.shape, stone.rot, cam, t, active, i);
  }
}

function drawSteppingStone(ctx, s, shape, rot, cam, t, active, index) {
  const z = cam.zoom;
  // Water contact shadow under the stone.
  blob(ctx, s.x + 5 * z, s.y + 9 * z, 38 * z, 14 * z, "rgba(6,32,40,.42)");
  // Soft wet reflection in the water.
  blob(ctx, s.x, s.y + 6 * z, 30 * z, 5 * z, "rgba(120,200,210,.18)");

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(rot);
  if (shape === "slab") {
    // Long flat slab.
    ctx.fillStyle = "#7a7660";
    ctx.beginPath();
    ctx.ellipse(0, 0, 36 * z, 12 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a39a7a";
    ctx.beginPath();
    ctx.ellipse(-2 * z, -3 * z, 28 * z, 7 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Crack.
    ctx.strokeStyle = "rgba(40,30,18,.55)";
    ctx.lineWidth = 1.2 * z;
    ctx.beginPath();
    ctx.moveTo(-22 * z, -2 * z);
    ctx.quadraticCurveTo(0, 4 * z, 20 * z, 0);
    ctx.stroke();
  } else if (shape === "rounded") {
    // Wider, low rounded boulder.
    ctx.fillStyle = "#878266";
    ctx.beginPath();
    ctx.ellipse(0, 0, 30 * z, 14 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b0a988";
    ctx.beginPath();
    ctx.ellipse(-2 * z, -4 * z, 22 * z, 8 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tiny moss edge.
    ctx.fillStyle = "rgba(86,118,62,.7)";
    ctx.beginPath();
    ctx.ellipse(12 * z, -7 * z, 7 * z, 2.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rocky: irregular composite.
    ctx.fillStyle = "#6f6a58";
    ctx.beginPath();
    ctx.moveTo(-26 * z, 4 * z);
    ctx.lineTo(-22 * z, -10 * z);
    ctx.lineTo(-6 * z, -14 * z);
    ctx.lineTo(10 * z, -12 * z);
    ctx.lineTo(24 * z, -6 * z);
    ctx.lineTo(28 * z, 6 * z);
    ctx.lineTo(12 * z, 12 * z);
    ctx.lineTo(-8 * z, 12 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9c9175";
    ctx.beginPath();
    ctx.moveTo(-18 * z, -4 * z);
    ctx.lineTo(-2 * z, -10 * z);
    ctx.lineTo(16 * z, -8 * z);
    ctx.lineTo(20 * z, 0);
    ctx.lineTo(4 * z, 2 * z);
    ctx.lineTo(-14 * z, 2 * z);
    ctx.closePath();
    ctx.fill();
    // Moss cluster on the rocky silhouette.
    ctx.fillStyle = "rgba(94,126,64,.7)";
    ctx.beginPath();
    ctx.ellipse(-14 * z, -8 * z, 6 * z, 2 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10 * z, -9 * z, 5 * z, 1.8 * z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wet highlight.
  ctx.fillStyle = "rgba(220,255,250,.32)";
  ctx.beginPath();
  ctx.ellipse(-6 * z, -6 * z, 9 * z, 2.2 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ripple / foam ring under each stone.
  const ripple = 26 + ((t / 70 + index * 11) % 18);
  ctx.strokeStyle = active ? "rgba(173,255,237,.45)" : "rgba(138,236,235,.18)";
  ctx.lineWidth = active ? 2.6 * z : 1.8 * z;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 9 * z, ripple * z, ripple * 0.34 * z, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Foam specks.
  ctx.fillStyle = active ? "rgba(232,255,250,.6)" : "rgba(220,240,235,.25)";
  for (let f = 0; f < 3; f += 1) {
    const ang = (t / 240 + index * 0.9 + f * 2.1);
    const fx = s.x + Math.cos(ang) * (ripple + 4) * z;
    const fy = s.y + 10 * z + Math.sin(ang) * 4 * z;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 1.6 * z, 0.9 * z, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (active) {
    const sparkle = 2.4 + Math.sin(t / 160 + index) * 1.0;
    blob(ctx, s.x + 9 * z, s.y - 15 * z, sparkle * z, sparkle * z, "rgba(247,245,183,.7)");
  }
}

function drawGate(ctx, p, cam, active) {
  const s = p(700, 900);
  ctx.save();
  ctx.strokeStyle = "#6b4b2f";
  ctx.lineWidth = 8 * cam.zoom;
  for (const dx of [-48, 48]) {
    ctx.beginPath();
    ctx.moveTo(s.x + dx * cam.zoom, s.y + 15 * cam.zoom);
    ctx.lineTo(s.x + dx * cam.zoom, s.y - 75 * cam.zoom);
    ctx.stroke();
  }
  ctx.strokeStyle = "#9b6e3c";
  ctx.lineWidth = 9 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(s.x - 54 * cam.zoom, s.y - 60 * cam.zoom);
  ctx.lineTo(s.x + 54 * cam.zoom, s.y - 60 * cam.zoom);
  ctx.stroke();
  ctx.fillStyle = active ? "#f0cc72" : "#d2aa5d";
  ctx.beginPath();
  ctx.roundRect(s.x - 37 * cam.zoom, s.y - 55 * cam.zoom, 74 * cam.zoom, 27 * cam.zoom, 6 * cam.zoom);
  ctx.fill();
  ctx.fillStyle = "#3f5639";
  ctx.font = `${12 * cam.zoom}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("안개 폭포", s.x, s.y - 37 * cam.zoom);
  ctx.restore();
}

function drawLookout(ctx, p, cam, active) {
  const lookout = p(1450, 330);
  ctx.save();
  const halo = ctx.createRadialGradient(lookout.x, lookout.y - 25 * cam.zoom, 8, lookout.x, lookout.y - 25 * cam.zoom, 105 * cam.zoom);
  halo.addColorStop(0, active ? "rgba(185,242,237,.26)" : "rgba(185,242,237,.08)");
  halo.addColorStop(1, "rgba(185,242,237,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(lookout.x, lookout.y - 25 * cam.zoom, 105 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#70452c";
  ctx.lineWidth = 8 * cam.zoom;
  for (const dx of [-62,-22,22,62]) {
    ctx.beginPath();
    ctx.moveTo(lookout.x + dx * cam.zoom, lookout.y + 8 * cam.zoom);
    ctx.lineTo(lookout.x + dx * cam.zoom, lookout.y - 78 * cam.zoom);
    ctx.stroke();
  }
  ctx.fillStyle = "#90633b";
  ctx.beginPath();
  ctx.roundRect(lookout.x - 78 * cam.zoom, lookout.y - 16 * cam.zoom, 156 * cam.zoom, 24 * cam.zoom, 5 * cam.zoom);
  ctx.fill();
  ctx.strokeStyle = "#d4a86a";
  ctx.lineWidth = 3 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(lookout.x - 62 * cam.zoom, lookout.y - 58 * cam.zoom);
  ctx.quadraticCurveTo(lookout.x, lookout.y - 37 * cam.zoom, lookout.x + 62 * cam.zoom, lookout.y - 58 * cam.zoom);
  ctx.stroke();
  ctx.restore();
}

function drawArtProps(ctx, p, cam, images) {
  for (let i = 0; i < ART_PROPS.length; i += 1) {
    const prop = ART_PROPS[i];
    const s = p(prop.x, prop.y);
    const img = images?.[prop.type];
    // Small deterministic rotation per prop so identical tree/grass sprites
    // do not all stand perfectly vertical. Falls back to the sprite's own
    // orientation when the asset is present.
    const rot = ((i * 0.41) % 1 - 0.5) * 0.22;
    if (drawSpriteBottom(ctx, img, s, prop.width, cam, prop.alpha, rot)) continue;

    // Fallback if a source sprite failed to load.
    if (prop.type === "rock") {
      blob(ctx, s.x, s.y - 10 * cam.zoom, prop.width * 0.42 * cam.zoom, prop.width * 0.2 * cam.zoom, "#647a70");
    } else if (prop.type === "tall_grass") {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      ctx.strokeStyle = "#4d7654";
      ctx.lineWidth = 5 * cam.zoom;
      for (let k = -3; k <= 3; k += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(k * 8 * cam.zoom, -36 * cam.zoom, k * 13 * cam.zoom, -58 * cam.zoom);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(rot);
      blob(ctx, 0, -prop.width * 0.42 * cam.zoom, prop.width * 0.34 * cam.zoom, prop.width * 0.26 * cam.zoom, "#2f6c49");
      ctx.restore();
    }
  }
}

function drawFlowersAndLeafBeds(ctx, p, cam, t, state) {
  // Flower-only beds. The leaf-themed observation patch lives in
  // drawLeafFamilies so the leaf match area reads as a leaf landmark first.
  const beds = [
    [585, 945], [690, 830], [1015, 510], [1115, 445], [1390, 395], [1515, 345],
  ];
  for (let b = 0; b < beds.length; b += 1) {
    const [x, y] = beds[b];
    const s = p(x, y);
    for (let i = 0; i < 7; i += 1) {
      const dx = ((i * 17 + b * 11) % 52) - 26;
      const dy = ((i * 13 + b * 7) % 24) - 12;
      ctx.fillStyle = i % 3 === 0 ? "#f2b6c9" : i % 3 === 1 ? "#f4d477" : "#b6a2de";
      ctx.beginPath();
      ctx.arc(s.x + dx * cam.zoom, s.y + dy * cam.zoom - 8 * cam.zoom, 4 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#537653";
      ctx.lineWidth = 1.5 * cam.zoom;
      ctx.beginPath();
      ctx.moveTo(s.x + dx * cam.zoom, s.y + dy * cam.zoom - 5 * cam.zoom);
      ctx.lineTo(s.x + dx * cam.zoom, s.y + dy * cam.zoom + 7 * cam.zoom);
      ctx.stroke();
    }
  }

  if (state?.discoveredClues?.includes("mistTrail")) {
    for (let i = 0; i < 11; i += 1) {
      const phase = t / 880 + i * 0.73;
      const s = p(1110 + Math.sin(phase) * 170 + i * 12, 455 + Math.cos(phase * 0.8) * 45);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(phase);
      ctx.fillStyle = "rgba(190,216,121,.62)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 * cam.zoom, 4 * cam.zoom, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Three distinguishable leaf families arranged as a small observation patch
// around the leaf match interaction. Pure presentation: drawn outside the
// 110-radius interaction circle so the cue stays readable and the walkable
// route (passes through (1250, 470)) is never covered.
function drawLeafFamilies(ctx, p, cam, t) {
  const cx = 1250;
  const cy = 470;
  const r = 110;
  // Patch anchor positions sit on a ring around the interaction. The angle
  // sequence is fixed so the patch is deterministic.
  const patches = [
    { kind: "round", ax: cx - 95, ay: cy - 32, rot: -0.35 },
    { kind: "long", ax: cx + 88, ay: cy - 48, rot: 0.4 },
    { kind: "split", ax: cx + 30, ay: cy + 92, rot: -0.15 },
    { kind: "round", ax: cx + 105, ay: cy + 38, rot: 0.55 },
    { kind: "long", ax: cx - 110, ay: cy + 60, rot: -0.5 },
    { kind: "split", ax: cx - 50, ay: cy - 100, rot: 0.25 },
  ];
  // A soft ground shadow under the patch keeps the silhouettes readable.
  const sCenter = p(cx, cy + 6);
  const ground = ctx.createRadialGradient(sCenter.x, sCenter.y, 8, sCenter.x, sCenter.y, 150 * cam.zoom);
  ground.addColorStop(0, "rgba(20,42,28,.30)");
  ground.addColorStop(1, "rgba(20,42,28,0)");
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.ellipse(sCenter.x, sCenter.y, 150 * cam.zoom, 80 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < patches.length; i += 1) {
    const { kind, ax, ay, rot } = patches[i];
    // Skip if it would land inside the interaction radius (keep the cue clear).
    const distToCenter = Math.hypot(ax - cx, ay - cy);
    if (distToCenter < r - 6) continue;
    drawLeafFamily(ctx, p(ax, ay), kind, rot, cam, t, i);
  }
}

function drawLeafFamily(ctx, s, kind, rot, cam, t, index) {
  const z = cam.zoom;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(rot);
  if (kind === "round") {
    // Round leaf: circular blade with a single central vein.
    ctx.fillStyle = "#5d8a4a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16 * z, 14 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7fa864";
    ctx.beginPath();
    ctx.ellipse(-2 * z, -2 * z, 10 * z, 8 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(30,60,30,.7)";
    ctx.lineWidth = 1.1 * z;
    ctx.beginPath();
    ctx.moveTo(0, 8 * z);
    ctx.lineTo(0, -8 * z);
    ctx.stroke();
    // Stem.
    ctx.strokeStyle = "rgba(58,90,46,.85)";
    ctx.lineWidth = 1.4 * z;
    ctx.beginPath();
    ctx.moveTo(0, 12 * z);
    ctx.quadraticCurveTo(2 * z, 18 * z, 4 * z, 22 * z);
    ctx.stroke();
  } else if (kind === "long") {
    // Long leaf: pointed ellipse with a curved central vein.
    ctx.fillStyle = "#3f6d3a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * z, 18 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a9c52";
    ctx.beginPath();
    ctx.ellipse(-1.5 * z, -1 * z, 3 * z, 13 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(28,52,28,.7)";
    ctx.lineWidth = 1 * z;
    ctx.beginPath();
    ctx.moveTo(0, 16 * z);
    ctx.quadraticCurveTo(2 * z, 0, 0, -16 * z);
    ctx.stroke();
    // Stem.
    ctx.strokeStyle = "rgba(58,90,46,.85)";
    ctx.lineWidth = 1.2 * z;
    ctx.beginPath();
    ctx.moveTo(0, 18 * z);
    ctx.lineTo(2 * z, 24 * z);
    ctx.stroke();
  } else {
    // Split / three-lobed leaf.
    ctx.fillStyle = "#3a6a3a";
    ctx.beginPath();
    ctx.moveTo(0, 14 * z);
    ctx.quadraticCurveTo(-12 * z, 4 * z, -14 * z, -6 * z);
    ctx.quadraticCurveTo(-8 * z, -10 * z, -4 * z, -6 * z);
    ctx.quadraticCurveTo(-2 * z, -14 * z, 4 * z, -8 * z);
    ctx.quadraticCurveTo(10 * z, -10 * z, 14 * z, -4 * z);
    ctx.quadraticCurveTo(10 * z, 6 * z, 0, 14 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#628e4a";
    ctx.beginPath();
    ctx.moveTo(0, 10 * z);
    ctx.quadraticCurveTo(-7 * z, 2 * z, -8 * z, -4 * z);
    ctx.quadraticCurveTo(-3 * z, -2 * z, 0, -4 * z);
    ctx.quadraticCurveTo(3 * z, -2 * z, 8 * z, -2 * z);
    ctx.quadraticCurveTo(7 * z, 4 * z, 0, 10 * z);
    ctx.closePath();
    ctx.fill();
    // Vein.
    ctx.strokeStyle = "rgba(28,52,28,.65)";
    ctx.lineWidth = 1.1 * z;
    ctx.beginPath();
    ctx.moveTo(0, 12 * z);
    ctx.lineTo(0, -6 * z);
    ctx.moveTo(0, 0);
    ctx.lineTo(-8 * z, -4 * z);
    ctx.moveTo(0, -4 * z);
    ctx.lineTo(8 * z, -2 * z);
    ctx.stroke();
    // Stem.
    ctx.strokeStyle = "rgba(58,90,46,.85)";
    ctx.lineWidth = 1.3 * z;
    ctx.beginPath();
    ctx.moveTo(0, 14 * z);
    ctx.lineTo(0, 20 * z);
    ctx.stroke();
  }
  // A subtle warm highlight to keep the patch readable on the cool basin.
  ctx.fillStyle = "rgba(255,236,168,.18)";
  ctx.beginPath();
  ctx.ellipse(-2 * z, -3 * z, 8 * z, 5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tiny drop shadow so the leaf reads as resting on the ground.
  ctx.fillStyle = "rgba(8,28,22,.34)";
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + 4 * z, 9 * z, 2.4 * z, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStateCues(ctx, p, cam, t, state) {
  if (!state) return;

  if (state.steppingStonesComplete && !state.discoveredClues?.includes("echo")) {
    const s = p(1170, 560);
    ctx.strokeStyle = "rgba(204,251,247,.46)";
    ctx.lineWidth = 3 * cam.zoom;
    for (let i = 0; i < 3; i += 1) {
      const r = 35 + ((t / 18 + i * 28) % 90);
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 12 * cam.zoom, r * cam.zoom, r * 0.36 * cam.zoom, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Echo: cool cyan ripple emphasis. Adds a soft cyan core so the screen
  // reads as a cool water moment without recoloring the whole stage.
  if (state.discoveredClues?.includes("echo")) {
    const s = p(1170, 560);
    const pulse = 0.5 + Math.sin(t / 520) * 0.18;
    const cool = ctx.createRadialGradient(s.x, s.y - 8 * cam.zoom, 4, s.x, s.y - 8 * cam.zoom, 130 * cam.zoom);
    cool.addColorStop(0, `rgba(140,225,235,${0.22 * pulse})`);
    cool.addColorStop(1, "rgba(140,225,235,0)");
    ctx.fillStyle = cool;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 8 * cam.zoom, 130 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.discoveredClues?.includes("echo") && !state.discoveredClues?.includes("mistTrail")) {
    const s = p(1020, 480);
    const mist = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, 125 * cam.zoom);
    mist.addColorStop(0, "rgba(225,252,248,.30)");
    mist.addColorStop(1, "rgba(225,252,248,0)");
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 125 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.leafMatchComplete && !state.lookoutComplete) {
    const s = p(1450, 330);
    const glow = ctx.createRadialGradient(s.x, s.y - 25 * cam.zoom, 5, s.x, s.y - 25 * cam.zoom, 135 * cam.zoom);
    glow.addColorStop(0, "rgba(166,238,229,.34)");
    glow.addColorStop(1, "rgba(166,238,229,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 25 * cam.zoom, 135 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lookout warm golden sunlight accent. A short, restrained gradient that
  // reads as sunlight cutting through the canopy, not a recolor of the stage.
  if (state.lookoutComplete) {
    const s = p(1450, 330);
    const sun = ctx.createLinearGradient(s.x - 90 * cam.zoom, s.y - 70 * cam.zoom, s.x + 60 * cam.zoom, s.y + 40 * cam.zoom);
    sun.addColorStop(0, "rgba(255,228,150,0)");
    sun.addColorStop(0.45, "rgba(255,228,150,.18)");
    sun.addColorStop(1, "rgba(255,228,150,0)");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 22 * cam.zoom, 110 * cam.zoom, 55 * cam.zoom, -0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.kingfisherComplete && !state.rewardComplete) {
    const s = p(1410, 400);
    for (let i = 0; i < 9; i += 1) {
      const a = t / 700 + (i / 9) * Math.PI * 2;
      const r = 52 + Math.sin(t / 240 + i) * 8;
      blob(ctx, s.x + Math.cos(a) * r * cam.zoom, s.y - 25 * cam.zoom + Math.sin(a) * r * 0.55 * cam.zoom, 3.5 * cam.zoom, 3.5 * cam.zoom, "rgba(255,230,137,.72)");
    }
  }
}

function drawMist(ctx, basin, cam, t) {
  const mist = ctx.createRadialGradient(basin.x, basin.y, 10, basin.x, basin.y, 335 * cam.zoom);
  mist.addColorStop(0, "rgba(224,255,252,.17)");
  mist.addColorStop(1, "rgba(224,255,252,0)");
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.arc(basin.x, basin.y, 335 * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 22; i += 1) {
    const drift = Math.sin(t / 720 + i * 0.8) * 22;
    const x = basin.x + (((i * 71) % 520) - 260) * cam.zoom + drift * cam.zoom;
    const y = basin.y + (((i * 43) % 250) - 125) * cam.zoom;
    blob(ctx, x, y, (18 + i % 4 * 7) * cam.zoom, (6 + i % 3 * 4) * cam.zoom, "rgba(234,255,253,.08)");
  }
}

function drawForegroundFrame(ctx, viewW, viewH, t) {
  ctx.save();
  const sway = Math.sin(t / 1200) * 5;
  // Asymmetric corner accents: top-left and bottom-right are the heavier
  // anchors; top-right and bottom-left are lighter and fewer leaves. This
  // breaks the obvious duplicated vine frame while still anchoring the
  // edges of the screen so the playable area stays framed.
  const clusters = [
    { x: -18, y: 45, side: 1, count: 6, alpha: 0.78 },
    { x: viewW + 18, y: 60, side: -1, count: 3, alpha: 0.42 },
    { x: -22, y: viewH - 38, side: 1, count: 4, alpha: 0.55 },
    { x: viewW + 24, y: viewH - 32, side: -1, count: 5, alpha: 0.7 },
  ];
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.count; i += 1) {
      const dx = cluster.side * (16 + (i % 3) * 26);
      const dy = (i - Math.floor(cluster.count / 2)) * 24 + sway * (i % 2 ? 1 : -1);
      ctx.fillStyle = i % 2 ? `rgba(20,62,42,${cluster.alpha})` : `rgba(32,84,51,${cluster.alpha})`;
      ctx.beginPath();
      ctx.ellipse(cluster.x + dx, cluster.y + dy, 38, 17, cluster.side * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Screen-space foreground pass. The caller is expected to invoke this AFTER
// the world render and the player/effects depth sort, but BEFORE the HUD/modal
// DOM. It contains: the soft vignette, the procedural dark-leaf corner frame,
// and the authored screen-edge vine overlays. None of these may cover the
// center gameplay area; they live in the screen edges only.
export function drawWaterfallForeground(ctx, viewW, viewH, art, t = 0) {
  const images = art || {};
  const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.18, viewW / 2, viewH / 2, viewW * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(3,20,27,.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewW, viewH);

  drawForegroundFrame(ctx, viewW, viewH, t);
  drawAuthoredForeground(ctx, viewW, viewH, images);
}

export function drawWaterfallWorld(ctx, cam, viewW, viewH, t = 0, images = null, state = null) {
  ctx.save();
  const p = (x, y) => worldToScreen(x, y, cam, viewW, viewH);

  const art = images?.waterfallArt || {};

  // BACK: sky / parallax + authored back layer (distant cliffs, rear foliage).
  drawParallaxBackdrop(ctx, cam, viewW, viewH, t, art.backdrop);
  drawAuthoredArtLayer(ctx, p, cam, art, WATERFALL_ART_BACK);

  // WORLD BASE: procedural cliffs, basin / water, waterfall.
  drawCliffTerraces(ctx, p, cam);
  const basin = drawWaterSystem(ctx, p, cam, t);
  drawWaterfall(ctx, p, cam, t);

  // MID: authored mid layer (foliage/boulders/cliff terraces that frame the
  // basin) plus procedural wet rocks and small authored sprite props.
  drawAuthoredArtLayer(ctx, p, cam, art, WATERFALL_ART_MID);
  for (const [x, y, r] of [[760,560,38],[820,520,34],[930,590,28],[1080,620,38],[1220,570,30],[1350,520,34],[1440,455,30]]) {
    drawWetRock(ctx, p, x, y, r, cam);
  }
  drawArtProps(ctx, p, cam, images);

  // WALKABLE: the route. Drawn on top of mid so the child can always read
  // where walking is allowed, but before the front dressing so the path does
  // not get visually buried by flowers or platform props.
  drawWalkableRoute(ctx, cam, viewW, viewH);

  // FRONT WORLD: interaction dressing (stones, gate sign, lookout sign),
  // authored front layer (gate arch, flower banks, lookout platform), flowers
  // and leaf beds, leaf-family observation patch, gameplay state cues, mist.
  drawSteppingStones(ctx, p, cam, t, Boolean(state?.streamGateComplete && !state?.steppingStonesComplete));
  drawGate(ctx, p, cam, !state?.streamGateComplete);
  drawLookout(ctx, p, cam, Boolean(state?.leafMatchComplete && !state?.lookoutComplete));
  drawAuthoredArtLayer(ctx, p, cam, art, WATERFALL_ART_FRONT);
  drawFlowersAndLeafBeds(ctx, p, cam, t, state);
  drawLeafFamilies(ctx, p, cam, t);
  drawStateCues(ctx, p, cam, t, state);
  drawMist(ctx, basin, cam, t);

  ctx.restore();
}

export function drawKingfisher(ctx, cam, viewW, viewH, t = 0) {
  const s = worldToScreen(1410, 400 + Math.sin(t / 260) * 4, cam, viewW, viewH);
  const z = cam.zoom;
  ctx.save();

  // Perch and small leaves anchor the bird into the environment.
  ctx.strokeStyle = "#5d412d";
  ctx.lineWidth = 9 * z;
  ctx.beginPath();
  ctx.moveTo(s.x - 58 * z, s.y + 13 * z);
  ctx.quadraticCurveTo(s.x, s.y - 5 * z, s.x + 55 * z, s.y + 8 * z);
  ctx.stroke();
  ctx.strokeStyle = "#765132";
  ctx.lineWidth = 5 * z;
  ctx.beginPath();
  ctx.moveTo(s.x + 7 * z, s.y - 2 * z);
  ctx.lineTo(s.x + 28 * z, s.y - 34 * z);
  ctx.stroke();
  for (const [dx, dy, rot] of [[-42,-2,-.5],[-28,-10,.3],[35,-12,-.2],[48,0,.5]]) {
    ctx.save();
    ctx.translate(s.x + dx * z, s.y + dy * z);
    ctx.rotate(rot);
    ctx.fillStyle = "#4f7f50";
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * z, 5 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const halo = ctx.createRadialGradient(s.x, s.y - 28 * z, 8, s.x, s.y - 28 * z, 68 * z);
  halo.addColorStop(0, "rgba(103,220,236,.20)");
  halo.addColorStop(1, "rgba(103,220,236,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(s.x, s.y - 28 * z, 68 * z, 0, Math.PI * 2);
  ctx.fill();

  // Tail.
  ctx.fillStyle = "#0f6f93";
  ctx.beginPath();
  ctx.moveTo(s.x - 12 * z, s.y - 8 * z);
  ctx.lineTo(s.x - 29 * z, s.y + 24 * z);
  ctx.lineTo(s.x - 2 * z, s.y + 4 * z);
  ctx.closePath();
  ctx.fill();

  // Body and wing.
  ctx.fillStyle = "#168aad";
  ctx.beginPath();
  ctx.ellipse(s.x, s.y - 22*z, 23*z, 30*z, -0.15, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#0d6f93";
  ctx.beginPath();
  ctx.ellipse(s.x - 8*z, s.y - 20*z, 12*z, 22*z, 0.35, 0, Math.PI*2);
  ctx.fill();

  // Orange chest and head.
  ctx.fillStyle = "#f28f3b";
  ctx.beginPath();
  ctx.ellipse(s.x + 4*z, s.y - 7*z, 14*z, 19*z, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#123047";
  ctx.beginPath();
  ctx.arc(s.x + 10*z, s.y - 43*z, 11*z, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#168aad";
  ctx.beginPath();
  ctx.arc(s.x + 6*z, s.y - 47*z, 8*z, 0, Math.PI*2);
  ctx.fill();

  // Long beak and eye.
  ctx.fillStyle = "#f7d154";
  ctx.beginPath();
  ctx.moveTo(s.x + 18*z, s.y - 42*z);
  ctx.lineTo(s.x + 47*z, s.y - 36*z);
  ctx.lineTo(s.x + 18*z, s.y - 33*z);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(s.x + 13*z, s.y - 45*z, 3.2*z, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = "#17354a";
  ctx.beginPath();
  ctx.arc(s.x + 14*z, s.y - 45*z, 1.5*z, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}
