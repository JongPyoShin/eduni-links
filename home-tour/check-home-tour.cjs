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
assert.equal(context.W.length, 45);
for (let i = 0; i < context.floor.length; i++) for (let j = i + 1; j < context.floor.length; j++) {
  const a = context.floor[i], b = context.floor[j];
  const overlap = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  assert.ok(overlap < 1e-9, `floor slabs ${i} and ${j} do not overlap`);
}
assert.ok(context.floor.some(f => f[0] === 0 && f[2] === 3) && context.floor.some(f => f[0] === 3 && f[2] === 7.8) && context.floor.some(f => f[0] === 7.8 && f[2] === 12), 'floor follows the 12m = 3m + 4.8m + 4.2m chain');
assert.ok(context.W.some(w => w[0] === 3 && w[2] === 3) && context.W.some(w => w[0] === 7.8 && w[2] === 7.8), 'walls follow the dimensioned x stations');
assert.ok([...context.floor, ...context.W].every(a => a[0] !== 3.05 && a[2] !== 3.05 && a[0] !== 7.9 && a[2] !== 7.9), 'superseded x stations are removed from plan arrays');
assert.equal(Math.max(...context.floor.map(f => f[3])), 10.9, 'the right-side depth chain extent is preserved');
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
assert.match(html, /var tile=f\[4\]===0xc5d7d4\|\|f\[4\]===0xcdd9d8\|\|f\[4\]===0xdad8cf/, 'tile-vs-wood finish follows floor material colors, not fragile indices');
assert.doesNotMatch(html, /box\(3\.39,\.02,3\.30,4\.2,1\.71,3\.72,0xc6b7a5\)/, 'the entrance route is no longer blocked by a cabinet');
assert.doesNotMatch(html, /box\(5\.57,\.02,3\.1,6\.11,1\.75,3\.83,0xc5cbca\)/, 'the tall barrier between sink and dining is removed');
assert.match(html, /box\(5\.05,\.02,\.12,5\.73,\.86,\.80,0xf3f3f0\);box\(5\.05,\.90,\.12,5\.73,1\.74,\.80,0xf3f3f0\)/, 'room 10 has a stacked washer/dryer at its left end');
assert.match(html, /Estimated 1\.2m between jamb centerlines/, 'the inferred laundry access is disclosed');
const rearBalcony = context.floor.find(f => f[0] === 4.85 && f[1] === 0 && f[2] === 12 && f[3] === 1.25);
assert.ok(rearBalcony && 5.05 >= rearBalcony[0] && 5.73 <= rearBalcony[2] && .12 >= rearBalcony[1] && .80 <= rearBalcony[3], 'washer/dryer footprint fits inside room 10');
const rearGlazing = context.W.filter(w => w[4] === 'g' && w[1] === 2.4 && w[3] === 2.4);
assert.deepEqual(Array.from(rearGlazing, w => Array.from(w)), [[7, 2.4, 7.25, 2.4, 'g'], [8.45, 2.4, 8.7, 2.4, 'g']], 'the estimated balcony opening is clear between glazing segments');
assert.equal(context.W.filter(w => w[4] === 'i' && w[0] === w[2] && w[0] >= 7 && w[0] <= 8.7 && w[1] === 2.34 && w[3] === 2.46).length, 2, 'the inferred opening has two narrow jambs');
assert.match(html, /12\.0m는 3\.0\+4\.8\+4\.2m 체인/, 'the UI states its dimension basis');
assert.match(html, /10,000mm 표기와 맞지 않아 총 길이가 모호합니다/, 'the UI discloses the conflicting vertical mark');
assert.match(html, /문설주 중심 간격 약 1\.2m\(문틀 안쪽 약 1\.07m\)/, 'the UI distinguishes estimated centerline span from clear opening width');
assert.match(html, /보행 중심선 폭은 약 0\.76m/, 'the UI discloses the modeled walkthrough clearance band');
assert.match(fs.readFileSync(require('node:path').join(__dirname, 'README.md'), 'utf8'), /walkable centerline band is about 0\.76m/, 'the README documents the modeled walkthrough clearance band');
assert.match(html, /function bed\(x,z,w,d\)\{box\(x-\.14,\.005,z-\.16,x\+w\+\.14/, 'bed-frame overhang is included in footprint calculations');
assert.match(html, /bed\(\.44,6\.62,1\.40,1\.90\);bed\(9\.11,6\.55,1\.70,2\.0\);bed\(9\.21,2\.0,1\.63,1\.95\)/, 'bed footprints are sized for their respective rooms');
assert.match(html, /box\(2\.53,\.01,7\.0,2\.93,1\.75,8\.4,0xcdbfac\);box\(11\.5,\.01,6\.45,11\.90,1\.73,8\.55,0xcabfac\);box\(11\.6,\.01,1\.35,11\.90,1\.6,2\.45,0xcdbfac\)/, 'wardrobes sit against the room edges opposite the beds');
assert.ok(2.53 - (.44 + 1.40 + .14) >= .55 - 1e-9 && 11.5 - (9.11 + 1.70 + .14) >= .55 - 1e-9 && 11.6 - (9.21 + 1.63 + .14) >= .60 - 1e-9, 'bed-frame-to-wardrobe clearances remain at least 55cm');
const jambThickness = Number(html.match(/th=t==='p'\?\.09:(\.\d+)/)?.[1]);
assert.ok((8.45 - 7.25) - jambThickness >= 1.07 - 1e-9, 'the opening keeps about 1.07m clear between jamb faces');
assert.ok((8.45 - 7.25) - 2 * .22 >= .76 - 1e-9, 'the collision margin leaves a 76cm walkable centerline band');
assert.ok((7.25 - jambThickness / 2) - (5.76 + .025 / 2) >= 1.4 - 1e-9, 'the washer/dryer front leaves at least 1.4m to the opening jamb');
assert.match(html, /sofa\.position\.set\(5\.9,0,7\.5\);sofa\.rotation\.y=-Math\.PI\/2/, 'the sofa faces the east-wall TV');
assert.match(html, /table\(6\.425,7\.15,\.40,\.70\)/, 'a compact coffee table sits in front of the sofa');
const sofaFront = 5.9 + .275, coffeeLeft = 6.425, coffeeRight = 6.425 + .40, tvLeft = 7.38;
assert.ok(coffeeLeft - sofaFront >= .25 - 1e-9 && tvLeft - coffeeRight >= .55 - 1e-9, 'sofa-table-TV clearances are preserved');
assert.ok(7.71 <= 7.8 - .13 / 2, 'the TV base fits inside the living-room partition');
assert.match(html, /0xd4d7d9/, 'open interior doors use a light-gray finish');
assert.match(html, /box\(5\.13,\.995,2\.25,5\.48,1\.015,2\.65,0xf7f8f5\)/, 'kitchen sink basin is white');
assert.match(html, /hemi\.intensity=evening\?\.48:\.9;light\.intensity=evening\?\.65:1\.8;light\.color\.setHex\(evening\?0xffb879:0xfff2df\)/, 'day lighting returns to its original levels');
assert.match(html, /ground\.visible=!evening/, 'the pale overview ground does not mask the evening background');

const collisionFns = html.match(/function inFloor\([\s\S]*?\nfunction blocked\([\s\S]*?\n/)[0];
vm.runInContext(collisionFns, context);
assert.equal(vm.runInContext('blocked(2.7, 8.5)', context), false);
assert.equal(vm.runInContext('blocked(3.2, 8.5)', context), true);
assert.equal(vm.runInContext('blocked(-2, 0)', context), true, 'illustrative common stairs remain outside unit walk bounds');
assert.equal(vm.runInContext('blocked(8, 2.4)', context), false, 'the inferred rear-balcony opening is walkable');
assert.equal(vm.runInContext('blocked(7.2, 2.4)', context), true, 'the opening jamb remains a wall');
assert.equal(vm.runInContext('blocked(8.5, 2.4)', context), true, 'the opposite opening jamb remains a wall');

const moveFn = html.match(/function movePlayer\(step\)[^\n]*/)?.[0];
assert.ok(moveFn, 'shared collision-aware movement function exists');
context.walkPos = { x: 2.7, z: 8.5 };
context.walkYaw = Math.PI / 2;
vm.runInContext(moveFn, context);
vm.runInContext('movePlayer(0.3)', context);
assert.equal(context.walkPos.x, 2.7, 'zoom movement cannot cross a wall');
context.walkPos = { x: 8, z: 2.5 };
context.walkYaw = Math.PI;
vm.runInContext('movePlayer(0.3)', context);
assert.ok(Math.abs(context.walkPos.z - 2.2) < 1e-9, 'the route from kitchen to rear balcony passes through its opening');
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
