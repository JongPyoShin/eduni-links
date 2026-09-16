from __future__ import annotations

import re


_MAIN_SCRIPT_MARKER = "<script>\n(()=>{'use strict';"
_STRONGEST_AI_PATTERN = re.compile(
    r"function strongestAiReason\(move\)\{.*?\}\nfunction uniqueGroupKeys",
    re.DOTALL,
)
_ANALYZE_PATTERN = re.compile(
    r"function analyzeMove\(source,row,col,color,koState=null\)\{.*?\}\nlet board=",
    re.DOTALL,
)
_AI_CANDIDATE_PATTERN = re.compile(
    r"function aiCandidateMoves\(source,koState\)\{.*?\}\nfunction aiPickMove",
    re.DOTALL,
)
_AI_COMPONENTS_PATTERN = re.compile(
    r"const components=\{capture:result\.captured\*w\.capture.*?jitter:Math\.random\(\)\*w\.jitter\};",
    re.DOTALL,
)
_PLAY_MOVE_PATTERN = re.compile(
    r"function playMove\(row,col,color,source='human',aiMeta=null\)\{.*?return true\}",
    re.DOTALL,
)
_PASS_TURN_PATTERN = re.compile(
    r"function passTurn\(source='human'\)\{.*?\}\nfunction finishByScore",
    re.DOTALL,
)
_RESIGN_PATTERN = re.compile(
    r"function resign\(\)\{.*?\}\nfunction scheduleAi",
    re.DOTALL,
)
_SCHEDULE_AI_PATTERN = re.compile(
    r"function scheduleAi\(\)\{.*?\}\nfunction resetGame",
    re.DOTALL,
)

_SHOW_COACH_AI_BRANCH = (
    "if(kind==='ai'){coachIcon.textContent='💡';coachTitle.textContent='AI는 왜 여기에 뒀을까?';"
    "coachSummary.textContent=view.explanation;confirmMoveButton.style.display='none';"
    "cancelPreviewButton.textContent='알겠어요'}else if(a.legal){"
)
_SHOW_COACH_AI_AND_LOCAL_BRANCH = (
    "if(kind==='ai'){const d=view.danger||{level:'safe',title:'🙂 지금은 크게 위험하지 않아요',summary:'이번 AI 수로 바로 잡힐 위험은 커지지 않았어요.'};"
    "coachIcon.textContent=d.level==='critical'||d.level==='danger'?'🚨':d.level==='caution'?'⚠️':'💡';"
    "coachTitle.textContent='AI는 왜 여기 뒀을까?';coachSummary.style.whiteSpace='pre-line';"
    "coachSummary.textContent=`AI 이유: ${view.explanation}\n내 돌: ${d.title} ${d.summary}`;"
    "if(d.level==='critical')appendBadge(`잡힌 돌 ${d.capturedCount}개`,'danger');"
    "else if(d.level==='danger')appendBadge('단수 · 숨 쉴 곳 1개','danger');"
    "else if(d.level==='caution')appendBadge('숨 쉴 곳 2개','warn');"
    "confirmMoveButton.style.display='none';cancelPreviewButton.textContent='알겠어요'}"
    "else if(kind==='local'){coachIcon.textContent='🔎';coachTitle.textContent='이 수로 바뀐 점';"
    "coachSummary.style.whiteSpace='';coachSummary.textContent=view.explanation;"
    "confirmMoveButton.style.display='none';cancelPreviewButton.textContent='알겠어요'}"
    "else if(a.legal){coachSummary.style.whiteSpace='';"
)

