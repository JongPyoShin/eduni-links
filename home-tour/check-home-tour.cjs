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
assert.match(html, /var sharedPlan=\[\[-4\.05,-2\.55,-\.35,2\.5\]/, 'common core is separate from the apartment floor arrays');
assert.match(html, /var liftBays=\[-2\.72\],liftWidth=1\.34,liftDepth=1\.5,liftBack=3\.12;/, 'one illustrative elevator bay matches the source reference');
assert.equal((html.match(/liftBays\.forEach/g) || []).length, 2, '2D and 3D use the same elevator-bay definition');
assert.match(html, /sharedCoreGroup\.visible=mode==='orbit'/, 'shared core is overview-only');
assert.match(html, /var oak=oakTexture\(false\),lightOak=oakTexture\(true\),porcelain=tileTexture\(\)/, 'dark chocolate wood is the default finish');
assert.doesNotMatch(html.match(/var tileFloors=\{[^}]*\}/)[0], /(?:^|,)(?:7|8|9):1(?:,|\})/, 'kitchen and dining floors keep the wood finish');
assert.match(html, /0xd4d7d9/, 'open interior doors use a light-gray finish');
assert.match(html, /box\(5\.13,\.995,2\.25,5\.48,1\.015,2\.65,0xf7f8f5\)/, 'kitchen sink basin is white');
assert.match(html, /hemi\.intensity=evening\?\.48:\.9;light\.intensity=evening\?\.65:1\.8;light\.color\.setHex\(evening\?0xffb879:0xfff2df\)/, 'day lighting returns to its original levels');
assert.match(html, /ground\.visible=!evening/, 'the pale overview ground does not mask the evening background');

const collisionFns = html.match(/function inFloor\([\s\S]*?\nfunction blocked\([\s\S]*?\n/)[0];
vm.runInContext(collisionFns, context);
assert.equal(vm.runInContext('blocked(2.7, 8.5)', context), false);
assert.equal(vm.runInContext('blocked(3.2, 8.5)', context), true);
assert.equal(vm.runInContext('blocked(-2, 0)', context), true, 'illustrative common stairs remain outside unit walk bounds');

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
const bath2 = context.viewpoints[8];
assert.ok(bath2[0] < 10.92 - .22 || bath2[0] > 11.64 + .22 || bath2[1] < 5.03 - .22 || bath2[1] > 5.41 + .22, 'bathroom 2 entry stays clear of the vanity footprint');
console.log('home-tour navigation: PASS (no-WebGL fallback and all 10 room entries)');
