from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse
from nicegui import app


SPACE_GAME_URL = "/space"
SPACE_GAME_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space.html"


def _space_game_html() -> HTMLResponse:
    if not SPACE_GAME_FILE.exists():
        return HTMLResponse(
            """
            <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>공간탐험 파일 없음</title></head><body style="font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px">
            <h1>공간탐험 게임 파일을 찾을 수 없습니다.</h1>
            </body></html>
            """,
            status_code=404,
        )
    return HTMLResponse(SPACE_GAME_FILE.read_text(encoding="utf-8"))


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
