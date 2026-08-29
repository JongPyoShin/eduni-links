import { worldToScreen } from "../transforms.js";
import { CLUES, nextClueId } from "./camp_chapter.js";
import { clueCount, hasClue } from "./chapter_state.js";
import { campVisualPhase } from "./stage_visual_director.js";

const CAMP_PALETTES = Object.freeze({
  "sunlit-olive": ["rgba(255,232,166,0.12)", "rgba(74,105,55,0.04)"],
  "earthy-olive": ["rgba(220,196,130,0.08)", "rgba(83,92,53,0.08)"],
  "leaf-green": ["rgba(183,226,166,0.08)", "rgba(43,91,61,0.08)"],
  "amber-dusk": ["rgba(255,184,93,0.12)", "rgba(100,67,49,0.12)"],
  "cool-ridge": ["rgba(178,225,220,0.10)", "rgba(65,92,91,0.07)"],
  "golden-ridge": ["rgba(255,225,143,0.14)", "rgba(114,100,55,0.06)"],
});

function screen(cam, viewW, viewH, point) {
  return worldToScreen(point.x, point.y, cam, viewW, viewH);
}

export function drawChapterWorld(ctx, cam, viewW, viewH, state, t, feedback, directing = null) {
  ctx.save();
  const visualPhase = campVisualPhase(state);
  drawCampStageAtmosphere(ctx, cam, viewW, viewH, visualPhase, t);
  drawCampComposition(ctx, cam, viewW, viewH, state, t);

  if (!state.questStarted) {
    drawHutGuidance(ctx, screen(cam, viewW, viewH, { x: 430, y: 260 }), t, cam.zoom, directing?.type === "intro");
    drawTrailSparkles(ctx, cam, viewW, viewH, [
      { x: 205, y: 1010 },
      { x: 265, y: 900 },
      { x: 315, y: 760 },
      { x: 360, y: 620 },
      { x: 405, y: 470 },
      { x: 445, y: 350 },
    ], t, "#ffe59a");
  }

  const activeClueId = nextClueId(state);
  for (const clue of CLUES) {
    const p = screen(cam, viewW, viewH, clue);
    const found = hasClue(state, clue.id);
    const active = clue.id === activeClueId;
    const alpha = found ? 0 : active ? 1 : state.questStarted ? 0.08 : 0.16;
    ctx.globalAlpha = alpha;
    drawClue(ctx, clue.type, p.x, p.y, t, cam.zoom);
    ctx.globalAlpha = 1;
    if (active) drawClueStage(ctx, cam, viewW, viewH, clue, t);
  }

  if (clueCount(state) === CLUES.length) {
    drawWarmFireGlow(ctx, screen(cam, viewW, viewH, { x: 990, y: 935 }), t, cam.zoom, state.firePitComplete ? 1 : 0.55);
    if (!state.firePitComplete) {
      drawTrailSparkles(ctx, cam, viewW, viewH, [
        { x: 1110, y: 850 },
        { x: 1070, y: 890 },
        { x: 1030, y: 920 },
        { x: 995, y: 940 },
      ], t, "#ffca69");
    }
  }

  if (state.firePitComplete) {
    drawRidgeGlow(ctx, screen(cam, viewW, viewH, { x: 1410, y: 400 }), t, cam.zoom, directing?.type === "ridge");
    drawTrailSparkles(ctx, cam, viewW, viewH, [
      { x: 1040, y: 890 },
      { x: 1110, y: 820 },
      { x: 1190, y: 700 },
      { x: 1280, y: 575 },
      { x: 1360, y: 470 },
    ], t, "#d9f5a8");
  }

  if (state.bluebirdComplete) {
    drawCompletionAmbience(ctx, screen(cam, viewW, viewH, { x: 1410, y: 400 }), t, cam.zoom);
  }

  if (feedback && t < feedback.until) {
    const point = screen(cam, viewW, viewH, feedback);
    if (feedback.style === "embers") drawEmbers(ctx, point, t, feedback.until, cam.zoom);
    else drawBurst(ctx, point, t, feedback.until, cam.zoom);
  }
  ctx.restore();
}

