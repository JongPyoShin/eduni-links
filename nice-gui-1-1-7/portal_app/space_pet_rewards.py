from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


_PET_STYLES = r'''
    .top-actions { display:flex; align-items:center; gap:8px; }
    .pet-wallet { min-height:42px; padding:0 12px; border:1px solid rgba(24,32,51,.1); border-radius:12px; background:#fff8dd; color:#7c4a03; font-weight:950; cursor:pointer; box-shadow:0 6px 18px rgba(180,120,0,.08); }
    .pet-wallet:active { transform:translateY(1px); }
    .pet-overlay[hidden] { display:none; }
    .pet-overlay { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:16px; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); }
    .pet-dialog { width:min(560px,100%); max-height:min(760px,calc(100dvh - 32px)); overflow:auto; position:relative; padding:24px; border-radius:26px; background:#fff; box-shadow:0 28px 80px rgba(15,23,42,.28); }
    .pet-close { position:absolute; right:14px; top:14px; width:42px; height:42px; border:0; border-radius:50%; background:#f1f5f9; color:#475467; font-size:22px; font-weight:1000; cursor:pointer; }
    .pet-kicker { margin:0; color:#7c3aed; font-weight:950; }
    .pet-title { margin:4px 44px 4px 0; font-size:clamp(28px,6vw,42px); line-height:1.1; }
    .pet-copy { margin:8px 0 18px; color:#667085; font-weight:800; line-height:1.5; }
    .pet-species-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
    .pet-species { min-height:132px; padding:14px 8px; border:2px solid #e2e8f0; border-radius:20px; background:#f8fafc; cursor:pointer; font-weight:950; color:#344054; }
    .pet-species b { display:block; font-size:52px; line-height:1.1; margin-bottom:7px; }
    .pet-species:hover { border-color:#a5b4fc; background:#eef2ff; }
    .pet-home { display:grid; gap:14px; }
    .pet-card { display:grid; grid-template-columns:120px 1fr; align-items:center; gap:18px; padding:18px; border:1px solid #e2e8f0; border-radius:22px; background:linear-gradient(135deg,#fff7ed,#f5f3ff); }
    .pet-avatar { width:112px; height:112px; display:grid; place-items:center; border-radius:28px; background:#fff; font-size:70px; box-shadow:0 12px 28px rgba(91,91,214,.12); }
    .pet-stage { margin:0 0 4px; color:#7c3aed; font-size:15px; font-weight:950; }
    .pet-name { margin:0; font-size:28px; font-weight:1000; }
    .pet-care-copy { margin:5px 0 0; color:#667085; font-weight:800; line-height:1.45; }
    .pet-progress { height:12px; margin-top:12px; overflow:hidden; border-radius:999px; background:#e9eef7; }
    .pet-progress > div { height:100%; width:0; border-radius:999px; background:linear-gradient(90deg,#f59e0b,#8b5cf6); transition:width .2s ease; }
    .pet-balance { padding:12px 14px; border-radius:16px; background:#fff8dd; color:#7c4a03; text-align:center; font-size:18px; font-weight:1000; }
    .pet-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .pet-action { min-height:72px; border:0; border-radius:18px; background:#eef2ff; color:#3730a3; font-weight:1000; cursor:pointer; }
    .pet-action:nth-child(2) { background:#ecfdf5; color:#166534; }
    .pet-action:active { transform:translateY(1px); }
    .pet-message { min-height:48px; display:grid; place-items:center; padding:10px 12px; border-radius:14px; background:#f8fafc; color:#475467; text-align:center; font-weight:900; line-height:1.4; }
    .pet-result-button { min-height:56px; border-radius:18px; padding:0 24px; border:2px solid #f5c451; background:#fff8dd; color:#7c4a03; font-size:18px; font-weight:950; cursor:pointer; }
    @media (max-width:560px) {
      .top-actions { gap:5px; }
      .pet-wallet { padding:0 9px; font-size:13px; }
      .portal-link { padding:10px 9px; }
      .pet-dialog { padding:20px 14px; border-radius:22px; }
      .pet-species-grid { grid-template-columns:1fr; }
      .pet-species { min-height:82px; display:flex; align-items:center; justify-content:center; gap:12px; }
      .pet-species b { margin:0; font-size:42px; }
      .pet-card { grid-template-columns:86px 1fr; gap:12px; padding:14px; }
      .pet-avatar { width:82px; height:82px; border-radius:22px; font-size:54px; }
      .pet-name { font-size:23px; }
    }
'''


