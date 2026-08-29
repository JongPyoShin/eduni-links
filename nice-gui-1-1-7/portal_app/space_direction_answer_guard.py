from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


_DIRECTION_START = "      function makeDirectionQuestion() {"
_DIRECTION_END = "      function renderReasoningPiece(matrix, color) {"

_DIRECTION_IMPLEMENTATION = r'''      function directionAnswerKey(row,col,direction) {
        return `${row},${col},${direction}`;
      }

      function makeDirectionQuestion() {
        const scenario=drawBankItem('direction', extraQuestionBank.directionScenarios || [], () => ({
          startRow:2,startCol:2,startDirection:0,commands:['R','F','L','F'],finalRow:1,finalCol:3,finalDirection:0,
        }));
        const correctKey=directionAnswerKey(scenario.finalRow,scenario.finalCol,scenario.finalDirection);
        const candidates=[[scenario.finalRow,scenario.finalCol,scenario.finalDirection]];
        const seen=new Set([correctKey]);

        const positionOffsets=shuffle([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]);
        for (const [dr,dc] of positionOffsets) {
          const r=scenario.finalRow+dr;
          const c=scenario.finalCol+dc;
          const d=scenario.finalDirection;
          const key=directionAnswerKey(r,c,d);
          if (r<0 || r>=5 || c<0 || c>=5 || seen.has(key)) continue;
          seen.add(key);
          candidates.push([r,c,d]);
          if (candidates.length===2) break;
        }

        const wrongDirections=shuffle([0,1,2,3].filter((direction) => direction!==scenario.finalDirection));
        for (const direction of wrongDirections) {
          const key=directionAnswerKey(scenario.finalRow,scenario.finalCol,direction);
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push([scenario.finalRow,scenario.finalCol,direction]);
          if (candidates.length===3) break;
        }

        if (candidates.length!==3) throw new Error('EDUNI direction question could not build 3 unique position+direction choices');

        const options=shuffle(candidates).map(([r,c,direction]) => ({
          key:directionAnswerKey(r,c,direction),
          html:renderDirectionGrid(r,c,direction,true),
        }));
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
