from __future__ import annotations


_ANALYZE_OLD = "function analyzeMove(source,row,col,color,koState=null){const shared=sharedCoachLogic().analyzeMove(source,row,col,color,koState);let summary=shared.summary;if(shared.legal&&levelId==='intermediate'&&!shared.captured)summary+=` 현재 활로 ${shared.ownLibertiesAfter}개를 확보해요.`;if(shared.legal&&levelId==='standard')summary+=` 연결 그룹 ${shared.connectedOwnGroups}개, 상대 단수 그룹 ${shared.opponentAtariGroups.length}개를 함께 확인하세요.`;return{...shared,reasonCode:shared.reasonCode==='self_atari_risk'?'self_atari':shared.reasonCode,summary,visual:{candidate:[row,col],liberties:shared.libertyPoints||[],captured:shared.capturedStones||[],atari:shared.opponentAtariStones||[]},boardAfter:shared.afterBoard}}"

_ANALYZE_NEW = "function analyzeMove(source,row,col,color,koState=null){const shared=sharedCoachLogic().analyzeMove(source,row,col,color,koState);const ownGroupSizeAfter=shared.legal&&shared.afterBoard?window.EDUNIBadukEngine.groupAt(shared.afterBoard,row,col).stones.length:0;const largeSelfAtariRisk=!!(shared.legal&&shared.selfAtariRisk&&ownGroupSizeAfter>=Math.max(6,Math.ceil(boardSize*boardSize*.12)));let title=shared.title,summary=shared.summary;if(shared.selfAtariRisk&&ownGroupSizeAfter>1){summary=`이 수를 두면 연결된 내 돌 ${ownGroupSizeAfter}개의 숨 쉴 곳이 1개만 남아요. 상대가 마지막 숨 쉴 곳에 두면 ${ownGroupSizeAfter}개가 한꺼번에 잡힐 수 있어요.`;if(largeSelfAtariRisk)title='🚨 큰 돌무리가 위험해요'}else{if(shared.legal&&levelId==='intermediate'&&!shared.captured)summary+=` 현재 활로 ${shared.ownLibertiesAfter}개를 확보해요.`;if(shared.legal&&levelId==='standard')summary+=` 연결 그룹 ${shared.connectedOwnGroups}개, 상대 단수 그룹 ${shared.opponentAtariGroups.length}개를 함께 확인하세요.`}return{...shared,reasonCode:shared.reasonCode==='self_atari_risk'?'self_atari':shared.reasonCode,title,summary,ownGroupSizeAfter,largeSelfAtariRisk,visual:{candidate:[row,col],liberties:shared.libertyPoints||[],captured:shared.capturedStones||[],atari:shared.opponentAtariStones||[]},boardAfter:shared.afterBoard}}"

_RULES_OLD = "function badukRuleGuide(){return sharedCoachLogic().ruleGuide(komi)}"
_RULES_NEW = "function badukRuleGuide(){return[...sharedCoachLogic().ruleGuide(komi),{code:'dont_fill_own_territory',title:'내 집은 끝까지 메우지 않아도 돼요',summary:'상대가 들어오기 어려운 내 영역을 계속 메우면 내 돌의 숨 쉴 곳이 줄어들 수 있어요. 둘 곳이 없으면 한 수 쉬기를 눌러도 돼요.'}]}"

_STATE_OLD = "let undoHistory=[],aiGeneration=0,aiTimer=null,ruleGuidePanel=null;"
_STATE_NEW = "let undoHistory=[],aiGeneration=0,aiTimer=null,ruleGuidePanel=null,aiForcedPasses=0;"