_PET_OVERLAY = r'''
  <div id="petOverlay" class="pet-overlay" hidden>
    <section class="pet-dialog" role="dialog" aria-modal="true" aria-labelledby="petDialogTitle">
      <button id="petCloseBtn" class="pet-close" type="button" aria-label="펫 창 닫기">×</button>
      <p class="pet-kicker">🐾 EDUNI 펫하우스</p>
      <h2 id="petDialogTitle" class="pet-title">문제를 풀고 펫을 키워보자!</h2>
      <p class="pet-copy">정답을 맞혀 모은 포인트로 먹이를 주고 함께 놀면 펫이 차근차근 자라요. 포인트와 펫 기록은 이 기기에만 저장돼요.</p>

      <div id="petChoosePanel">
        <div class="pet-species-grid" aria-label="키울 펫 고르기">
          <button class="pet-species" type="button" data-pet-species="dog"><b>🐶</b>강아지</button>
          <button class="pet-species" type="button" data-pet-species="cat"><b>🐱</b>고양이</button>
          <button class="pet-species" type="button" data-pet-species="rabbit"><b>🐰</b>토끼</button>
        </div>
        <div class="pet-message" style="margin-top:12px;">마음에 드는 친구 한 마리를 골라주세요.</div>
      </div>

      <div id="petHomePanel" class="pet-home" hidden>
        <div class="pet-card">
          <div id="petAvatar" class="pet-avatar">🐶</div>
          <div>
            <p id="petStage" class="pet-stage">1단계 · 꼬물이</p>
            <p id="petName" class="pet-name">강아지</p>
            <p id="petCareCopy" class="pet-care-copy"></p>
            <div class="pet-progress" aria-label="펫 성장 진행도"><div id="petProgressBar"></div></div>
          </div>
        </div>
        <div id="petPointBalance" class="pet-balance">🪙 보유 포인트 0P</div>
        <div class="pet-actions">
          <button id="petFeedBtn" class="pet-action" type="button">🍎 먹이 주기<br>20P</button>
          <button id="petPlayBtn" class="pet-action" type="button">🎾 같이 놀기<br>30P</button>
        </div>
        <div id="petMessage" class="pet-message">문제를 풀어 포인트를 모아보자!</div>
      </div>
    </section>
  </div>
'''


