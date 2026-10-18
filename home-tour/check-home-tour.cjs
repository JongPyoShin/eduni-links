const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'inline tour script exists');
new vm.Script(inline);

function arraySource(name) {
  const match = html.match(new RegExp(`var ${name}=(\\[[\\s\\S]*?\\n\\];)`));
  assert.ok(match, `${name} coordinate array exists`);
  return `${name}=${match[1]}`;
}

const context = vm.createContext({ Math });
vm.runInContext(`${arraySource('floor')};${arraySource('W')};`, context);
assert.equal(context.floor.length, 18);
assert.equal(context.W.length, 42);
assert.equal((html.match(/\['(?:전체|현관|거실|주방|안방|침실 2|침실 3|욕실 1|욕실 2|앞 발코니|뒷 발코니)'/g) || []).length, 11);
assert.match(html, /if\(!window\.THREE\|\|!camera\|\|contextLost\)return/, 'room navigation stays usable in the 2D fallback');
assert.match(html, /else movePlayer\(\.3\)/, 'walk zoom-in uses collision-aware movement');
assert.match(html, /else movePlayer\(-\.3\)/, 'walk zoom-out uses collision-aware movement');
assert.match(html, /new THREE\.Group\(\)/, 'window rails are assembled in local coordinates');
assert.match(html, /windowFrames\.forEach\(function\(o\)\{o\.scale\.y=mode==='orbit'\?\.49:1\}\)/, 'window frames follow overview wall height');
assert.match(html, /h1\{[^}]*color:#f5f1e8/, 'sidebar heading contrasts with its dark background');
assert.match(html, /function chair\(/, 'dining area has detailed seating');

const collisionFns = html.match(/function inFloor\([\s\S]*?\nfunction blocked\([\s\S]*?\n/)[0];
vm.runInContext(collisionFns, context);
assert.equal(vm.runInContext('blocked(2.7, 8.5)', context), false);
assert.equal(vm.runInContext('blocked(3.2, 8.5)', context), true);

const moveFn = html.match(/function movePlayer\(step\)[^\n]*/)?.[0];
assert.ok(moveFn, 'shared collision-aware movement function exists');
context.walkPos = { x: 2.7, z: 8.5 };
context.walkYaw = Math.PI / 2;
vm.runInContext(moveFn, context);
vm.runInContext('movePlayer(0.3)', context);
assert.equal(context.walkPos.x, 2.7, 'zoom movement cannot cross a wall');
assert.match(html, /o\.position\.y=o\.userData\.height\*o\.scale\.y\/2\}/, 'cut walls keep their base on the floor');
console.log('home-tour check: PASS (syntax, plan geometry, wall collision, wall cut height)');

// Execute navigation with no WebGL, including the selected UI and modal close.
const nav = html.match(/function showRoom\(i\)[^\n]*/)[0];
let updates = 0, closes = 0;
Object.assign(context, {rooms: Array(11), window: {}, camera: null,
  selectUI: () => updates++, closeMap: () => closes++, clearKeys: () => {}});
vm.runInContext(nav, context);
vm.runInContext('showRoom(4)', context);
assert.equal(context.selected, 4);
assert.equal(updates, 1);
assert.equal(closes, 1);

// Every separate entry viewpoint must stand on the floor and clear a wall.
const views = html.match(/var viewpoints=(\[[^\n]*);/)[1];
context.viewpoints = vm.runInContext(views, context);
for (const v of context.viewpoints.slice(1)) assert.equal(context.blocked(v[0], v[1]), false, `blocked room entry ${v}`);
console.log('home-tour navigation: PASS (no-WebGL fallback and all 10 room entries)');
