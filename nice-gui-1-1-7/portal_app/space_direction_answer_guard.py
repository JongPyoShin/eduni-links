from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


_DIRECTION_START = "      function makeDirectionQuestion() {"
_DIRECTION_END = "      function renderReasoningPiece(matrix, color) {"

_DIRECTION_IMPLEMENTATION = r'''      function directionAnswerKey(row,col,direction) {
        return `${row},${col},${direction}`;
      }

      function solveDirectionScenarioContract(scenario) {
        const dr=[-1,0,1,0];
        const dc=[0,1,0,-1];
        let row=scenario.startRow;
        let col=scenario.startCol;
        let direction=scenario.startDirection;
        for (const command of scenario.commands) {
          if (command==='L') direction=(direction+3)%4;
          else if (command==='R') direction=(direction+1)%4;
          else if (command==='F') {
            row+=dr[direction];
            col+=dc[direction];
          } else {
            return null;
          }
          if (row<0 || row>=5 || col<0 || col>=5) return null;
        }
        return {row,col,direction};
      }

      function buildDirectionChoiceTriples(scenario) {
        const correct=[scenario.finalRow,scenario.finalCol,scenario.finalDirection];
        const correctKey=directionAnswerKey(...correct);
        const candidates=[correct];
        const seen=new Set([correctKey]);
        const positionOffsets=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
        for (const [dr,dc] of positionOffsets) {
          const r=scenario.finalRow+dr;
          const c=scenario.finalCol+dc;
          const d=scenario.finalDirection;
          const key=directionAnswerKey(r,c,d);
          if (r<0 || r>=5 || c<0 || c>=5 || seen.has(key)) continue;
          seen.add(key);
          candidates.push([r,c,d]);
          break;
        }
        const wrongDirection=(scenario.finalDirection+2)%4;
        const directionKey=directionAnswerKey(scenario.finalRow,scenario.finalCol,wrongDirection);
        if (!seen.has(directionKey)) {
          seen.add(directionKey);
          candidates.push([scenario.finalRow,scenario.finalCol,wrongDirection]);
        }
        return candidates;
      }

      function auditDirectionUiContracts() {
        const failures=[];
        const scenarios=extraQuestionBank.directionScenarios || [];
        const bankAudit=window.EDUNI_SPACE_FULL_AUDIT;
        if (!bankAudit || bankAudit.ok!==true || bankAudit.checked!==470 || bankAudit.total!==470) {
          failures.push('470/470 bank audit missing or failed');
        }
        if (scenarios.length!==50) failures.push(`direction pool ${scenarios.length}/50`);
        scenarios.forEach((scenario,index) => {
          const solved=solveDirectionScenarioContract(scenario);
          const id=`DIR-${String(index+1).padStart(3,'0')}`;
          if (!solved) {
            failures.push(`${id}: invalid command path`);
            return;
          }
          if (solved.row!==scenario.finalRow || solved.col!==scenario.finalCol || solved.direction!==scenario.finalDirection) {
            failures.push(`${id}: solver ${solved.row},${solved.col},${solved.direction} != stored ${scenario.finalRow},${scenario.finalCol},${scenario.finalDirection}`);
          }
          const triples=buildDirectionChoiceTriples(scenario);
          const keys=triples.map(([r,c,d]) => directionAnswerKey(r,c,d));
          const correctKey=directionAnswerKey(scenario.finalRow,scenario.finalCol,scenario.finalDirection);
          if (triples.length!==3 || new Set(keys).size!==3) failures.push(`${id}: three unique position+direction choices required`);
          if (keys.filter((key) => key===correctKey).length!==1) failures.push(`${id}: correct answer must appear exactly once`);
          triples.forEach(([r,c,direction],choiceIndex) => {
            const rendered=renderDirectionGrid(r,c,direction,true);
            if (!rendered.includes(DIRECTION_ARROWS[direction])) failures.push(`${id}: choice ${choiceIndex+1} does not render facing direction`);
          });
        });
        const report=Object.freeze({ok:failures.length===0,checked:scenarios.length,total:50,failures:Object.freeze([...failures])});
        window.EDUNI_DIRECTION_UI_AUDIT=report;
        const status=document.getElementById('spaceAuditStatus');
        if (status) {
          if (report.ok && bankAudit && bankAudit.ok===true) {
            status.textContent='✅ 문제은행 470/470 + 방향 화면·채점 50/50 통과';
            status.style.color='#15803d';
          } else {
            status.textContent='⛔ 문제은행/화면 정답 검증 실패 · 문제 출제 차단';
            status.style.color='#b42318';
          }
        }
        if (!report.ok) {
          console.error('EDUNI direction UI audit failed',report);
          throw new Error(`EDUNI direction UI audit failed (${failures.length}): ${failures.slice(0,5).join(' | ')}`);
        }
        return report;
      }

      const directionUiAudit=auditDirectionUiContracts();

      function makeDirectionQuestion() {
        const scenario=drawBankItem('direction', extraQuestionBank.directionScenarios || [], () => ({
          startRow:2,startCol:2,startDirection:0,commands:['R','F','L','F'],finalRow:1,finalCol:3,finalDirection:0,
        }));
        const solved=solveDirectionScenarioContract(scenario);
        if (!solved || solved.row!==scenario.finalRow || solved.col!==scenario.finalCol || solved.direction!==scenario.finalDirection) {
          throw new Error('EDUNI direction scenario failed independent solve before rendering');
        }
        const correctKey=directionAnswerKey(scenario.finalRow,scenario.finalCol,scenario.finalDirection);
        const triples=buildDirectionChoiceTriples(scenario);
        if (triples.length!==3) throw new Error('EDUNI direction question could not build 3 unique position+direction choices');
        const options=shuffle(triples).map(([r,c,direction]) => ({
          key:directionAnswerKey(r,c,direction),
          html:renderDirectionGrid(r,c,direction,true),
        }));
        const optionKeys=options.map((option) => option.key);
        if (new Set(optionKeys).size!==3 || optionKeys.filter((key) => key===correctKey).length!==1) {
          throw new Error('EDUNI direction rendered choices failed single-answer contract');
        }
        const commands=scenario.commands.map((command,index) => `<span class="command-chip">${index+1}. ${COMMAND_LABELS[command]}</span>`).join('');
        return {
          badge:'🧭 방향 이동',
          title:'명령을 모두 따라간 뒤, 마지막 위치와 방향은?',
          copy:`해야 할 일: 명령을 1번부터 순서대로 실행한 뒤 마지막 칸과 화살표 방향이 모두 맞는 답을 고르세요.\n규칙: 시작 방향은 ${DIRECTION_LABELS[scenario.startDirection]}입니다. ↺는 제자리에서 90° 반시계 방향, ↻는 제자리에서 90° 시계 방향으로 돕니다. 돌기 명령은 칸을 이동하지 않습니다. 앞으로 1칸은 현재 바라보는 방향으로 한 칸 이동합니다.`,
          visual:`<div class="reasoning-stage"><div class="fold-label">시작 방향: ${DIRECTION_LABELS[scenario.startDirection]}</div>${renderDirectionGrid(scenario.startRow,scenario.startCol,scenario.startDirection)}<div class="command-row">${commands}</div></div>`,
          options,
          correctKey,
          hint:'회전할 때는 자리를 옮기지 않아. 먼저 마지막 칸을 찾고, 그 자리에서 마지막 화살표 방향까지 확인해봐.',
        };
      }

'''


