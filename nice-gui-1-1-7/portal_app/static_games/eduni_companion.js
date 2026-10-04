(() => {
  "use strict";
  if (window.top !== window.self || document.getElementById("eduni-companion-launch")) return;
  const launch = document.createElement("button");
  launch.id = "eduni-companion-launch"; launch.type = "button"; launch.textContent = "🐣";
  launch.setAttribute("aria-label", "AI 친구 열기");
  const route = (() => {
    const path = location.pathname.replace(/\/$/, "") || "/";
    const routes = [["/pattern-train","pattern_train","패턴 연습"],["/sudoku","sudoku","스도쿠"],["/space","space","공간탐험"],["/facto","facto","팩토 연습"],["/hanja","hanja","한자 시험"],["/bubble-shooter","bubble_shooter","버블 슈터"],["/bubble","bubble","버블 게임"],["/baduk","baduk","바둑"],["/omok","omok","오목"],["/link","link","블럭 링크"],["/jungle-3d","jungle","정글 탐험"],["/jungle","jungle","정글 탐험"],["/reading","reading","독서기록"]];
    return routes.find(([prefix]) => path === prefix || path.startsWith(prefix + "/")) || [path,"general",cleanTitle()];
  })();
  const READING_CONTEXT_QUESTION = "독서기록 기능 안내 화면입니다. 저장된 책 제목, 글쓴이, 아이의 메모와 감상, 검색 내용, 사진, 기록 수와 집계 정보는 전달되지 않았습니다. 기록 방법이나 일반적인 책 이야기는 도울 수 있지만, 저장된 기록을 본 것처럼 말하지 마세요.";
  const readingPrompts = route[1] === "reading"
    ? '<button type="button" data-prompt="책 이야기 도와줘">책 이야기 도와줘</button><button type="button" data-prompt="기록하는 방법 알려줘">기록하는 방법 알려줘</button>'
    : '<button type="button" data-prompt="힌트 줘">힌트 줘</button><button type="button" data-prompt="쉽게 설명해 줘">쉽게 설명해 줘</button>';
  const panel = document.createElement("section"); panel.id = "eduni-companion-panel"; panel.setAttribute("aria-label", "AI 친구");
  panel.innerHTML = `<header><span>AI 친구</span><button type="button" class="close" aria-label="닫기">닫기</button></header><div class="quick">${readingPrompts}</div><div id="eduni-companion-screen" aria-live="polite"></div><section class="answer-card" aria-labelledby="eduni-companion-answer-title"><h2 id="eduni-companion-answer-title">친구의 답변</h2><div id="eduni-companion-answer" aria-live="polite">궁금한 것을 물어봐!</div></section><details id="eduni-companion-notice"><summary>체험과 개인정보 안내</summary><p>아직은 보호자 감독 아래 합성 문제로 시험하는 기능이에요. 독립적인 어린이 사용은 준비되지 않았어요. 질문과 화면에 보이는 문제 일부가 OpenAI로 전송되며 구독 사용량에 포함됩니다. 이름, 학교, 주소, 연락처, 사적인 기록은 입력하지 마세요. 음성 인식은 브라우저 제공자를 이용할 수 있어요.</p></details><textarea rows="2" maxlength="500" aria-label="AI 친구에게 질문" placeholder="질문을 적어 줘"></textarea><div class="actions"><button type="button" data-action="voice">🎙️ 말하기</button><button type="button" data-action="speak">🔊 읽어 줘</button><button type="button" data-action="send">보내기</button></div><div id="eduni-companion-status" role="status" aria-live="polite" aria-atomic="true"></div>`;
  document.body.append(launch, panel);
  const avoidBottomDock = () => {
    const target = launch.getBoundingClientRect(), viewportHeight = innerHeight; let offset = 0;
    for (const node of document.querySelectorAll("body *")) {
      if (node === launch || node === panel || panel.contains(node)) continue;
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      const opacity = Number(style.opacity);
      if (style.position !== "fixed" || style.display === "none" || style.visibility !== "visible" || !Number.isFinite(opacity) || opacity <= 0
          || rect.width <= 0 || rect.height < 32 || rect.height > viewportHeight / 2
          || rect.top < viewportHeight / 2 || rect.top >= viewportHeight || rect.bottom < viewportHeight - 12) continue;
      if (rect.left < target.right && rect.right > target.left) offset = Math.max(offset, viewportHeight - rect.top + 12);
    }
    offset = Math.min(offset, Math.max(0, viewportHeight - target.height - 14));
    document.documentElement.style.setProperty("--eduni-companion-offset", `${offset}px`);
  };
  requestAnimationFrame(avoidBottomDock); window.addEventListener("resize", avoidBottomDock);
  const input = panel.querySelector("textarea"), answer = panel.querySelector("#eduni-companion-answer"), status = panel.querySelector("#eduni-companion-status"), screenLabel = panel.querySelector("#eduni-companion-screen");
  const buttons = [...panel.querySelectorAll("button")];
  const readingContext = Object.freeze({activity:"reading",question:READING_CONTEXT_QUESTION,choices:Object.freeze([]),selected:""});
  let context = route[1] === "reading" ? readingContext : window.EDUNICompanionPendingContext || {activity:"general",question:"",choices:[],selected:""};
  if (route[1] === "reading") window.EDUNICompanionPendingContext = readingContext;
  let generation = 0, controller = null, busy = false, recognition = null, screenWatch = null;
  const cleanText = (value, max=600) => String(value || "").replace(/\s+/g," ").trim().slice(0,max);
  function cleanTitle(){return document.title.replace(/\s+/g," ").trim().slice(0,40)||"학습 화면";}
  const isVisible = node => { for(let n=node;n&&n!==document.documentElement;n=n.parentElement){const s=getComputedStyle(n);if(n.hidden||n.getAttribute("aria-hidden")==="true"||s.display==="none"||s.visibility==="hidden"||Number(s.opacity)===0)return false;}return true; };
  const visibleText = selector => [...document.querySelectorAll(selector)].filter(isVisible).map(node=>cleanText(node.textContent)).filter(Boolean).join(" ").slice(0,600);
  const visibleChoices = selector => [...document.querySelectorAll(selector)].filter(node=>!node.disabled&&isVisible(node)).map(node=>cleanText(node.textContent,60)).filter(Boolean).slice(0,10);
  const screenContext = () => {
    if (route[1] === "reading") return {payload:readingContext, label:"함께 보는 화면: 독서기록 · 일반 안내"};
    if (context.activity === "pattern_train" || context.activity === "sudoku") return {payload:context, label:`함께 보는 화면: ${context.activity==="pattern_train"?"패턴 연습":"스도쿠"} · ${context.question?"현재 문제":"문제 없음"}`};
    const [path, activity, title] = route;
    let question="", choices=[], selected="", mode="글로 읽을 수 없는 화면";
    const known = {
      "/space": ["#questionTitle, #questionCopy", "#choices .choice"],
      "/facto": ["#card .qtitle, #card .visual", "#card .choice label"],
      "/hanja": ["#card h2", "#card label"],
      "/bubble": ["#questionText", "#bubbleField .answer-bubble"],
      "/jungle": ["#quizQuestion, #questionText", "#quizOptions button, #answerButtons button"],
    };
    const selectorKey = path === "/jungle-3d" ? "/jungle" : path;
    if (known[selectorKey]) {
      mode="현재 문항이 보이지 않음";
      question = cleanText(visibleText(known[selectorKey][0]),530);
      choices = known[selectorKey][1] ? visibleChoices(known[selectorKey][1]) : [];
      if (question) { question=`문제의 보이는 글만 제공됨; 그림/도형/숨은 정답 정보는 포함되지 않음. ${question}`; mode="보이는 글만 참고"; }
      if (activity === "facto") selected=cleanText([...document.querySelectorAll("#card input:checked")].map(x=>isVisible(x.nextElementSibling)?x.nextElementSibling.textContent:"").filter(Boolean).join(", "),60);
      else if (activity === "hanja") selected=[...document.querySelectorAll("#card input:checked")].some(isVisible) ? "선택한 답 있음" : "";
    } else if (activity === "baduk" && window.EDUNIBadukEngine?.getState) {
      const s=window.EDUNIBadukEngine.getState();
      if (s && Array.isArray(s.board) && s.board.length >= 9 && s.board.length <= 19 && (s.currentPlayer===1||s.currentPlayer===2) && typeof s.gameOver==="boolean" && s.board.every(row=>Array.isArray(row)&&row.length===s.board.length&&row.every(v=>v===0||v===1||v===2))) {
        const cells=s.board.map(row=>row.map(v=>v===1?"B":v===2?"W":".").join("")).join("/");
        question=`현재 바둑판 ${s.board.length}줄(흑 B, 백 W, 빈 곳 .): ${cells}. 차례: ${s.currentPlayer===1?"흑":"백"}${s.gameOver?"; 대국 종료":""}`; mode="보드 요약";
      }
    } else if (activity === "omok") {
      const points=[...document.querySelectorAll("#board .point")], size=Math.sqrt(points.length);
      if (Number.isInteger(size) && size>=9 && size<=19) {
        const cells=points.map(p=>p.querySelector(".stone.black")?"B":p.querySelector(".stone.white")?"W":".");
        question=`현재 오목판 ${size}줄(흑 B, 백 W, 빈 곳 .): ${Array.from({length:size},(_,r)=>cells.slice(r*size,(r+1)*size).join("")).join("/")}. 차례: ${visibleText("#turnText")||"확인 불가"}`; mode="보드 요약";
      }
    } else if (activity === "link") {
      question="같은 종류의 블록을 이어 맞추는 게임입니다. 현재 보드 배열은 전달되지 않아, 보드에 관한 질문에는 어떤 블록이 보이는지 설명해 달라고 안내하세요."; mode="일반 안내";
    } else if (activity === "bubble_shooter") {
      question="한자 버블 슈터 게임입니다. 캔버스의 현재 목표와 배치는 전달되지 않아, 보이는 문제나 목표 한자를 글로 알려 달라고 안내하세요."; mode="일반 안내";
    } else if (activity === "general") {
      question=path==="/"?"학습 포털 메뉴 화면입니다. 각 활동의 문제 내용은 전달되지 않았습니다.":`현재 화면(${title})의 세부 내용은 전달되지 않았습니다. 질문과 관련된 화면 부분을 글로 설명해 달라고 안내하세요.`; mode="일반 안내";
    } else if (!question) {
      question=`현재 ${title} 화면의 구체적인 문항 또는 상태를 읽을 수 없습니다. 화면에서 궁금한 부분을 글로 알려 달라고 안내하세요.`; mode="일반 안내";
    }
    return {payload:{activity, question, choices, selected}, label:`함께 보는 화면: ${title} · ${mode}`};
  };
  let lastScreenPayload = JSON.stringify(screenContext().payload);
  screenLabel.textContent=screenContext().label;
  const setBusy = value => { busy=value; panel.setAttribute("aria-busy",String(value)); panel.querySelector('[data-action="send"]').disabled=value; panel.querySelectorAll("[data-prompt]").forEach(button=>button.disabled=value); };
  const stopAudio = () => { try { recognition?.stop(); } catch {} recognition=null; window.speechSynthesis?.cancel(); };
  const invalidate = () => { generation++; controller?.abort(); controller=null; setBusy(false); stopAudio(); };
  const close = () => { const wasBusy=busy; clearInterval(screenWatch); screenWatch=null; invalidate(); if(wasBusy) answer.textContent="궁금한 것을 물어봐!"; status.textContent=""; panel.classList.remove("open"); launch.focus(); };
  function refreshScreen() {
    const current=screenContext(), signature=JSON.stringify(current.payload);
    screenLabel.textContent=current.label;
    if(signature!==lastScreenPayload){lastScreenPayload=signature;answer.textContent="궁금한 것을 물어봐!";status.textContent=busy?"화면이 바뀌어서 답변을 취소했어. 다시 물어봐.":"";invalidate();}
  }
  window.EDUNICompanion = {
    setContext(next) {
      if (!next || typeof next !== "object") return;
      if (route[1] === "reading") {
        context = readingContext; window.EDUNICompanionPendingContext = readingContext;
        screenLabel.textContent=screenContext().label; answer.textContent="궁금한 것을 물어봐!"; status.textContent=""; invalidate();
        return;
      }
      context = {activity:next.activity,question:next.question,choices:next.choices,selected:next.selected};
      window.EDUNICompanionPendingContext = context;
      screenLabel.textContent=screenContext().label;
      answer.textContent="궁금한 것을 물어봐!"; status.textContent="";
      invalidate();
    }
  };
  launch.addEventListener("click", () => { refreshScreen(); panel.classList.add("open"); clearInterval(screenWatch); screenWatch=setInterval(refreshScreen,500); });
  panel.querySelector(".close").addEventListener("click", close);
  panel.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => { if(busy)return; input.value=button.dataset.prompt; send(); }));
  const send = async () => {
    const prompt=input.value.trim();
    if (!prompt || busy) return;
    const current=screenContext(), screenPayload=JSON.stringify(current.payload); screenLabel.textContent=current.label;
    if(screenPayload!==lastScreenPayload){answer.textContent="궁금한 것을 물어봐!";status.textContent="";lastScreenPayload=screenPayload;}
    const token=++generation; controller=new AbortController(); setBusy(true); answer.textContent="답을 준비하고 있어…"; status.textContent="답변을 기다리고 있어요…";
    try {
      const response=await fetch("/ai/companion/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"},body:JSON.stringify({prompt,context:current.payload}),signal:controller.signal,credentials:"same-origin"});
      const data=await response.json();
      if (token!==generation || !panel.classList.contains("open")) return;
      if (JSON.stringify(screenContext().payload)!==JSON.stringify(current.payload)) { answer.textContent="화면이 바뀌었어. 지금 화면을 보고 다시 물어봐."; status.textContent="화면이 바뀌어서 답을 표시하지 않았어."; return; }
      if (response.status===503 && data.error==="ai_unavailable") throw new Error("AI 친구가 아직 꺼져 있어. 보호자가 설정을 확인해 줘.");
      if (!response.ok || !data.ok || typeof data.answer!=="string") throw new Error("AI 친구가 잠시 쉴게. 조금 뒤에 다시 물어봐.");
      answer.textContent=data.answer; status.textContent="답변이 도착했어!";
    } catch (error) {
      if (token===generation && error.name!=="AbortError") { answer.textContent="아직 답을 받지 못했어. 다시 물어봐."; status.textContent=error.message||"연결할 수 없어요."; }
    } finally {
      if (token===generation) { controller=null; setBusy(false); }
    }
  };
  panel.querySelector('[data-action="send"]').addEventListener("click",send);
  input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();send();}});
  panel.querySelector('[data-action="speak"]').addEventListener("click",()=>{
    if (!window.speechSynthesis || !answer.textContent.trim()) return status.textContent="이 기기에서는 읽어주기를 사용할 수 없어요.";
    window.speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(answer.textContent); utterance.lang="ko-KR"; window.speechSynthesis.speak(utterance);
  });
  panel.querySelector('[data-action="voice"]').addEventListener("click",()=>{
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!Recognition || !window.isSecureContext) return status.textContent="이 접속에서는 음성 입력을 사용할 수 없어요. 글자로 적어 줘.";
    try { recognition?.stop(); } catch {};
    const token=generation, activeRecognition=new Recognition(); recognition=activeRecognition; activeRecognition.lang="ko-KR"; activeRecognition.interimResults=false; activeRecognition.maxAlternatives=1;
    activeRecognition.onresult=event=>{if(recognition===activeRecognition&&token===generation&&panel.classList.contains("open")){input.value=event.results[0][0].transcript;status.textContent="말한 내용을 확인한 뒤 보내기를 눌러 줘.";}};
    activeRecognition.onerror=()=>{if(recognition===activeRecognition&&token===generation)status.textContent="음성을 확인하지 못했어요. 글자로 적어 줘.";};
    try { activeRecognition.start(); status.textContent="말해 주세요. 인식된 문장은 확인 후 보낼 수 있어요."; }
    catch { recognition=null; status.textContent="음성을 시작할 수 없어요. 글자로 적어 줘."; }
  });
  window.addEventListener("pagehide",()=>{clearInterval(screenWatch);invalidate();},{once:true});
  if (window.EDUNICompanionPendingContext) window.EDUNICompanion.setContext(window.EDUNICompanionPendingContext);
})();
