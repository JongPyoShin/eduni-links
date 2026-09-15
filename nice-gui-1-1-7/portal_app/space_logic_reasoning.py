from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, Response
from nicegui import app

from . import space_routes


SPACE_LOGIC_BANK_URL = "/space-logic-bank.js"
SPACE_LOGIC_BANK_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_logic_bank.js"


def _replace_once(html: str, old: str, new: str) -> str:
    if old not in html:
        raise RuntimeError(f"EDUNI logic integration marker missing: {old[:100]}")
    return html.replace(old, new, 1)


def _inject_logic_reasoning(html: str) -> str:
    html = _replace_once(
        html,
        '<script src="/space-question-bank.js"></script>\n  <script>',
        f'<script src="/space-question-bank.js"></script>\n  <script src="{SPACE_LOGIC_BANK_URL}"></script>\n  <script>',
    )
    html = _replace_once(
        html,
        "350문제 풀에서 공간지각과 사고추론 문제 10개를 매번 랜덤으로 골라 연습해요. 시간 제한은 없어요.",
        "470문제 풀에서 공간지각·규칙·조건·길찾기 문제 10개를 매번 랜덤으로 골라 연습해요. 시간 제한은 없어요.",
    )
    html = html.replace("7세 공간지각 미션", "공간·추리 사고력 미션", 1)
    html = _replace_once(
        html,
        '          <div class="mission"><b>📄</b><span>종이 접기</span></div>',
        '          <div class="mission"><b>📄</b><span>종이 접기</span></div>\n'
        '          <div class="mission"><b>🧠</b><span>규칙 추론</span></div>\n'
        '          <div class="mission"><b>🔐</b><span>조건 배치</span></div>\n'
        '          <div class="mission"><b>🗺️</b><span>조건 길찾기</span></div>',
    )
    html = _replace_once(
        html,
        "    svg.reasoning-piece { width:min(150px,38vw); height:auto; display:block; }",
        "    svg.reasoning-piece { width:min(150px,38vw); height:auto; display:block; }\n"
        "    .question-copy { white-space:pre-line; line-height:1.55; }\n"
        "    .logic-rule-list { width:min(620px,100%); display:grid; gap:9px; text-align:left; }\n"
        "    .logic-rule { padding:10px 12px; border-radius:13px; background:#fff; border:1px solid #dbe4f0; color:#344054; font-weight:900; line-height:1.45; }\n"
        "    .sequence-row { width:100%; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:7px; }\n"
        "    .sequence-frame { min-width:88px; min-height:88px; padding:8px; display:grid; place-items:center; align-content:center; gap:5px; border-radius:16px; background:#fff; border:2px solid #dbe4f0; }\n"
        "    .sequence-arrow { font-size:33px; line-height:1; font-weight:1000; }\n"
        "    .sequence-dots { max-width:90px; font-size:15px; line-height:1.1; letter-spacing:1px; overflow-wrap:anywhere; }\n"
        "    .sequence-next { color:#667085; font-size:26px; font-weight:1000; }\n"
        "    .arrangement { display:flex; justify-content:center; gap:6px; font-size:31px; }\n"
        "    .arrangement span { width:48px; height:48px; display:grid; place-items:center; border-radius:13px; background:#f8fafc; border:1px solid #dbe4f0; }\n"
        "    .path-grid { display:grid; grid-template-columns:repeat(5,48px); gap:4px; padding:8px; border-radius:18px; background:#dbe4f0; }\n"
        "    .path-cell { width:48px; height:48px; display:grid; place-items:center; border-radius:10px; background:#fff; font-size:23px; font-weight:1000; }\n"
        "    .path-cell.wall { background:#64748b; }\n"
        "    .path-cell.goal { color:#4338ca; font-size:17px; }\n"
        "    .logic-answer { font-size:24px; font-weight:1000; color:#4338ca; }\n"
        "    @media (max-width:480px) { .path-grid { grid-template-columns:repeat(5,42px); } .path-cell { width:42px; height:42px; } .sequence-frame { min-width:76px; } }",
    )

    html = html.replace("F:'↑ 앞으로 1칸'", "F:'↑ 앞으로 1칸 이동'", 1)
    html = html.replace(
        "copy:`시작 방향: ${DIRECTION_LABELS[scenario.startDirection]}<br>회전은 항상 90°씩 해요.<br>화살표가 보는 방향을 기억하면서 움직여보자. 마지막 화살표 방향도 확인해보자.`,",
        "copy:`해야 할 일: 명령을 순서대로 따라가 마지막 도착 칸을 찾으세요.\\n규칙: 시작 방향은 ${DIRECTION_LABELS[scenario.startDirection]}입니다. ↺는 90° 반시계, ↻는 90° 시계 방향으로 돌고, 앞으로 1칸은 현재 바라보는 방향으로 이동합니다.`,",
        1,
    )

    logic_javascript = r'''      const logicQuestionBank = window.EDUNI_LOGIC_BANK || { sequenceScenarios:[], conditionScenarios:[], pathScenarios:[] };
      const LOGIC_COLORS = ['#ef4444','#2563eb','#16a34a'];
      const LOGIC_ARROWS = ['↑','→','↓','←'];

      function stableQuestionHash(text) {
        let hash=2166136261;
        for (let i=0;i<text.length;i+=1) {
          hash^=text.charCodeAt(i);
          hash=Math.imul(hash,16777619);
        }
        return (hash>>>0).toString(36).toUpperCase().padStart(6,'0').slice(-6);
      }

      function validateQuestionContract(question) {
        if (!question || !question.title || !question.copy || !question.visual) return false;
        if (!Array.isArray(question.options) || question.options.length!==3) return false;
        const keys=question.options.map((option) => String(option.key));
        if (new Set(keys).size!==3) return false;
        if (keys.filter((key) => key===String(question.correctKey)).length!==1) return false;
        return question.options.every((option) => typeof option.html==='string' && option.html.length>0);
      }

      function stampQuestion(type, question) {
        if (question.questionId) return question;
        const prefixes={mirror:'MIR',rotate:'ROT',count:'CNT',projection:'TOP',direction:'DIR',compose:'COM',fold:'FLD',sequence:'SEQ',condition:'CON',pathlogic:'PTH'};
        const source=`${type}|${question.title}|${question.correctKey}|${question.visual}`;
        question.questionId=`${prefixes[type] || 'Q'}-${stableQuestionHash(source)}`;
        return question;
      }

      function solveSequenceScenario(scenario) {
        const step=4;
        return {
          direction:(scenario.start.direction + scenario.rule.turnStep*step + 16)%4,
          color:(scenario.start.color + scenario.rule.colorStep*step + 12)%3,
          count:scenario.start.count + scenario.rule.countStep*step,
        };
      }

      function sequenceFrameKey(frame) {
        return `${frame.direction}:${frame.color}:${frame.count}`;
      }

      function renderSequenceFrame(frame) {
        const dots='●'.repeat(frame.count);
        return `<div class="sequence-frame"><div class="sequence-arrow" style="color:${LOGIC_COLORS[frame.color]}">${LOGIC_ARROWS[frame.direction]}</div><div class="sequence-dots" style="color:${LOGIC_COLORS[frame.color]}">${dots}</div></div>`;
      }

      function makeSequenceQuestion() {
        const scenario=drawBankItem('sequence',logicQuestionBank.sequenceScenarios || [],() => null);
        if (!scenario) return null;
        const correct=solveSequenceScenario(scenario);
        const distractors=[
          {...correct,direction:(correct.direction+2)%4},
          {...correct,color:(correct.color+1)%3},
          {...correct,count:Math.max(1,correct.count-scenario.rule.countStep)},
        ];
        const seen=new Set([sequenceFrameKey(correct)]);
        const options=[{key:sequenceFrameKey(correct),html:renderSequenceFrame(correct)}];
        for (const candidate of distractors) {
          const key=sequenceFrameKey(candidate);
          if (seen.has(key)) continue;
          seen.add(key);
          options.push({key,html:renderSequenceFrame(candidate)});
          if (options.length===3) break;
        }
        const frames=scenario.frames.map((frame) => renderSequenceFrame(frame)).join('<span class="sequence-next">→</span>');
        return {
          questionId:`SEQ-${String(scenario.index).padStart(3,'0')}`,
          badge:'🧠 규칙 추론',
          title:'다음에 올 그림은 무엇일까?',
          copy:'해야 할 일: 앞의 4개 그림에서 동시에 변하는 규칙을 찾아 5번째 그림을 고르세요.\n규칙 확인: 화살표 방향, 색, 점의 개수가 각각 일정한 방식으로 변합니다. 한 가지 규칙만 보지 말고 세 가지를 모두 확인하세요.',
          visual:`<div class="reasoning-stage"><div class="sequence-row">${frames}<span class="sequence-next">→ ?</span></div></div>`,
          options:shuffle(options),
          correctKey:sequenceFrameKey(correct),
          hint:'화살표가 몇 도씩 도는지, 색 순서가 어떻게 바뀌는지, 점이 몇 개씩 늘어나는지를 따로 확인해봐.',
        };
      }

      function logicPermutations(items) {
        if (items.length<=1) return [items];
        const out=[];
        items.forEach((item,index) => {
          const rest=items.slice(0,index).concat(items.slice(index+1));
          logicPermutations(rest).forEach((tail) => out.push([item,...tail]));
        });
        return out;
      }

      function logicConditionHolds(order,condition) {
        const indexOf=(token) => order.indexOf(token);
        if (condition.type==='leftOf') return indexOf(condition.a)<indexOf(condition.b);
        if (condition.type==='adjacent') return Math.abs(indexOf(condition.a)-indexOf(condition.b))===1;
        if (condition.type==='notEnd') { const i=indexOf(condition.a); return i!==0 && i!==order.length-1; }
        if (condition.type==='atEnd') { const i=indexOf(condition.a); return i===0 || i===order.length-1; }
        return false;
      }

      function solveConditionScenario(scenario) {
        return logicPermutations(scenario.tokens).filter((order) => scenario.conditions.every((condition) => logicConditionHolds(order,condition)));
      }

      function conditionText(condition) {
        if (condition.type==='leftOf') return `${condition.a}는 ${condition.b}보다 왼쪽에 있어요.`;
        if (condition.type==='adjacent') return `${condition.a}와 ${condition.b}는 서로 바로 옆에 있어요.`;
        if (condition.type==='notEnd') return `${condition.a}는 맨 왼쪽도 맨 오른쪽도 아니에요.`;
        return `${condition.a}는 양쪽 끝 중 한 곳에 있어요.`;
      }

      function arrangementKey(order) { return order.join(''); }
      function renderArrangement(order) { return `<div class="arrangement">${order.map((token) => `<span>${token}</span>`).join('')}</div>`; }

      function makeConditionQuestion() {
        const scenario=drawBankItem('condition',logicQuestionBank.conditionScenarios || [],() => null);
        if (!scenario) return null;
        const solved=solveConditionScenario(scenario);
        if (solved.length!==1) return null;
        const correct=solved[0];
        const invalid=shuffle(logicPermutations(scenario.tokens).filter((order) => arrangementKey(order)!==arrangementKey(correct))).slice(0,2);
        const options=shuffle([correct,...invalid].map((order) => ({key:arrangementKey(order),html:renderArrangement(order)})));
        const rules=scenario.conditions.map((condition,index) => `<div class="logic-rule">${index+1}. ${conditionText(condition)}</div>`).join('');
        return {
          questionId:`CON-${String(scenario.index).padStart(3,'0')}`,
          badge:'🔐 조건 배치',
          title:'세 조건을 모두 만족하는 줄은?',
          copy:'해야 할 일: 네 친구를 왼쪽부터 한 줄로 세운다고 생각하고, 아래의 세 조건을 모두 만족하는 답을 고르세요.\n규칙: 조건 하나만 맞는 답이 아니라 1번부터 3번 조건까지 전부 맞아야 정답입니다.',
          visual:`<div class="reasoning-stage"><div class="logic-rule-list">${rules}</div></div>`,
          options,
          correctKey:arrangementKey(correct),
          hint:'조건을 하나씩 적용해서 불가능한 줄을 지워보자. 마지막까지 남는 줄이 정답이야.',
        };
      }

      function pathCellKey(row,col) { return `${row},${col}`; }
      function solvePathScenario(scenario) {
        const blocked=new Set(scenario.walls.map(([r,c]) => pathCellKey(r,c)));
        const keyCell=pathCellKey(scenario.key[0],scenario.key[1]);
        const doorCell=pathCellKey(scenario.door[0],scenario.door[1]);
        const goalByCell=new Map(Object.entries(scenario.goals).map(([label,[r,c]]) => [pathCellKey(r,c),label]));
        const queue=[{row:scenario.start[0],col:scenario.start[1],hasKey:false,passedDoor:false}];
        const seen=new Set([`0:${pathCellKey(scenario.start[0],scenario.start[1])}:0`]);
        const qualified=new Set();
        const directions=[[-1,0],[1,0],[0,-1],[0,1]];
        while (queue.length) {
          const current=queue.shift();
          const cell=pathCellKey(current.row,current.col);
          const hasKey=current.hasKey || cell===keyCell;
          const passedDoor=current.passedDoor || cell===doorCell;
          const goal=goalByCell.get(cell);
          if (goal && hasKey && passedDoor) qualified.add(goal);
          directions.forEach(([dr,dc]) => {
            const row=current.row+dr;
            const col=current.col+dc;
            if (row<0 || row>=scenario.size || col<0 || col>=scenario.size) return;
            const next=pathCellKey(row,col);
            if (blocked.has(next)) return;
            if (next===doorCell && !hasKey) return;
            const nextHasKey=hasKey || next===keyCell;
            const nextPassedDoor=passedDoor || next===doorCell;
            const stateKey=`${nextHasKey?1:0}:${next}:${nextPassedDoor?1:0}`;
            if (seen.has(stateKey)) return;
            seen.add(stateKey);
            queue.push({row,col,hasKey:nextHasKey,passedDoor:nextPassedDoor});
          });
        }
        return [...qualified].sort();
      }

      function renderPathGrid(scenario) {
        const walls=new Set(scenario.walls.map(([r,c]) => pathCellKey(r,c)));
        const goalByCell=new Map(Object.entries(scenario.goals).map(([label,[r,c]]) => [pathCellKey(r,c),label]));
        let cells='';
        for (let r=0;r<scenario.size;r+=1) {
          for (let c=0;c<scenario.size;c+=1) {
            const key=pathCellKey(r,c);
            let text='';
            let cls='path-cell';
            if (walls.has(key)) { text='🧱'; cls+=' wall'; }
            else if (r===scenario.start[0] && c===scenario.start[1]) text='🚗';
            else if (r===scenario.key[0] && c===scenario.key[1]) text='🔑';
            else if (r===scenario.door[0] && c===scenario.door[1]) text='🚪';
            else if (goalByCell.has(key)) { text=`💎${goalByCell.get(key)}`; cls+=' goal'; }
            cells+=`<div class="${cls}">${text}</div>`;
          }
        }
        return `<div class="path-grid">${cells}</div>`;
      }

      function makePathLogicQuestion() {
        const scenario=drawBankItem('pathlogic',logicQuestionBank.pathScenarios || [],() => null);
        if (!scenario) return null;
        const solved=solvePathScenario(scenario);
        if (solved.length!==1) return null;
        const correct=solved[0];
        const labels=Object.keys(scenario.goals).sort();
        return {
          questionId:`PTH-${String(scenario.index).padStart(3,'0')}`,
          badge:'🗺️ 조건 길찾기',
          title:'규칙을 모두 지키며 갈 수 있는 보물은?',
          copy:'해야 할 일: 자동차가 규칙을 모두 지키면서 도착할 수 있는 보물을 고르세요.\n규칙: ① 🧱 벽은 지나갈 수 없습니다. ② 🔑 열쇠를 먼저 얻어야 합니다. ③ 열쇠가 있어야 🚪 문을 통과할 수 있습니다. ④ 반드시 문을 실제로 통과한 뒤 도착하는 보물만 정답입니다.',
          visual:`<div class="reasoning-stage">${renderPathGrid(scenario)}</div>`,
          options:shuffle(labels.map((label) => ({key:label,html:`<span class="logic-answer">💎 보물 ${label}</span>`}))),
          correctKey:correct,
          hint:'자동차에서 출발해 먼저 열쇠까지 갈 수 있는지 보고, 그 다음 문을 통과한 뒤 이어지는 칸을 따라가봐.',
        };
      }

'''
    html = _replace_once(
        html,
        "      function makeTypeSequence() {\n        const allTypes=['mirror','rotate','count','projection','direction','compose','fold'];",
        logic_javascript + "      function makeTypeSequence() {\n        const allTypes=['mirror','rotate','count','projection','direction','compose','fold'];",
    )
    html = _replace_once(
        html,
        "      function makeTypeSequence() {\n"
        "        const allTypes=['mirror','rotate','count','projection','direction','compose','fold'];\n"
        "        const core=[...allTypes];\n"
        "        while (core.length<TOTAL) core.push(pick(allTypes));\n"
        "        return shuffle(core);\n"
        "      }",
        "      function makeTypeSequence() {\n"
        "        const allTypes=['mirror','rotate','count','projection','direction','compose','fold','sequence','condition','pathlogic'];\n"
        "        const core=shuffle(allTypes).slice(0,8);\n"
        "        while (core.length<TOTAL) core.push(pick(allTypes));\n"
        "        return shuffle(core);\n"
        "      }",
    )
    html = _replace_once(
        html,
        "      function makeQuestion(type) {\n"
        "        if (type==='mirror') return makeMirrorQuestion();\n"
        "        if (type==='rotate') return makeRotationQuestion();\n"
        "        if (type==='count') return makeCountQuestion();\n"
        "        if (type==='projection') return makeProjectionQuestion();\n"
        "        if (type==='direction') return makeDirectionQuestion();\n"
        "        if (type==='compose') return makeComposeQuestion();\n"
        "        return makeFoldQuestion();\n"
        "      }",
        "      function buildQuestion(type) {\n"
        "        if (type==='mirror') return makeMirrorQuestion();\n"
        "        if (type==='rotate') return makeRotationQuestion();\n"
        "        if (type==='count') return makeCountQuestion();\n"
        "        if (type==='projection') return makeProjectionQuestion();\n"
        "        if (type==='direction') return makeDirectionQuestion();\n"
        "        if (type==='compose') return makeComposeQuestion();\n"
        "        if (type==='fold') return makeFoldQuestion();\n"
        "        if (type==='sequence') return makeSequenceQuestion();\n"
        "        if (type==='condition') return makeConditionQuestion();\n"
        "        return makePathLogicQuestion();\n"
        "      }\n\n"
        "      function makeQuestion(type) {\n"
        "        for (let attempt=0;attempt<40;attempt+=1) {\n"
        "          const question=buildQuestion(type);\n"
        "          if (!validateQuestionContract(question)) continue;\n"
        "          return stampQuestion(type,question);\n"
        "        }\n"
        "        throw new Error(`EDUNI could not build a single-answer question for ${type}`);\n"
        "      }",
    )
    html = _replace_once(
        html,
        "        $('typeBadge').textContent=state.question.badge;",
        "        $('typeBadge').textContent=`${state.question.badge} · ${state.question.questionId}`;",
    )
    return html


def install_logic_reasoning() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_logic_reasoning", False):
        return

    def _space_game_html_with_logic_reasoning() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        if not SPACE_LOGIC_BANK_FILE.exists():
            return HTMLResponse("EDUNI logic bank missing", status_code=404)
        html = response.body.decode("utf-8")
        return HTMLResponse(_inject_logic_reasoning(html), status_code=response.status_code)

    _space_game_html_with_logic_reasoning._eduni_logic_reasoning = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_logic_reasoning


@app.get(SPACE_LOGIC_BANK_URL)
def eduni_space_logic_bank() -> Response:
    if not SPACE_LOGIC_BANK_FILE.exists():
        return Response("// logic question bank missing", status_code=404, media_type="application/javascript")
    return Response(SPACE_LOGIC_BANK_FILE.read_text(encoding="utf-8"), media_type="application/javascript")