_PET_SCRIPT = r'''
  <script>
    (() => {
      'use strict';
      const POINTS_KEY='eduniSpacePointsV1';
      const PET_KEY='eduniSpacePetV1';
      const SPECIES={
        dog:{name:'강아지',emoji:['🐶','🐶','🐕','🐕']},
        cat:{name:'고양이',emoji:['🐱','🐱','🐈','🐈']},
        rabbit:{name:'토끼',emoji:['🐰','🐰','🐰','🐰']},
      };
      const STAGES=[
        {min:0,next:3,label:'1단계 · 꼬물이'},
        {min:3,next:8,label:'2단계 · 아기 펫'},
        {min:8,next:15,label:'3단계 · 쑥쑥 크는 펫'},
        {min:15,next:null,label:'4단계 · 멋진 어른 펫'},
      ];
      const $pet=(id) => document.getElementById(id);
      let sessionPoints=0;

      function safeNumber(value) {
        const number=Number(value);
        return Number.isFinite(number) && number>=0 ? Math.floor(number) : 0;
      }
      function readPoints() {
        try { return safeNumber(localStorage.getItem(POINTS_KEY)); } catch (_) { return 0; }
      }
      function writePoints(points) {
        const safe=safeNumber(points);
        try { localStorage.setItem(POINTS_KEY,String(safe)); } catch (_) {}
        return safe;
      }
      function readPet() {
        try {
          const parsed=JSON.parse(localStorage.getItem(PET_KEY) || 'null');
          if (!parsed || !SPECIES[parsed.species]) return null;
          return {
            species:parsed.species,
            care:safeNumber(parsed.care),
            feedCount:safeNumber(parsed.feedCount),
            playCount:safeNumber(parsed.playCount),
          };
        } catch (_) { return null; }
      }
      function writePet(pet) {
        try { localStorage.setItem(PET_KEY,JSON.stringify(pet)); } catch (_) {}
      }
      function stageIndex(care) {
        if (care>=15) return 3;
        if (care>=8) return 2;
        if (care>=3) return 1;
        return 0;
      }
      function growthPercent(care,index) {
        const stage=STAGES[index];
        if (stage.next===null) return 100;
        const range=stage.next-stage.min;
        return Math.max(0,Math.min(100,((care-stage.min)/range)*100));
      }
      function renderPet(message='') {
        const points=readPoints();
        const pet=readPet();
        const balance=$pet('pointBalance');
        if (balance) balance.textContent=`🪙 ${points}P`;
        const topEmoji=$pet('petTopEmoji');
        if (topEmoji) topEmoji.textContent=pet ? SPECIES[pet.species].emoji[stageIndex(pet.care)] : '🐾';
        const choose=$pet('petChoosePanel');
        const home=$pet('petHomePanel');
        if (!choose || !home) return;
        choose.hidden=Boolean(pet);
        home.hidden=!pet;
        if (!pet) return;
        const index=stageIndex(pet.care);
        const species=SPECIES[pet.species];
        $pet('petAvatar').textContent=species.emoji[index];
        $pet('petStage').textContent=STAGES[index].label;
        $pet('petName').textContent=species.name;
        $pet('petPointBalance').textContent=`🪙 보유 포인트 ${points}P`;
        $pet('petProgressBar').style.width=`${growthPercent(pet.care,index)}%`;
        if (STAGES[index].next===null) {
          $pet('petCareCopy').textContent=`돌봄 ${pet.care}회 · 최고 성장 단계에 도착했어요!`;
        } else {
          $pet('petCareCopy').textContent=`돌봄 ${pet.care}회 · 다음 성장까지 ${STAGES[index].next-pet.care}회`;
        }
        if (message) $pet('petMessage').textContent=message;
      }
      function choosePet(species) {
        if (!SPECIES[species] || readPet()) return;
        writePet({species,care:0,feedCount:0,playCount:0});
        renderPet(`${SPECIES[species].name}와 친구가 되었어! 문제를 풀어 돌봄 포인트를 모아보자. 🥳`);
      }
      function careForPet(kind) {
        const pet=readPet();
        if (!pet) return;
        const config=kind==='feed'
          ? {cost:20,care:1,message:'맛있게 먹었어! 🍎 돌봄 +1'}
          : {cost:30,care:2,message:'신나게 놀았어! 🎾 돌봄 +2'};
        const points=readPoints();
        if (points<config.cost) {
          renderPet(`포인트가 ${config.cost-points}P 더 필요해. 문제를 조금 더 풀어보자!`);
          return;
        }
        const beforeStage=stageIndex(pet.care);
        writePoints(points-config.cost);
        pet.care+=config.care;
        if (kind==='feed') pet.feedCount+=1;
        else pet.playCount+=1;
        writePet(pet);
        const afterStage=stageIndex(pet.care);
        const message=afterStage>beforeStage ? `🎉 성장했어! ${STAGES[afterStage].label}이 되었어!` : config.message;
        renderPet(message);
      }
      function openPet() {
        const overlay=$pet('petOverlay');
        if (!overlay) return;
        renderPet();
        overlay.hidden=false;
        document.body.style.overflow='hidden';
      }
      function closePet() {
        const overlay=$pet('petOverlay');
        if (!overlay) return;
        overlay.hidden=true;
        document.body.style.overflow='';
      }
      function award(amount) {
        const earned=safeNumber(amount);
        if (!earned) return 0;
        writePoints(readPoints()+earned);
        sessionPoints+=earned;
        renderPet();
        return earned;
      }
      function startRun() {
        sessionPoints=0;
        renderPet();
      }
      function runSummary() {
        return sessionPoints>0
          ? `이번 탐험에서 🪙 ${sessionPoints}P를 모았어! 펫에게 먹이를 주거나 같이 놀아보자.`
          : '이번에는 포인트를 못 모았지만, 다시 도전하면 펫을 돌볼 수 있어!';
      }

      window.EDUNI_PET_REWARDS=Object.freeze({
        version:1,
        storage:'localStorage-only',
        firstTryPoints:10,
        retryPoints:5,
        feedCost:20,
        playCost:30,
        award,
        startRun,
        runSummary,
        open:openPet,
      });

      $pet('petBarBtn')?.addEventListener('click',openPet);
      $pet('petResultBtn')?.addEventListener('click',openPet);
      $pet('petCloseBtn')?.addEventListener('click',closePet);
      $pet('petOverlay')?.addEventListener('click',(event) => { if (event.target===$pet('petOverlay')) closePet(); });
      document.addEventListener('keydown',(event) => { if (event.key==='Escape') closePet(); });
      document.querySelectorAll('[data-pet-species]').forEach((button) => {
        button.addEventListener('click',() => choosePet(button.dataset.petSpecies));
      });
      $pet('petFeedBtn')?.addEventListener('click',() => careForPet('feed'));
      $pet('petPlayBtn')?.addEventListener('click',() => careForPet('play'));
      renderPet();
    })();
  </script>
'''


