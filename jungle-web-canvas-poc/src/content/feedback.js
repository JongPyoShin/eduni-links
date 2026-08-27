import { worldToScreen } from "../transforms.js";
import { CLUES } from "./camp_chapter.js";
import { hasClue } from "./chapter_state.js";

function screen(ctx, cam, viewW, viewH, point) {
  return worldToScreen(point.x, point.y, cam, viewW, viewH);
}

export function drawChapterWorld(ctx, cam, viewW, viewH, state, t, feedback) {
  ctx.save();
  for (const clue of CLUES) {
    const p = screen(ctx, cam, viewW, viewH, clue);
    const found = hasClue(state, clue.id);
    const active = state.questStarted && !found;
    const alpha = active ? 1 : found ? 0 : 0.22;
    ctx.globalAlpha = alpha;
    drawClue(ctx, clue.type, p.x, p.y, t, cam.zoom);
  }
  if (state.firePitComplete) drawWarmFireGlow(ctx, screen(ctx, cam, viewW, viewH, { x: 990, y: 935 }), t, cam.zoom);
  if (state.bluebirdComplete) drawCompletionAmbience(ctx, screen(ctx, cam, viewW, viewH, { x: 1410, y: 400 }), t, cam.zoom);
  if (feedback && t < feedback.until) drawBurst(ctx, screen(ctx, cam, viewW, viewH, feedback), t, feedback.until, cam.zoom);
  ctx.restore();
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
    for (const dx of [-8, 8]) { ctx.beginPath(); ctx.ellipse(dx, 3, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(dx, 0); ctx.lineTo(dx - 5, -6); ctx.moveTo(dx, 0); ctx.lineTo(dx + 5, -6); ctx.stroke(); }
  } else {
    ctx.strokeStyle = "#eaf9ff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 12 * pulse, -1.2, 1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 21 * pulse, -1.05, 1.05); ctx.stroke();
    ctx.fillStyle = "#8dd7ff"; ctx.font = "bold 22px sans-serif"; ctx.fillText("♪", -9, 5);
  }
  ctx.restore();
}

function drawWarmFireGlow(ctx, p, t, zoom) {
  const r = (56 + Math.sin(t / 130) * 8) * zoom;
  const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
  g.addColorStop(0, "rgba(255,225,128,0.42)"); g.addColorStop(1, "rgba(255,130,40,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
}

function drawCompletionAmbience(ctx, p, t, zoom) {
  ctx.fillStyle = "rgba(196,235,255,0.65)";
  for (let i = 0; i < 5; i++) { const a = t / 900 + i * 1.25; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 34 * zoom, p.y - 18 * zoom + Math.sin(a) * 15 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill(); }
}

function drawBurst(ctx, p, t, until, zoom) {
  const progress = Math.max(0, Math.min(1, 1 - (until - t) / 650));
  ctx.globalAlpha = 1 - progress;
  ctx.fillStyle = "#fff3a5";
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * progress * 34 * zoom, p.y + Math.sin(a) * progress * 34 * zoom, 2.5 * zoom, 0, Math.PI * 2); ctx.fill(); }
}
