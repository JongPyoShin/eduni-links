// Focused state/interaction checks for the companion widget without a browser dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../portal_app/static_games/eduni_companion.js'), 'utf8');

function element(text = '') {
  return {textContent:text, value:'', disabled:false, dataset:{}, style:{display:'block',visibility:'visible',opacity:'1'},
    events:{}, classList:{add(){},remove(){},contains(){return true;}},
    setAttribute(name,value){this[name]=value;}, getAttribute(){return null;},
    addEventListener(name,callback){this.events[name]=callback;}, focus(){this.focused=true;}};
}
function fixture() {
  const controls = new Map();
  for (const selector of ['textarea','#eduni-companion-answer','#eduni-companion-status','#eduni-companion-screen',
    '[data-action="send"]','[data-action="voice"]','[data-action="speak"]','.close']) controls.set(selector,element());
  const chips = ['힌트 줘','쉽게 설명해 줘'].map(prompt=>{const chip=element();chip.dataset.prompt=prompt;return chip;});
  const photo=element(),image=element(),title=element(),credit=element(),sourceLink=element();
  image.removeAttribute=function(name){delete this[name];};
  photo.hidden=true;
  const photoFields=new Map([['img',image],['.photo-title',title],['.photo-credit',credit],['.photo-source',sourceLink]]);
  photo.querySelector=selector=>photoFields.get(selector);
  controls.set('#eduni-companion-photo',photo);
  const panel=element();panel.querySelector=selector=>controls.get(selector);panel.querySelectorAll=selector=>selector==='[data-prompt]'?chips:[];
  const launch=element();
  const document={title:'EDUNI',documentElement:{style:{setProperty(){}}},body:{append(){}},getElementById(){return null;},
    createElement(tag){return tag==='section'?panel:launch;},querySelectorAll(){return[];}};
  let requests=[];
  const window={addEventListener(){},EDUNICompanionPendingContext:{activity:'pattern_train',question:'첫 문제',choices:['A'],selected:''}};
  window.top=window.self=window;
  const sandbox={window,document,location:{pathname:'/pattern-train'},getComputedStyle:node=>node.style,
    requestAnimationFrame(){},setInterval(){return 1;},clearInterval(){},AbortController,URL,
    fetch:(_url,options)=>new Promise((resolve,reject)=>requests.push({options,resolve,reject}))};
  vm.runInNewContext(source,sandbox);
  return {window,panel,launch,controls,chips,requests,photo,image,title,credit,sourceLink};
}
const response=(status,body)=>({status,ok:status===200,json:async()=>body});

async function main(){
  const f=fixture();
  f.launch.events.click();
  assert.equal(f.controls.get('textarea').focused,undefined,'opening must not pop the mobile keyboard');
  const first=f.chips[0].events.click();
  assert.equal(f.requests.length,1,'quick prompt sends immediately');
  assert.equal(f.requests[0].options.body.includes('힌트 줘'),true);
  assert.equal(JSON.parse(f.requests[0].options.body).context.question,'첫 문제','send uses current screen context');
  assert.equal(f.controls.get('#eduni-companion-answer').textContent,'답을 준비하고 있어…');
  assert.equal(f.panel['aria-busy'],'true');
  assert.equal(f.controls.get('[data-action="send"]').disabled,true);
  assert.ok(f.chips.every(chip=>chip.disabled),'quick prompts are visibly disabled while busy');
  f.chips[1].events.click();
  assert.equal(f.requests.length,1,'busy guard prevents overlapping quick sends');
  const oldRequest=f.requests[0];
  f.window.EDUNICompanion.setContext({activity:'pattern_train',question:'다음 문제',choices:['B'],selected:''});
  oldRequest.resolve(response(200,{ok:true,answer:'늦은 답'}));
  await new Promise(setImmediate);
  assert.notEqual(f.controls.get('#eduni-companion-answer').textContent,'늦은 답','context change discards late answer');
  assert.equal(f.panel['aria-busy'],'false');

  const second=f.chips[1].events.click();
  assert.equal(JSON.parse(f.requests[1].options.body).context.question,'다음 문제','next chip captures fresh context');
  f.requests[1].resolve(response(503,{ok:false,error:'ai_unavailable'}));
  await new Promise(setImmediate);
  assert.equal(f.controls.get('#eduni-companion-answer').textContent,'아직 답을 받지 못했어. 다시 물어봐.','failure clears waiting answer');
  assert.notEqual(f.panel['aria-busy'],'true');
  assert.ok(f.chips.every(chip=>!chip.disabled),'quick prompts are re-enabled when the request finishes');
  f.chips[0].events.click();
  f.requests[2].reject(new Error('network offline'));
  await new Promise(setImmediate);
  assert.equal(f.controls.get('#eduni-companion-answer').textContent,'아직 답을 받지 못했어. 다시 물어봐.','network failure clears waiting answer');
  f.controls.get('textarea').value='북극곰 사진 보여줘';
  f.controls.get('[data-action="send"]').events.click();
  f.requests[3].resolve(response(200,{ok:true,answer:'북극곰을 보자!',photo:{
    topic:'polar_bear',title:'북극곰',alt:'알래스카 북극곰',
    url:'https://commons.wikimedia.org/wiki/Special:FilePath/Polar_Bear.jpg?width=640',
    source_url:'https://commons.wikimedia.org/wiki/File:Polar_Bear.jpg',
    credit:'U.S. Fish and Wildlife Service',license:'공개 도메인'
  }}));
  await new Promise(setImmediate);
  assert.equal(f.photo.hidden,false,'matching photo visible');
  assert.equal(f.image.alt,'알래스카 북극곰');
  assert.ok(f.image.src.includes('commons.wikimedia.org'),'Wikimedia image only');
  assert.equal(f.credit.textContent,'촬영·제공: U.S. Fish and Wildlife Service · 공개 도메인');
  assert.equal(f.controls.get('#eduni-companion-answer').textContent,'북극곰을 보자!');
  assert.ok(f.sourceLink.href.endsWith('/wiki/File:Polar_Bear.jpg'),'attribution source link visible');
  f.controls.get('textarea').value='다른 사진';
  f.controls.get('[data-action="send"]').events.click();
  assert.equal(f.photo.hidden,true,'new question clears stale photo before waiting');
  f.requests[4].resolve(response(200,{ok:true,answer:'안전하게 답할게',photo:{
    title:'잘못된 URL',alt:'not real',credit:'Fake',license:'none',
    url:'https://evil.example/malicious.jpg',
    source_url:'https://commons.wikimedia.org/wiki/File:Polar_Bear.jpg'
  }}));
  await new Promise(setImmediate);
  assert.equal(f.photo.hidden,true,'foreign host never rendered');
  f.controls.get('textarea').value='고양이';
  f.controls.get('[data-action="send"]').events.click();
  f.requests[5].resolve(response(200,{ok:true,answer:'고양이!',photo:{
    title:'고양이',alt:'고양이 실물',credit:'Alvesgaspar',license:'CC BY-SA 3.0',
    url:'https://commons.wikimedia.org/wiki/Special:FilePath/Cat_November_2010-1a.jpg?width=640',
    source_url:'https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg'
  }}));
  await new Promise(setImmediate);
  assert.equal(f.photo.hidden,false,'second valid photo visible');
  f.window.EDUNICompanion.setContext({activity:'pattern_train',question:'새로운 문제',choices:[],selected:''});
  assert.equal(f.photo.hidden,true,'context change removes old photo');
  console.log('PASS: interaction, trusted photo rendering, source attribution, untrusted URL rejection, stale image cleanup');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
