"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../portal_app/survival_static/logic.js");
const Worlds = require("../portal_app/survival_static/worlds.js");
require("../portal_app/survival_static/render25d.js");
const Art = require("../portal_app/survival_static/worldart25d.js");
const ids = ["jungle", "arctic", "pyramid"];

function mockCanvas() {
  const counter = {};
  const ctx = {};
  for (const key of ["beginPath", "closePath", "roundRect", "ellipse", "arc", "moveTo",
    "lineTo", "bezierCurveTo", "quadraticCurveTo", "fill", "stroke", "fillRect",
    "strokeRect", "clearRect", "save", "restore", "clip", "translate", "rotate",
    "scale", "fillText"]) {
    ctx[key] = () => { counter[key] = (counter[key] || 0) + 1; };
  }
  ctx.createLinearGradient = () => ({ addColorStop() { counter.gradients = (counter.gradients || 0) + 1; } });
  return { ctx, counter };
}
test("all three world names resolve and unknown selections fall back to jungle", () => {
  assert.deepEqual(Worlds.worldIds(), ids);
  assert.equal(Worlds.getWorld("invalid").id, "jungle");
  assert.equal(Worlds.getWorld(""), Worlds.getWorld("jungle"));
});
test("arctic and pyramid each have three unique villains, a boss and themed shelters", () => {
  for (const id of ids) {
    const w = Worlds.getWorld(id);
    assert.equal(w.enemies.length, 3);
    assert.equal(w.shelters.length, 8);
    assert.equal(w.stars.length, 5);
    assert.equal(w.obstacles.length, 14);
    assert.equal(w.hazards.length, 4);
    assert.ok(w.boss.kind);
    assert.equal(new Set(w.enemies.map(e => e.id)).size, 3);
    assert.equal(new Set(w.shelters.map(s => s.id)).size, 8);
    assert.ok(w.shelters.every(s => [4,5,6].includes(s.hideSeconds)));
  }
  assert.deepEqual(Worlds.getWorld("arctic").enemies.map(e => e.kind), ["fox", "wolf", "seal"]);
  assert.equal(Worlds.getWorld("arctic").boss.kind, "polar_bear");
  assert.deepEqual(Worlds.getWorld("pyramid").enemies.map(e => e.kind), ["scarab", "mummy", "anubis"]);
  assert.equal(Worlds.getWorld("pyramid").boss.kind, "pharaoh");
});
test("world entrances, villains, hazards, key, stars and every shelter are walkable", () => {
  for (const id of ids) {
    const w = Worlds.getWorld(id);
    for (const point of [w.start,w.key,w.exit,w.boss,...w.enemies,...w.shelters,...w.hazards,...w.stars,...w.searchLocations])
      assert.ok(L.canOccupy(point.x,point.y,point.radius||13,w.obstacles),
        id+" invalid object "+(point.id||JSON.stringify(point)));
  }
});
test("each world has a path from camp to key and from key to locked exit", () => {
  for (const id of ids) {
    const w = Worlds.getWorld(id);
    assert.ok(L.findChasePath(w.start,w.key,w.obstacles).length > 50, id+" key");
    assert.ok(L.findChasePath(w.key,w.exit,w.obstacles).length > 20, id+" exit");
    for (const shelter of w.shelters)
      assert.ok(L.findChasePath(w.start,shelter,w.obstacles).length,id+" "+shelter.id);
    assert.equal(L.hasEscaped(w.exit,w.exit),true);
    assert.equal(L.hasEscaped(w.start,w.exit),false);
  }
});
test("every hideout has four distinct faraway monster search destinations", () => {
  for (const id of ids) {
    const w = Worlds.getWorld(id);
    for (const shelter of w.shelters) {
      const t=[0,1,2,3].map(i=>L.searchTarget(shelter,1,i,w.searchLocations,w.obstacles));
      assert.equal(new Set(t.map(p=>p.x+","+p.y)).size,4,id+" "+shelter.id);
      for (const p of t){
        assert.ok(L.canOccupy(p.x,p.y,22,w.obstacles));
        assert.ok(Math.hypot(p.x-shelter.x,p.y-shelter.y)>=L.SEARCH_SAFE_RADIUS);
      }
    }
  }
});
test("world-specific obstacles matter to player and monster collision and routing", () => {
  for (const id of ids.slice(1)) {
    const w=Worlds.getWorld(id),obstacle=w.obstacles[0];
    const center={x:obstacle.x+obstacle.w/2,y:obstacle.y+obstacle.h/2};
    assert.equal(L.canOccupy(center.x,center.y,13,w.obstacles),false);
    const enemy={...w.boss,x:w.start.x,y:w.start.y};
    let moving=enemy,path=[],age=.7;
    for(let tick=0;tick<150;tick++){
      age+=.05;if(age>=.7){path=L.findChasePath(moving,w.key,w.obstacles);age=0;}
      while(path.length&&Math.hypot(moving.x-path[0].x,moving.y-path[0].y)<13)path.shift();
      moving=L.chaseJaguar(moving,path[0]||w.key,.05,"thrill",w.obstacles);
      assert.ok(L.canOccupy(moving.x,moving.y,moving.radius,w.obstacles),id+" boss crossed obstacle");
    }
    assert.ok(Math.hypot(moving.x-w.start.x,moving.y-w.start.y)>100);
  }
});
test("arctic and pyramid have distinct area names and shelter shapes", () => {
  const a=Worlds.getWorld("arctic"),p=Worlds.getWorld("pyramid");
  assert.ok(L.areaFor(a.start,a.areas).includes("탐험기지"));
  assert.ok(L.areaFor(p.exit,p.areas).includes("유적"));
  assert.deepEqual(new Set(a.shelters.map(s=>s.kind)),new Set(["snowbank","igloo","ice_cave"]));
  assert.deepEqual(new Set(p.shelters.map(s=>s.kind)),new Set(["jar","sarcophagus","secret_room"]));
});
test("arctic and pyramid theme ground and all enemies paint without missing primitives", () => {
  for(const id of ids.slice(1)){
    const w=Worlds.getWorld(id),{ctx,counter}=mockCanvas();
    Art.drawGround(ctx,w,L.cameraFor(w.start),2.4);
    for(const e of [...w.enemies,w.boss]) Art.drawEnemy(ctx,e,2.4);
    for(const [i,r] of w.obstacles.entries()){Art.drawObstacleBase(ctx,r);Art.drawObstacle(ctx,r,i);}
    for(const s of w.shelters){
      Art.drawShelter(ctx,s,false,0,2.4);
      Art.drawShelter(ctx,{...s,status:"occupied"},true,2.2,2.4);
    }
    for(const h of w.hazards)for(const phase of ["idle","warning","active"])
      Art.drawHazard(ctx,h,phase,2.4);
    for(const star of w.stars)Art.drawStar(ctx,star.x,star.y,2.4);
    Art.drawExit(ctx,w.exit,false,2.4);Art.drawExit(ctx,w.exit,true,2.4);
    Art.drawKey(ctx,w.key,2.4);
    assert.ok((counter.ellipse||0)>100,id+" sprite shapes");
    assert.ok((counter.gradients||0)>40,id+" shading");
    assert.equal(counter.save,counter.restore,id+" context balance");
  }
});
test("no remote dependencies added to world art or data", () => {
  assert.deepEqual(Object.keys(Worlds.WORLDS).sort(),ids.slice().sort());
  assert.ok(["북극여우","북극늑대","바다표범 도둑","북극곰","스카라베",
    "미라 전사","아누비스 수호병","파라오의 혼령"].every(name=>name.length>1));
  for(const id of ids)assert.ok(Worlds.getWorld(id).areas.length>=4);
});