_AI_POST_MOVE_BRANCH = (
    "if(coachEnabled()&&source==='ai'&&aiMeta){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:`AI가 여기 둔 이유: ${strongestAiReason(aiMeta)}`},'ai')}"
    "return true}"
)
_AI_AND_LOCAL_POST_MOVE_BRANCH = (
    "if(coachEnabled()&&source==='ai'&&aiMeta){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "const danger=analyzeAiDanger(beforeBoard,board,{row,col});"
    "analysis.visual={...analysis.visual,liberties:danger.libertyPoints?.length?danger.libertyPoints:analysis.visual.liberties,"
    "captured:danger.capturedStones?.length?danger.capturedStones:analysis.visual.captured,"
    "atari:danger.affectedStones?.length?danger.affectedStones:analysis.visual.atari};"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:strongestAiReason(aiMeta),danger},'ai')}"
    "else if(coachEnabled()&&mode==='local'&&source==='human'){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:localMoveSummary(analysis)},'local')}"
    "saveCurrentGame();updateUndoButton();return true}"
)

_SHARED_AI_FUNCTIONS = """function sharedCoachLogic(){return window.EDUNIBadukCoachLogic.create(window.EDUNIBadukEngine)}
function strongestAiReason(move){return sharedCoachLogic().strongestAiReason(move)}
function uniqueGroupKeys"""

