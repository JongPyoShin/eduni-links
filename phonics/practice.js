/* EDUNI Phonics Pages-only question games. Independent of the family portal.
   All content is original and reuses the curated 24-word phonics bank.
   Progress exists only during this page view. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EDUNIPhonicsPractice = api;
  if (root && root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () { api.mount(root); });
    } else api.mount(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const TYPES = Object.freeze([
    Object.freeze({id:"listen",name:"소리 듣고 고르기",icon:"🔊"}),
    Object.freeze({id:"picture",name:"그림 보고 단어 찾기",icon:"🖼️"}),
    Object.freeze({id:"missing",name:"빠진 글자 채우기",icon:"✏️"}),
    Object.freeze({id:"order",name:"글자 조합하기",icon:"🧩"}),
    Object.freeze({id:"first",name:"첫소리 찾기",icon:"👂"}),
    Object.freeze({id:"meaning",name:"단어 뜻 찾기",icon:"💡"})
  ]);
  const MODES = Object.freeze(["mix",...TYPES.map(t => t.id)]);

  function shuffle(items, random = Math.random) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const value = Math.max(0,Math.min(0.999999999,Number(random()) || 0));
      const j = Math.floor(value * (i + 1));
      [result[i],result[j]] = [result[j],result[i]];
    }
    return result;
  }
  function fourChoices(correct, others, random = Math.random) {
    const deduped = [...new Set(others)].filter(value => value !== correct);
    return shuffle([correct,...shuffle(deduped,random).slice(0,3)],random).map(value => ({
      value, label:value
    }));
  }
  function makeQuestion(word, type, bank, random = Math.random) {
    if (!TYPES.some(t => t.id === type)) throw new Error("Unknown question type: " + type);
    const otherWords = bank.filter(w => w.word !== word.word);
    const tiles = word.sounds.map(s => s.grapheme);
    const common = {type,word:word.word,meaning:word.meaning,emoji:word.emoji};
    if (type === "listen") return Object.assign(common,{
      title:"소리를 듣고 알맞은 영어 단어를 골라요",
      visual:"🎧",hint:"소리 듣기 버튼을 눌러 주세요.",audio:true,
      correct:word.word,
      options:fourChoices(word.word,otherWords.map(w => w.word),random)
    });
    if (type === "picture") return Object.assign(common,{
      title:"그림에 맞는 영어 단어를 골라요",
      visual:word.emoji,hint:word.meaning,audio:false,
      correct:word.word,
      options:fourChoices(word.word,otherWords.map(w => w.word),random)
    });
    if (type === "meaning") return Object.assign(common,{
      title:"영어 단어의 뜻은 무엇일까요?",
      visual:word.word,hint:"맞는 뜻을 찾아 보세요.",audio:true,
      correct:word.meaning,
      options:fourChoices(word.meaning,otherWords.map(w => w.meaning),random)
    });
    if (type === "first") return Object.assign(common,{
      title:"이 단어는 어떤 첫 글자 소리로 시작할까요?",
      visual:word.emoji,hint:word.meaning,audio:true,
      correct:tiles[0],
      options:fourChoices(tiles[0],bank.map(w => w.sounds[0].grapheme),random)
    });
    if (type === "missing") {
      const missingAt = Math.floor(Math.max(0,Math.min(.999999999,Number(random()) || 0)) * tiles.length);
      const correct = tiles[missingAt];
      const phonemes = [...new Set(bank.flatMap(w => w.sounds.map(s => s.grapheme)))];
      return Object.assign(common,{
        title:"어떤 글자가 빠졌을까요?",
        visual:tiles.map((tile,index) => index === missingAt ? "＿" : tile).join(" · "),
        hint:word.emoji + " " + word.meaning,audio:true,
        correct,
        options:fourChoices(correct,phonemes,random)
      });
    }
    const order = shuffle(tiles.map((tile,index) => ({value:tile,id:index})),random);
    if (order.every((tile,index) => tile.id === index)) order.push(order.shift());
    return Object.assign(common,{
      title:"글자 조각을 순서대로 눌러 단어를 만들어요",
      visual:word.emoji,hint:word.meaning,audio:true,
      correct:tiles.join(""),
      segments:tiles,
      options:order
    });
  }

  function buildRound(words, level = "start", mode = "mix", random = Math.random, count = 8) {
    if (!MODES.includes(mode)) throw new Error("Unknown mode");
    if (!["start","more","all"].includes(level)) throw new Error("Unknown level");
    const selected = words.filter(w => level === "all" || w.level === level);
    if (selected.length < 4) throw new Error("Not enough words for varied questions");
    const targets = shuffle(selected,random).slice(0,Math.min(count,selected.length));
    const kinds = mode === "mix" ? shuffle(TYPES.map(t => t.id),random) : [mode];
    return targets.map((word,index) => makeQuestion(word,kinds[index%kinds.length],selected,random));
  }

  function mount(win) {
    const doc = win.document;
    const get = id => doc.getElementById(id);
    if (!get("phonicsPractice") || !win.EDUNIPhonics || !win.EDUNIPhonics.WORDS) return;
    const words = win.EDUNIPhonics.WORDS;
    let round=[],index=0,completed=0,firstTry=0,misses=0,answered=false,selected=[];
    const feedback = (message,tone="info") => {
      const el = get("practiceFeedback");
      el.textContent=message;el.dataset.tone=tone;
    };
    const clear = node => node.replaceChildren();
    function button(label, click, cls="") {
      const node=doc.createElement("button");
      node.type="button";node.textContent=label;node.className="practice-option "+cls;
      node.addEventListener("click",click);
      return node;
    }
    function play() {
      const q=round[index], synth=win.speechSynthesis;
      if (!q || !synth || !win.SpeechSynthesisUtterance) {
        feedback("이 기기에서는 소리 듣기가 지원되지 않아요. 다른 문제를 골라 보거나 보호자와 함께 읽어 봐요.","warn");return;
      }
      try {
        synth.cancel();
        const utter=new win.SpeechSynthesisUtterance(q.word);
        utter.lang="en-US";utter.rate=.78;
        const voices=synth.getVoices?synth.getVoices():[];
        const voice=voices.find(v=>v.lang && v.lang.toLowerCase().startsWith("en"));
        if (voice) utter.voice=voice;
        synth.speak(utter);
      } catch (_) { feedback("소리 재생에 실패했어요. 다른 문제로 시도해 보세요.","warn"); }
    }
    function progress() {
      get("practiceProgress").textContent="문제 "+(index+1)+" / "+round.length;
      get("practiceBar").max=round.length;
      get("practiceBar").value=completed;
    }
    function finish(success) {
      if (!success || answered) return;
      answered=true;completed++;
      if (!misses)firstTry++;
      get("practiceNext").hidden=false;
      get("practiceNext").textContent=index===round.length-1?"결과 보기 🎉":"다음 문제 ➜";
      get("practiceOptions").querySelectorAll("button").forEach(b=>b.disabled=true);
      feedback(misses ? "좋아요! 다시 도전해서 맞혔어요. 🌱" : "정답! 멋지게 해냈어요! ⭐","success");
      progress();
    }
    function choose(q,value,element) {
      if (answered)return;
      if (value===q.correct) finish(true);
      else {
        misses++;
        element.disabled=true;element.classList.add("practice-wrong");
        feedback("괜찮아요. 소리나 그림을 다시 살펴보고 골라 봐요!","retry");
      }
    }
    function render() {
      if (!round.length)return;
      const q=round[index];
      answered=false;misses=0;selected=[];
      get("practiceCard").hidden=false;
      get("practiceSummary").hidden=true;
      get("practiceNext").hidden=true;
      const type=TYPES.find(t=>t.id===q.type);
      get("practiceKind").textContent=type.icon+" "+type.name;
      get("practicePrompt").textContent=q.title;
      get("practiceVisual").textContent=q.visual;
      get("practiceVisual").lang=(q.type==="meaning")?"en":"ko";
      get("practiceHint").textContent=q.hint;
      const playButton=get("practiceReplay");
      playButton.hidden=!q.audio;
      playButton.textContent=q.type==="listen"?"🔊 소리 듣기 / 다시 듣기":"🔊 단어 발음 듣기";
      progress();
      feedback("천천히 생각하고 골라 보세요. 정답을 맞히면 다음 문제로 갈 수 있어요.");
      const options=get("practiceOptions");clear(options);
      const made=get("practiceMade");clear(made);made.hidden=q.type!=="order";
      if (q.type==="order") {
        const remaining=q.options.slice();
        const addTiles=()=>{
          clear(options);
          remaining.forEach(piece=>{
            options.appendChild(button(piece.value,()=>{
              if(answered)return;
              const pos=remaining.findIndex(x=>x.id===piece.id);
              if(pos<0)return;
              remaining.splice(pos,1);selected.push(piece);
              const tile=doc.createElement("span");
              tile.className="practice-made-tile";tile.textContent=piece.value;made.appendChild(tile);
              addTiles();
              if(selected.length===q.segments.length) {
                if(selected.map(p=>p.value).join("")===q.correct)finish(true);
                else {
                  misses++;
                  feedback("글자 순서를 다시 생각해 볼까요? 🔁","retry");
                  const reset=button("↺ 다시 조합하기",()=> {
                    selected=[];remaining.splice(0,remaining.length,...q.options);
                    clear(made);addTiles();
                    feedback("글자를 처음부터 다시 눌러 보세요.");
                  },"practice-reset");
                  options.appendChild(reset);
                }
              }
            }));
          });
        };
        addTiles();
      } else q.options.forEach(option=>{
        let b=null;
        b=button(option.label,()=>choose(q,option.value,b));
        options.appendChild(b);
      });
    }
    function showSummary() {
      get("practiceCard").hidden=true;get("practiceSummary").hidden=false;
      get("practiceBar").value=round.length;
      get("practiceProgress").textContent="오늘의 8문제 완료!";
      get("practiceSummaryTitle").textContent="🎉 오늘의 문제 놀이 끝!";
      get("practiceSummaryText").textContent=
        "모두 "+completed+"문제를 풀었어요. 첫 도전에 맞힌 문제는 "+firstTry+"개! 다시 해보면 더 익숙해질 거예요.";
    }
    function start() {
      if (win.speechSynthesis)win.speechSynthesis.cancel();
      const level=get("practiceLevel").value,mode=get("practiceMode").value;
      try { round=buildRound(words,level,mode); }
      catch (_) { feedback("문제 목록을 만들지 못했어요. 학습 단계를 다시 선택해 주세요.","warn");return; }
      index=0;completed=0;firstTry=0;render();
    }
    get("practiceStart").addEventListener("click",start);
    get("practiceNext").addEventListener("click",()=>{
      if (!answered)return;
      if(index===round.length-1)showSummary();
      else {index++;if(win.speechSynthesis)win.speechSynthesis.cancel();render();}
    });
    get("practiceReplay").addEventListener("click",play);
    get("practiceAgain").addEventListener("click",start);
    doc.addEventListener("visibilitychange",()=>{
      if(doc.hidden && win.speechSynthesis)win.speechSynthesis.cancel();
    });
    win.addEventListener("pagehide",()=>{if(win.speechSynthesis)win.speechSynthesis.cancel();});
    start();
  }
  return Object.freeze({TYPES,MODES,shuffle,makeQuestion,buildRound,mount});
});
