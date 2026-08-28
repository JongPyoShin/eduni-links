import { worldToScreen } from "./transforms.js";

function blob(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawWaterfallWorld(ctx, cam, viewW, viewH, t = 0) {
  ctx.save();
  const p = (x, y) => worldToScreen(x, y, cam, viewW, viewH);
  ctx.fillStyle = "#0d3440"; ctx.fillRect(0, 0, viewW, viewH);
  const basin = p(1050, 520);
  const water = ctx.createRadialGradient(basin.x, basin.y, 10, basin.x, basin.y, 430 * cam.zoom);
  water.addColorStop(0, "rgba(94,224,220,.72)"); water.addColorStop(1, "rgba(22,100,119,.12)");
  ctx.fillStyle = water; ctx.beginPath(); ctx.ellipse(basin.x, basin.y, 430 * cam.zoom, 240 * cam.zoom, 0, 0, Math.PI * 2); ctx.fill();
  const fall = p(1170, 260);
  ctx.fillStyle = "#dffcff"; ctx.beginPath(); ctx.moveTo(fall.x - 90 * cam.zoom, fall.y - 170 * cam.zoom); ctx.lineTo(fall.x + 90 * cam.zoom, fall.y - 170 * cam.zoom); ctx.lineTo(fall.x + 48 * cam.zoom, fall.y + 90 * cam.zoom); ctx.lineTo(fall.x - 48 * cam.zoom, fall.y + 90 * cam.zoom); ctx.fill();
  for (let i = 0; i < 7; i += 1) { const x = fall.x + (i - 3) * 22 * cam.zoom; ctx.strokeStyle = `rgba(116,236,240,${0.42 + (i % 2) * .18})`; ctx.lineWidth = 6 * cam.zoom; ctx.beginPath(); ctx.moveTo(x, fall.y - 145 * cam.zoom); ctx.bezierCurveTo(x - 12, fall.y - 15, x + 14, fall.y + 30, x + (i - 3) * 4, fall.y + 95 * cam.zoom); ctx.stroke(); }
  for (const [x, y, r] of [[820,520,34],[930,590,28],[1080,620,38],[1220,570,30],[1350,520,34]]) { const s=p(x,y); blob(ctx,s.x,s.y,r*cam.zoom,r*.55*cam.zoom,"#59727a"); blob(ctx,s.x,s.y-r*.35*cam.zoom,r*.65*cam.zoom,r*.3*cam.zoom,"#87a4a0"); }
  for (let i=0;i<6;i+=1) { const s=p(850+i*90,720-(i%2)*35); blob(ctx,s.x,s.y,30*cam.zoom,16*cam.zoom,"#d7b46a"); }
  const lookout=p(1450,330); ctx.strokeStyle="#9b6737"; ctx.lineWidth=7*cam.zoom; for (const dx of [-55,55]) { ctx.beginPath(); ctx.moveTo(lookout.x+dx*cam.zoom,lookout.y); ctx.lineTo(lookout.x+dx*cam.zoom,lookout.y-72*cam.zoom); ctx.stroke(); } ctx.strokeStyle="#e2bc7c"; ctx.lineWidth=3*cam.zoom; ctx.beginPath(); ctx.moveTo(lookout.x-55*cam.zoom,lookout.y-55*cam.zoom); ctx.quadraticCurveTo(lookout.x,lookout.y-35*cam.zoom,lookout.x+55*cam.zoom,lookout.y-55*cam.zoom); ctx.stroke();
  for (let i=0;i<14;i+=1) { const s=p(760+(i*83)%700,300+(i*47)%460); blob(ctx,s.x,s.y,5*cam.zoom,9*cam.zoom,"rgba(224,255,255,.26)"); }
  const mist = ctx.createRadialGradient(basin.x, basin.y, 10, basin.x, basin.y, 300 * cam.zoom); mist.addColorStop(0,"rgba(220,255,255,.12)"); mist.addColorStop(1,"rgba(220,255,255,0)"); ctx.fillStyle=mist; ctx.beginPath(); ctx.arc(basin.x,basin.y,300*cam.zoom,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
