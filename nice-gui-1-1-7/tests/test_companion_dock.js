// Focused geometry tests for the shared companion launcher / bottom-dock detector.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const baseline = process.argv.includes('--baseline');
const source = baseline
  ? execFileSync('git', ['show', '375ede9:nice-gui-1-1-7/portal_app/static_games/eduni_companion.js'], {encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname, '../portal_app/static_games/eduni_companion.js'), 'utf8');
const match = source.match(/  const avoidBottomDock = \(\) => \{[\s\S]*?\n  \};/);
assert.ok(match, 'extract the real production dock detector');

function fixture(height, width, docks) {
  let offset = 0;
  const window = {events:{},addEventListener(name,callback){this.events[name]=callback;}};
  const panel = {contains(){return false;}};
  const launch = {getBoundingClientRect(){
    const top=height-14-64-offset;
    return {left:width-14-64,right:width-14,top,bottom:top+64,width:64,height:64};
  }};
  const document = {querySelectorAll(){return docks;},documentElement:{style:{setProperty(_name,value){offset=Number.parseFloat(value);}}}};
  const sandbox = {window,launch,panel,document,getComputedStyle:node=>node.style,innerHeight:height};
  vm.runInNewContext(`${match[0]}\nwindow.runDock=avoidBottomDock;`,sandbox);
  const run=()=>window.runDock();
  return {window,sandbox,run,offset:()=>offset,resize(newHeight){height=newHeight;sandbox.innerHeight=newHeight;run();}};
}

function node(rect, styles={}) {
  return {getBoundingClientRect:()=>rect,style:{position:'fixed',display:'block',visibility:'visible',opacity:'1',...styles}};
}

// This models NiceGUI's visible, empty full-viewport notifications list.
const viewport=fixture(800,390,[node({left:0,right:390,top:0,bottom:800,width:390,height:800})]);
viewport.run();
assert.equal(viewport.offset(),0,'empty full-height fixed container is not a dock');

const bottomDock=node({left:0,right:390,top:740,bottom:800,width:390,height:60});
const valid=fixture(800,390,[bottomDock]);
valid.run();
assert.equal(valid.offset(),72,'visible dock at the bottom offsets the launcher by its height plus gap');
valid.resize(800); valid.resize(800);
assert.equal(valid.offset(),72,'repeated resize passes do not accumulate or oscillate');

for (const styles of [{display:'none'},{visibility:'hidden'},{opacity:'0'}]) {
  const hidden=fixture(800,390,[node({left:0,right:390,top:740,bottom:800,width:390,height:60},styles)]);
  hidden.run();
  assert.equal(hidden.offset(),0,`hidden dock (${JSON.stringify(styles)}) is ignored`);
}
for (const rect of [
  {left:0,right:390,top:801,bottom:850,width:390,height:49},
  {left:0,right:100,top:740,bottom:800,width:100,height:60},
]) {
  const offscreen=fixture(800,390,[node(rect)]);
  offscreen.run();
  assert.equal(offscreen.offset(),0,'offscreen or non-overlapping node is ignored');
}

const landscapeDock=node({left:500,right:640,top:300,bottom:360,width:140,height:60});
const landscape=fixture(360,640,[landscapeDock]);
landscape.run();
const landscapeTop=360-14-64-landscape.offset();
assert.ok(landscape.offset()>0,'small landscape bottom dock remains supported');
assert.ok(landscapeTop>=0,'launcher remains on-screen after dock offset');
assert.ok(landscapeTop+64<=300,'launcher clears the dock');

console.log(`PASS: ${baseline?'baseline extraction ':' '}dock geometry`);
