// Run with: node tests/test_thinking_workshop.cjs
const fs = require("node:fs");
const path = require("node:path");
function verify(html){
 const scripts=[...html.matchAll(/<script(?: id="rules")?>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 const rules=new Function(scripts[0]+"\nreturn {DATA,foodResult,runRoute,detectiveResult,bridgeResult,scienceResult,planResult,systemResult,inventResult,differentDesign,storyResult};")();
 const {DATA,foodResult,runRoute,detectiveResult,bridgeResult,scienceResult,planResult,systemResult,inventResult,differentDesign,storyResult}=rules;
 let checks=0, sessions=0;
 function assert(x,m){if(!x)throw Error(m);checks++;}
 class El{
  constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.style={};this.events={};this.className="";this.disabled=false;this.checked=false;this._text="";this.classList={add:c=>{this.className+=" "+c;}}}
  set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(x=>x.textContent).join("");}
  append(...xs){this.children.push(...xs)}replaceChildren(...xs){this.children=xs;this._text="";}
  setAttribute(k,v){this.attrs[k]=v}addEventListener(k,fn){this.events[k]=fn;}
  click(){if(this.disabled)throw Error("disabled: "+this.textContent);this.events.click?.();}
 }
 const menu=new El("nav"),game=new El("section");
 const doc={getElementById:id=>id==="menu"?menu:game,createElement:t=>new El(t),createTextNode:t=>{let e=new El("#text");e.textContent=t;return e;}};
 const ui=new Function("document",scripts.join("\n")+"\nreturn {start,render,getState:()=>state};")(doc);
 const all=(root,tag)=>root.children.flatMap(x=>[...(x.tagName===tag?[x]:[]),...all(x,tag)]);
 const press=(label,root=game)=>{const e=all(root,"button").find(x=>x.textContent===label);if(!e)throw Error("missing button: "+label);e.click();};
 const pressAria=(label)=>{const e=all(game,"button").find(x=>x.attrs["aria-label"]===label);if(!e)throw Error("missing aria label: "+label);e.click();};
 const done=()=>all(game,"button").some(x=>x.textContent==="다시 해보기");
 for(let i=0;i<DATA.food.length;i++){
  const s=DATA.food[i];assert(foodResult(s,s.need).ok,s.title);assert(!foodResult(s,[0,0,0]).ok,"empty");assert(!foodResult(s,[s.stock+1,0,0]).ok,"overspend");
  ui.start("food",i);press("나눈 결과 확인하기");assert(!done(),"empty food completed");
  s.names.forEach((n,k)=>{for(let j=0;j<s.need[k];j++)pressAria(n+"에게 사과 한 개 주기")});press("나눈 결과 확인하기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.route.length;i++){
  const s=DATA.route[i];let q=[[]],solution;while(q.length){const c=q.shift(),r=runRoute(s,c);if(r.ok){solution=c;break;}if(r.reason==="end"&&c.length<s.limit)for(const d of "UDLR")q.push([...c,d]);}assert(solution,s.title);assert(!runRoute(s,["__proto__"]).ok,"invalid command");assert(!runRoute(s,Array(s.limit+1).fill("U")).ok,"over limit");
  ui.start("route",i);press("↓");press("로봇 출발!");assert(!done(),"bad route completed");press("모두 지우기");for(const d of solution)press({U:"↑",D:"↓",L:"←",R:"→"}[d]);press("로봇 출발!");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.detect.length;i++){
  const s=DATA.detect[i];assert(detectiveResult(s,s.correct,[0,1,2,3],s.proof).ok,s.title);assert(!detectiveResult(s,s.correct,[0,0,0,0],s.proof).ok,"duplicate seen");assert(!detectiveResult(s,(s.correct+1)%3,[0,1,2,3],s.proof).ok,"wrong idea");
  ui.start("detect",i);assert(all(game,"button").find(x=>x.textContent==="내 생각 확인하기").disabled,"early confirm");s.clues.forEach(c=>press(c[0]+" 살펴보기"));
  press(s.ideas[(s.correct+1)%3]);for(const k of s.proof){let e=all(game,"input")[k];e.checked=true;e.events.change();}press("내 생각 확인하기");assert(!done(),"wrong hypothesis completed");press(s.ideas[s.correct]);press("내 생각 확인하기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.bridge.length;i++){
  const s=DATA.bridge[i];let solution;function rec(a){if(a.length===s.loads.length){if(bridgeResult(s,a).ok)solution=a;return;}for(let k=0;k<s.parts.length;k++)rec([...a,k]);}rec([]);assert(solution,s.title);assert(!bridgeResult(s,s.loads.map(()=>-1)).ok,"empty bridge");
  ui.start("bridge",i);press("다리 시험하기");assert(!done(),"empty bridge UI");solution.forEach((part,k)=>{const row=game.children.find(e=>e.children.some(x=>x.tagName==="h3"&&x.textContent===(k+1)+"번 칸에 놓을 재료"));press(s.parts[part].icon+" "+s.parts[part].name,row);});press("다리 시험하기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.science.length;i++){
  const s=DATA.science[i];let valid=[],invalid=[];for(let a=0;a<s.trials.length;a++)for(let b=a+1;b<s.trials.length;b++)(scienceResult(s,[a,b],0).ok?valid:invalid).push([a,b]);assert(valid.length===1,s.title);assert(!scienceResult(s,valid[0],null).ready,"no prediction");
  ui.start("science",i);for(const k of invalid[0])press("실험 "+(k+1));press("두 실험이 같을 것 같아요");press("관찰 기록 열기");assert(!done(),"unfair comparison completed");
  for(const k of invalid[0])press("실험 "+(k+1));for(const k of valid[0])press("실험 "+(k+1));press("두 실험이 같을 것 같아요");press("관찰 기록 열기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.plan.length;i++){
  const s=DATA.plan[i];let solution;for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)for(let d=0;d<4;d++)if(planResult(s,[a,b,c,d]).ok)solution=[a,b,c,d];assert(solution,s.title);assert(!planResult(s,[0,0,0,0]).ok,"empty plan");assert(!planResult(s,[20,20,20,20]).ok,"over budget");
  ui.start("plan",i);press("준비가 끝났는지 확인하기");assert(!done(),"empty plan completed");solution.forEach((count,k)=>{for(let j=0;j<count;j++)pressAria(s.items[k][0]+" 하나 담기");});press("준비가 끝났는지 확인하기");assert(done(),s.title+" UI");sessions++;
 }

 for(let i=0;i<DATA.system.length;i++){
  const s=DATA.system[i];const solutions=[];
  for(let round=0;round<s.rounds.length;round++){
   const r=s.rounds[round],valid=[];
   for(let a=0;a<=r.helpers;a++)for(let b=0;b<=r.helpers;b++)for(let c=0;c<=r.helpers;c++){
    const alloc=[a,b,c],out=systemResult(s,round,alloc);
    if(out.ok)valid.push(alloc);
    if(out.valid){if(out.flow.reduce((n,f)=>n+f.waiting,0)+out.output!==r.supply)throw Error("flow not conserved");}
   }
   assert(valid.length>0,s.title);assert(!systemResult(s,round,[0,0,0]).ok,"empty allocation");
   assert(!systemResult(s,round,[r.helpers,r.helpers,r.helpers]).ok,"excess helpers");
   solutions.push(valid);
  }
  const first=solutions[0].find(a=>!systemResult(s,1,a).ok);assert(first,"change should require revised allocation");
  ui.start("system",i);press("일을 시작해 보기");assert(!done(),"baseline incorrectly completed");
  first.forEach((n,k)=>{for(let j=0;j<n;j++)pressAria(s.stages[k]+" 도우미 한 명 추가")});press("일을 시작해 보기");press("상황이 바뀌었어요! 다음 도전");
  assert(ui.getState().allocation.join(",")===first.join(","),"allocation lost on change");press("일을 시작해 보기");assert(!done(),"disruption bypassed");
  first.forEach((n,k)=>{for(let j=0;j<n;j++)pressAria(s.stages[k]+" 도우미 한 명 빼기")});
  solutions[1][0].forEach((n,k)=>{for(let j=0;j<n;j++)pressAria(s.stages[k]+" 도우미 한 명 추가")});press("일을 시작해 보기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.invent.length;i++){
  const s=DATA.invent[i],valid=[];
  for(let mask=0;mask<1<<s.parts.length;mask++){const a=s.parts.map((_,k)=>k).filter(k=>mask&(1<<k));if(inventResult(s,a).ok)valid.push(a);}
  const first=valid.find(a=>valid.some(b=>differentDesign(s,a,b))),second=valid.find(b=>differentDesign(s,first,b));
  assert(first&&second,s.title);assert(!inventResult(s,[]).ok,"empty invention");assert(!inventResult(s,[0,0]).ok,"duplicate parts");assert(!differentDesign(s,first,first),"same prototype");const deco=s.parts.findIndex(p=>!p[3].length);assert(!differentDesign(s,first,first.includes(deco)?first.filter(k=>k!==deco):[...first,deco]),"decoration only");
  ui.start("invent",i);press("내 작품 시험하기");assert(!done(),"empty invention completed");
  first.forEach(k=>press(s.parts[k][1]+" "+s.parts[k][0]));press("내 작품 시험하기");press("다른 작품 만들기");press("내 작품 시험하기");assert(!done(),"same prototype completed");
  first.filter(k=>!second.includes(k)).forEach(k=>press(s.parts[k][1]+" "+s.parts[k][0]));second.filter(k=>!first.includes(k)).forEach(k=>press(s.parts[k][1]+" "+s.parts[k][0]));press("내 작품 시험하기");assert(done(),s.title+" UI");sessions++;
 }
 for(let i=0;i<DATA.story.length;i++){
  const s=DATA.story[i];assert(!storyResult(s,[0],[0,1],1,0,"이유").ok,"missing perspective");assert(!storyResult(s,[0,1],[0],0,0,"이유").ok,"one alternative");assert(!storyResult(s,[0,1],[0,1],1,0,"   ").ok,"empty reflection");
  s.actions.forEach((_,k)=>assert(storyResult(s,[0,1],[0,1,2],k,0,"이유").ok,"must not grade moral choice"));
  ui.start("story",i);assert(!all(game,"button").some(x=>x.textContent==="내 생각 정리하기"),"early completion");
  s.people.forEach(p=>press(p[1]+" "+p[0]+"의 이야기 듣기"));press(s.actions[0][0]);assert(!all(game,"button").some(x=>x.textContent==="내 생각 정리하기"),"one approach bypassed");press(s.actions[1][0]);press(s.priorities[0]);
  // The same action label occurs twice: one comparison control and one final choice.
  const select=all(game,"button").filter(x=>x.textContent===s.actions[1][0]).at(-1);select.click();
  const finish=()=>all(game,"button").find(x=>x.textContent==="내 생각 정리하기");assert(finish().disabled,"reflection required");
  if(i===1){const field=all(game,"textarea")[0];field.value="두 친구가 모두 참여했으면 좋겠어요.";field.events.input();assert(!finish().disabled,"typed reflection");}
  else{press("가족에게 말로 설명했어요");assert(!finish().disabled,"spoken reflection");}
  press("내 생각 정리하기");assert(done(),s.title+" UI");sessions++;
  ui.start("story",i);assert(ui.getState().reason===""&&!ui.getState().spoken,"reflection retained on restart");
 }
 assert(sessions===27,"expected sessions");assert(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\s*[.(]/.test(scripts.join("\n")),"external communication or persistence");return {checks,sessions};
}
const html = fs.readFileSync(path.join(__dirname,"../portal_app/static_games/eduni_thinking_lab_v2.html"),"utf8");
console.log(verify(html));
