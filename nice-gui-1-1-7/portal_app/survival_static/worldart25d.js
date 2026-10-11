/* 2.5D terrain and character art for the Arctic and Pyramid worlds. No images or network. */
(function(root,factory){
  const api=factory(root.SurvivalArt25D);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.SurvivalWorldArt25D=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(R){
  "use strict";
  if(!R)throw Error("render25d.js must load before worldart25d.js");
  const PI=Math.PI,TAU=2*PI;
  const names=Object.freeze({monkey:"원숭이",snake:"뱀",jaguar:"재규어",
    fox:"북극여우",wolf:"북극늑대",seal:"바다표범 도둑",polar_bear:"북극곰",
    scarab:"스카라베",mummy:"미라 전사",anubis:"아누비스 수호병",pharaoh:"파라오의 혼령"});
  function enemyName(kind){return names[kind]||kind;}
  function gradient(c,x,y,x2,y2,colors){const g=c.createLinearGradient(x,y,x2,y2);for(const [p,col] of colors)g.addColorStop(p,col);return g}
  function oval(c,x,y,rx,ry,fill,stroke,lw=1){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
  function line(c,x,y,x2,y2,col,w=3){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.lineCap="round";c.lineWidth=w;c.strokeStyle=col;c.stroke()}
  function poly(c,arr,fill,stroke,w=2){c.beginPath();c.moveTo(arr[0][0],arr[0][1]);for(const a of arr.slice(1))c.lineTo(a[0],a[1]);c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke()}}
  function rect(c,x,y,w,h,r,fill,stroke,width=2){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
  function shadow(c,x,y,rx=30){oval(c,x+5,y+6,rx+8,13,"#1d35414c");oval(c,x,y+2,rx,10,"#2440475c")}
  function drawTrail(c,points,ice,secondary) {
    if (!Array.isArray(points) || points.length < 2) return;
    c.beginPath(); c.moveTo(points[0][0],points[0][1]);
    for (let i=1;i<points.length;i++) {
      const last=points[i-1],next=points[i];
      if (ice) {
        const midX=(last[0]+next[0])/2,midY=(last[1]+next[1])/2;
        c.quadraticCurveTo(midX,midY,next[0],next[1]);
      } else {
        // Sandstone temples have angular, intersecting causeways.
        c.lineTo(next[0],next[1]);
      }
    }
    c.lineCap="round";c.lineJoin="round";
    c.strokeStyle=ice?"#6baec7bb":"#a37b4da8";
    c.lineWidth=secondary?75:117;c.stroke();
    c.strokeStyle=ice?(secondary?"#c7f2f8":"#f8ffff"):(secondary?"#d5ac70":"#f3d294");
    c.lineWidth=secondary?60:95;c.stroke();
    if (!ice) {
      c.setLineDash?.([17,24]);
      c.strokeStyle="#ffe5b45a";c.lineWidth=3;c.stroke();
      c.setLineDash?.([]);
    }
  }
  function drawGround(c,world,camera,time){
    const ice=world.id==="arctic",width=2048,height=1536;
    c.fillStyle=gradient(c,0,0,width,height,ice?
      [[0,"#d9f7fc"],[.42,"#bce9f4"],[1,"#8dbfcd"]]:
      [[0,"#fae0ae"],[.48,"#f0c080"],[1,"#c88b50"]]);
    c.fillRect(0,0,width,height);
    if(ice){
      // Glacial cliffs, blue frozen lake and translucent aurora: no desert-style layout.
      oval(c,1000,1220,480,220,"#8fd2e6","#e5fbff",20);
      oval(c,1000,1220,355,145,"#66b1d299","#e5ffff",8);
      oval(c,990,1190,150,42,"#d9f8f6b9");
      oval(c,490,370,375,260,"#c7f4fa88");
      oval(c,1595,480,305,270,"#7ebed196");
      for(let i=0;i<5;i++){
        const x=i*430-110;
        poly(c,[[x,490],[x+120,215+(i%2)*75],[x+250,490]],
          gradient(c,x,190,x+250,510,[[0,"#f5ffff"],[.6,"#c3ebf6"],[1,"#73adca"]]),
          "#83bdce",5);
      }
      for(let i=0;i<3;i++){
        c.beginPath();c.moveTo(950+i*64,52+i*23);
        c.bezierCurveTo(1300+i*45,135+i*24,1480-i*19,24+i*30,2050,165+i*18);
        c.strokeStyle=["#86ffb43a","#80dbff33","#d2a7ff2f"][i];
        c.lineWidth=24-i*5;c.stroke();
      }
      for(let i=0;i<7;i++) {
        const x=720+i*145;
        line(c,x,1150+(i%3)*24,x+61,1130+(i%2)*26,"#eaffff74",3);
        line(c,x+32,1100+(i%2)*24,x+67,1081+(i%3)*20,"#eaffff88",2);
      }
    } else {
      // Pyramid: long squared stone corridors, tomb chambers and concentric dunes.
      oval(c,280,1050,360,220,"#dcaa6b88");
      oval(c,1800,1250,410,240,"#b7834d55");
      oval(c,620,230,335,205,"#f8e0ad99");
      rect(c,770,925,710,540,25,"#aa825242","#af7c4777",9);
      rect(c,850,1000,540,375,12,"#e6be8480","#f9e3af",5);
      rect(c,90,95,460,380,8,"#b9956277","#ae814e",10);
      for(let i=0;i<4;i++){
        const y=160+i*83;
        line(c,110,y,525,y,"#f6dcaa88",8);
      }
      for(let i=0;i<5;i++){
        const x=220+i*390;
        poly(c,[[x,650],[x+100,500+(i%2)*55],[x+240,655]],"#d6a46b55");
      }
    }
    // World-authored routes replace the old shared start→key→exit silhouette.
    (world.trails||[]).forEach((route,i)=>drawTrail(c,route.points,ice,i>0));
    // Sparse deterministic close-range texture rather than heavy full-world paint.
    const x0=Math.max(0,Math.floor((camera.x-65)/82)),x1=Math.min(26,Math.ceil((camera.x+790)/82));
    const y0=Math.max(0,Math.floor((camera.y-65)/82)),y1=Math.min(20,Math.ceil((camera.y+790)/82));
    for(let yi=y0;yi<=y1;yi++)for(let xi=x0;xi<=x1;xi++){
      const x=xi*82+((yi*23+xi*7)%41),y=yi*82+((xi*17+yi*3)%29);
      if(ice){
        oval(c,x,y,8+(xi%3)*3,2,"#ffffffb8");
        if((xi+yi)%5===0){
          line(c,x-6,y-11,x+6,y-11,"#f8ffffb9",1);
          line(c,x,y-18,x,y-5,"#f8ffffb9",1);
          line(c,x-4,y-16,x+4,y-7,"#f8ffffb9",1);
        }
      } else {
        oval(c,x,y,14,4,"#c993585c");
        if((xi+yi)%5===0){line(c,x-7,y,x+8,y-8,"#946c4966",2);oval(c,x+8,y+5,4,2,"#ad81545c");}
      }
    }
    for(const mark of world.landmarks){
      if(mark.x<camera.x-165||mark.x>camera.x+880||mark.y<camera.y-180||mark.y>camera.y+880)continue;
      drawLandmark(c,mark,time);
      c.font="900 22px system-ui";c.textAlign="center";c.textBaseline="middle";
      c.fillStyle=ice?"#22566c":"#6b4023";
      c.fillText(mark.label,mark.x,mark.y+40);
    }
    c.strokeStyle=ice?"#5a9bae":"#986b45";c.lineWidth=23;c.strokeRect(12,12,width-24,height-24);
  }
  function drawLandmark(c,mark,time){
    const {x,y,kind}=mark;const ice=["station","blizzard","lake","aurora","glacier"].includes(kind);
    c.save();c.translate(x,y);shadow(c,0,0,53);
    if(kind==="station"||kind==="desert_camp"){
      const top=ice?"#db5b5c":"#bd7846";
      poly(c,[[-49,0],[-8,-81],[46,0]],top,ice?"#a7cad7":"#89512c",4);
      poly(c,[[-8,-81],[46,0],[15,0]],ice?"#a13d43":"#96502b");
      oval(c,0,-10,11,13,"#443a36");
    }else if(kind==="blizzard"||kind==="aurora"){
      const g=gradient(c,-60,-92,60,-5,[[0,ice?"#9df6dc":"#eec78a"],[1,ice?"#66b7d7":"#ca8a45"]]);
      for(let i=-2;i<=2;i++){poly(c,[[i*24,-8],[i*24+8,-95+(i%2)*20],[i*24+22,-8]],g,"#72aaba",2);}
      oval(c,0,-78,8,6,"#f7ffff");
    }else if(kind==="lake"){oval(c,0,-10,66,27,"#75c9dd","#e9ffff",5);for(let i=0;i<4;i++)line(c,-40+i*23,-9,-21+i*23,-17,"#e7ffff",3);}
    else if(kind==="glacier"){poly(c,[[-55,2],[-40,-65],[-9,-35],[18,-90],[55,0]],"#b1ddea","#5c9fb5",5);}
    else if(kind==="pyramid"){poly(c,[[-62,4],[0,-108],[66,4]],gradient(c,-50,-90,70,0,[[0,"#e8bd74"],[1,"#a96f41"]]),"#87613e",4);poly(c,[[0,-108],[66,4],[0,4]],"#a9804b");}
    else if(kind==="sphinx"){oval(c,0,-17,48,18,"#b99259");rect(c,-18,-64,36,50,8,"#d6ab72","#8f7049",4);oval(c,0,-70,22,21,"#dfbf85");}
    else if(kind==="obelisk"){poly(c,[[-18,2],[-18,-100],[0,-127],[18,-100],[18,2]],"#bf985f","#846443",4);line(c,-11,-72,11,-72,"#e3c68c",5);}
    else {for(let i=0;i<3;i++)oval(c,i*36-35,-20+Math.sin(i)*12,43,14,"#d6a96f99");}
    c.restore();
  }
  function drawObstacleBase(c,r){
    oval(c,r.x+r.w/2,r.y+r.h/2+10,r.w*.58,r.h*.64,"#3e53524c");
    rect(c,r.x,r.y,r.w,r.h,12,"#455c6266");
  }
  function drawObstacle(c,r,index){
    const ice=(index>=0&&windowTheme==="arctic"); // set by drawGround for this game frame
    const x=r.x,y=r.y,w=r.w,h=r.h;
    if(ice){
      const pieces=Math.min(7,Math.max(2,Math.ceil(w/48)));
      for(let i=0;i<pieces;i++){
        const px=x+(i+.5)*w/pieces,py=y+h-8+(i%2)*4;
        shadow(c,px,py,18);
        const tall=55+(i*13+index*7)%45;
        poly(c,[[px-25,py-3],[px-14,py-tall*.63],[px,py-tall],[px+23,py-5]],
          gradient(c,px-28,py-tall,px+22,py,[[0,"#faffff"],[.58,"#b2e5f5"],[1,"#70b7d1"]]),"#71afc6",2);
        line(c,px-7,py-tall*.8,px-11,py-18,"#f9ffffbb",3);
      }
    }else{
      const rows=Math.min(4,Math.max(1,Math.ceil(h/34)));
      const cols=Math.min(6,Math.max(2,Math.ceil(w/48)));
      for(let yy=0;yy<rows;yy++)for(let xx=0;xx<cols;xx++){
        const px=x+xx*w/cols,py=y+yy*h/rows;
        rect(c,px+1,py+1,w/cols-3,h/rows-3,4,
          gradient(c,px,py,px+w/cols,py+h/rows,[[0,"#efc995"],[1,"#ae804d"]]),
          "#9e754c",2);
      }
      line(c,x+4,y+4,x+w-7,y+4,"#fff0b977",2);
    }
  }
  let windowTheme="arctic";
  function drawShelter(c,s,occupied,remaining,time){
    const {x,y,kind}=s;c.save();shadow(c,x,y,37);
    if(kind==="snowbank"){
      oval(c,x,y-12,49,32,gradient(c,x-45,y-40,x+44,y,[[0,"#fcffff"],[1,"#b3dce9"]]),"#82bed4",3);
      oval(c,x,y-15,22,10,"#4b889b");oval(c,x,y-22,31,15,"#f4ffff");
    }else if(kind==="igloo"){
      oval(c,x,y-27,49,40,gradient(c,x-46,y-65,x+44,y,[[0,"#faffff"],[1,"#b9d9e8"]]),"#74a7bf",3);
      for(let i=-1;i<=1;i++)line(c,x-42,y-28+i*13,x+42,y-28+i*13,"#91bfcb",2);
      oval(c,x,y-13,19,23,"#486978","#e9ffff",3);
      oval(c,x,y-8,11,13,"#274856");
    }else if(kind==="ice_cave"){
      poly(c,[[x-48,y],[x-40,y-48],[x-18,y-76],[x+14,y-83],[x+46,y-40],[x+49,y]],
        gradient(c,x-45,y-82,x+50,y+8,[[0,"#f8ffff"],[1,"#69b2d0"]]),"#5b9ab5",4);
      oval(c,x,y-9,26,43,"#21546b","#e2f6ff",3);
    }else if(kind==="jar"){
      oval(c,x,y-15,37,35,gradient(c,x-32,y-49,x+39,y,[[0,"#ecba7b"],[1,"#986039"]]),"#7e5536",3);
      rect(c,x-25,y-55,50,17,5,"#ba8950","#805431",3);
      oval(c,x,y-56,23,6,"#5c442e","#e5bb7a",2);
      line(c,x-30,y-24,x+30,y-24,"#f2d49a",3);
    }else if(kind==="sarcophagus"){
      rect(c,x-39,y-62,78,63,8,gradient(c,x-38,y-65,x+42,y+2,[[0,"#d5a96b"],[1,"#895d3b"]]),"#694b2e",4);
      rect(c,x-34,y-69,68,15,4,"#ecc687","#775536",3);
      oval(c,x,y-38,13,17,"#be995e","#f1d38f",3);
      line(c,x-19,y-18,x+19,y-18,"#dfc183",4);
    }else if(kind==="secret_room"){
      rect(c,x-51,y-73,102,73,4,"#b99566","#70583e",5);
      rect(c,x-29,y-58,60,59,3,"#352c29","#cfad74",4);
      poly(c,[[x-14,y-63],[x+32,y-63],[x+32,y-2],[x-14,y-2]],"#856243","#c2a079",2);
      line(c,x+19,y-30,x+25,y-30,"#e4c590",4);
    }
    oval(c,x,y,s.radius+7,13,null,occupied?"#7affe9":"#fff7b5aa",occupied?5:2);
    if(occupied){
      const fraction=Math.max(0,remaining/s.hideSeconds);
      c.beginPath();c.ellipse(x,y,s.radius+14,18,0,-PI/2,-PI/2+TAU*fraction);
      c.strokeStyle=fraction<.25?"#ffb99c":"#c4ffe0";c.lineWidth=5;c.stroke();
    }
    c.restore();
  }
  function ears(c,shape,color){
    const pointed=shape==="wolf"||shape==="fox"||shape==="anubis";
    if(!pointed)return;
    poly(c,[[-23,-56],[-17,-104],[-2,-69]],color,"#544957",3);
    poly(c,[[3,-70],[19,-105],[28,-57]],color,"#544957",3);
    poly(c,[[-19,-69],[-16,-91],[-10,-70]],"#a77c89");
    poly(c,[[13,-70],[20,-91],[22,-67]],"#a77c89");
  }
  function drawEnemy(c,e,time){
    const {x,y,kind}=e;
    if(kind==="monkey"||kind==="snake"||kind==="jaguar"){R.drawEnemy(c,e,time);return;}
    const arctic=["fox","wolf","seal","polar_bear"].includes(kind);
    const scarab=kind==="scarab",mummy=kind==="mummy",anubis=kind==="anubis",pharaoh=kind==="pharaoh";
    const bob=Math.sin(time*6+x*.02)*3;c.save();shadow(c,x,y,kind==="polar_bear"?34:26);
    c.translate(x,y-bob);
    if(scarab){
      for(let i=-1;i<=1;i++){line(c,-18,-27+i*6,-34,-40+i*10,"#4c6051",5);line(c,18,-27+i*6,34,-40+i*10,"#4c6051",5);}
      oval(c,0,-38,25,32,gradient(c,-20,-65,24,-11,[[0,"#59b2a0"],[1,"#1d5553"]]),"#124c4a",3);
      oval(c,0,-40,3,27,"#b5d6b1");oval(c,-11,-45,6,8,"#c8cb70");oval(c,11,-45,6,8,"#c8cb70");
      oval(c,0,-65,14,10,"#305e5a");oval(c,-6,-65,2.8,3,"#fff4cf");oval(c,6,-65,2.8,3,"#fff4cf");
    }else if(mummy||pharaoh){
      for(const side of [-1,1]){
        line(c,side*9,-22,side*11,-6,10,pharaoh?"#a387bd":"#b6a486");
        line(c,side*17,-52,side*27,-25,9,pharaoh?"#8e70b1":"#d9c9a6");
      }
      rect(c,-20,-67,40,50,11,pharaoh?"#735da3":"#cdbb96",pharaoh?"#e2d69c":"#9e876e",3);
      for(let i=0;i<4;i++)line(c,-18,-56+i*10,18,-61+i*10,pharaoh?"#d5b36d":"#eee0c3",3);
      oval(c,0,-83,21,23,pharaoh?"#b3a0d5":"#dccca8",pharaoh?"#d9c5a2":"#a28b6c",3);
      if(pharaoh){
        poly(c,[[-25,-73],[-21,-112],[21,-112],[25,-73]],"#cba75e","#845f4d",3);
        line(c,-19,-100,19,-100,"#52bfce",5);
        oval(c,0,-113,7,10,"#7ed3bc","#c1f4d0",2);
      }else{
        for(let i=0;i<4;i++)line(c,-16,-94+i*9,17,-91+i*9,"#eee0c6",3);
      }
      oval(c,-8,-82,4,3,pharaoh?"#a0fbff":"#4b3930");
      oval(c,8,-82,4,3,pharaoh?"#a0fbff":"#4b3930");
      if(pharaoh)oval(c,0,-85,35,48,"#d5b4ff13","#a18bdf88",2);
    }else{
      const color=kind==="fox"?"#ecf4e9":kind==="wolf"?"#b9cdd2":
        kind==="seal"?"#7ba8b6":kind==="polar_bear"?"#fffdf0":"#2a303b";
      const outline=arctic?"#607f8b":"#48414d";
      if(kind==="seal"){
        oval(c,0,-26,30,18,color,outline,2);
        oval(c,5,-49,24,20,"#a4c7d1",outline,2);
        oval(c,-10,-51,3,4,"#21383f");oval(c,17,-51,3,4,"#21383f");
        oval(c,5,-40,7,5,"#344c54");
        oval(c,-28,-15,13,7,"#6e9baa");oval(c,26,-15,13,7,"#6e9baa");
      }else{
        const big=kind==="polar_bear"?1.24:1;
        for(const side of [-1,1]){
          line(c,side*14*big,-25,side*15*big,-6,11*big,color);
        }
        oval(c,0,-34*big,26*big,24*big,color,outline,2.5);
        if(kind==="polar_bear"){
          oval(c,-18,-75,10,9,color,outline,2);oval(c,18,-75,10,9,color,outline,2);
        }else{
          ears(c,kind,color);
          if(kind==="fox"){
            poly(c,[[-26,-40],[-43,-27],[-28,-19]],"#f9ffff",outline,2);
            oval(c,13,-39,15,12,"#d9ebde");
          }
        }
        oval(c,0,-59*big,23*big,22*big,
          gradient(c,-18,-79*big,18,-40*big,[[0,"#fffef7"],[1,color]]),outline,2.5);
        oval(c,-8,-63*big,3.4,4,"#27414a");oval(c,8,-63*big,3.4,4,"#27414a");
        oval(c,0,-52*big,9,6,"#e5eef0");oval(c,0,-56*big,4.5,4,"#334047");
      }
    }
    if(kind==="wolf"||kind==="anubis"){
      if(anubis){oval(c,0,-41,21,27,"#2c303d","#6d5c54",3);ears(c,kind,"#252e3e");oval(c,0,-62,22,22,"#292b3d");oval(c,-8,-63,3,4,"#d9c172");oval(c,8,-63,3,4,"#d9c172");rect(c,-21,-33,43,13,3,"#c9a15b","#755233",2);}
    }
    c.restore();
  }
  function drawHazard(c,h,phase,time){
    oval(c,h.x,h.y,h.radius+5,19,phase==="active"?"#e5645f77":phase==="warning"?"#ffa44788":
      windowTheme==="arctic"?"#b5ebf133":"#d9a65b44",
      phase==="active"?"#ff6a5e":"#fff0c1",phase==="idle"?2:5);
    if(phase!=="idle"){
      c.save();c.translate(h.x,h.y-15);
      if(windowTheme==="arctic")poly(c,[[-11,13],[-3,-37],[14,15]],"#e6ffff","#72b8ca",3);
      else{rect(c,-17,-25,34,25,5,"#aa8054","#795333",3);line(c,-17,-25,17,-25,"#f4ddb1",4);}
      c.restore();
    }
  }
  function drawExit(c,p,open,time){
    const x=p.x,y=p.y;c.save();shadow(c,x,y,52);
    if(windowTheme==="arctic"){
      poly(c,[[x-52,y],[x-40,y-100],[x-22,y-112],[x+14,y-112],[x+51,y]],
        "#d9f4fb","#74b5d2",5);
      oval(c,x,y-37,31,46,open?"#92eadd":"#345c7a","#eaffff",4);
      if(open)oval(c,x,y-38,14,29,"#d7ffffb0");
    }else{
      poly(c,[[x-58,y],[x-48,y-108],[x,y-133],[x+48,y-108],[x+58,y]],
        "#d2a66b","#8f6844",5);
      rect(c,x-29,y-82,58,82,9,open?"#5ee3cb":"#49372d","#dfc28f",5);
      line(c,x-36,y-99,x+35,y-99,"#ffe8aa",5);
      if(open)oval(c,x,y-45,15,29,"#b7ffec99");
    }
    c.restore();
  }
  function drawKey(c,p,time){
    R.drawKey(c,p,time);
    oval(c,p.x,p.y-68,12,5,windowTheme==="arctic"?"#baffef77":"#f9ce8f77");
  }
  function drawStar(c,x,y,time){R.drawStar(c,x,y,time)}
  function setTheme(id){windowTheme=id==="arctic"?"arctic":"pyramid";}
  return Object.freeze({drawGround:(c,w,camera,time)=>{setTheme(w.id);drawGround(c,w,camera,time)},
    drawLandmark,drawObstacleBase,drawObstacle,drawShelter,drawEnemy,drawHazard,drawExit,drawKey,drawStar,enemyName});
});