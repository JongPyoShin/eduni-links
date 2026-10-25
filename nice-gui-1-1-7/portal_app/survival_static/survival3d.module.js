/* EDUNI Survival v1.1: real Three.js WebGL meshes with Canvas 2D fallback.
   Geometry is rendered in 3D; legacy SurvivalLogic remains authoritative.
   No personal data, model generation, physics duplication or textures. */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js";

const PX=48, W=2048, H=1536, GROUND_MARGIN=320, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const canvas=document.getElementById("gameCanvas");
const stage=canvas?.parentElement;
const toggle=document.getElementById("graphicsToggle");
const RAD=Math.PI/180;
let scene,renderer,camera,worldGroup,dynamicGroup,lit,activeWorld=null;
let player,enemyMeshes=new Map(),starMeshes=new Map(),shelterMeshes=new Map();
let key,exit,frameSize="",enabled=true,available=false;
const materials=new Map();
const palettes={
  jungle:{floor:0x4b9b69,ground:0x377d5a,trim:0x81c77d,wall:0x235f4e,accent:0xffe092,fog:0xc0d3a4},
  arctic:{floor:0xc3e6ee,ground:0xa0d3e1,trim:0xeafff8,wall:0x6ba4bb,accent:0x8ce6ff,fog:0xd2f2f4},
  pyramid:{floor:0xe4bc7e,ground:0xd4a76b,trim:0xffdeb0,wall:0xad7d4c,accent:0xffdc73,fog:0xf6d6ac},
};
const pos=(x,y,h=0)=>new THREE.Vector3(x/PX,h,y/PX);
function mat(color,rough=.88){
  const id=String(color)+"|"+rough;
  if(!materials.has(id))materials.set(id,new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0}));
  return materials.get(id);
}
function mesh(geometry,color,position,parent,rough=.86){
  const part=new THREE.Mesh(geometry,mat(color,rough));
  if(position)part.position.copy(position);
  (parent||worldGroup).add(part);
  return part;
}
const BOX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
const CONE=(r,h,n=7)=>new THREE.ConeGeometry(r,h,n);
const BALL=(r,s=9,t=7)=>new THREE.SphereGeometry(r,s,t);
const CYL=(r,rb,h,n=8)=>new THREE.CylinderGeometry(r,rb,h,n);
function box(parent,x,y,z,w,h,d,color){
  return mesh(BOX(w,h,d),color,new THREE.Vector3(x,y,z),parent);
}
function ball(parent,x,y,z,r,color,sy=1){
  const p=mesh(BALL(r),color,new THREE.Vector3(x,y,z),parent);p.scale.y=sy;return p;
}
function tree(x,y,id,p){
  const g=new THREE.Group();g.position.copy(pos(x,y));worldGroup.add(g);
  const scale=0.8+((id*17)%5)*.10;g.scale.setScalar(scale);
  mesh(CYL(.09,.14,.85,7),0x825833,new THREE.Vector3(0,.39,0),g);
  for(const [dx,dy,dz,rad] of [[0,1.18,0,.60],[-.35,.95,.1,.42],[.34,.97,-.13,.45]]){
    mesh(new THREE.IcosahedronGeometry(rad,0),dy>1?0x51a967:p.trim,new THREE.Vector3(dx,dy,dz),g);
  }
}
function iceberg(x,y,id,p){
  const g=new THREE.Group();g.position.copy(pos(x,y));worldGroup.add(g);
  mesh(CONE(.42+id%3*.12,1.3+id%4*.15,6),p.trim,new THREE.Vector3(0,.6,0),g);
  ball(g,-.28,.15,.15,.3,p.wall,.45);
}
function palm(x,y,id,p){
  const g=new THREE.Group();g.position.copy(pos(x,y));worldGroup.add(g);
  mesh(CYL(.07,.13,1.1,7),0x947044,new THREE.Vector3(0,.57,0),g);
  for(let k=0;k<6;k++){
    const angle=k*Math.PI/3,leaf=mesh(CONE(.28,.9,4),id%3?0x31835a:0x4b9b5c,new THREE.Vector3(Math.cos(angle)*.42,1.14,Math.sin(angle)*.42),g);
    leaf.rotation.z=Math.cos(angle)*.75;leaf.rotation.x=Math.sin(angle)*.75;
  }
}
function makeGround(world,p){
  const geometry=new THREE.PlaneGeometry(W/PX,(H+GROUND_MARGIN*2)/PX);
  geometry.rotateX(-Math.PI/2);
  mesh(geometry,p.floor,pos(W/2,H/2,-.05),worldGroup);
  // Sparse built-in 3D ground features with per-world palette; deterministic.
  for(let i=0;i<115;i++){
    const x=50+(i*331)%1950,y=35+(i*223)%1450;
    const tile=new THREE.Group();tile.position.copy(pos(x,y,.016));worldGroup.add(tile);
    const g=mesh(new THREE.IcosahedronGeometry(.08+i%4*.028,0),
      i%3===0?p.trim:p.ground,new THREE.Vector3(0,0,0),tile);
    g.scale.y=.2;
  }
  for(const trail of world.trails||[]){
    const points=trail.points;
    for(let i=1;i<points.length;i++){
      const [x0,y0]=points[i-1],[x1,y1]=points[i];
      const a=pos(x0,y0,.016),b=pos(x1,y1,.016);
      const len=a.distanceTo(b),mid=a.clone().add(b).multiplyScalar(.5);
      const piece=mesh(BOX(world.id==="arctic"?1.40:1.75,.016,len),world.id==="arctic"?0xf3ffff:0xe8c69a,mid,worldGroup);
      piece.rotation.y=-Math.atan2(b.x-a.x,b.z-a.z);
    }
  }
}
function makeWalls(world,p){
  world.obstacles.forEach((rect,i)=>{
    const x=rect.x/PX,z=rect.y/PX,w=rect.w/PX,d=rect.h/PX;
    // Opaque low wall directly follows the authoritative 2D collision box.
    box(worldGroup,x+w/2,.29,z+d/2,w,.58,d,p.wall);
    box(worldGroup,x+w/2,.62,z+d/2,w,.09,d,p.trim);
    const n=Math.max(1,Math.min(5,Math.floor(Math.max(rect.w,rect.h)/65)));
    for(let j=0;j<n;j++){
      const xx=rect.x+(j+.5)*rect.w/n, yy=rect.y+(j+.5)*rect.h/n;
      if(world.id==="jungle")tree(xx,rect.y+rect.h*.65,i+j,p);
      else if(world.id==="arctic")iceberg(xx,rect.y+rect.h*.65,i+j,p);
      else{
        const group=new THREE.Group();group.position.copy(pos(xx,yy));worldGroup.add(group);
        mesh(CYL(.25,.31,1.25,6),0xcb9b65,new THREE.Vector3(0,.75,0),group);
        box(group,0,1.40,0,.85,.25,.85,0xf0c98d);
      }
    }
  });
  for(const mark of world.landmarks||[]){
    if(world.id==="jungle")palm(mark.x,mark.y,mark.x,p);
    if(world.id==="arctic")iceberg(mark.x,mark.y,mark.y,p);
    if(world.id==="pyramid"){
      const grp=new THREE.Group();grp.position.copy(pos(mark.x,mark.y));worldGroup.add(grp);
      mesh(CONE(.8,1.35,4),0xd6aa71,new THREE.Vector3(0,.68,0),grp).rotation.y=Math.PI/4;
      box(grp,0,.05,0,1.55,.10,1.55,0xa47848);
    }
  }
}
function makePlayer(bunny){
  const grp=new THREE.Group();
  // Family-friendly little explorer, with real volume & lighting.
  const shirt=bunny?0xf8f4dc:0x62aade,skin=bunny?0xf9ede3:0xf4be9f;
  mesh(CYL(.27,.33,.63,9),shirt,new THREE.Vector3(0,.78,0),grp);
  mesh(BOX(.48,.46,.20),bunny?0xb2d9c9:0xb77d4f,new THREE.Vector3(0,.79,-.26),grp);
  for(const x of [-.18,.18]){
    mesh(CYL(.105,.11,.52),0x365472,new THREE.Vector3(x,.3,0),grp);
    ball(grp,x,.09,.10,.15,0x645348,.6);
    ball(grp,x*1.75,.83,0,.145,skin,.75);
  }
  ball(grp,0,1.4,0,.43,skin);
  for(const x of [-.17,.17])ball(grp,x,1.44,.365,.052,0x22333b);
  if(bunny){
    for(const x of [-.23,.23]){
      const ear=mesh(CYL(.115,.16,.61,8),0xfff9f1,new THREE.Vector3(x,2.03,0),grp);
      ear.rotation.z=x>0?-.13:.13;
      ball(grp,x,2.14,.113,.09,0xeaa2b4,1.9);
    }
  }else{
    mesh(CYL(.47,.43,.2,10),0x225e9b,new THREE.Vector3(0,1.77,0),grp);
    box(grp,0,1.70,.29,.55,.07,.26,0x1c5088);
  }
  return grp;
}
function makeEnemy(enemy,world){
  const group=new THREE.Group();
  const big=/bear|jaguar|pharaoh|anubis/.test(enemy.kind);
  const c=world.id==="arctic"?0xe8fbff:world.id==="pyramid"?0x7a536b:0xba7a45;
  const scale=big?1.4:.95;
  group.scale.setScalar(scale);
  ball(group,0,.74,0,.45,c,.85);
  ball(group,0,1.18,.22,.30,c);
  for(const x of [-.25,.25]){
    ball(group,x,.42,.30,.16,c,.8);
    ball(group,x*.55,1.21,.47,.055,0x1f2a35);
    ball(group,x,1.44,.13,.13,c,.85);
  }
  mesh(CONE(.12,.24,5),0xffe7bd,new THREE.Vector3(0,1.10,.55),group).rotation.x=Math.PI/2;
  return group;
}
function makeShelter(s,world,p){
  const g=new THREE.Group();g.position.copy(pos(s.x,s.y));worldGroup.add(g);
  if(world.id==="jungle"){
    ball(g,0,.5,0,.85,0x277a50,.60);
    ball(g,-.45,.53,.24,.6,0x4eae65,.75);
    ball(g,.44,.57,-.16,.56,0x67b768,.72);
  }else if(world.id==="arctic"){
    mesh(new THREE.SphereGeometry(.85,12,7,0,Math.PI*2,0,Math.PI/2),0xb2eaf7,new THREE.Vector3(0,.05,0),g);
    box(g,0,.28,.78,.5,.56,.18,0x477b93);
  }else{
    box(g,0,.4,0,1.4,.8,1.1,0xb98a5d);
    box(g,0,.43,.61,.62,.74,.13,0x3a3343);
    box(g,0,.94,0,1.55,.21,1.23,0xe3ba7d);
  }
  shelterMeshes.set(s.id,g);
}
function makeItems(world,p){
  const ex=new THREE.Group();ex.position.copy(pos(world.exit.x,world.exit.y));worldGroup.add(ex);
  for(const x of [-.55,.55])box(ex,x,.9,0,.22,1.8,.3,p.accent);
  box(ex,0,1.9,0,1.35,.28,.4,p.trim);
  box(ex,0,.75,-.08,.88,1.42,.12,0x1c5450);
  exit=ex;
  key=new THREE.Group();key.position.copy(pos(world.key.x,world.key.y,.28));worldGroup.add(key);
  const hoop=mesh(new THREE.TorusGeometry(.23,.075,7,12),0xffe266,new THREE.Vector3(0,.6,0),key,.40);
  mesh(CYL(.075,.075,.62,8),0xffdc54,new THREE.Vector3(0,.15,0),key,.35);
  for(const y of [-.09,.14])box(key,.12,y,0,.26,.07,.12,0xffdc54);
  world.stars.forEach(star=>{
    const obj=new THREE.Group();obj.position.copy(pos(star.x,star.y,.42));worldGroup.add(obj);
    mesh(new THREE.OctahedronGeometry(.28,0),0xffe37d,new THREE.Vector3(0,.27,0),obj,.32);
    starMeshes.set(star.id||star.x+"-"+star.y,obj);
  });
  world.hazards.forEach(h=>{
    const grp=new THREE.Group();grp.position.copy(pos(h.x,h.y,.07));worldGroup.add(grp);
    const floor=mesh(new THREE.RingGeometry(.22,.49,16),0xe37d5f,new THREE.Vector3(0,0,0),grp);
    floor.rotation.x=-Math.PI/2;
    mesh(CONE(.24,.35,6),0xffc17e,new THREE.Vector3(0,.18,0),grp);
  });
}
function resetWorld(world,bunny){
  if(worldGroup){
    scene.remove(worldGroup);
    worldGroup.traverse(obj=>{ if(obj.geometry)obj.geometry.dispose(); });
  }
  worldGroup=new THREE.Group();scene.add(worldGroup);
  enemyMeshes=new Map();starMeshes=new Map();shelterMeshes=new Map();
  const p=palettes[world.id]||palettes.jungle;
  scene.background=new THREE.Color(p.fog);
  scene.fog=new THREE.Fog(p.fog,14,72);
  makeGround(world,p);makeWalls(world,p);
  world.shelters.forEach(s=>makeShelter(s,world,p));
  makeItems(world,p);
  player=makePlayer(bunny);worldGroup.add(player);
  activeWorld=world.id+":"+(bunny?"bunny":"explorer");
}
function setEnabled(v){
  enabled=Boolean(v)&&available;
  if(renderer)renderer.domElement.hidden=!enabled;
  if(canvas)canvas.style.visibility=enabled?"hidden":"visible";
  if(toggle){toggle.textContent=enabled?"3D ✓":"2D";toggle.setAttribute("aria-label",enabled?"3D 화면 사용 중, 2D로 전환":"2D 화면 사용 중, 3D로 전환");toggle.disabled=!available;}
}
function disable(){
  available=false;setEnabled(false);
  if(toggle)toggle.title="WebGL 미지원 또는 연결 실패: 2D 안전 모드";
}
function init(){
  if(!stage||!canvas)return;
  if(!document.createElement("canvas").getContext("webgl2"))return;
  try{
    renderer=new THREE.WebGLRenderer({alpha:false,antialias:false,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.55;
    renderer.domElement.className="survival-webgl-view";
    renderer.domElement.setAttribute("aria-hidden","true");
    renderer.domElement.style.cssText="position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;";
    stage.appendChild(renderer.domElement);
    renderer.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();disable();});
    scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff9e5,0x466b70,2.2));
    lit=new THREE.DirectionalLight(0xffffff,2.5);lit.position.set(-12,22,9);scene.add(lit);
    camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,170);
    available=true;setEnabled(true);
    if(toggle)toggle.addEventListener("click",()=>setEnabled(!enabled));
  }catch(e){console.warn("Survival 3D unavailable, continuing in Canvas mode",e);disable();}
}
function render(state,view){
  if(!available||!enabled||!state||!view||!state.world)return false;
  try{
    const keyName=state.world.id+":"+(state.character==="bunny"?"bunny":"explorer");
    if(activeWorld!==keyName)resetWorld(state.world,state.character==="bunny");
    const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight),dims=width+"x"+height;
    if(frameSize!==dims){
      renderer.setSize(width,height,false);
      frameSize=dims;
    }
    const fovWidth=view.viewW/PX,fovHeight=view.viewH/PX;
    camera.left=-fovWidth/2;camera.right=fovWidth/2;
    camera.top=fovHeight/2;camera.bottom=-fovHeight/2;
    camera.updateProjectionMatrix();
    const cx=(state.camera.x+view.viewW/2)/PX,cz=(state.camera.y+view.viewH/2)/PX;
    camera.position.set(cx,24,cz+24);
    camera.lookAt(cx,0,cz);
    player.position.copy(pos(state.player.x,state.player.y));
    player.rotation.y=({up:Math.PI,down:0,left:-Math.PI/2,right:Math.PI/2})[state.facing]||0;
    player.position.y=state.moving?Math.abs(Math.sin(state.walkPhase*11))*.10:0;
    player.visible=!state.hiding&&(state.invulnerable<=0||Math.floor(state.seconds*10)%2!==0);
    const activeIds=new Set();
    for(const actor of [...state.enemies,...(state.jaguar?[state.jaguar]:[])]){
      activeIds.add(actor.id);
      let part=enemyMeshes.get(actor.id);
      if(!part){part=makeEnemy(actor,state.world);worldGroup.add(part);enemyMeshes.set(actor.id,part);}
      part.position.copy(pos(actor.x,actor.y));
      part.rotation.y=Math.atan2(state.player.x-actor.x,state.player.y-actor.y);
      part.position.y=Math.sin(state.seconds*5+actor.x)*.05;
    }
    for(const [id,part] of enemyMeshes)part.visible=activeIds.has(id);
    for(const shelter of state.shelters){
      const part=shelterMeshes.get(shelter.id);
      if(part)part.visible=shelter.status!=="used";
    }
    const usedStars=new Set(state.stars.filter(s=>s.collected).map(s=>s.id||s.x+"-"+s.y));
    for(const [id,part] of starMeshes){
      part.visible=!usedStars.has(id);
      part.rotation.y=state.seconds*2;
      part.position.y=.42+Math.sin(state.seconds*4+part.position.x)*.13;
    }
    key.visible=!state.keyCollected;
    key.rotation.y=state.seconds*2.1;
    key.position.y=.28+Math.sin(state.seconds*3)*.15;
    if(exit)exit.scale.setScalar(state.keyCollected?1.06:1);
    renderer.render(scene,camera);
    return true;
  }catch(e){console.warn("Survival WebGL render failed: falling back to 2D",e);disable();return false;}
}
init();
window.SurvivalThreeD=Object.freeze({render,setEnabled,get ready(){return available&&enabled;},get supported(){return available;}});
