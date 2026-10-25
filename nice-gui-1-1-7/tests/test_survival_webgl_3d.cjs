"use strict";
/* Focused WebGL adapter regression test: mocks only Three API / DOM.
   This does not claim actual mobile GPU pixel or FPS acceptance. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const test=require("node:test");
const source=fs.readFileSync(path.join(__dirname,"../portal_app/survival_static/survival3d.module.js"),"utf8");
const logic=require("../portal_app/survival_static/logic.js");
const Worlds=require("../portal_app/survival_static/worlds.js");

class Vec {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new Vec(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class Obj {
  constructor(){
    this.position=new Vec();this.rotation={x:0,y:0,z:0};
    this.scale={x:1,y:1,z:1,setScalar(n){this.x=this.y=this.z=n;}};
    this.children=[];this.visible=true;
  }
  add(v){this.children.push(v);}
  remove(v){this.children=this.children.filter(x=>x!==v);}
  traverse(f){f(this);for(const x of this.children)x.traverse(f);}
}
class Geometry{rotateX(){return this;}dispose(){}}
class Material{constructor(x){this.color=x.color;}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;}}
class Renderer {
  constructor(){
    this.domElement={style:{},hidden:false,events:{},setAttribute(){},
      addEventListener(name,cb){this.events[name]=cb;}};
    this.frames=0;
  }
  setPixelRatio(){}setSize(w,h){this.width=w;this.height=h;}
  render(){this.frames++;}
}
function fixture(webgl=true){
  const cameraRef={current:null};
  const groundPlanes=[];
  class Camera extends Obj{
    constructor(){super();cameraRef.current=this;}
    updateProjectionMatrix(){}
    lookAt(x,y,z){this.target=new Vec(x,y,z);}
  }
  const T={Vector3:Vec,Mesh,MeshStandardMaterial:Material,Group:Obj,Scene:Obj,
    Color:class{constructor(v){this.value=v;}},Fog:class{},
    HemisphereLight:Obj,DirectionalLight:Obj,OrthographicCamera:Camera,
    WebGLRenderer:Renderer,SRGBColorSpace:"SRGB",ACESFilmicToneMapping:"ACES"};
  for(const name of ["BoxGeometry","ConeGeometry","SphereGeometry","CylinderGeometry",
    "PlaneGeometry","IcosahedronGeometry","TorusGeometry","OctahedronGeometry","RingGeometry"]){
    T[name]=Geometry;
  }
  T.PlaneGeometry=class extends Geometry{
    constructor(width,height){super();groundPlanes.push({width,height});}
  };
  const toggle={disabled:true,textContent:"2D",events:{},
    setAttribute(k,v){this[k]=v;},addEventListener(k,f){this.events[k]=f;}};
  const stage={clientWidth:390,clientHeight:640,children:[],appendChild(v){this.children.push(v);}};
  const canvas={parentElement:stage,style:{}};
  const document={
    getElementById(id){return id==="gameCanvas"?canvas:id==="graphicsToggle"?toggle:null;},
    createElement(){return {getContext(t){return webgl&&t==="webgl2"?{}:null;}};}
  };
  const window={devicePixelRatio:2};
  const warnings=[];
  const plain=source.replace(/import\s+\*\s+as\s+THREE\s+from\s+["'][^"']+["'];/,"");
  assert.notEqual(plain,source,"Three import source must be present");
  new Function("THREE","window","document","console",plain)(
    T,window,document,{warn:(...items)=>warnings.push(items.join(" "))});
  return {window,canvas,stage,toggle,warnings,camera:cameraRef.current,groundPlanes};
}
function gameState(id){
  const world=Worlds.getWorld(id);
  return {
    world,character:"explorer",player:{...world.start},
    enemies:world.enemies.map(e=>({...e})),jaguar:null,
    stars:world.stars.map(s=>({...s,collected:false})),
    shelters:world.shelters.map(s=>({...s,status:"available"})),
    keyCollected:false,moving:true,walkPhase:1,seconds:2,facing:"right",
    hiding:null,invulnerable:0,
    camera:{x:Math.max(0,world.start.x-345),y:Math.max(0,world.start.y-565)}
  };
}
test("WebGL availability, 3 real-mesh worlds and player state transitions",()=>{
  const {window,stage,warnings}=fixture(),api=window.SurvivalThreeD;
  assert.equal(api.ready,true);
  assert.equal(stage.children.length,1);
  for(const id of Worlds.worldIds()){
    const state=gameState(id),view={viewW:690,viewH:1130};
    assert.equal(api.render(state,view),true,id);
    state.keyCollected=true;state.stars[0].collected=true;
    state.shelters[0].status="used";state.jaguar={...state.world.boss};
    state.character="bunny";state.player.x+=25;state.seconds+=3;
    assert.equal(api.render(state,view),true,id+" state/character transition");
  }
  assert.deepEqual(warnings,[]);
});
test("WebGL camera uses a roughly 45-degree elevated pitch across all worlds",()=>{
  const {window,camera}=fixture();
  const api=window.SurvivalThreeD;
  assert.equal(api.ready,true);
  assert.ok(camera,"fixture must construct a camera");
  for(const id of Worlds.worldIds()){
    assert.equal(api.render(gameState(id),{viewW:690,viewH:1130}),true,id);
    const rise=camera.position.y-camera.target.y;
    const run=Math.hypot(camera.position.x-camera.target.x,camera.position.z-camera.target.z);
    const pitch=Math.atan2(rise,run)*180/Math.PI;
    assert.ok(Math.abs(pitch-45)<0.1,`${id} camera pitch was ${pitch.toFixed(2)}°`);
  }
});
test("portrait 45-degree view stays covered by ground at both world edges",()=>{
  const {window,groundPlanes}=fixture();
  const api=window.SurvivalThreeD,worldHeight=logic.WORLD_HEIGHT,viewH=1300,pitch=Math.PI/4;
  const halfDepth=viewH/(2*Math.sin(pitch));
  const firstCenter=viewH/2,lastCenter=worldHeight-viewH/2;
  assert.equal(api.ready,true);
  for(const id of Worlds.worldIds()){
    assert.equal(api.render(gameState(id),{viewW:600,viewH}),true,id);
    const plane=groundPlanes.at(-1),floorHeight=plane.height*48;
    const start=(worldHeight-floorHeight)/2,end=start+floorHeight;
    assert.ok(start<=firstCenter-halfDepth,`${id} floor starts after the portrait view`);
    assert.ok(end>=lastCenter+halfDepth,`${id} floor ends before the portrait view`);
  }
});
test("graphics toggle and WebGL context loss fall back to original Canvas",()=>{
  const {window,canvas,toggle,stage}=fixture(),api=window.SurvivalThreeD;
  assert.equal(canvas.style.visibility,"hidden");
  toggle.events.click();assert.equal(api.ready,false);
  assert.equal(canvas.style.visibility,"visible");
  toggle.events.click();assert.equal(api.ready,true);
  let prevented=false;
  stage.children[0].events.webglcontextlost({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(api.ready,false);
  assert.equal(canvas.style.visibility,"visible");
  assert.equal(toggle.disabled,true);
});
test("WebGL2 unsupported: default to 2D and do not create a renderer",()=>{
  const {window,canvas,toggle,stage}=fixture(false);
  assert.equal(window.SurvivalThreeD.ready,false);
  assert.equal(canvas.style.visibility,undefined);
  assert.equal(toggle.disabled,true);
  assert.equal(stage.children.length,0);
});