def _replace_direction_question(html: str) -> str:
    start = html.find(_DIRECTION_START)
    end = html.find(_DIRECTION_END)
    if start < 0 or end < 0 or end <= start:
        raise RuntimeError("EDUNI direction question markers missing")
    return html[:start] + _DIRECTION_IMPLEMENTATION + html[end:]


def _fix_destination_marker(html: str) -> str:
    old = (
        "          body += `<circle cx=\"${x}\" cy=\"${y}\" r=\"10\" fill=\"#7c3aed\"/>"
        "<text x=\"${x}\" y=\"${y+5}\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"900\" fill=\"#fff\">★</text>"
        "<text x=\"${x+17}\" y=\"${y+6}\" font-size=\"18\" font-weight=\"900\" fill=\"#4338ca\">${direction === null ? '' : DIRECTION_ARROWS[direction]}</text>`;"
    )
    new = (
        "          body += `<circle cx=\"${x}\" cy=\"${y}\" r=\"14\" fill=\"#eef2ff\" stroke=\"#7c3aed\" stroke-width=\"2\"/>"
        "<text x=\"${x}\" y=\"${y+7}\" text-anchor=\"middle\" font-size=\"22\" font-weight=\"1000\" fill=\"#4338ca\">${direction === null ? '★' : DIRECTION_ARROWS[direction]}</text>"
        "<text x=\"${x+9}\" y=\"${y-8}\" text-anchor=\"middle\" font-size=\"10\" font-weight=\"1000\" fill=\"#f59e0b\">★</text>`;"
    )
    if old not in html:
        raise RuntimeError("EDUNI destination marker renderer missing")
    return html.replace(old, new, 1)


def install_direction_answer_guard() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_direction_answer_guard", False):
        return

    def _space_game_html_with_direction_answer_guard() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        html = response.body.decode("utf-8")
        html = _fix_destination_marker(html)
        html = _replace_direction_question(html)
        return HTMLResponse(html, status_code=response.status_code)

    _space_game_html_with_direction_answer_guard._eduni_direction_answer_guard = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_direction_answer_guard