_SHARED_ANALYZE_FUNCTIONS = """function analyzeMove(source,row,col,color,koState=null){const shared=sharedCoachLogic().analyzeMove(source,row,col,color,koState);let summary=shared.summary;if(shared.legal&&levelId==='intermediate'&&!shared.captured)summary+=` 현재 활로 ${shared.ownLibertiesAfter}개를 확보해요.`;if(shared.legal&&levelId==='standard')summary+=` 연결 그룹 ${shared.connectedOwnGroups}개, 상대 단수 그룹 ${shared.opponentAtariGroups.length}개를 함께 확인하세요.`;return{...shared,reasonCode:shared.reasonCode==='self_atari_risk'?'self_atari':shared.reasonCode,summary,visual:{candidate:[row,col],liberties:shared.libertyPoints||[],captured:shared.capturedStones||[],atari:shared.opponentAtariStones||[]},boardAfter:shared.afterBoard}}
function analyzeAiDanger(beforeBoard,afterBoard,aiMove){return sharedCoachLogic().analyzeAiDanger(beforeBoard,afterBoard,aiMove)}
function suggestHint(source,color,koState=null){return sharedCoachLogic().suggestHint(source,color,koState)}
function badukRuleGuide(){return sharedCoachLogic().ruleGuide(komi)}
function localMoveSummary(analysis){const atariStones=(analysis.opponentAtariStones||[]).length;if(analysis.captured>0)return`이 수로 내 돌 ${analysis.captured}개가 잡혔어요.`;if(atariStones>0)return`이 수로 내 돌 ${atariStones}개의 숨 쉴 곳이 1개만 남았어요.`;if(analysis.connectedOwnGroups>=2)return'이 수로 상대 돌 두 무리가 연결됐어요.';return`이 수로 잡힌 돌은 없어요. 상대 돌의 숨 쉴 곳은 ${analysis.ownLibertiesAfter||0}개예요.`}
let undoHistory=[],aiGeneration=0,aiTimer=null,ruleGuidePanel=null;
function invalidateAi(reason='state-change'){aiGeneration++;if(aiTimer!==null){clearTimeout(aiTimer);aiTimer=null}aiThinking=false;return reason}
function snapshotGame(){return{board:cloneBoard(board),boardSize,levelId,mode,currentPlayer,previousPosition,captures:{...captures},moveCount,consecutivePasses,lastMove:lastMove?{...lastMove}:null,gameOver}}
function recordUndoSnapshot(kind){undoHistory.push({kind,state:snapshotGame()});if(undoHistory.length>240)undoHistory.shift();updateUndoButton()}
function updateUndoButton(){const b=document.getElementById('undo');if(b)b.disabled=undoHistory.length===0}
function saveCurrentGame(){if(window.EDUNIBadukPersistence)window.EDUNIBadukPersistence.save({levelId,boardSize,mode,board,currentPlayer,previousPosition,captures,moveCount,consecutivePasses,lastMove,gameOver,coachEnabled:coachEnabledEl.checked})}
function restoreUndoSnapshot(s){if(!s||s.boardSize!==boardSize||s.levelId!==levelId||s.mode!==mode)return false;invalidateAi('undo');board=cloneBoard(s.board);currentPlayer=s.currentPlayer;previousPosition=s.previousPosition;captures={...s.captures};moveCount=s.moveCount;consecutivePasses=s.consecutivePasses;lastMove=s.lastMove?{...s.lastMove}:null;gameOver=!!s.gameOver;resultEl.classList.toggle('active',gameOver);if(!gameOver)resultEl.textContent='';clearCoach();updateHud();render();saveCurrentGame();updateUndoButton();return true}
function undoMove(){if(!undoHistory.length){setMessage('아직 무를 수가 없어요.');updateUndoButton();return false}const entry=undoHistory.pop();if(!restoreUndoSnapshot(entry.state)){undoHistory=[];updateUndoButton();setMessage('지금 판에서는 무르기를 할 수 없어요.','error');return false}setMessage('한 수 전으로 돌아왔어요. 다시 생각해 볼까요?','ok');return true}
function showHint(){if(gameOver){setMessage('게임이 끝났어요. 새 게임에서 힌트를 다시 받아 보세요.');return}if(aiThinking){setMessage('AI가 생각 중이에요. AI가 둔 뒤에 힌트를 볼 수 있어요.');return}if(mode==='ai'&&currentPlayer===WHITE){setMessage('지금은 AI 차례예요. AI가 둔 뒤에 힌트를 볼 수 있어요.');scheduleAi();return}const hint=suggestHint(board,currentPlayer,previousPosition);if(!hint){setMessage('지금은 추천할 수 있는 자리를 찾지 못했어요. 한 수 쉬기도 생각해 볼 수 있어요.');return}const a={...hint.analysis,title:`💡 ${hint.title}`,summary:hint.summary,badges:[hint.badge,...(hint.analysis.badges||[]).filter(b=>b!==hint.badge)].slice(0,2)};preview={row:hint.row,col:hint.col,color:currentPlayer,analysis:a,source:cloneBoard(board)};showCoach(preview,'hint');setMessage('노란 표시가 힌트 자리예요. 이유를 보고 직접 생각해 봐요.','ok')}
function ensureRuleGuidePanel(){if(ruleGuidePanel)return ruleGuidePanel;ruleGuidePanel=document.createElement('div');ruleGuidePanel.id='badukRuleGuide';ruleGuidePanel.className='message';ruleGuidePanel.style.display='none';ruleGuidePanel.setAttribute('aria-live','polite');rulesEl.parentNode.insertBefore(ruleGuidePanel,rulesEl);return ruleGuidePanel}
function renderRuleGuide(){const panel=ensureRuleGuidePanel();panel.innerHTML='';const heading=document.createElement('strong');heading.textContent='📘 바둑 기본 규칙';heading.style.display='block';heading.style.marginBottom='8px';panel.appendChild(heading);for(const rule of badukRuleGuide()){const item=document.createElement('div');item.style.marginBottom='8px';const title=document.createElement('strong');title.textContent=rule.title;title.style.display='block';const summary=document.createElement('span');summary.textContent=rule.summary;item.appendChild(title);item.appendChild(summary);panel.appendChild(item)}panel.style.display='block';const b=document.getElementById('rulesHelp');if(b)b.textContent='규칙 닫기'}
function toggleRulesHelp(){const panel=ensureRuleGuidePanel();if(panel.style.display==='none'){renderRuleGuide();setMessage('처음에는 숨 쉴 곳과 잡기 규칙만 기억해도 충분해요.','ok')}else{panel.style.display='none';const b=document.getElementById('rulesHelp');if(b)b.textContent='규칙 보기'}}
let board="""

