(() => {
  "use strict";
  if (window.top !== window.self || document.getElementById("eduni-companion-launch")) return;
  const launch = document.createElement("button");
  launch.id = "eduni-companion-launch"; launch.type = "button"; launch.textContent = "🐣";
  launch.setAttribute("aria-label", "AI 친구 열기");
  const panel = document.createElement("section"); panel.id = "eduni-companion-panel"; panel.setAttribute("aria-label", "AI 친구");
  panel.innerHTML = '<header><span>AI 친구</span><button type="button" class="close" aria-label="닫기">닫기</button></header><div class="quick"><button type="button" data-prompt="힌트 줘">힌트 줘</button><button type="button" data-prompt="쉽게 설명해 줘">쉽게 설명해 줘</button></div><div id="eduni-companion-answer" aria-live="polite">궁금한 것을 물어봐!</div><div id="eduni-companion-notice">아직은 보호자 감독 아래 합성 문제로만 시험하는 기능이에요. 독립적인 어린이 사용은 준비되지 않았어요. 질문과 문제 일부가 OpenAI로 전송되며 구독 사용량에 포함됩니다. 이름, 학교, 주소, 연락처, 사적인 기록은 입력하지 마세요. 음성 인식은 브라우저 제공자를 이용할 수 있어요.</div><label><input type="checkbox" data-action="guardian"> 보호자와 함께 사용해요</label><textarea maxlength="500" aria-label="AI 친구에게 질문" placeholder="질문을 적어 줘"></textarea><div class="actions"><button type="button" data-action="voice">🎙️ 말하기</button><button type="button" data-action="speak">🔊 읽어 줘</button><button type="button" data-action="send">보내기</button></div><div id="eduni-companion-status" role="status"></div>';
  document.body.append(launch, panel);
  const avoidBottomDock = () => {
    const target = launch.getBoundingClientRect(); let offset = 0;
    for (const node of document.querySelectorAll("body *")) {
      if (node === launch || node === panel || panel.contains(node)) continue;
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      if (style.position !== "fixed" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.height < 32 || rect.bottom < innerHeight - 12) continue;
      if (rect.left < target.right && rect.right > target.left) offset = Math.max(offset, innerHeight - rect.top + 12);
    }
    document.documentElement.style.setProperty("--eduni-companion-offset", `${offset}px`);
  };
  requestAnimationFrame(avoidBottomDock); window.addEventListener("resize", avoidBottomDock);
  const input = panel.querySelector("textarea"), answer = panel.querySelector("#eduni-companion-answer"), status = panel.querySelector("#eduni-companion-status");
  const buttons = [...panel.querySelectorAll("button")];
  let context = window.EDUNICompanionPendingContext || {activity:"general",question:"",choices:[],selected:""};
  let generation = 0, controller = null, busy = false, recognition = null;
  const setBusy = value => { busy=value; panel.querySelector('[data-action="send"]').disabled=value; };
  const stopAudio = () => { try { recognition?.stop(); } catch {} recognition=null; window.speechSynthesis?.cancel(); };
  const invalidate = () => { generation++; controller?.abort(); controller=null; setBusy(false); stopAudio(); };
  const close = () => { invalidate(); status.textContent=""; panel.classList.remove("open"); launch.focus(); };
  window.EDUNICompanion = {
    setContext(next) {
      if (!next || typeof next !== "object") return;
      context = {activity:next.activity,question:next.question,choices:next.choices,selected:next.selected};
      window.EDUNICompanionPendingContext = context;
      answer.textContent="궁금한 것을 물어봐!"; status.textContent="";
      invalidate();
    }
  };
  launch.addEventListener("click", () => { panel.classList.add("open"); input.focus(); });
  panel.querySelector(".close").addEventListener("click", close);
  panel.querySelectorAll("[data-prompt]").forEach(button => button.addEventListener("click", () => { input.value=button.dataset.prompt; input.focus(); }));
  const send = async () => {
    const prompt=input.value.trim();
    if (!prompt || busy) return;
    if (!panel.querySelector('[data-action="guardian"]').checked) { status.textContent="보호자와 함께 내용을 확인한 뒤 사용할 수 있어요."; return; }
    const token=++generation; controller=new AbortController(); setBusy(true); status.textContent="답변을 기다리고 있어요…";
    try {
      const response=await fetch("/ai/companion/chat",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"},body:JSON.stringify({prompt,context}),signal:controller.signal,credentials:"same-origin"});
      const data=await response.json();
      if (token!==generation || !panel.classList.contains("open")) return;
      if (response.status===503 && data.error==="ai_unavailable") throw new Error("AI 친구가 아직 꺼져 있어. 보호자가 설정을 확인해 줘.");
      if (!response.ok || !data.ok || typeof data.answer!=="string") throw new Error("AI 친구가 잠시 쉴게. 조금 뒤에 다시 물어봐.");
      answer.textContent=data.answer; status.textContent="답변이 도착했어!";
    } catch (error) {
      if (token===generation && error.name!=="AbortError") status.textContent=error.message||"연결할 수 없어요.";
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
    if (!panel.querySelector('[data-action="guardian"]').checked) { status.textContent="보호자와 함께 내용을 확인한 뒤 음성 입력을 사용할 수 있어요."; return; }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if (!Recognition || !window.isSecureContext) return status.textContent="이 접속에서는 음성 입력을 사용할 수 없어요. 글자로 적어 줘.";
    try { recognition?.stop(); } catch {};
    const token=generation, activeRecognition=new Recognition(); recognition=activeRecognition; activeRecognition.lang="ko-KR"; activeRecognition.interimResults=false; activeRecognition.maxAlternatives=1;
    activeRecognition.onresult=event=>{if(recognition===activeRecognition&&token===generation&&panel.classList.contains("open")){input.value=event.results[0][0].transcript;input.focus();status.textContent="말한 내용을 확인한 뒤 보내기를 눌러 줘.";}};
    activeRecognition.onerror=()=>{if(recognition===activeRecognition&&token===generation)status.textContent="음성을 확인하지 못했어요. 글자로 적어 줘.";};
    try { activeRecognition.start(); status.textContent="말해 주세요. 인식된 문장은 확인 후 보낼 수 있어요."; }
    catch { recognition=null; status.textContent="음성을 시작할 수 없어요. 글자로 적어 줘."; }
  });
  window.addEventListener("pagehide",invalidate,{once:true});
  if (window.EDUNICompanionPendingContext) window.EDUNICompanion.setContext(window.EDUNICompanionPendingContext);
})();