_CHOOSE_REPLACEMENT = r'''      function choose(key,button) {
        if (state.resolved || button.disabled) return;
        state.attempts+=1;
        if (key===state.question.correctKey) {
          state.resolved=true;
          state.stars+=1;
          const earnedPoints=window.EDUNI_PET_REWARDS ? window.EDUNI_PET_REWARDS.award(state.attempts===1 ? 10 : 5) : 0;
          button.classList.add('correct');
          [...$('choices').querySelectorAll('.choice')].forEach((item) => item.disabled=true);
          $('stars').textContent=`⭐ ${state.stars}`;
          $('feedback').className='feedback good';
          const pointText=earnedPoints ? ` · 🪙 +${earnedPoints}P` : '';
          $('feedback').textContent=(state.attempts===1 ? '정답! 한눈에 잘 찾았어! 🌟' : '맞았어! 다시 생각해서 찾아냈네! 🌟')+pointText;
          $('nextBtn').style.display='inline-flex';
          return;
        }

        button.classList.add('wrong');
        button.disabled=true;
        if (state.attempts===1) {
          $('feedback').className='feedback try';
          $('feedback').textContent=`한 번 더! ${state.question.hint}`;
          return;
        }

        state.resolved=true;
        markCorrectChoice();
        $('feedback').className='feedback try';
        $('feedback').textContent='정답 위치를 확인했어. 다음 문제에서 다시 도전해보자!';
        $('nextBtn').style.display='inline-flex';
      }

'''


def _inject_pet_rewards(html: str) -> str:
    if "window.EDUNI_PET_REWARDS" in html:
        return html

    if "</style>" not in html:
        raise RuntimeError("EDUNI pet style marker missing")
    html = html.replace("</style>", _PET_STYLES + "  </style>", 1)

    topbar_marker = '      <a class="portal-link" href="/portal">포털로</a>'
    topbar_replacement = (
        '      <div class="top-actions">\n'
        '        <button id="petBarBtn" class="pet-wallet" type="button"><span id="petTopEmoji">🐾</span> <span id="pointBalance">🪙 0P</span></button>\n'
        '        <a class="portal-link" href="/portal">포털로</a>\n'
        '      </div>'
    )
    if topbar_marker not in html:
        raise RuntimeError("EDUNI pet topbar marker missing")
    html = html.replace(topbar_marker, topbar_replacement, 1)

    result_marker = '          <button id="replayBtn" class="primary" type="button">한 번 더!</button>'
    result_replacement = (
        result_marker + '\n'
        '          <button id="petResultBtn" class="pet-result-button" type="button">🐾 펫 돌보기</button>'
    )
    if result_marker not in html:
        raise RuntimeError("EDUNI pet result marker missing")
    html = html.replace(result_marker, result_replacement, 1)

    if "</main>" not in html:
        raise RuntimeError("EDUNI pet overlay marker missing")
    html = html.replace("</main>", "</main>\n" + _PET_OVERLAY, 1)

    choose_start = html.find("      function choose(key,button) {")
    choose_end = html.find("      function nextQuestion() {", choose_start)
    if choose_start < 0 or choose_end < 0:
        raise RuntimeError("EDUNI pet scoring function markers missing")
    html = html[:choose_start] + _CHOOSE_REPLACEMENT + html[choose_end:]

    start_marker = "      function startGame() {\n        state.index=0;"
    start_replacement = "      function startGame() {\n        window.EDUNI_PET_REWARDS?.startRun();\n        state.index=0;"
    if start_marker not in html:
        raise RuntimeError("EDUNI pet run-start marker missing")
    html = html.replace(start_marker, start_replacement, 1)

    result_copy_marker = "        $('resultCopy').textContent=message;"
    result_copy_replacement = (
        "        const petRewardSummary=window.EDUNI_PET_REWARDS?.runSummary() || '';\n"
        "        $('resultCopy').textContent=petRewardSummary ? `${message} ${petRewardSummary}` : message;"
    )
    if result_copy_marker not in html:
        raise RuntimeError("EDUNI pet result-copy marker missing")
    html = html.replace(result_copy_marker, result_copy_replacement, 1)

    if "</body>" not in html:
        raise RuntimeError("EDUNI pet script marker missing")
    html = html.replace("</body>", _PET_SCRIPT + "</body>", 1)
    return html


def install_pet_rewards() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_pet_rewards", False):
        return

    def _space_game_html_with_pet_rewards() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        html = response.body.decode("utf-8")
        return HTMLResponse(_inject_pet_rewards(html), status_code=response.status_code)

    _space_game_html_with_pet_rewards._eduni_pet_rewards = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_pet_rewards