_INVALIDATE_MARKER = "function invalidateAi(reason='state-change')"
_HELPERS = """function _blackGroupsForEndgame(source){const groups=[],seen=new Set();for(let r=0;r<boardSize;r++)for(let c=0;c<boardSize;c++){if(source[r]?.[c]!==BLACK||seen.has(`${r},${c}`))continue;const g=groupAt(source,r,c);for(const[gr,gc]of g.stones)seen.add(`${gr},${gc}`);groups.push(g)}return groups}
function assessAiNoMove(source){const score=scoreBoard(source),deficit=score.black-score.white,total=boardSize*boardSize;let filled=0;for(const row of source)for(const v of row)if(v!==EMPTY)filled++;const groups=_blackGroupsForEndgame(source);let maxComebackSwing=0,warningGroup=null;for(const g of groups){const swing=g.stones.length*(g.liberties.length<=6?2:1);if(swing>maxComebackSwing)maxComebackSwing=swing;if(g.stones.length>=Math.max(6,Math.ceil(total*.12))&&g.liberties.length<=2&&(!warningGroup||g.stones.length>warningGroup.stones.length))warningGroup=g}const margin=boardSize===9?12:boardSize===13?20:36,lateEnough=filled/total>=.45||moveCount>=boardSize*2,comebackPossible=maxComebackSwing>=Math.max(8,deficit-margin/2),resign=aiForcedPasses>=2&&lateEnough&&deficit>=margin&&!comebackPossible;let passMessage='AI는 지금 규칙상 둘 수 있는 자리가 없어서 한 수 쉬었어요. 내가 한 수 쉬면 점수 계산으로 끝낼 수 있어요.';if(warningGroup)passMessage=`AI는 지금 둘 수 있는 자리가 없어 한 수 쉬었어요. 하지만 내 돌 ${warningGroup.stones.length}개가 한 덩어리이고 숨 쉴 곳이 ${warningGroup.liberties.length}개뿐이에요. 내 영역을 계속 메우면 한꺼번에 잡힐 수 있어요.`;return{resign,deficit,filled,maxComebackSwing,warningGroup,passMessage}}
function finishAiResignation(info){clearCoach();invalidateAi('ai-resign');aiForcedPasses=0;undoHistory=[];updateUndoButton();gameOver=true;resultEl.textContent='AI 기권 — 흑 승!';resultEl.classList.add('active');setMessage(`AI가 현재 점수에서 ${Math.max(0,Math.round(info?.deficit||0))}집 정도 뒤져 있고 뒤집기 어렵다고 판단해 기권했어요.`,'ok');updateHud();saveCurrentGame()}
"""

_PASS_OLD = "function passTurn(source='human'){if(gameOver||(aiThinking&&source==='human'))return;if(source==='human')recordUndoSnapshot(mode==='ai'?'decision':'action');clearCoach();previousPosition=boardKey(board);consecutivePasses++;moveCount++;const passed=currentPlayer;currentPlayer=currentPlayer===BLACK?WHITE:BLACK;lastMove=null;setMessage(`${playerName(passed)}이 한 수 쉬었어요.`);updateHud();saveCurrentGame();updateUndoButton();if(consecutivePasses>=2){finishByScore();return}if(mode==='ai'&&currentPlayer===WHITE)scheduleAi()}"
_PASS_NEW = "function passTurn(source='human',messageOverride=null){if(gameOver||(aiThinking&&source==='human'))return;if(source==='human')recordUndoSnapshot(mode==='ai'?'decision':'action');clearCoach();previousPosition=boardKey(board);consecutivePasses++;moveCount++;const passed=currentPlayer;currentPlayer=currentPlayer===BLACK?WHITE:BLACK;lastMove=null;setMessage(messageOverride||`${playerName(passed)}이 한 수 쉬었어요.`);updateHud();saveCurrentGame();updateUndoButton();if(consecutivePasses>=2){finishByScore();return}if(mode==='ai'&&currentPlayer===WHITE)scheduleAi()}"

_SCHEDULE_OLD = "const move=aiPickMove(board,previousPosition);aiThinking=false;if(!move){passTurn('ai');return}playMove(move.row,move.col,WHITE,'ai',move)"
_SCHEDULE_NEW = "const move=aiPickMove(board,previousPosition);aiThinking=false;if(!move){aiForcedPasses++;const endgame=assessAiNoMove(board);if(endgame.resign){finishAiResignation(endgame);return}passTurn('ai',endgame.passMessage);return}aiForcedPasses=0;playMove(move.row,move.col,WHITE,'ai',move)"