_AI_CANDIDATES_WITH_STRATEGY = """function aiCandidateMoves(source,koState){const empties=new Set(),hasStone=source.some(row=>row.some(Boolean));if(!hasStone){for(const[r,c]of starPoints)empties.add(`${r},${c}`);const m=Math.floor(boardSize/2);empties.add(`${m},${m}`)}else{for(let r=0;r<boardSize;r++)for(let c=0;c<boardSize;c++)if(source[r][c]!==EMPTY)for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){if(Math.abs(dr)+Math.abs(dc)>3)continue;const nr=r+dr,nc=c+dc;if(inside(nr,nc)&&source[nr][nc]===EMPTY)empties.add(`${nr},${nc}`)}}let candidates=[...empties].map(k=>k.split(',').map(Number));if(boardSize===19&&window.EDUNIBadukAiStrategy)candidates=window.EDUNIBadukAiStrategy.expandCandidates(source,candidates);if(!candidates.length)return legalMoves(source,WHITE,koState);const moves=[];for(const[row,col]of candidates){const result=tryMove(source,row,col,WHITE,koState);if(result.legal)moves.push({row,col,result})}return moves.length?moves:legalMoves(source,WHITE,koState)}
function aiPickMove"""

_AI_COMPONENTS_WITH_STRATEGY = """const strategic=boardSize===19&&window.EDUNIBadukAiStrategy?window.EDUNIBadukAiStrategy.scoreMove(source,row,col,moveCount):{spread:0,opening:0};const components={capture:result.captured*w.capture,atari:Math.max(0,afterAtari-beforeAtari)*w.atari,liberties:result.liberties*w.liberties,neighbors:neighbors*w.neighbors,center:(maxCenter-centerDistance)*w.center,edge:(row===0||row===boardSize-1||col===0||col===boardSize-1)?-w.edge:0,spread:strategic.spread,opening:strategic.opening,jitter:Math.random()*w.jitter};"""

_PLAY_MOVE_WITH_FEATURES = """function playMove(row,col,color,source='human',aiMeta=null){if(gameOver||(aiThinking&&source==='human'))return false;if(color!==currentPlayer)return false;const before=boardKey(board),beforeBoard=cloneBoard(board),result=tryMove(board,row,col,color,previousPosition);if(!result.legal){setMessage(result.reason,'error');return false}if(source==='human'){recordUndoSnapshot(mode==='ai'?'decision':'action')}board=result.board;previousPosition=before;captures[color]+=result.captured;moveCount++;consecutivePasses=0;lastMove={row,col,color};currentPlayer=color===BLACK?WHITE:BLACK;setMessage(result.captured?`${playerName(color)}이 ${result.captured}개를 잡았어요!`:`${playerName(color)} 착수`,result.captured?'ok':'');preview=null;coachView=null;coachCard.classList.remove('active');render();updateHud();if(coachEnabled()&&source==='ai'&&aiMeta){const analysis=analyzeMove(beforeBoard,row,col,color,null);const danger=analyzeAiDanger(beforeBoard,board,{row,col});analysis.visual={...analysis.visual,liberties:danger.libertyPoints?.length?danger.libertyPoints:analysis.visual.liberties,captured:danger.capturedStones?.length?danger.capturedStones:analysis.visual.captured,atari:danger.affectedStones?.length?danger.affectedStones:analysis.visual.atari};showCoach({row,col,color,analysis,source:beforeBoard,explanation:strongestAiReason(aiMeta),danger},'ai')}else if(coachEnabled()&&mode==='local'&&source==='human'){const analysis=analyzeMove(beforeBoard,row,col,color,null);showCoach({row,col,color,analysis,source:beforeBoard,explanation:localMoveSummary(analysis)},'local')}saveCurrentGame();updateUndoButton();return true}"""

_PASS_TURN_WITH_FEATURES = """function passTurn(source='human'){if(gameOver||(aiThinking&&source==='human'))return;if(source==='human')recordUndoSnapshot(mode==='ai'?'decision':'action');clearCoach();previousPosition=boardKey(board);consecutivePasses++;moveCount++;const passed=currentPlayer;currentPlayer=currentPlayer===BLACK?WHITE:BLACK;lastMove=null;setMessage(`${playerName(passed)}이 한 수 쉬었어요.`);updateHud();saveCurrentGame();updateUndoButton();if(consecutivePasses>=2){finishByScore();return}if(mode==='ai'&&currentPlayer===WHITE)scheduleAi()}
function finishByScore"""

