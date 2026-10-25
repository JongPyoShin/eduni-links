/* 의준 서바이벌 v0.5 — lightweight painter-sorted 2.5D jungle art.
   Every sprite is drawn from shapes and gradients; no CDN, fonts, images or user data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SurvivalArt25D = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TAU = Math.PI * 2;
  function oval(ctx, x, y, rx, ry, color, stroke, line = 1) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, TAU);
    if (color) { ctx.fillStyle = color; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
  }
  function rounded(ctx, x, y, w, h, r, color, stroke, width = 1) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (color) { ctx.fillStyle = color; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function shade(ctx, x1, y1, x2, y2, colors) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach(([pos, color]) => g.addColorStop(pos, color));
    return g;
  }
  function limb(ctx, x1, y1, x2, y2, width, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineWidth = width; ctx.stroke();
  }
  function leaf(ctx, x, y, rx, ry, color, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    oval(ctx, 0, 0, rx, ry, color);
    ctx.beginPath(); ctx.moveTo(-rx * .65, ry * .25); ctx.lineTo(rx * .72, -ry * .20);
    ctx.strokeStyle = "#e7f6c244"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  }
  function shadow(ctx, x, y, rx = 24, ry = 9) {
    oval(ctx, x + 6, y + 3, rx + 7, ry + 3, "#102b2550");
    oval(ctx, x, y, rx, ry, "#163b3066");
  }
  function pill(ctx, x, y, w, h, color, accent) {
    rounded(ctx, x - w/2, y - h/2, w, h, h/2, color, accent, 2);
  }
  function drawPlayer(ctx, p, options = {}) {
    const { facing = "down", walk = 0, moving = false, bunny = false,
      dash = false, invulnerable = false, hiding = false } = options;
    if (hiding) return; // A covered explorer must not be rendered above the shelter.
    const x = p.x, y = p.y;
    const sway = moving ? Math.sin(walk * 11) * 7 : Math.sin(walk * 2) * 1;
    const bob = moving ? Math.abs(Math.sin(walk * 11)) * 2.5 : Math.sin(walk * 2) * .65;
    const front = facing !== "up", side = facing === "left" || facing === "right";
    const sign = facing === "left" ? -1 : 1;
    ctx.save();
    shadow(ctx, x, y, dash ? 28 : 22, 9);
    if (dash) oval(ctx, x, y, 31, 13, "#8ffff077", "#e9ffe9", 3);
    if (invulnerable) oval(ctx, x, y - 37, 34, 50, "#cbf7ff18", "#b8fff2", 2);
    ctx.translate(x, y - bob);
    // Boots and alternating legs ground the model at the original collision position.
    limb(ctx, -7, -23, -8 - sway * .5, -7, 11, "#426d92");
    limb(ctx, 8, -23, 8 + sway * .5, -7, 11, "#305c81");
    oval(ctx, -9 - sway * .5, -4, 9, 5, "#75583c", "#3f382c", 1.5);
    oval(ctx, 9 + sway * .5, -4, 9, 5, "#75583c", "#3f382c", 1.5);
    // Explorer's tan satchel and blue shoulder backpack echo EDUNI jungle explorer.
    if (front) rounded(ctx, -20, -47, 40, 31, 12, "#6e452b", "#422c25", 2);
    else rounded(ctx, -20, -47, 40, 33, 12,
      shade(ctx, -18, -48, 18, -16, [[0,"#b88549"],[1,"#694526"]]), "#55361f", 2);
    limb(ctx, -21, -39, -26 - sway * .35, -23, 11, bunny ? "#e6d3bb" : "#f4b591");
    limb(ctx, 21, -39, 26 + sway * .35, -23, 11, bunny ? "#e6d3bb" : "#f4b591");
    oval(ctx, -25 - sway * .35, -21, 6, 7, bunny ? "#f4e4d2" : "#ffd0ad");
    oval(ctx, 25 + sway * .35, -21, 6, 7, bunny ? "#f4e4d2" : "#ffd0ad");
    rounded(ctx, -19, -49, 38, 31, 11,
      shade(ctx, -17, -49, 19, -17, [[0,"#fff8e0"],[.6,"#e5ede0"],[1,"#a9c9b7"]]), "#4d655c", 2.2);
    // Shirt collar, diagonal bag strap and compass.
    limb(ctx, -10, -46, 14, -22, 3.5, "#9e734d");
    oval(ctx, -7, -35, 5.5, 5.5, "#e7bd59", "#88572d", 1.5);
    oval(ctx, -7, -35, 2.1, 2.1, "#fff5cb");
    rounded(ctx, 13, -36, 15, 15, 4, "#ba8250", "#70502e", 2);
    // Big dimensional head and cheeks.
    oval(ctx, 0, -66, 21.5, 23, "#c28f6a");
    oval(ctx, 0, -69, 22, 22.5, bunny
      ? shade(ctx,-17,-83,18,-56,[[0,"#fff9e9"],[1,"#dec7b6"]])
      : shade(ctx,-17,-87,18,-57,[[0,"#ffdab1"],[.68,"#f8be99"],[1,"#d99172"]]),
      bunny ? "#a38a7f" : "#97664e", 2);
    if (bunny) {
      [-13,13].forEach(a=>{
        ctx.save(); ctx.translate(a, -93); ctx.rotate(a<0?-.18:.2);
        oval(ctx, 0, 0, 8, 24, "#fff2e8", "#8e8691", 2);
        oval(ctx, 0, 1, 3.8, 15.5, "#eaadba"); ctx.restore();
      });
      oval(ctx, 0, -58, 4, 3, "#dd7e88");
    } else {
      // Hair, blue jungle cap, deep brim and high-lit crown.
      oval(ctx, 0, -82, 21.6, 10, "#29251f");
      oval(ctx, 0, -91, 21.8, 10.5,
        shade(ctx, -18,-102,22,-87,[[0,"#65a4ed"],[.55,"#3276c4"],[1,"#174783"]]), "#193d69", 2);
      oval(ctx, side ? sign * 9 : 0, -87, 24, 5.5, "#2664b4", "#204b7c", 1.6);
      oval(ctx, -7, -95, 7, 2, "#d5e9fb99");
    }
    if (front) {
      const shift = side ? sign * 8 : 0;
      oval(ctx, shift - 8, -68, 2.5, 3.4, "#282c33");
      oval(ctx, shift + (side?1:8), -68, 2.5, 3.4, "#282c33");
      oval(ctx, shift - 12, -59, 4.8, 2.5, "#ed8b83bb");
      oval(ctx, shift + 12, -59, 4.8, 2.5, "#ed8b83bb");
      ctx.beginPath(); ctx.arc(shift, -59, 5, .1, Math.PI-.1);
      ctx.strokeStyle = "#a75d56"; ctx.lineWidth = 1.7; ctx.stroke();
    } else {
      // Back view shows the blue explorer cap and satchel, not a face on the rear.
      oval(ctx, 0, -82, 20, 8, "#29518d");
    }
    ctx.restore();
  }
  function drawMonkey(ctx, enemy, t) {
    const { x, y } = enemy; ctx.save();
    shadow(ctx, x, y, 23, 9); ctx.translate(x, y);
    const step = Math.sin(t * 9 + x *.01) * 5;
    // Long curling tail behind the round body.
    ctx.beginPath(); ctx.moveTo(15,-27); ctx.bezierCurveTo(46,-44,38,-64,24,-62);
    ctx.bezierCurveTo(10,-59,23,-48,30,-54);
    ctx.strokeStyle="#68412b";ctx.lineWidth=9;ctx.lineCap="round";ctx.stroke();
    limb(ctx,-11,-20,-13-step,-6,10,"#835134");
    limb(ctx,10,-20,12+step,-6,10,"#70442d");
    oval(ctx,0,-31,21,23,shade(ctx,-20,-49,21,-15,[[0,"#c37c4d"],[1,"#714327"]]),"#59351f",2);
    oval(ctx,0,-58,25,23,shade(ctx,-24,-76,22,-42,[[0,"#ba794e"],[1,"#6f4128"]]),"#6a3d23",2);
    oval(ctx,-22,-61,11,12,"#ab6f4b","#673d2c",2); oval(ctx,22,-61,11,12,"#ab6f4b","#673d2c",2);
    oval(ctx,-22,-61,5,6,"#dfa48a"); oval(ctx,22,-61,5,6,"#dfa48a");
    oval(ctx,0,-55,17,14,"#f6ca9e");
    oval(ctx,-8,-61,2.7,3.8,"#2c2525"); oval(ctx,8,-61,2.7,3.8,"#2c2525");
    oval(ctx,0,-51,5.2,4,"#7c4837"); oval(ctx,0,-49,2,1,"#2c2728");
    ctx.restore();
  }
  function drawSnake(ctx, enemy, t) {
    const { x, y } = enemy; ctx.save();
    shadow(ctx,x,y,26,8);ctx.translate(x,y);
    const wave=Math.sin(t*7+x*.02)*3;
    ctx.beginPath();ctx.moveTo(-20,-13);ctx.bezierCurveTo(-38,-40,12,-39,8,-17);
    ctx.bezierCurveTo(5,2,39,-23,12,-40+wave);
    ctx.strokeStyle="#285c3c";ctx.lineWidth=17;ctx.lineCap="round";ctx.stroke();
    ctx.strokeStyle="#6bb96c";ctx.lineWidth=12;ctx.stroke();
    for(let i=0;i<4;i++)oval(ctx,-19+i*11,-14-Math.sin(i*1.7)*7,3.5,2,"#c5de80");
    oval(ctx,14,-44+wave,17,15,
      shade(ctx,1,-60,27,-32,[[0,"#8de18c"],[1,"#429355"]]),"#225d47",2);
    oval(ctx,7,-48+wave,3.2,4,"#fefae6"); oval(ctx,21,-48+wave,3.2,4,"#fefae6");
    oval(ctx,8,-48+wave,1.4,2.7,"#142926"); oval(ctx,22,-48+wave,1.4,2.7,"#142926");
    oval(ctx,15,-36+wave,10,4,"#e0c98a");
    ctx.beginPath();ctx.moveTo(17,-33+wave);ctx.lineTo(24,-24+wave);ctx.lineTo(29,-27+wave);
    ctx.strokeStyle="#c96d75";ctx.lineWidth=2.5;ctx.stroke();
    ctx.restore();
  }
  function drawJaguar(ctx, enemy, t) {
    const { x, y }=enemy;ctx.save(); shadow(ctx,x,y,33,11);ctx.translate(x,y);
    const trot=Math.sin(t*10+x*.03)*6;
    ctx.beginPath();ctx.moveTo(15,-29);ctx.bezierCurveTo(35,-36,43,-18,48,-36);
    ctx.strokeStyle="#754523";ctx.lineWidth=9;ctx.lineCap="round";ctx.stroke();
    limb(ctx,-16,-26,-20-trot,-6,12,"#d9933d");limb(ctx,16,-26,20+trot,-6,12,"#c37a2f");
    oval(ctx,0,-35,29,21,
      shade(ctx,-22,-57,28,-18,[[0,"#f5c35c"],[1,"#af6829"]]),"#844d20",2);
    [[-16,-40],[7,-40],[-4,-28],[18,-32]].forEach(([a,b])=>oval(ctx,a,b,3,4,"#7a532b"));
    oval(ctx,0,-60,23,20,
      shade(ctx,-19,-81,22,-44,[[0,"#ffd878"],[1,"#cd8230"]]),"#965220",2);
    oval(ctx,-16,-75,9,10,"#d48a33","#925724",2);oval(ctx,16,-75,9,10,"#d48a33","#925724",2);
    oval(ctx,-16,-75,4,5,"#6a452f");oval(ctx,16,-75,4,5,"#6a452f");
    oval(ctx,-9,-61,3.3,4,"#1e3126");oval(ctx,9,-61,3.3,4,"#1e3126");
    oval(ctx,-13,-48,11,7,"#fff0d2");oval(ctx,13,-48,11,7,"#fff0d2");
    oval(ctx,0,-52,6,4.5,"#774334");
    for(let i=0;i<4;i++){limb(ctx,-3,-49-i*2,-19,-46-i*2,1.3,"#61452e");limb(ctx,3,-49-i*2,19,-46-i*2,1.3,"#61452e");}
    ctx.restore();
  }
  function drawEnemy(ctx, enemy, time) {
    if (enemy.kind==="snake") drawSnake(ctx,enemy,time);
    else if (enemy.kind==="jaguar") drawJaguar(ctx,enemy,time);
    else drawMonkey(ctx,enemy,time);
  }
  function drawObstacleBase(ctx, rect) {
    oval(ctx,rect.x+rect.w/2,rect.y+rect.h/2+8,rect.w*.60,rect.h*.59,"#1d4c3755");
    rounded(ctx,rect.x,rect.y,rect.w,rect.h,12,"#284d3280","#507a4199",2);
  }
  function drawTree(ctx,x,y,scale,seed) {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    shadow(ctx,0,0,26,10);
    // Perspective trunk: tapered, lighter at left, shaded at the right.
    ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(-14,-60);ctx.lineTo(12,-65);
    ctx.lineTo(10,-8);ctx.closePath();
    ctx.fillStyle=shade(ctx,-15,-44,14,-42,[[0,"#bb8851"],[.45,"#80572f"],[1,"#503b2a"]]);ctx.fill();
    ctx.strokeStyle="#5d442a";ctx.lineWidth=2;ctx.stroke();
    limb(ctx,-6,-32,-8,-63,2,"#d2a36a66");
    const colors=["#2b7145","#31874a","#3c9550","#23643f","#57a95b"];
    const shift=seed%3;
    oval(ctx,-16,-80,28,28,colors[shift], "#1b5637", 2.5);
    oval(ctx,15,-82,29,28,colors[(shift+1)%5],"#215e3c",2.5);
    oval(ctx,0,-103,34,31,shade(ctx,-25,-127,31,-70,
      [[0,"#86c36c"],[.43,colors[(shift+2)%5]],[1,"#215f41"]]),"#1b603d",3);
    oval(ctx,-14,-115,12,6,"#e6ffb733");oval(ctx,12,-111,14,7,"#f6fdb72a");
    ctx.restore();
  }
  function drawObstacle(ctx, rect, index) {
    const step=60, cols=Math.max(1,Math.ceil(rect.w/step));
    const rows=Math.max(1,Math.ceil(rect.h/64));
    const count=Math.min(12,cols*rows);
    for(let i=0;i<count;i++) {
      const col=i%cols,row=Math.floor(i/cols);
      const x=rect.x+(col+.5)*rect.w/cols+(row%2?8:-8);
      const y=rect.y+(row+.72)*rect.h/rows;
      drawTree(ctx,x,y,.62+(index+i)%4*.07,index*3+i);
    }
  }
  function drawBush(ctx, s, occupied, time) {
    const {x,y}=s;ctx.save();shadow(ctx,x,y,37,13);
    oval(ctx,x,y-4,40,18,"#245338","#173c2f",2);
    for(let i=0;i<9;i++){
      const a=-Math.PI+ i*Math.PI/8;
      const px=x+Math.cos(a)*28,py=y-23+Math.sin(a)*13;
      leaf(ctx,px,py,17,26,["#358b4d","#61aa59","#2e7647","#8ac96b"][i%4],a*.44);
    }
    leaf(ctx,x-9,y-35,23,30,"#449d50",-.1);
    leaf(ctx,x+12,y-34,22,28,"#63b85d",.25);
    if(occupied){oval(ctx,x,y-17,13,6,"#254a34");oval(ctx,x-5,y-18,2.4,3,"#fffbd4");oval(ctx,x+5,y-18,2.4,3,"#fffbd4");}
    ctx.restore();
  }
  function drawLog(ctx,s,occupied,time){
    const {x,y}=s;ctx.save();shadow(ctx,x,y,45,14);
    rounded(ctx,x-44,y-39,88,34,15,
      shade(ctx,x-44,y-39,x+44,y-10,[[0,"#c28c4c"],[.3,"#986037"],[1,"#573b29"]]),"#513b2a",3);
    oval(ctx,x+36,y-22,16,21,"#c49054","#704b30",3);
    oval(ctx,x+36,y-22,10,15,"#47392b");
    ctx.beginPath();ctx.moveTo(x-31,y-37);ctx.bezierCurveTo(x-15,y-48,x+4,y-44,x+17,y-37);
    ctx.strokeStyle="#e9b879";ctx.lineWidth=4;ctx.stroke();
    [[-25,-24],[0,-31],[16,-18]].forEach(([dx,dy])=>limb(ctx,x+dx,y+dy,x+dx+10,y+dy-4,2,"#66462c"));
    if(occupied) oval(ctx,x+33,y-22,7,6,"#8ade9666");
    ctx.restore();
  }
  function drawCave(ctx,s,occupied,time){
    const {x,y}=s;ctx.save();shadow(ctx,x,y,44,15);
    ctx.beginPath();ctx.moveTo(x-48,y);ctx.bezierCurveTo(x-48,y-57,x-22,y-69,x,y-65);
    ctx.bezierCurveTo(x+30,y-75,x+47,y-50,x+48,y);ctx.closePath();
    ctx.fillStyle=shade(ctx,x-36,y-65,x+43,y+5,[[0,"#b2b1a2"],[.55,"#737d71"],[1,"#515c55"]]);
    ctx.fill();ctx.strokeStyle="#445448";ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-25,y);ctx.bezierCurveTo(x-23,y-49,x-10,y-45,x,y-45);
    ctx.bezierCurveTo(x+13,y-48,x+26,y-30,x+26,y);ctx.closePath();
    ctx.fillStyle="#152d2c";ctx.fill();
    oval(ctx,x-28,y-48,12,7,"#e2e3cf55");oval(ctx,x+21,y-52,13,7,"#d3dccb55");
    if(occupied){oval(ctx,x-7,y-22,2.8,4,"#f6eeb7");oval(ctx,x+7,y-22,2.8,4,"#f6eeb7");}
    ctx.restore();
  }
  function drawShelter(ctx, shelter, occupied, remaining, time) {
    if(shelter.status==="used")return;
    if(shelter.kind==="cave")drawCave(ctx,shelter,occupied,time);
    else if(shelter.kind==="log")drawLog(ctx,shelter,occupied,time);
    else drawBush(ctx,shelter,occupied,time);
    oval(ctx,shelter.x,shelter.y, shelter.radius+6, shelter.radius*.38+5,
      null,occupied?"#b8ffe9":"#ffffb6aa",occupied?4:2);
    if(occupied) {
      const progress=Math.max(0,remaining/shelter.hideSeconds);
      ctx.beginPath();ctx.ellipse(shelter.x,shelter.y, shelter.radius+11,
        shelter.radius*.38+9,0,-Math.PI/2,-Math.PI/2+TAU*progress);
      ctx.strokeStyle=progress<.25?"#ffbb84":"#ddff9e";ctx.lineWidth=5;ctx.stroke();
    }
  }
  function drawStar(ctx,x,y,time){
    ctx.save();shadow(ctx,x,y,16,5);ctx.translate(x,y-24-Math.sin(time*3+x)*3);
    ctx.shadowColor="#ffea8e";ctx.shadowBlur=17;
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const a=i*Math.PI/5-Math.PI/2,r=i%2?9:20;
      if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
      else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
    ctx.closePath();ctx.fillStyle=shade(ctx,-15,-15,15,20,
      [[0,"#fffbd4"],[.45,"#ffdf73"],[1,"#d59439"]]);ctx.fill();
    ctx.strokeStyle="#ffffff";ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function drawKey(ctx,point,time){
    const {x,y}=point;ctx.save();shadow(ctx,x,y,19,7);
    const bob=Math.sin(time*4)*3;ctx.translate(x,y-32+bob);
    ctx.shadowColor="#ffeaa5";ctx.shadowBlur=16;
    oval(ctx,0,-18,13,13,null,"#ffe6a2",7);
    oval(ctx,0,-18,7.5,7.5,null,"#ac711f",2);
    limb(ctx,0,-6,0,24,9,"#dfaa35");
    limb(ctx,0,17,12,17,6,"#f7ca4d");
    limb(ctx,0,23,9,23,6,"#f1c352");
    ctx.restore();
  }
  function drawExit(ctx, point, unlocked, time) {
    const {x,y}=point;ctx.save();shadow(ctx,x,y,45,17);
    const stone=shade(ctx,x-39,y-97,x+46,y-2,[[0,"#b5bba7"],[.5,"#7a8d78"],[1,"#455c53"]]);
    rounded(ctx,x-42,y-91,20,89,6,stone,"#3f6356",3);
    rounded(ctx,x+22,y-91,20,89,6,stone,"#3f6356",3);
    ctx.beginPath();ctx.moveTo(x-43,y-84);ctx.bezierCurveTo(x-46,y-130,x+45,y-130,x+43,y-84);
    ctx.strokeStyle="#819881";ctx.lineWidth=23;ctx.stroke();
    ctx.strokeStyle="#b6c2a8";ctx.lineWidth=10;ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-20,y);ctx.lineTo(x-20,y-80);
    ctx.quadraticCurveTo(x,y-106,x+20,y-80);ctx.lineTo(x+20,y);ctx.closePath();
    ctx.fillStyle=unlocked?"#57d6bd":"#263d3d";ctx.fill();
    if(unlocked) {
      const glow=Math.sin(time*5)*.2+.45;
      oval(ctx,x,y-37,16,28,"rgba(183,255,221,"+glow+")");
      oval(ctx,x,y-32,6,11,"#fff7bc");
    } else {
      rounded(ctx,x-8,y-46,17,18,4,"#b5a788","#614d38",2);
      ctx.beginPath();ctx.arc(x,y-47,7,Math.PI,0);ctx.strokeStyle="#c5bb9a";ctx.lineWidth=4;ctx.stroke();
    }
    leaf(ctx,x-37,y-75,13,19,"#398253",-.5);
    leaf(ctx,x+41,y-62,13,19,"#3a9757",.65);
    ctx.restore();
  }
  function drawHazard(ctx, hazard, phase, time) {
    const {x,y,radius}=hazard;
    oval(ctx,x,y,radius+4,(radius+4)*.46,
      phase==="active"?"#eb4b4555":phase==="warning"?"#ffc95544":"#345a4255",
      phase==="active"?"#fd7264":phase==="warning"?"#ffe57c":"#b8ce83",phase==="idle"?2:5);
    if(phase!=="idle"){
      ctx.save();ctx.translate(x,y-21);
      const blink=Math.sin(time*12)*5;
      oval(ctx,0,-4,20+blink*.2,22+blink*.2,phase==="active"?"#d85d49":"#ffd37a","#f9e2aa",2);
      ctx.fillStyle="#673b2e";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="900 25px system-ui";ctx.fillText("!",0,-6);
      ctx.restore();
    }
  }
  function drawLandmark(ctx, marker, time) {
    const {x,y,kind}=marker;ctx.save();shadow(ctx,x,y,50,17);ctx.translate(x,y);
    if(kind==="camp") {
      ctx.beginPath();ctx.moveTo(-49,-9);ctx.lineTo(0,-85);ctx.lineTo(49,-9);ctx.closePath();
      ctx.fillStyle=shade(ctx,-35,-55,39,-12,[[0,"#ffd680"],[1,"#d88437"]]);ctx.fill();
      ctx.strokeStyle="#82562a";ctx.lineWidth=4;ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-85);ctx.lineTo(0,-9);ctx.lineTo(24,-9);ctx.closePath();
      ctx.fillStyle="#9f5f33";ctx.fill();
      limb(ctx,0,-85,0,-101,4,"#6d5b3b");
    } else if(kind==="butterflies") {
      for(let i=0;i<4;i++){
        const px=Math.cos(i*2)*30,py=-36+i*12+Math.sin(time*4+i)*5;
        oval(ctx,px-9,py,10,6,["#e8c6fb","#ffb7c7","#f7e58c","#a4defb"][i]);
        oval(ctx,px+9,py,10,6,["#d9a2f2","#f39bae","#ecdb71","#7dc3e0"][i]);
        limb(ctx,px,py-3,px,py+8,2,"#584c53");
      }
      leaf(ctx,-36,-13,13,25,"#33764c",-.7);
      leaf(ctx,32,-13,13,25,"#4a9b5c",.7);
    } else if(kind==="flowers") {
      for(let i=0;i<8;i++){
        const px=Math.cos(i*2.5)*38,py=Math.sin(i*2.5)*16-13;
        limb(ctx,px,py+12,px,py-7,3,"#346d43");
        for(let a=0;a<5;a++){const angle=a*TAU/5;oval(ctx,px+Math.cos(angle)*7,py-7+Math.sin(angle)*7,7,5,["#ffd9a1","#fcd6f2","#fff3a9"][i%3]);}
        oval(ctx,px,py-7,4,4,"#e9ae4d");
      }
    } else if(kind==="ruins") {
      for(let i=-1;i<=1;i++){
        rounded(ctx,i*37-12,-84-(i===0?18:0),24,83+(i===0?18:0),3,
          shade(ctx,i*37-12,-92,i*37+15,-15,[[0,"#cad1b9"],[1,"#87988b"]]),"#5f7770",3);
        rounded(ctx,i*37-18,-96-(i===0?18:0),36,12,3,"#c6cbb1","#687e6d",2);
      }
      ctx.beginPath();ctx.moveTo(-46,-91);ctx.quadraticCurveTo(0,-128,46,-91);
      ctx.strokeStyle="#a9b7a1";ctx.lineWidth=11;ctx.stroke();
      leaf(ctx,-33,-59,15,22,"#3c925a",-.45);
    } else if(kind==="jungle") {
      for(let i=-2;i<=2;i++){
        leaf(ctx,i*19,-26+(i%2)*6,21,37,["#28694a","#4b9e54","#60ad5a"][Math.abs(i)%3],i*.18);
      }
    } else if(kind==="waterfall") {
      oval(ctx,0,0,67,20,"#398a9b","#90e5e7",4);
      for(let i=-2;i<=2;i++){
        ctx.beginPath();ctx.moveTo(i*17,-76);ctx.bezierCurveTo(i*17-4,-36,i*17+11,-31,i*15,0);
        ctx.strokeStyle=i%2?"#b6f0ee":"#80d5eb";ctx.lineWidth=11;ctx.stroke();
      }
    }
    ctx.restore();
  }
  return Object.freeze({ drawPlayer, drawEnemy, drawObstacleBase, drawObstacle,
    drawShelter, drawStar, drawKey, drawExit, drawHazard, drawLandmark });
});