_POINTER_OLD = "canvas.addEventListener('pointerup',e=>{if(gameOver)return;if(aiThinking){setMessage('AI가 생각 중이에요. 잠깐만 기다려 주세요.');return}if(mode==='ai'&&currentPlayer===WHITE){setMessage('AI 차례가 이어지고 있어요. 곧 둘게요.');scheduleAi();return}const p=pointFromEvent(e);if(!p)return;if(coachEnabled())previewMove(p.row,p.col);else if(playMove(p.row,p.col,currentPlayer)&&mode==='ai'&&currentPlayer===WHITE)scheduleAi()});"
_POINTER_NEW = "canvas.addEventListener('pointerup',e=>{if(gameOver)return;if(aiThinking){setMessage('AI가 생각 중이에요. 잠깐만 기다려 주세요.');return}if(mode==='ai'&&currentPlayer===WHITE){setMessage('AI 차례가 이어지고 있어요. 곧 둘게요.');scheduleAi();return}const p=pointFromEvent(e);if(!p)return;if(coachEnabled()){previewMove(p.row,p.col);return}const risk=analyzeMove(board,p.row,p.col,currentPlayer,previousPosition);if(risk.legal&&risk.largeSelfAtariRisk){preview={row:p.row,col:p.col,color:currentPlayer,analysis:risk,source:cloneBoard(board)};showCoach(preview,'preview');setMessage(`🚨 이 수를 두면 내 돌 ${risk.ownGroupSizeAfter}개가 숨 쉴 곳 1개만 남아요. 그래도 두려면 설명을 보고 '여기에 두기'를 눌러 주세요.`,'error');return}if(playMove(p.row,p.col,currentPlayer)&&mode==='ai'&&currentPlayer===WHITE)scheduleAi()});"

_RESTORE_UNDO_OLD = "invalidateAi('undo');board=cloneBoard(s.board);"
_RESTORE_UNDO_NEW = "invalidateAi('undo');aiForcedPasses=0;board=cloneBoard(s.board);"
_RESTORE_SAVE_OLD = "const s=P.load();if(!s)return false;invalidateAi('restore');undoHistory=[];updateUndoButton();"
_RESTORE_SAVE_NEW = "const s=P.load();if(!s)return false;invalidateAi('restore');aiForcedPasses=0;undoHistory=[];updateUndoButton();"
_RESET_OLD = "invalidateAi('reset');undoHistory=[];updateUndoButton();"
_RESET_NEW = "invalidateAi('reset');aiForcedPasses=0;undoHistory=[];updateUndoButton();"


def integrate_endgame_safety(source: str) -> str:
    """Add conservative AI resignation and large-group self-atari teaching guards.

    This post-processes the already integrated Baduk v2 runtime. Every required
    marker must match exactly; otherwise the original integrated source is
    returned unchanged so a partial safety patch is never served.
    """
    if not source:
        return source

    replacements = (
        (_ANALYZE_OLD, _ANALYZE_NEW),
        (_RULES_OLD, _RULES_NEW),
        (_STATE_OLD, _STATE_NEW),
        (_INVALIDATE_MARKER, _HELPERS + _INVALIDATE_MARKER),
        (_PASS_OLD, _PASS_NEW),
        (_SCHEDULE_OLD, _SCHEDULE_NEW),
        (_POINTER_OLD, _POINTER_NEW),
        (_RESTORE_UNDO_OLD, _RESTORE_UNDO_NEW),
        (_RESTORE_SAVE_OLD, _RESTORE_SAVE_NEW),
    )
    if any(old not in source for old, _ in replacements):
        return source

    patched = source
    for old, new in replacements:
        patched = patched.replace(old, new, 1)

    if _RESET_OLD not in patched:
        return source
    patched = patched.replace(_RESET_OLD, _RESET_NEW, 1)
    return patched
