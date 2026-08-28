from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, Response
from nicegui import app


SPACE_GAME_URL = "/space"
SPACE_QUESTION_BANK_URL = "/space-question-bank.js"
SPACE_GAME_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space.html"
SPACE_QUESTION_BANK_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_question_bank.js"


def _replace_once(html: str, old: str, new: str) -> str:
    if old not in html:
        raise RuntimeError(f"EDUNI space integration marker missing: {old[:80]}")
    return html.replace(old, new, 1)


def _inject_home_button(html: str) -> str:
    html = _replace_once(
        html,
        "    .counter { color:#475467; }",
        "    .space-home-button { min-height:38px; padding:0 12px; border:1px solid #d9def0; border-radius:12px; background:#fff; color:#475467; font-weight:950; cursor:pointer; white-space:nowrap; }\n"
        "    .space-home-button:active { transform:translateY(1px); }\n"
        "    .counter { color:#475467; }",
    )
    html = _replace_once(
        html,
        "          <div class=\"progress-row\">\n            <span id=\"counter\" class=\"counter\">1 / 10</span>",
        "          <div class=\"progress-row\">\n"
        "            <button id=\"spaceHomeBtn\" class=\"space-home-button\" type=\"button\">← 처음으로</button>\n"
        "            <span id=\"counter\" class=\"counter\">1 / 10</span>",
    )
    html = _replace_once(
        html,
        "      $('startBtn').addEventListener('click',startGame);",
        "      function goToSpaceIntro() {\n"
        "        state.index=0;\n"
        "        state.stars=0;\n"
        "        state.attempts=0;\n"
        "        state.resolved=false;\n"
        "        state.types=[];\n"
        "        state.question=null;\n"
        "        $('game').style.display='none';\n"
        "        $('result').style.display='none';\n"
        "        $('intro').style.display='block';\n"
        "        updateBest();\n"
        "        window.scrollTo({top:0,behavior:'smooth'});\n"
        "      }\n\n"
        "      $('spaceHomeBtn').addEventListener('click',goToSpaceIntro);\n"
        "      $('startBtn').addEventListener('click',startGame);",
    )
    return html


def _inject_question_bank(html: str) -> str:
    html = _replace_once(
        html,
        "거울, 회전, 쌓기나무, 위에서 본 모양을 10문제로 가볍게 연습해요. 시간 제한은 없어요.",
        "200문제 풀에서 매번 10문제를 랜덤으로 골라 연습해요. 시간 제한은 없어요.",
    )
    html = _replace_once(
        html,
        "  <script>\n    (() => {",
        f'  <script src="{SPACE_QUESTION_BANK_URL}"></script>\n  <script>\n    (() => {{',
    )
    html = _replace_once(
        html,
        "      const baseShapes = [",
        "      const extraQuestionBank = window.EDUNI_SPACE_BANK || { shapes: [], countMaps: [], projectionMaps: [] };\n"
        "      const baseShapes = [",
    )
    html = _replace_once(
        html,
        "      ];\n\n      const randInt =",
        "      ];\n"
        "      const allShapes = baseShapes.concat(extraQuestionBank.shapes || []);\n\n"
        "      const randInt =",
    )
    html = _replace_once(
        html,
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
    )
    html = _replace_once(
        html,
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('mirror', allShapes, () => cloneMatrix(pick(baseShapes)));",
    )
    html = _replace_once(
        html,
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('rotate', allShapes, () => cloneMatrix(pick(baseShapes)));",
    )
    html = _replace_once(
        html,
        "      function makeCountQuestion() {\n        const map = randomHeightMap();",
        "      function makeCountQuestion() {\n"
        "        const map = drawBankMatrix('count', extraQuestionBank.countMaps || [], randomHeightMap);",
    )
    html = _replace_once(
        html,
        "      function makeProjectionQuestion() {\n        const map=randomHeightMap();",
        "      function makeProjectionQuestion() {\n"
        "        const map=drawBankMatrix('projection', extraQuestionBank.projectionMaps || [], randomHeightMap);",
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
    html = SPACE_GAME_FILE.read_text(encoding="utf-8")
    html = _inject_question_bank(html)
    html = _inject_home_button(html)
    return HTMLResponse(html)


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
