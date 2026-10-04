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
function fixture(route, nodes = {}, engine, pendingContext) {
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
  const window = {addEventListener(){}, EDUNIBadukEngine:engine, EDUNICompanionPendingContext:pendingContext};
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
  return {window, panel, controls, read:()=>JSON.parse(JSON.stringify(window.__readScreen())),
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
  const pending=f.controls.get('[data-action="send"]').events.click();
  assert.match(f.request().context.question,/처음 문제/);
  prompt.textContent='다음 문제';
  f.finish(); await pending;
  assert.notEqual(f.controls.get('#eduni-companion-answer').textContent,'old answer');

  f.window.isSecureContext=true;
  f.window.SpeechRecognition=function(){f.window.lastRecognition=this;this.start=()=>{};this.stop=()=>{};};
  f.controls.get('textarea').focus=function(){this.focused=true;};
  f.controls.get('[data-action="voice"]').events.click();
  f.window.lastRecognition.onresult({results:[[{transcript:'말한 질문'}]]});
  assert.equal(f.controls.get('textarea').value,'말한 질문');
  assert.equal(f.controls.get('textarea').focused,undefined,'voice result must not open keyboard');
  const oldRecognition=f.window.lastRecognition;
  f.window.EDUNICompanion.setContext({activity:'pattern_train',question:'새 문제',choices:[],selected:''});
  oldRecognition.onresult({results:[[{transcript:'늦은 음성'}]]});
  assert.equal(f.controls.get('textarea').value,'말한 질문','late recognition must not overwrite after screen change');

  const privateFields={activity:'pattern_train',question:'PRIVATE_TITLE PRIVATE_COMMENT PRIVATE_NOTE PRIVATE_PUBLISHER',
    choices:['PRIVATE_CHOICE'],selected:'PRIVATE_SELECTED'};
  f=fixture('/reading', {'#readingRecords':[element('PRIVATE_ROW')], '#parentInsight':[element('PRIVATE_INSIGHT')]}, undefined, privateFields);
  const readingContext=f.read().payload;
  assert.equal(readingContext.activity,'reading');
  assert.match(readingContext.question,/저장된 책 제목/);
  assert.doesNotMatch(JSON.stringify(readingContext),/PRIVATE_/);
  assert.match(f.panel.innerHTML,/책 이야기 도와줘/);
  assert.match(f.panel.innerHTML,/기록하는 방법 알려줘/);
  assert.doesNotMatch(f.panel.innerHTML,/힌트 줘|쉽게 설명해 줘/);
  f.window.EDUNICompanionPendingContext.question='PRIVATE_MUTATION';
  assert.doesNotMatch(JSON.stringify(f.read().payload),/PRIVATE_MUTATION/,'shared pending context cannot mutate the frozen reading projection');
  f.window.EDUNICompanion.setContext(privateFields);
  assert.doesNotMatch(JSON.stringify(f.read().payload),/PRIVATE_/,'pending or later context overrides cannot leak into reading context');
  const manualQuestion=f.controls.get('textarea'); manualQuestion.value='책 이야기 도와줘';
  const pendingSend=f.controls.get('[data-action="send"]').events.click();
  assert.equal(f.request().context.activity,'reading');
  assert.doesNotMatch(JSON.stringify(f.request().context),/PRIVATE_/);
  f.finish(); await pendingSend;
  console.log('PASS: screen text, visibility, board completeness/privacy, fallback, send-time context, stale answer');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