_RESIGN_WITH_FEATURES = """function resign(){if(gameOver||aiThinking)return;clearCoach();invalidateAi('resign');undoHistory=[];updateUndoButton();const loser=currentPlayer,winner=loser===BLACK?WHITE:BLACK;gameOver=true;resultEl.textContent=`${playerName(loser)} 기권 — ${playerName(winner)} 승!`;resultEl.classList.add('active');setMessage(`${playerName(loser)}이 기권했어요.`);updateHud();saveCurrentGame()}
function scheduleAi"""

_SCHEDULE_AI_WITH_GUARD = """function scheduleAi(){if(mode!=='ai'||gameOver||currentPlayer!==WHITE||aiThinking)return;clearCoach();aiThinking=true;const token=++aiGeneration;updateHud();setMessage(`${profile().name} AI가 다음 수를 생각하고 있어요…`);aiTimer=setTimeout(()=>{if(token!==aiGeneration)return;aiTimer=null;if(gameOver||mode!=='ai'||currentPlayer!==WHITE){aiThinking=false;updateHud();return}const move=aiPickMove(board,previousPosition);aiThinking=false;if(!move){passTurn('ai');return}playMove(move.row,move.col,WHITE,'ai',move)},profile().ai.delay+Math.floor(Math.random()*120))}
function resetGame"""

_POINTER_BLOCK = "canvas.addEventListener('pointerup',e=>{if(gameOver||aiThinking||(mode==='ai'&&currentPlayer===WHITE))return;const p=pointFromEvent(e);if(!p)return;if(coachEnabled())previewMove(p.row,p.col);else if(playMove(p.row,p.col,currentPlayer)&&mode==='ai'&&currentPlayer===WHITE)scheduleAi()});"
_POINTER_BLOCK_WITH_RECOVERY = "canvas.addEventListener('pointerup',e=>{if(gameOver)return;if(aiThinking){setMessage('AI가 생각 중이에요. 잠깐만 기다려 주세요.');return}if(mode==='ai'&&currentPlayer===WHITE){setMessage('AI 차례가 이어지고 있어요. 곧 둘게요.');scheduleAi();return}const p=pointFromEvent(e);if(!p)return;if(coachEnabled())previewMove(p.row,p.col);else if(playMove(p.row,p.col,currentPlayer)&&mode==='ai'&&currentPlayer===WHITE)scheduleAi()});"
_UNDO_BUTTON_MARKER = '<button class="btn" id="hint" type="button">도움말</button>'
_UNDO_BUTTON_HTML = '<button class="btn" id="undo" type="button" disabled>무르기</button><button class="btn" id="hint" type="button">힌트</button><button class="btn" id="rulesHelp" type="button">규칙 보기</button>'
_NEW_GAME_LISTENER = "document.getElementById('newGame').addEventListener('click',resetGame);"
_NEW_GAME_AND_UNDO_LISTENER = "document.getElementById('newGame').addEventListener('click',resetGame);document.getElementById('undo')?.addEventListener('click',undoMove);"
_HINT_LISTENER = "document.getElementById('hint').addEventListener('click',()=>{const text=levelId==='beginner'?'팁: 초록 점은 내 돌이 숨 쉴 수 있는 활로예요. 상대 활로를 하나씩 줄여 보세요.':levelId==='intermediate'?'팁: 내 돌을 연결하면서 상대 돌을 단수로 만드는 자리를 찾아보세요.':'팁: 포획만 보지 말고 연결, 끊기, 활로, 중앙 영향력을 함께 비교해 보세요.';setMessage(text)});"
_HINT_AND_RULES_LISTENER = "document.getElementById('hint').addEventListener('click',showHint);document.getElementById('rulesHelp')?.addEventListener('click',toggleRulesHelp);"
_RUNTIME_RESET_MARKER = "function resetGame(){board=createBoard();"
_RUNTIME_RESET_PREFIX = "function resetGame(){invalidateAi('reset');undoHistory=[];updateUndoButton();board=createBoard();"

