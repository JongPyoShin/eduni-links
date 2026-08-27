from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, Response
from nicegui import app


SPACE_GAME_URL = "/space"
SPACE_QUESTION_BANK_URL = "/space-question-bank.js"
SPACE_GAME_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space.html"
SPACE_QUESTION_BANK_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_question_bank.js"


def _inject_question_bank(html: str) -> str:
    html = html.replace(
        "거울, 회전, 쌓기나무, 위에서 본 모양을 10문제로 가볍게 연습해요. 시간 제한은 없어요.",
        "200문제 풀에서 매번 10문제를 랜덤으로 골라 연습해요. 시간 제한은 없어요.",
        1,
    )
    html = html.replace(
        "  <script>\n    (() => {",
        f'  <script src="{SPACE_QUESTION_BANK_URL}"></script>\n  <script>\n    (() => {{',
        1,
    )
    html = html.replace(
        "      const baseShapes = [",
        "      const extraQuestionBank = window.EDUNI_SPACE_BANK || { shapes: [], countMaps: [], projectionMaps: [] };\n"
        "      const baseShapes = [",
        1,
    )
    html = html.replace(
        "      ];\n\n      const randInt =",
        "      ];\n"
        "      const allShapes = baseShapes.concat(extraQuestionBank.shapes || []);\n\n"
        "      const randInt =",
        1,
    )
    html = html.replace(
        "      const matrixKey = (m) => m.map((row) => row.join('')).join('|');",
        "      const matrixKey = (m) => m.map((row) => row.join('')).join('|');\n"
        "      const bankBags = Object.create(null);\n"
        "      const drawBankMatrix = (name, pool, fallback) => {\n"
        "        if (!pool.length) return fallback();\n"
        "        if (!bankBags[name] || !bankBags[name].length) {\n"
        "          bankBags[name] = shuffle(Array.from({length:pool.length},(_,index) => index));\n"
        "        }\n"
        "        return cloneMatrix(pool[bankBags[name].pop()]);\n"
        "      };",
        1,
    )
    html = html.replace(
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('mirror', allShapes, () => cloneMatrix(pick(baseShapes)));",
        1,
    )
    html = html.replace(
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('rotate', allShapes, () => cloneMatrix(pick(baseShapes)));",
        1,
    )
    html = html.replace(
        "      function makeCountQuestion() {\n        const map = randomHeightMap();",
        "      function makeCountQuestion() {\n"
        "        const map = drawBankMatrix('count', extraQuestionBank.countMaps || [], randomHeightMap);",
        1,
    )
    html = html.replace(
        "      function makeProjectionQuestion() {\n        const map=randomHeightMap();",
        "      function makeProjectionQuestion() {\n"
        "        const map=drawBankMatrix('projection', extraQuestionBank.projectionMaps || [], randomHeightMap);",
        1,
    )
    return html


def _space_game_html() -> HTMLResponse:
    if not SPACE_GAME_FILE.exists() or not SPACE_QUESTION_BANK_FILE.exists():
        return HTMLResponse(
            """
            <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>공간탐험 파일 없음</title></head><body style="font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px">
            <h1>공간탐험 게임 파일을 찾을 수 없습니다.</h1>
            </body></html>
            """,
            status_code=404,
        )
    return HTMLResponse(_inject_question_bank(SPACE_GAME_FILE.read_text(encoding="utf-8")))


@app.get(SPACE_QUESTION_BANK_URL)
def eduni_space_question_bank() -> Response:
    if not SPACE_QUESTION_BANK_FILE.exists():
        return Response("// question bank missing", status_code=404, media_type="application/javascript")
    return Response(SPACE_QUESTION_BANK_FILE.read_text(encoding="utf-8"), media_type="application/javascript")


@app.get("/space", response_class=HTMLResponse)
@app.get("/space/", response_class=HTMLResponse)
def eduni_space_game() -> HTMLResponse:
    return _space_game_html()


@app.get("/games/eduni-space", response_class=HTMLResponse)
@app.get("/games/eduni-space/", response_class=HTMLResponse)
def eduni_space_redirect() -> HTMLResponse:
    return HTMLResponse(
        f"""
        <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <meta http-equiv="refresh" content="0; url={SPACE_GAME_URL}"><title>EDUNI 공간탐험으로 이동</title></head>
        <body style="font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px">
        <h1>EDUNI 공간탐험</h1><p>잠시 후 이동합니다.</p><a href="{SPACE_GAME_URL}">바로 열기</a>
        <script>window.location.replace('{SPACE_GAME_URL}');</script></body></html>
        """
    )
