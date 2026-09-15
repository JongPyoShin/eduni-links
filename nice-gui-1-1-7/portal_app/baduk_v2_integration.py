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

_SHOW_COACH_AI_BRANCH = (
    "if(kind==='ai'){coachIcon.textContent='💡';coachTitle.textContent='AI는 왜 여기에 뒀을까?';"
    "coachSummary.textContent=view.explanation;confirmMoveButton.style.display='none';"
    "cancelPreviewButton.textContent='알겠어요'}else if(a.legal){"
)
_SHOW_COACH_AI_AND_LOCAL_BRANCH = (
    "if(kind==='ai'){coachIcon.textContent='💡';coachTitle.textContent='AI는 왜 여기에 뒀을까?';"
    "coachSummary.textContent=view.explanation;confirmMoveButton.style.display='none';"
    "cancelPreviewButton.textContent='알겠어요'}else if(kind==='local'){coachIcon.textContent='🔎';"
    "coachTitle.textContent='이 수로 바뀐 점';coachSummary.textContent=view.explanation;"
    "confirmMoveButton.style.display='none';cancelPreviewButton.textContent='알겠어요'}else if(a.legal){"
)

_AI_POST_MOVE_BRANCH = (
    "if(coachEnabled()&&source==='ai'&&aiMeta){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:`AI가 여기 둔 이유: ${strongestAiReason(aiMeta)}`},'ai')}"
    "return true}"
)
_AI_AND_LOCAL_POST_MOVE_BRANCH = (
    "if(coachEnabled()&&source==='ai'&&aiMeta){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:`AI가 여기 둔 이유: ${strongestAiReason(aiMeta)}`},'ai')}"
    "else if(coachEnabled()&&mode==='local'&&source==='human'){const analysis=analyzeMove(beforeBoard,row,col,color,null);"
    "showCoach({row,col,color,analysis,source:beforeBoard,explanation:localMoveSummary(analysis)},'local')}"
    "return true}"
)

_SHARED_AI_FUNCTIONS = """function sharedCoachLogic(){return window.EDUNIBadukCoachLogic.create(window.EDUNIBadukEngine)}
function strongestAiReason(move){return sharedCoachLogic().strongestAiReason(move)}
function uniqueGroupKeys"""

_SHARED_ANALYZE_FUNCTIONS = """function analyzeMove(source,row,col,color,koState=null){const shared=sharedCoachLogic().analyzeMove(source,row,col,color,koState);let summary=shared.summary;if(shared.legal&&levelId==='intermediate'&&!shared.captured)summary+=` 현재 활로 ${shared.ownLibertiesAfter}개를 확보해요.`;if(shared.legal&&levelId==='standard')summary+=` 연결 그룹 ${shared.connectedOwnGroups}개, 상대 단수 그룹 ${shared.opponentAtariGroups.length}개를 함께 확인하세요.`;return{...shared,reasonCode:shared.reasonCode==='self_atari_risk'?'self_atari':shared.reasonCode,summary,visual:{candidate:[row,col],liberties:shared.libertyPoints||[],captured:shared.capturedStones||[],atari:shared.opponentAtariStones||[]},boardAfter:shared.afterBoard}}
function localMoveSummary(analysis){const atariStones=(analysis.opponentAtariStones||[]).length;if(analysis.captured>0)return`이 수로 내 돌 ${analysis.captured}개가 잡혔어요.`;if(atariStones>0)return`이 수로 내 돌 ${atariStones}개가 단수가 됐어요.`;if(analysis.connectedOwnGroups>=2)return'이 수로 상대 돌 두 무리가 연결됐어요.';return`이 수로 잡힌 돌은 없어요. 상대 돌의 활로는 ${analysis.ownLibertiesAfter||0}개예요.`}
let board="""

_AI_CANDIDATES_WITH_STRATEGY = """function aiCandidateMoves(source,koState){const empties=new Set(),hasStone=source.some(row=>row.some(Boolean));if(!hasStone){for(const[r,c]of starPoints)empties.add(`${r},${c}`);const m=Math.floor(boardSize/2);empties.add(`${m},${m}`)}else{for(let r=0;r<boardSize;r++)for(let c=0;c<boardSize;c++)if(source[r][c]!==EMPTY)for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){if(Math.abs(dr)+Math.abs(dc)>3)continue;const nr=r+dr,nc=c+dc;if(inside(nr,nc)&&source[nr][nc]===EMPTY)empties.add(`${nr},${nc}`)}}let candidates=[...empties].map(k=>k.split(',').map(Number));if(boardSize===19&&window.EDUNIBadukAiStrategy)candidates=window.EDUNIBadukAiStrategy.expandCandidates(source,candidates);if(!candidates.length)return legalMoves(source,WHITE,koState);const moves=[];for(const[row,col]of candidates){const result=tryMove(source,row,col,WHITE,koState);if(result.legal)moves.push({row,col,result})}return moves.length?moves:legalMoves(source,WHITE,koState)}
function aiPickMove"""

_AI_COMPONENTS_WITH_STRATEGY = """const strategic=boardSize===19&&window.EDUNIBadukAiStrategy?window.EDUNIBadukAiStrategy.scoreMove(source,row,col,moveCount):{spread:0,opening:0};const components={capture:result.captured*w.capture,atari:Math.max(0,afterAtari-beforeAtari)*w.atari,liberties:result.liberties*w.liberties,neighbors:neighbors*w.neighbors,center:(maxCenter-centerDistance)*w.center,edge:(row===0||row===boardSize-1||col===0||col===boardSize-1)?-w.edge:0,spread:strategic.spread,opening:strategic.opening,jitter:Math.random()*w.jitter};"""


def integrate_v2_coach(source: str, logic_script: str, ai_strategy_script: str = "") -> str:
    """Bind tested coach and optional 19x19 strategy logic to Baduk v2.

    Coach integration remains fail-safe. The optional AI strategy is applied only
    when both candidate-generation and scoring markers match; otherwise the
    verified coach integration is still served without a partial AI patch.
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

    if patched == source:
        return source

    scripts = [logic_script]
    if strategy_enabled:
        scripts.append(ai_strategy_script)
    shared_script = "\n".join(f"<script>\n{script}\n</script>" for script in scripts) + "\n"
    return patched.replace(_MAIN_SCRIPT_MARKER, f"{shared_script}{_MAIN_SCRIPT_MARKER}", 1)