function drawCampStageAtmosphere(ctx, cam, viewW, viewH, phase, t) {
  const palette = CAMP_PALETTES[phase?.palette] || CAMP_PALETTES["sunlit-olive"];
  const gradient = ctx.createLinearGradient(0, 0, 0, viewH);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(1, palette[1]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewW, viewH);

  const fog = Math.max(0, Math.min(1, phase?.fog || 0));
  if (fog > 0.035) {
    const haze = ctx.createLinearGradient(0, 0, viewW, 0);
    haze.addColorStop(0, `rgba(232,244,219,${fog * 0.07})`);
    haze.addColorStop(0.5, `rgba(244,245,218,${fog * 0.12})`);
    haze.addColorStop(1, `rgba(213,235,219,${fog * 0.06})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, viewW, viewH);
  }

  const phaseId = phase?.phaseId;
  if (phaseId === "firePit") {
    const fire = screen(cam, viewW, viewH, { x: 990, y: 935 });
    const r = 165 * cam.zoom;
    const glow = ctx.createRadialGradient(fire.x, fire.y, 8, fire.x, fire.y, r);
    glow.addColorStop(0, "rgba(255,174,70,0.16)");
    glow.addColorStop(1, "rgba(255,126,36,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(fire.x, fire.y, r, 0, Math.PI * 2); ctx.fill();
  }

  if (phase?.reveal === "open-sky" || phase?.reveal === "reward") {
    const sky = ctx.createLinearGradient(0, 0, 0, Math.min(viewH * 0.46, 360));
    sky.addColorStop(0, phase?.reveal === "reward" ? "rgba(255,231,153,0.13)" : "rgba(194,235,235,0.12)");
    sky.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewW, Math.min(viewH * 0.5, 390));
  }

  const density = Math.max(0, Math.min(1, phase?.density || 0.5));
  const moteCount = Math.round(2 + density * 5);
  ctx.fillStyle = phaseId === "reward" ? "rgba(255,240,162,0.52)" : "rgba(235,244,189,0.28)";
  for (let i = 0; i < moteCount; i += 1) {
    const a = t / (1100 + i * 73) + i * 1.31;
    const x = ((i + 1) / (moteCount + 1)) * viewW + Math.cos(a) * 22;
    const y = viewH * (0.18 + (i % 4) * 0.15) + Math.sin(a * 1.4) * 14;
    ctx.globalAlpha = 0.16 + ((Math.sin(a * 2) + 1) * 0.09);
    ctx.beginPath(); ctx.arc(x, y, phaseId === "reward" ? 2.4 : 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCampComposition(ctx, cam, viewW, viewH, state, t) {
  drawFlowerPatch(ctx, cam, viewW, viewH, 505, 335, 1.0);
  drawFlowerPatch(ctx, cam, viewW, viewH, 560, 285, 0.8);
  drawLantern(ctx, cam, viewW, viewH, 520, 355, t, !state.questStarted ? 1 : 0.55);
  drawLantern(ctx, cam, viewW, viewH, 575, 395, t, !state.questStarted ? 0.8 : 0.45);

  drawBench(ctx, cam, viewW, viewH, 920, 900, -0.25);
  drawBench(ctx, cam, viewW, viewH, 1060, 945, 0.18);
  drawLantern(ctx, cam, viewW, viewH, 925, 970, t, clueCount(state) === CLUES.length ? 1 : 0.38);
  drawLantern(ctx, cam, viewW, viewH, 1050, 990, t, clueCount(state) === CLUES.length ? 1 : 0.38);

  drawLookoutPost(ctx, cam, viewW, viewH, 1345, 470);
  drawLookoutPost(ctx, cam, viewW, viewH, 1460, 470);
  drawRope(ctx, cam, viewW, viewH, { x: 1345, y: 470 }, { x: 1460, y: 470 });
  drawFlowerPatch(ctx, cam, viewW, viewH, 1360, 500, 0.9);
  drawFlowerPatch(ctx, cam, viewW, viewH, 1460, 510, 0.75);

  if (state.questStarted && !state.firePitComplete) {
    drawFireflies(ctx, cam, viewW, viewH, 780, 430, t, 5, "rgba(255,230,133,0.62)");
  }
  if (state.firePitComplete) {
    drawFireflies(ctx, cam, viewW, viewH, 1375, 455, t, 9, "rgba(211,246,165,0.78)");
  }
}

function drawClueStage(ctx, cam, viewW, viewH, clue, t) {
  if (clue.id === "feather") {
    drawFireflies(ctx, cam, viewW, viewH, clue.x, clue.y, t, 8, "rgba(147,211,255,0.85)");
    drawFlowerPatch(ctx, cam, viewW, viewH, clue.x - 42, clue.y + 28, 0.65);
  } else if (clue.id === "footprints") {
    const trail = [
      { x: 760, y: 430 },
      { x: 805, y: 470 },
      { x: 845, y: 505 },
      { x: 880, y: 540 },
      { x: 915, y: 570 },
    ];
    drawFootprintTrail(ctx, cam, viewW, viewH, trail, t);
  } else if (clue.id === "birdcall") {
    drawSoundGarden(ctx, cam, viewW, viewH, clue.x, clue.y, t);
  }
}

function drawClue(ctx, type, x, y, t, zoom) {
  const pulse = 1 + Math.sin(t / 280) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(zoom, zoom);
  if (type === "feather") {
    ctx.fillStyle = "#5fb6ff";
    ctx.beginPath(); ctx.ellipse(0, 0, 7 * pulse, 19 * pulse, -0.55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#e1f3ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-5, 14); ctx.lineTo(5, -15); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(12, -12, 2, 0, Math.PI * 2); ctx.arc(-10, -16, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (type === "footprints") {
    ctx.fillStyle = "#5c3c27";
    ctx.strokeStyle = "#5c3c27";
    for (const dx of [-8, 8]) {
      ctx.beginPath(); ctx.ellipse(dx, 3, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx - 5, -6); ctx.moveTo(dx, 0); ctx.lineTo(dx + 5, -6); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "#eaf9ff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 21 * pulse, -1.05, 1.05); ctx.stroke();
    ctx.fillStyle = "#8dd7ff"; ctx.font = "bold 22px sans-serif"; ctx.fillText("♪", -9, 5);
  }
  ctx.restore();
}

function drawHutGuidance(ctx, p, t, zoom, isPeeking) {
  const pulse = 0.5 + Math.sin(t / 240) * 0.12 + (isPeeking ? 0.2 : 0);
  const radius = (64 + Math.sin(t / 260) * 8) * zoom;
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, radius);
  glow.addColorStop(0, `rgba(255,222,139,${pulse})`);
  glow.addColorStop(1, "rgba(255,184,89,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,247,202,0.72)";
  for (let i = 0; i < 4; i++) {
    const rise = (t / 900 + i * 0.24) % 1;
    ctx.beginPath(); ctx.arc(p.x + (i - 1.5) * 8 * zoom, p.y - (36 + rise * 36) * zoom, (2 + rise) * zoom, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWarmFireGlow(ctx, p, t, zoom, intensity) {
  const r = (56 + Math.sin(t / 130) * 8) * zoom;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
  g.addColorStop(0, `rgba(255,225,128,${0.42 * intensity})`); g.addColorStop(1, "rgba(255,130,40,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
}

function drawRidgeGlow(ctx, p, t, zoom, arriving) {
  const r = (arriving ? 92 : 58) * zoom;
  const glow = ctx.createRadialGradient(p.x, p.y - 22 * zoom, 3, p.x, p.y, r);
  glow.addColorStop(0, arriving ? "rgba(231,245,174,0.42)" : "rgba(210,236,145,0.2)"); glow.addColorStop(1, "rgba(210,236,145,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  if (arriving) {
    ctx.fillStyle = "rgba(245,255,204,0.82)";
    for (let i = 0; i < 7; i++) {
      const a = t / 360 + i;
      ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 42 * zoom, p.y - 15 * zoom + Math.sin(a * 1.3) * 24 * zoom, 2 * zoom, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawCompletionAmbience(ctx, p, t, zoom) {
  ctx.fillStyle = "rgba(196,235,255,0.65)";
  for (let i = 0; i < 5; i++) {
    const a = t / 900 + i * 1.25;
    ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 34 * zoom, p.y - 18 * zoom + Math.sin(a) * 15 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTrailSparkles(ctx, cam, viewW, viewH, points, t, color) {
  ctx.save();
  ctx.fillStyle = color;
  points.forEach((point, index) => {
    const p = screen(cam, viewW, viewH, point);
    const pulse = 1.4 + Math.sin(t / 220 + index * 0.8) * 0.8;
    ctx.globalAlpha = 0.32 + ((Math.sin(t / 260 + index) + 1) * 0.2);
    ctx.beginPath(); ctx.arc(p.x, p.y, pulse * cam.zoom, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawFootprintTrail(ctx, cam, viewW, viewH, points, t) {
  ctx.save();
  points.forEach((point, index) => {
    const p = screen(cam, viewW, viewH, point);
    const pulse = 0.45 + ((Math.sin(t / 240 - index * 0.7) + 1) * 0.18);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#65452f";
    ctx.beginPath(); ctx.ellipse(p.x - 4 * cam.zoom, p.y, 3.2 * cam.zoom, 5 * cam.zoom, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(p.x + 5 * cam.zoom, p.y - 7 * cam.zoom, 3.2 * cam.zoom, 5 * cam.zoom, 0.2, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

function drawSoundGarden(ctx, cam, viewW, viewH, x, y, t) {
  const p = screen(cam, viewW, viewH, { x, y });
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const phase = ((t / 850) + i * 0.33) % 1;
    ctx.globalAlpha = (1 - phase) * 0.48;
    ctx.strokeStyle = "#baf3d5";
    ctx.lineWidth = 2 * cam.zoom;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (22 + phase * 46) * cam.zoom, -1.2, 1.2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#d7ff9b";
  ctx.font = `${Math.max(14, 18 * cam.zoom)}px sans-serif`;
  ctx.fillText("♪", p.x + 26 * cam.zoom, p.y - 20 * cam.zoom);
  ctx.fillText("♫", p.x - 34 * cam.zoom, p.y - 42 * cam.zoom);
  ctx.restore();
}

function drawFireflies(ctx, cam, viewW, viewH, x, y, t, count, color) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = t / (650 + i * 37) + i * 1.7;
    const p = screen(cam, viewW, viewH, {
      x: x + Math.cos(a) * (28 + (i % 3) * 13),
      y: y + Math.sin(a * 1.3) * (20 + (i % 2) * 12),
    });
    ctx.globalAlpha = 0.42 + ((Math.sin(a * 2.1) + 1) * 0.22);
    ctx.beginPath(); ctx.arc(p.x, p.y, (1.5 + (i % 2)) * cam.zoom, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawLantern(ctx, cam, viewW, viewH, x, y, t, intensity) {
  const p = screen(cam, viewW, viewH, { x, y });
  const glowRadius = 32 * cam.zoom;
  const glow = ctx.createRadialGradient(p.x, p.y - 10 * cam.zoom, 2, p.x, p.y - 10 * cam.zoom, glowRadius);
  glow.addColorStop(0, `rgba(255,214,113,${0.28 * intensity})`);
  glow.addColorStop(1, "rgba(255,173,64,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y - 10 * cam.zoom, glowRadius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#64482f"; ctx.lineWidth = 3 * cam.zoom;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 25 * cam.zoom); ctx.stroke();
  ctx.fillStyle = `rgba(255,208,98,${0.72 + Math.sin(t / 160) * 0.12})`;
  ctx.fillRect(p.x - 5 * cam.zoom, p.y - 27 * cam.zoom, 10 * cam.zoom, 12 * cam.zoom);
}

function drawBench(ctx, cam, viewW, viewH, x, y, angle) {
  const p = screen(cam, viewW, viewH, { x, y });
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = "#744a28";
  ctx.strokeStyle = "rgba(54,34,20,0.7)";
  ctx.lineWidth = 2 * cam.zoom;
  ctx.beginPath();
  ctx.ellipse(0, 0, 34 * cam.zoom, 10 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(190,126,63,0.38)";
  ctx.beginPath(); ctx.ellipse(-5 * cam.zoom, -2 * cam.zoom, 25 * cam.zoom, 3 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawLookoutPost(ctx, cam, viewW, viewH, x, y) {
  const p = screen(cam, viewW, viewH, { x, y });
  ctx.fillStyle = "#6b4b2e";
  ctx.fillRect(p.x - 4 * cam.zoom, p.y - 24 * cam.zoom, 8 * cam.zoom, 24 * cam.zoom);
  ctx.fillStyle = "#9a6d3c";
  ctx.beginPath(); ctx.arc(p.x, p.y - 24 * cam.zoom, 5 * cam.zoom, 0, Math.PI * 2); ctx.fill();
}

function drawRope(ctx, cam, viewW, viewH, a, b) {
  const p1 = screen(cam, viewW, viewH, a);
  const p2 = screen(cam, viewW, viewH, b);
  ctx.strokeStyle = "rgba(185,145,86,0.82)";
  ctx.lineWidth = 2.5 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y - 14 * cam.zoom);
  ctx.quadraticCurveTo((p1.x + p2.x) / 2, Math.max(p1.y, p2.y) - 5 * cam.zoom, p2.x, p2.y - 14 * cam.zoom);
  ctx.stroke();
}

function drawFlowerPatch(ctx, cam, viewW, viewH, x, y, scale) {
  const p = screen(cam, viewW, viewH, { x, y });
  const colors = ["#f4b6c2", "#ffd166", "#b9e88b", "#a8d8ff"];
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    const px = p.x + Math.cos(a) * (8 + (i % 2) * 5) * cam.zoom * scale;
    const py = p.y + Math.sin(a) * (5 + (i % 3) * 3) * cam.zoom * scale;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath(); ctx.arc(px, py, 2.2 * cam.zoom * scale, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBurst(ctx, p, t, until, zoom) {
  const progress = Math.max(0, Math.min(1, 1 - (until - t) / 650));
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = "#fff3a5";
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * progress * 34 * zoom, p.y + Math.sin(a) * progress * 34 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEmbers(ctx, p, t, until, zoom) {
  const progress = Math.max(0, Math.min(1, 1 - (until - t) / 760));
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = "#ffe6a5";
  for (let i = 0; i < 6; i++) {
    const sway = Math.sin(progress * 8 + i) * 9;
    ctx.beginPath(); ctx.arc(p.x + (i - 2.5) * 8 * zoom + sway * zoom, p.y - progress * (48 + i * 7) * zoom, (2.3 - progress) * zoom, 0, Math.PI * 2); ctx.fill();
  }
}
