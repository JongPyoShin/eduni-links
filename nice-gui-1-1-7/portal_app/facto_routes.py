from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse
from nicegui import app


FACTO_PREP_URL = "/facto"
_GAME_STATIC_DIR = Path(__file__).resolve().parent / "static_games"


@app.get(FACTO_PREP_URL, response_class=HTMLResponse)
@app.get(f"{FACTO_PREP_URL}/", response_class=HTMLResponse)
def facto_competition_prep() -> HTMLResponse:
    path = _GAME_STATIC_DIR / "facto_prep.html"
    if not path.exists():
        return HTMLResponse(
            "<!doctype html><html lang='ko'><meta charset='utf-8'><title>팩토대회준비</title>"
            "<body><h1>팩토대회준비</h1><p>문제 페이지를 찾을 수 없습니다.</p></body></html>",
            status_code=404,
        )
    return HTMLResponse(path.read_text(encoding="utf-8"))