_PERSISTENCE_RESET_MARKER = _RUNTIME_RESET_PREFIX
_PERSISTENCE_SAVE_HOOK = (
    "function resetGame(){if(window._eduniRestoring){window._eduniRestoring=false;"
    "updateHud();render();updateUndoButton();return;}"
    "invalidateAi('reset');undoHistory=[];updateUndoButton();"
    "if(window.EDUNIBadukPersistence)window.EDUNIBadukPersistence.clear();"
    "board=createBoard();"
)
_PERSISTENCE_ENGINE_EXPORT = re.compile(
    r"window\.EDUNIBadukEngine\s*=\s*\{.*\};"
)
_PERSISTENCE_ENGINE_EXPORT_WITH_SAVE = (
    "window.EDUNIBadukEngine={EMPTY,BLACK,WHITE,LEVELS,"
    "get SIZE(){return boardSize},get KOMI(){return komi},"
    "get LEVEL_ID(){return levelId},get LEVEL(){return profile()},"
    "createBoard,cloneBoard,boardKey,groupAt,tryMove,legalMoves,scoreBoard,aiPickMove,analyzeMove,analyzeAiDanger,suggestHint,badukRuleGuide,"
    "getState:()=>({board:cloneBoard(board),boardSize,levelId,currentPlayer,previousPosition,"
    "captures:{...captures},moveCount,consecutivePasses,lastMove:lastMove?{...lastMove}:null,gameOver,aiThinking,mode,undoDepth:undoHistory.length}),"
    "setLevel:id=>{if(!LEVELS[id])return false;levelSelect.value=id;applyLevel(id);resetGame();return true},"
    "undo:undoMove,invalidateAi,showHint,toggleRulesHelp,"
    "saveGame:function(){saveCurrentGame()}};"
)
_PERSISTENCE_RESTORE_BLOCK = (
    "function _eduniRestore(){const P=window.EDUNIBadukPersistence;if(!P)return false;"
    "const s=P.load();if(!s)return false;invalidateAi('restore');undoHistory=[];updateUndoButton();"
    "window._eduniRestoring=true;"
    "levelId=s.levelId;boardSize=s.boardSize;board=s.board;currentPlayer=s.currentPlayer;"
    "previousPosition=s.previousPosition;captures=s.captures;moveCount=s.moveCount;"
    "consecutivePasses=s.consecutivePasses;lastMove=s.lastMove;gameOver=s.gameOver;"
    "const lv=document.getElementById('level');if(lv)lv.value=levelId;"
    "const md=document.getElementById('mode');if(md)md.value=s.mode;mode=s.mode;"
    "const ce=document.getElementById('coachEnabled');if(ce)ce.checked=!!s.coachEnabled;"
    "updateHud();render();updateUndoButton();"
    "if(s.mode==='ai'&&s.currentPlayer===2&&typeof scheduleAi==='function')scheduleAi();"
    "return s;}\n"
)


