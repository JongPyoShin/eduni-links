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


def install_facto_portal_card() -> None:
    """Add the Facto practice card beside Space Exploration on the portal home."""
    from . import routes as portal_routes

    original = portal_routes._portal_card
    if getattr(original, "_facto_card_installed", False):
        return

    def portal_card_with_facto(href, title, description, badge, card_class="", *, icon=None, accent=None):
        result = original(href, title, description, badge, card_class, icon=icon, accent=accent)
        if href == portal_routes.EDUNI_SPACE_URL and title == "공간탐험":
            original(
                FACTO_PREP_URL,
                "팩토대회준비",
                "7세 팩토 대회 유형을 연습하는 사고력 수학 문제",
                "대회 준비",
                "portal-game-amber",
            )
        return result

    portal_card_with_facto._facto_card_installed = True
    portal_routes._portal_card = portal_card_with_facto


install_facto_portal_card()
