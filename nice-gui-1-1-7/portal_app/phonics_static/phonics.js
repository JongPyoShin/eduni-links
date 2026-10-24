/* EDUNI English phonics: curated decoding cards + opt-in Web Speech practice.
   No recordings, transcripts, or child profiles are transmitted to EDUNI. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.EDUNIPhonics = api;
  if (root && root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", function () { api.mount(root); });
    } else api.mount(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SOUND = Object.freeze({
    s:["/s/","ssss"], m:["/m/","mmmm"], n:["/n/","nnnn"], f:["/f/","ffff"],
    r:["/ɹ/","rrrr"], l:["/l/","llll"], h:["/h/","hhhh"], v:["/v/","vvvv"],
    a:["/æ/","ah"], e:["/ɛ/","eh"], i:["/ɪ/","ih"], o:["/ɑ/","ah"],
    u:["/ʌ/","uh"], t:["/t/","tuh"], p:["/p/","puh"], k:["/k/","kuh"],
    b:["/b/","buh"], d:["/d/","duh"], g:["/ɡ/","guh"],
    sh:["/ʃ/","shhh"], ch:["/tʃ/","ch"], th:["/θ/","thhh"]
  });
  // Use curated phoneme sequences; never derive phonics pronunciation from spelling alone.
  const SOURCE = [
    ["sun","해","☀️","start","s u n"],
    ["man","남자","👨","start","m a n"],
    ["fan","부채","🪭","start","f a n"],
    ["fin","지느러미","🐟","start","f i n"],
    ["run","달리다","🏃","start","r u n"],
    ["sit","앉다","🪑","start","s i t"],
    ["sat","앉았다","🧸","start","s a t"],
    ["mat","매트","🟩","start","m a t"],
    ["map","지도","🗺️","start","m a p"],
    ["pen","펜","🖊️","start","p e n"],
    ["ten","열","🔟","start","t e n"],
    ["pin","핀","📍","start","p i n"],
    ["cat","고양이","🐱","more","k a t","c a t"],
    ["hat","모자","🎩","more","h a t"],
    ["cup","컵","🥤","more","k u p","c u p"],
    ["bug","벌레","🐞","more","b u g"],
    ["bed","침대","🛏️","more","b e d"],
    ["red","빨강","🔴","more","r e d"],
    ["pig","돼지","🐷","more","p i g"],
    ["hop","깡충 뛰다","🐰","more","h o p"],
    ["ship","배","🚢","more","sh i p"],
    ["fish","물고기","🐠","more","f i sh"],
    ["chip","감자칩","🍟","more","ch i p"],
    ["thin","얇은","📄","more","th i n"]
  ];
  function makeWord(entry) {
    const [word, meaning, emoji, level, soundKeys, graphemeKeys] = entry;
    const keys = soundKeys.split(" ");
    const graphemes = (graphemeKeys || soundKeys).split(" ");
    if (keys.length !== graphemes.length || graphemes.join("") !== word) {
      throw new Error("Invalid phonics word: " + word);
    }
    return Object.freeze({
      word, meaning, emoji, level,
      sounds:Object.freeze(keys.map((key,i) => Object.freeze({
        grapheme:graphemes[i], ipa:SOUND[key][0], cue:SOUND[key][1]
      })))
    });
  }
  const WORDS = Object.freeze(SOURCE.map(makeWord));
  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z\s]/g," ").trim().replace(/\s+/g," ");
  }
  function evaluate(word, alternatives) {
    const target=normalize(word),heard=(alternatives || []).map(normalize).filter(Boolean);
    if (!heard.length) return {status:"empty",heard:""};
    const accepted=[target,"a "+target,"the "+target];
    return {status:heard.some(t=>accepted.includes(t))?"match":"retry",heard:heard[0]};
  }
  function forLevel(level) {
    return WORDS.filter(w=>level==="all" || w.level===level);
  }
  function mount(win) {
    const doc=win.document, el=id=>doc.getElementById(id);
    if (!el("phonicsLesson")) return;
    const synth=win.speechSynthesis;
    const Recognition=win.SpeechRecognition || win.webkitSpeechRecognition;
    let level="start",idx=0,token=0,activeRecognition=null,completed=new Set(),sessionCount=0;
    let busy=false;
    const cards=()=>forLevel(level);
    const item=()=>cards()[idx];
    const status=(text,type="info")=>{
      const node=el("feedback");node.textContent=text;node.dataset.tone=type;
    };
    const stopSpeak=()=>{token++;if(synth&&synth.cancel)synth.cancel();el("playSounds").disabled=false;el("playWhole").disabled=false;el("playSlow").disabled=false;};
    function stopMic(){
      const running=activeRecognition;activeRecognition=null;
      if(running){try{running.abort();}catch(_e){}}
      busy=false;el("recordButton").disabled=false;el("recordButton").textContent="🎙️ 내가 읽기";
    }
    function selectWord(position){
      stopSpeak();stopMic();idx=Math.max(0,Math.min(cards().length-1,position));
      const w=item();
      el("word").textContent=w.word;
      el("wordEmoji").textContent=w.emoji;
      el("meaning").textContent=w.meaning;
      el("progress").textContent=(idx+1)+" / "+cards().length;
      el("phonemes").replaceChildren();
      w.sounds.forEach((sound,i)=>{
        const button=doc.createElement("button");
        button.type="button";button.className="sound-tile";
        button.setAttribute("aria-label",sound.grapheme+" 음가 "+sound.ipa);
        const spelling=doc.createElement("span");spelling.className="sound-letter";spelling.textContent=sound.grapheme;
        const ipa=doc.createElement("span");ipa.className="ipa";ipa.textContent=sound.ipa;
        const icon=doc.createElement("span");icon.className="tile-speak";icon.textContent="🔊";
        button.append(spelling,ipa,icon);
        button.addEventListener("click",function(){speakSound(i);});
        el("phonemes").appendChild(button);
      });
      el("previous").disabled=idx===0;el("next").disabled=idx===cards().length-1;
      el("recordButton").disabled=!Recognition;
      el("micHelp").textContent=Recognition ?
        "마이크를 누르면 브라우저가 영어 한 단어를 인식해요. 부모님과 함께 눌러 주세요." :
        "이 브라우저에서는 음성 인식을 사용할 수 없어요. 보호자 확인으로 연습할 수 있어요.";
      el("recordButton").textContent=Recognition?"🎙️ 내가 읽기":"🎙️ 음성 인식 미지원";
      el("wordDone").textContent=completed.has(w.word)?"✅ 연습했어요":"☆ 연습 전";
      status("① 음가를 살펴보고 ② 전체 단어를 듣고 ③ 따라 읽어 봐요.");
    }
    function say(text, rate, currentToken){
      return new Promise(resolve=>{
        if(!synth||!win.SpeechSynthesisUtterance){status("이 브라우저에서는 음성 재생을 지원하지 않아요.","warning");resolve();return;}
        if(currentToken!==token){resolve();return;}
        let finished=false, timer=null;
        const done=()=>{if(finished)return;finished=true;if(timer)win.clearTimeout(timer);resolve();};
        const utterance=new win.SpeechSynthesisUtterance(text);
        utterance.lang="en-US";utterance.rate=rate;utterance.pitch=1;utterance.volume=1;
        const voices=synth.getVoices?synth.getVoices():[];
        const preferred=voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith("en-us")) ||
                        voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith("en"));
        if(preferred)utterance.voice=preferred;
        utterance.onend=done;utterance.onerror=done;
        timer=win.setTimeout(done,5000);
        try{synth.speak(utterance);}catch(_e){done();}
      });
    }
    async function speakSound(i){
      stopMic();stopSpeak();
      const t=token,s=item().sounds[i];
      const buttons=[...el("phonemes").querySelectorAll("button")];
      buttons.forEach(b=>b.classList.remove("active"));
      buttons[i]?.classList.add("active");
      status(s.grapheme+" → "+s.ipa+" (합성 음가는 실제 소리와 조금 다를 수 있어요.)");
      await say(s.cue,.7,t);
      if(t===token)buttons[i]?.classList.remove("active");
    }
    async function readBlend(){
      stopMic();stopSpeak();
      const t=token,w=item(),buttons=[...el("phonemes").querySelectorAll("button")];
      el("playSounds").disabled=true;
      status("소리를 이어서 읽어 볼게요. 끊지 말고 연결해요!");
      for(let i=0;i<w.sounds.length;i++){
        if(t!==token)break;
        buttons.forEach(b=>b.classList.remove("active"));
        buttons[i]?.classList.add("active");
        await say(w.sounds[i].cue,.8,t);
      }
      if(t===token){
        buttons.forEach(b=>b.classList.remove("active"));
        await say(w.word,.74,t);
      }
      if(t===token)el("playSounds").disabled=false;
    }
    async function readWhole(slow){
      stopMic();stopSpeak();const t=token;
      status(slow?"조금 천천히 듣고 따라 읽어 봐요.":"전체 단어를 자연스럽게 들어 봐요.");
      await say(item().word,slow?.66:.95,t);
    }
    function markSuccess(manual){
      completed.add(item().word);
      el("wordDone").textContent="✅ 연습했어요";
      el("completed").textContent=completed.size+"개 연습";
      if(manual)status("👏 보호자와 함께 읽었어요! 다음 단어에도 도전해 봐요.","success");
      else status("🌟 단어를 알아들었어요! 정말 잘했어요! 다음 단어도 읽어 봐요.","success");
    }
    function startListening(){
      if(!Recognition){status("이 브라우저에서는 마이크 인식이 지원되지 않아요. 보호자와 함께 확인해 주세요.","warning");return;}
      if(busy)return;
      stopSpeak();stopMic();
      const target=item().word;
      let rec;
      try{rec=new Recognition();}catch(_e){status("음성 인식을 시작할 수 없어요.","warning");return;}
      activeRecognition=rec;busy=true;
      rec.lang="en-US";rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=5;
      el("recordButton").disabled=true;el("recordButton").textContent="🎙️ 듣는 중…";
      status("🎙️ 이제 '"+target+"'를 한 번 읽어 주세요. 음성이 인식될 때까지 조용히 기다려요.");
      rec.onresult=event=>{
        if(activeRecognition!==rec || item().word!==target)return;
        const alternatives=[];
        for(let i=event.resultIndex||0;i<event.results.length;i++){
          const result=event.results[i];
          if(!result.isFinal)continue;
          for(let j=0;j<result.length;j++)alternatives.push(result[j].transcript);
        }
        const outcome=evaluate(target,alternatives);
        if(outcome.status==="match")markSuccess(false);
        else if(outcome.status==="empty")status("잘 듣지 못했어요. 다시 한번 읽어 주세요.","warning");
        else status("이렇게 들렸어요: "+outcome.heard+" · 단어를 듣고 천천히 다시 해볼까요?","retry");
      };
      rec.onerror=event=>{
        if(activeRecognition!==rec)return;
        const messages={
          "not-allowed":"마이크 권한이 꺼져 있어요. 브라우저에서 허용해 주세요.",
          "service-not-allowed":"브라우저의 음성 인식 서비스가 차단됐어요.",
          "audio-capture":"마이크를 찾지 못했어요.",
          "no-speech":"목소리가 들리지 않았어요. 다시 도전해 봐요.",
          "network":"음성 인식 서비스에 연결하지 못했어요. 보호자 확인으로 진행할 수 있어요.",
          "language-not-supported":"영어 음성 인식을 지원하지 않아요."
        };
        status(messages[event.error]||"음성 인식을 완료하지 못했어요. 다시 시도해 주세요.","warning");
      };
      rec.onend=()=>{if(activeRecognition===rec){activeRecognition=null;busy=false;el("recordButton").disabled=false;el("recordButton").textContent="🎙️ 내가 읽기";}};
      try{rec.start();}catch(_e){stopMic();status("마이크를 시작할 수 없어요. 권한과 브라우저를 확인해 주세요.","warning");}
    }
    el("level").addEventListener("change",function(e){level=e.target.value;idx=0;selectWord(0);});
    el("previous").addEventListener("click",()=>selectWord(idx-1));
    el("next").addEventListener("click",()=>selectWord(idx+1));
    el("playSounds").addEventListener("click",readBlend);
    el("playWhole").addEventListener("click",()=>readWhole(false));
    el("playSlow").addEventListener("click",()=>readWhole(true));
    el("recordButton").addEventListener("click",startListening);
    el("parentConfirm").addEventListener("click",()=>{stopMic();markSuccess(true);});
    doc.addEventListener("visibilitychange",()=>{if(doc.hidden){stopSpeak();stopMic();}});
    win.addEventListener("pagehide",()=>{stopSpeak();stopMic();});
    selectWord(0);
  }
  return Object.freeze({SOUND, WORDS, normalize, evaluate, forLevel, mount});
});