def integrate_v2_coach(source: str, logic_script: str, ai_strategy_script: str = "", persistence_script: str = "") -> str:
    """Bind tested coach, strategy, persistence, undo, hints, rules, and AI turn guards to Baduk v2.

    Integrations remain marker-gated and fail safe. If a required runtime marker
    drifts, the already-working game is returned rather than a half-patched page.
    """
    if not source or not logic_script.strip() or _MAIN_SCRIPT_MARKER not in source:
        return source
    if _SHOW_COACH_AI_BRANCH not in source or _AI_POST_MOVE_BRANCH not in source:
        return source

    patched, ai_count = _STRONGEST_AI_PATTERN.subn(_SHARED_AI_FUNCTIONS, source, count=1)
    patched, analyze_count = _ANALYZE_PATTERN.subn(_SHARED_ANALYZE_FUNCTIONS, patched, count=1)
    if ai_count != 1 or analyze_count != 1:
        return source

    patched = patched.replace(_SHOW_COACH_AI_BRANCH, _SHOW_COACH_AI_AND_LOCAL_BRANCH, 1)
    patched = patched.replace(_AI_POST_MOVE_BRANCH, _AI_AND_LOCAL_POST_MOVE_BRANCH, 1)

    strategy_enabled = False
    if ai_strategy_script.strip():
        strategy_source, candidate_count = _AI_CANDIDATE_PATTERN.subn(
            _AI_CANDIDATES_WITH_STRATEGY, patched, count=1
        )
        strategy_source, components_count = _AI_COMPONENTS_PATTERN.subn(
            _AI_COMPONENTS_WITH_STRATEGY, strategy_source, count=1
        )
        if candidate_count == 1 and components_count == 1:
            patched = strategy_source
            strategy_enabled = True

    runtime_source, play_count = _PLAY_MOVE_PATTERN.subn(_PLAY_MOVE_WITH_FEATURES, patched, count=1)
    runtime_source, pass_count = _PASS_TURN_PATTERN.subn(_PASS_TURN_WITH_FEATURES, runtime_source, count=1)
    runtime_source, resign_count = _RESIGN_PATTERN.subn(_RESIGN_WITH_FEATURES, runtime_source, count=1)
    runtime_source, schedule_count = _SCHEDULE_AI_PATTERN.subn(_SCHEDULE_AI_WITH_GUARD, runtime_source, count=1)
    runtime_ok = play_count == pass_count == resign_count == schedule_count == 1
    if runtime_ok and _POINTER_BLOCK in runtime_source and _RUNTIME_RESET_MARKER in runtime_source:
        runtime_source = runtime_source.replace(_POINTER_BLOCK, _POINTER_BLOCK_WITH_RECOVERY, 1)
        runtime_source = runtime_source.replace(_RUNTIME_RESET_MARKER, _RUNTIME_RESET_PREFIX, 1)
        if _UNDO_BUTTON_MARKER in runtime_source and _NEW_GAME_LISTENER in runtime_source and _HINT_LISTENER in runtime_source:
            runtime_source = runtime_source.replace(_UNDO_BUTTON_MARKER, _UNDO_BUTTON_HTML, 1)
            runtime_source = runtime_source.replace(_NEW_GAME_LISTENER, _NEW_GAME_AND_UNDO_LISTENER, 1)
            runtime_source = runtime_source.replace(_HINT_LISTENER, _HINT_AND_RULES_LISTENER, 1)
            patched = runtime_source
        else:
            runtime_ok = False
    else:
        runtime_ok = False

    if not runtime_ok:
        return source

    persistence_enabled = False
    if persistence_script.strip() and _PERSISTENCE_RESET_MARKER in patched:
        patched = patched.replace(_PERSISTENCE_RESET_MARKER, _PERSISTENCE_SAVE_HOOK, 1)
        patched, engine_count = _PERSISTENCE_ENGINE_EXPORT.subn(
            _PERSISTENCE_ENGINE_EXPORT_WITH_SAVE, patched, count=1
        )
        if engine_count == 1 and _PERSISTENCE_RESTORE_BLOCK not in patched:
            patched = patched.replace(
                _MAIN_SCRIPT_MARKER,
                f"{_MAIN_SCRIPT_MARKER}{_PERSISTENCE_RESTORE_BLOCK}",
                1,
            )
            patched = patched.replace(
                "resizeCanvas();resetGame();",
                "resizeCanvas();_eduniRestore();resetGame();",
                1,
            )
            persistence_enabled = True

    scripts = [logic_script]
    if strategy_enabled:
        scripts.append(ai_strategy_script)
    if persistence_enabled:
        scripts.append(persistence_script)
    shared_script = "\n".join(f"<script>\n{script}\n</script>" for script in scripts) + "\n"
    return patched.replace(_MAIN_SCRIPT_MARKER, f"{shared_script}{_MAIN_SCRIPT_MARKER}", 1)