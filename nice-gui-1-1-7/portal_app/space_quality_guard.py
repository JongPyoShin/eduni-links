from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, Response
from nicegui import app

from . import space_routes


SPACE_SPATIAL_GUARD_URL = "/space-spatial-guard.js"
SPACE_SPATIAL_GUARD_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_spatial_guard.js"
SPACE_FULL_AUDIT_URL = "/space-full-audit.js"
SPACE_FULL_AUDIT_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_full_audit.js"


def _replace_if_present(html: str, old: str, new: str) -> str:
    if old in html:
        return html.replace(old, new, 1)
    return html


def _inject_quality_guard(html: str) -> str:
    marker = (
        '<script src="/space-question-bank.js"></script>\n'
        '  <script src="/space-logic-bank.js"></script>'
    )
    replacement = (
        '<script src="/space-question-bank.js"></script>\n'
        f'  <script src="{SPACE_SPATIAL_GUARD_URL}"></script>\n'
        '  <script src="/space-logic-bank.js"></script>\n'
        f'  <script src="{SPACE_FULL_AUDIT_URL}"></script>'
    )
    if marker not in html:
        raise RuntimeError("EDUNI spatial/full audit script marker missing")
    html = html.replace(marker, replacement, 1)
    html = _replace_if_present(
        html,
        '        <p id="bestScore" class="best"></p>',
        '        <p id="bestScore" class="best"></p>\n'
        '        <p id="spaceAuditStatus" class="best">🔍 문제은행 전수검증 확인 중...</p>',
    )

    replacements = {
        "          copy:'세로 거울의 반대편 모습을 찾아보자.',":
            "          copy:'해야 할 일: 세로 거울에 비친 뒤의 모양을 고르세요.\\n규칙: 거울을 기준으로 왼쪽과 오른쪽 위치만 서로 바뀝니다. 위아래 위치와 노란 점이 도형 안에서 차지하는 상대적인 자리는 그대로 유지됩니다.',",
        "          copy:'노란 점의 자리도 함께 돌아가요.',":
            "          copy:`해야 할 일: 도형 전체를 오른쪽, 즉 시계 방향으로 ${degree}° 돌렸을 때의 모양을 고르세요.\\n규칙: 도형의 모든 칸과 노란 점을 하나의 종이처럼 함께 돌립니다. 일부 칸만 따로 움직이지 않습니다.`,",
        "          copy:'위에 블록이 있다면 그 아래에도 블록이 있어요.',":
            "          copy:'해야 할 일: 그림에 있는 쌓기나무의 전체 개수를 세세요.\\n규칙: 바닥의 서로 다른 칸은 서로 다른 기둥입니다. 한 기둥이 2칸 높이라면 위 블록과 그 아래 블록을 모두 세어야 합니다. 다른 바닥 칸의 숨은 블록을 임의로 가정하지 마세요.',",
        "          copy:'높이는 잠깐 잊고, 블록이 놓인 자리만 찾아보자.',":
            "          copy:'해야 할 일: 이 쌓기나무를 바로 위에서 내려다봤을 때 보이는 바닥 모양을 고르세요.\\n규칙: 같은 바닥 칸에 여러 블록이 쌓여 있어도 위에서는 한 칸으로 봅니다. 높이는 무시하고 블록이 놓인 바닥 칸의 위치만 확인하세요.',",
        "          copy:'같은 격자의 자리를 머릿속으로 포개어 완성 모양을 찾아보자.',":
            "          copy:'해야 할 일: 파란 조각과 분홍 조각을 같은 4×4 격자의 같은 위치에 포개었을 때 완성되는 모양을 고르세요.\\n규칙: 조각을 마음대로 이동하거나 돌리지 않습니다. 두 그림에 표시된 칸의 위치를 그대로 합칩니다.',",
        "          copy:'접힌 종이에 찍힌 빨간 점이 펼쳤을 때 대칭으로 어디에 나타날지 생각해보자.',":
            "          copy:'해야 할 일: 표시된 방향으로 종이를 정확히 반으로 한 번 접고 빨간 위치에 구멍을 뚫었다고 생각하세요. 종이를 완전히 펼쳤을 때 생기는 모든 구멍의 위치를 고르세요.\\n규칙: 접힌 선을 기준으로 구멍은 같은 거리의 대칭 위치에 하나 더 생깁니다.',",
        "          visual:renderBlocks(map),":
            "          visual:`<div class=\"reasoning-stage\"><div class=\"fold-label\">바닥 3×3 격자의 칸을 기준으로 기둥을 구분해요.</div>${renderBlocks(map)}</div>`,",
        "          visual:renderBlocks(map),\n          options:shuffle(options),":
            "          visual:`<div class=\"reasoning-stage\"><div class=\"fold-label\">바닥 3×3 격자에서 블록이 놓인 칸만 찾아요.</div>${renderBlocks(map)}</div>`,\n          options:shuffle(options),",
    }
    for old, new in replacements.items():
        html = _replace_if_present(html, old, new)
    return html


def install_quality_guard() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_quality_guard", False):
        return

    def _space_game_html_with_quality_guard() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        if not SPACE_SPATIAL_GUARD_FILE.exists() or not SPACE_FULL_AUDIT_FILE.exists():
            return HTMLResponse("EDUNI space audit file missing", status_code=404)
        html = response.body.decode("utf-8")
        return HTMLResponse(_inject_quality_guard(html), status_code=response.status_code)

    _space_game_html_with_quality_guard._eduni_quality_guard = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_quality_guard


@app.get(SPACE_SPATIAL_GUARD_URL)
def eduni_space_spatial_guard() -> Response:
    if not SPACE_SPATIAL_GUARD_FILE.exists():
        return Response("// spatial guard missing", status_code=404, media_type="application/javascript")
    return Response(SPACE_SPATIAL_GUARD_FILE.read_text(encoding="utf-8"), media_type="application/javascript")


@app.get(SPACE_FULL_AUDIT_URL)
def eduni_space_full_audit() -> Response:
    if not SPACE_FULL_AUDIT_FILE.exists():
        return Response("// full audit missing", status_code=404, media_type="application/javascript")
    return Response(SPACE_FULL_AUDIT_FILE.read_text(encoding="utf-8"), media_type="application/javascript")
