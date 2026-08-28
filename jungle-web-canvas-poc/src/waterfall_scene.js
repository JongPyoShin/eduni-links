import { worldToScreen } from "./transforms.js";
import { WaterfallWorldGeometry } from "./geometry.js";

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

function drawSpriteBottom(ctx, img, s, widthWorld, cam, alpha = 1) {
  if (!img || !img.width || !img.height) return false;
  const width = widthWorld * cam.zoom;
  const height = width * (img.height / img.width);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, s.x - width / 2, s.y - height, width, height);
  ctx.restore();
  return true;
}

function drawParallaxBackdrop(ctx, cam, viewW, viewH, t) {
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

  // The visible trail is derived directly from WaterfallWorldGeometry, preserving
  // the core invariant that the painted route and collision route share one source.
  pathStroke(ctx, points, WATERFALL_GEOMETRY.pathHalfWidth * 2 * cam.zoom, "rgba(30,54,45,.82)");
  pathStroke(ctx, points, WATERFALL_GEOMETRY.pathHalfWidth * 1.62 * cam.zoom, "rgba(106,118,76,.88)");
  pathStroke(ctx, points, WATERFALL_GEOMETRY.pathHalfWidth * 0.94 * cam.zoom, "rgba(184,158,96,.78)");
  pathStroke(ctx, points, 3 * cam.zoom, "rgba(247,227,151,.18)", [18 * cam.zoom, 28 * cam.zoom]);
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
  const steppingStones = [[860,770],[920,745],[980,720],[1040,705],[1080,700]];
  for (let i = 0; i < steppingStones.length; i += 1) {
    const [x, y] = steppingStones[i];
    const s = p(x, y);
    blob(ctx, s.x + 4 * cam.zoom, s.y + 7 * cam.zoom, 35 * cam.zoom, 17 * cam.zoom, "rgba(11,48,53,.34)");
    blob(ctx, s.x, s.y, 32 * cam.zoom, 18 * cam.zoom, "#817e68");
    blob(ctx, s.x - 4 * cam.zoom, s.y - 5 * cam.zoom, 22 * cam.zoom, 8 * cam.zoom, "#b7b292");
    const ripple = 25 + ((t / 70 + i * 11) % 18);
    ctx.strokeStyle = active ? "rgba(173,255,237,.42)" : "rgba(138,236,235,.18)";
    ctx.lineWidth = active ? 3 * cam.zoom : 2 * cam.zoom;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 8 * cam.zoom, ripple * cam.zoom, ripple * 0.35 * cam.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (active) {
      const sparkle = 3 + Math.sin(t / 160 + i) * 1.2;
      blob(ctx, s.x + 9 * cam.zoom, s.y - 15 * cam.zoom, sparkle * cam.zoom, sparkle * cam.zoom, "rgba(247,245,183,.72)");
    }
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
  for (const prop of ART_PROPS) {
    const s = p(prop.x, prop.y);
    const img = images?.[prop.type];
    if (drawSpriteBottom(ctx, img, s, prop.width, cam, prop.alpha)) continue;

    // Fallback if a source sprite failed to load.
    if (prop.type === "rock") {
      blob(ctx, s.x, s.y - 10 * cam.zoom, prop.width * 0.42 * cam.zoom, prop.width * 0.2 * cam.zoom, "#647a70");
    } else if (prop.type === "tall_grass") {
      ctx.strokeStyle = "#4d7654";
      ctx.lineWidth = 5 * cam.zoom;
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(s.x + i * 8 * cam.zoom, s.y - 36 * cam.zoom, s.x + i * 13 * cam.zoom, s.y - 58 * cam.zoom);
        ctx.stroke();
      }
    } else {
      blob(ctx, s.x, s.y - prop.width * 0.42 * cam.zoom, prop.width * 0.34 * cam.zoom, prop.width * 0.26 * cam.zoom, "#2f6c49");
    }
  }
}

function drawFlowersAndLeafBeds(ctx, p, cam, t, state) {
  const beds = [
    [585, 945], [690, 830], [1015, 510], [1115, 445], [1285, 445], [1390, 395], [1515, 345],
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
  const clusters = [
    { x: -18, y: 45, side: 1 },
    { x: viewW + 18, y: 55, side: -1 },
    { x: -25, y: viewH - 40, side: 1 },
    { x: viewW + 25, y: viewH - 30, side: -1 },
  ];
  for (const cluster of clusters) {
    for (let i = 0; i < 7; i += 1) {
      const dx = cluster.side * (18 + (i % 3) * 28);
      const dy = (i - 3) * 25 + sway * (i % 2 ? 1 : -1);
      ctx.fillStyle = i % 2 ? "rgba(20,62,42,.80)" : "rgba(32,84,51,.82)";
      ctx.beginPath();
      ctx.ellipse(cluster.x + dx, cluster.y + dy, 40, 18, cluster.side * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawWaterfallWorld(ctx, cam, viewW, viewH, t = 0, images = null, state = null) {
  ctx.save();
  const p = (x, y) => worldToScreen(x, y, cam, viewW, viewH);

  drawParallaxBackdrop(ctx, cam, viewW, viewH, t);
  drawCliffTerraces(ctx, p, cam);
  const basin = drawWaterSystem(ctx, p, cam, t);
  drawWaterfall(ctx, p, cam, t);

  // Keep the gameplay route on top of the water/terrain base so the child can
  // always read where walking is allowed.
  drawWalkableRoute(ctx, cam, viewW, viewH);

  for (const [x, y, r] of [[760,560,38],[820,520,34],[930,590,28],[1080,620,38],[1220,570,30],[1350,520,34],[1440,455,30]]) {
    drawWetRock(ctx, p, x, y, r, cam);
  }

  drawSteppingStones(ctx, p, cam, t, Boolean(state?.streamGateComplete && !state?.steppingStonesComplete));
  drawGate(ctx, p, cam, !state?.streamGateComplete);
  drawLookout(ctx, p, cam, Boolean(state?.leafMatchComplete && !state?.lookoutComplete));
  drawArtProps(ctx, p, cam, images);
  drawFlowersAndLeafBeds(ctx, p, cam, t, state);
  drawStateCues(ctx, p, cam, t, state);
  drawMist(ctx, basin, cam, t);

  const vignette = ctx.createRadialGradient(viewW / 2, viewH / 2, viewH * 0.18, viewW / 2, viewH / 2, viewW * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(3,20,27,.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewW, viewH);

  drawForegroundFrame(ctx, viewW, viewH, t);
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
