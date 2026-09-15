from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


_ORIGINAL_SPACE_GAME_HTML = space_routes._space_game_html


def _clarify_direction_html(html: str) -> str:
    replacements = {
        "      const DIRECTION_ARROWS = ['↑','→','↓','←'];\n      const COMMAND_LABELS = { L:'↶ 왼쪽으로 돌기', R:'↷ 오른쪽으로 돌기', F:'↑ 앞으로 1칸' };":
            "      const DIRECTION_ARROWS = ['↑','→','↓','←'];\n"
            "      const DIRECTION_NAMES = ['위쪽','오른쪽','아래쪽','왼쪽'];\n"
            "      const COMMAND_LABELS = { L:'↺ 90° 반시계 방향으로 돌기', R:'↻ 90° 시계 방향으로 돌기', F:'↑ 앞으로 1칸 이동' };",
        "          copy:'화살표가 보는 방향을 기억하면서 한 단계씩 움직여보자.',":
            "          copy:'시작 방향을 확인하고, 회전은 항상 90°씩 한 단계씩 따라가보자. 화살표가 보는 방향을 기억하면서 움직여보자.',",
        "          visual:`<div class=\"reasoning-stage\">${renderDirectionGrid(scenario.startRow,scenario.startCol,scenario.startDirection)}<div class=\"command-row\">${commands}</div></div>`,":
            "          visual:`<div class=\"reasoning-stage\"><div class=\"fold-label\">시작 방향: ${DIRECTION_NAMES[scenario.startDirection]} ${DIRECTION_ARROWS[scenario.startDirection]}</div>${renderDirectionGrid(scenario.startRow,scenario.startCol,scenario.startDirection)}<div class=\"command-row\">${commands}</div></div>`,",
        "          hint:'먼저 몸의 방향을 돌린 다음, 그 방향으로 앞으로 한 칸 움직여봐.',":
            "          hint:'먼저 몸의 방향을 돌린 다음, 그 방향으로 앞으로 한 칸 움직여봐. ↺는 반시계 방향 90°, ↻는 시계 방향 90°야.',",
    }
    for old, new in replacements.items():
        # The base route may already contain the clarified copy; keep this
        # compatibility wrapper idempotent across branch combinations.
        if old in html:
            html = html.replace(old, new, 1)
    return html


def _space_game_html_with_direction_clarity() -> HTMLResponse:
    response = _ORIGINAL_SPACE_GAME_HTML()
    if response.status_code != 200:
        return response
    html = response.body.decode("utf-8")
    return HTMLResponse(_clarify_direction_html(html), status_code=response.status_code)


def install_direction_clarity() -> None:
    if space_routes._space_game_html is _space_game_html_with_direction_clarity:
        return
    space_routes._space_game_html = _space_game_html_with_direction_clarity
