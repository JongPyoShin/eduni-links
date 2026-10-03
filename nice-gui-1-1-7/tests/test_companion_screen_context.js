// Independent focused checks of the real widget with a minimal public-DOM fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../portal_app/static_games/eduni_companion.js'), 'utf8');

function element(text = '', display = 'block') {
  return {textContent:text, hidden:false, disabled:false, parentElement:null, style:{display,visibility:'visible',opacity:'1'},
    events:{}, classList:{add(){},remove(){},contains(){return true;}},
    setAttribute(){}, getAttribute(){return null;}, addEventListener(name, callback){this.events[name]=callback;}, focus(){}};
}
function fixture(route, nodes = {}, engine) {
  const controls = new Map();
  const panel = element();
  panel.querySelector = selector => {
    if (!controls.has(selector)) controls.set(selector, element());
    return controls.get(selector);
  };
  panel.querySelectorAll = () => [];
  const document = {title:'EDUNI', documentElement:{style:{setProperty(){}}}, body:{append(){}},
    getElementById(){return null;}, createElement(tag){return tag==='section'?panel:element();},
    querySelector(selector){return (nodes[selector] || [])[0] || null;},
    querySelectorAll(selector){return nodes[selector] || [];}};
  const window = {addEventListener(){}, EDUNIBadukEngine:engine};
  window.top = window.self = window;
  let settle;
  let request;
  const sandbox = {window, document, location:{pathname:route}, getComputedStyle:node=>node.style,
    requestAnimationFrame(){}, setInterval(){return 1;}, clearInterval(){}, AbortController,
    fetch:(_url, options)=>{request=JSON.parse(options.body); return new Promise(resolve=>{settle=resolve;});}};
  // Test-only exposure of a private resolver, never shipped to a browser.
  const instrumented = source.replace('screenLabel.textContent=screenContext().label;',
    'window.__readScreen=screenContext; screenLabel.textContent=screenContext().label;');
  assert.notEqual(instrumented, source, 'resolver exposure marker exists');
  vm.runInNewContext(instrumented, sandbox);
  return {window, controls, read:()=>JSON.parse(JSON.stringify(window.__readScreen())),
    request:()=>request, finish:()=>settle({ok:true,status:200,json:async()=>({ok:true,answer:'old answer'})})};
}

async function main() {
  const textNodes=[element('첫 제목'),element('문제의 실제 설명')];
  let f=fixture('/space', {'#questionTitle, #questionCopy':textNodes,'#choices .choice':[element('보기1')]});
  assert.match(f.read().payload.question,/첫 제목/);
  assert.match(f.read().payload.question,/문제의 실제 설명/);
  assert.match(f.read().payload.question,/그림/);
  textNodes.forEach(node=>node.style.display='none');
  assert.doesNotMatch(f.read().payload.question,/첫 제목|문제의 실제 설명/);

  const board=Array.from({length:19},()=>Array(19).fill(0));
  board[0][0]=1; board[18][18]=2;
  f=fixture('/baduk', {}, {getState:()=>({board,currentPlayer:1,gameOver:false,
    parent_note:'PRIVATE_SENTINEL',previousPosition:'HIDDEN_POSITION',answer:'HIDDEN_ANSWER'})});
  const projected=f.read().payload;
  assert.equal(projected.activity,'baduk');
  assert.match(projected.question,/B\.{18}\//);
  assert.match(projected.question,/\.{18}W/);
  assert.equal(projected.question.match(/[BW.]{19}/g).length,19);
  assert.ok(projected.question.length<=600);
  assert.doesNotMatch(JSON.stringify(projected),/PRIVATE_SENTINEL|HIDDEN_POSITION|HIDDEN_ANSWER/);

  f=fixture('/omok', {'#board .point':[]});
  assert.doesNotMatch(f.read().payload.question,/0줄/);
  f=fixture('/hanja', {'#card h2':[element('LOCKED_SENTINEL','none')],'#card label':[element('LOCKED_OPTION','none')]});
  assert.doesNotMatch(JSON.stringify(f.read().payload),/LOCKED_SENTINEL|LOCKED_OPTION/);

  const checked=element(); checked.style.opacity='0'; checked.nextElementSibling=element('선택한 공개 보기');
  f=fixture('/facto', {'#card .qtitle, #card .visual':[element('현재 문제')], '#card input:checked':[checked]});
  assert.equal(f.read().payload.selected,'선택한 공개 보기');
  checked.nextElementSibling.style.display='none';
  assert.equal(f.read().payload.selected,'');

  const prompt=element('처음 문제');
  f=fixture('/bubble', {'#questionText':[prompt],'#bubbleField .answer-bubble':[element('공개 보기')]});
  f.controls.get('textarea').value='설명해 줘';
  f.controls.set('[data-action="guardian"]', Object.assign(element(), {checked:true}));
  const pending=f.controls.get('[data-action="send"]').events.click();
  assert.match(f.request().context.question,/처음 문제/);
  prompt.textContent='다음 문제';
  f.finish(); await pending;
  assert.notEqual(f.controls.get('#eduni-companion-answer').textContent,'old answer');
  console.log('PASS: screen text, visibility, board completeness/privacy, fallback, send-time context, stale answer');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
