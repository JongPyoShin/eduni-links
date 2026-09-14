from __future__ import annotations

from fastapi.responses import HTMLResponse
from nicegui import app

from . import routes


EDUNI_BADUK_URL = "/baduk"
_BADUK_CARD_MARKER = "__eduni_baduk_card_injected__"


@app.get("/baduk", response_class=HTMLResponse)
@app.get("/baduk/", response_class=HTMLResponse)
def eduni_baduk_game() -> HTMLResponse:
    return routes._game_html_response("eduni_baduk.html")


@app.get("/games/eduni-baduk", response_class=HTMLResponse)
@app.get("/games/eduni-baduk/", response_class=HTMLResponse)
def eduni_baduk_redirect() -> HTMLResponse:
    return routes._redirect_html("EDUNI 바둑으로 이동", EDUNI_BADUK_URL)


def install_baduk_portal_card() -> None:
    """Inject the Baduk card immediately after the existing Omok quick-start card.

    Phase 1 keeps the large portal route module untouched and installs the card as
    a small extension. A later cleanup can fold this into routes.py directly.
    """
    portal_card = routes._portal_card
    if getattr(portal_card, _BADUK_CARD_MARKER, False):
        return

    def portal_card_with_baduk(
        href: str,
        title: str,
        subtitle: str,
        pill: str,
        classes: str = "",
        icon: str | None = None,
        accent: str | None = None,
    ) -> None:
        portal_card(href, title, subtitle, pill, classes, icon, accent)
        if href == routes.EDUNI_OMOK_URL:
            portal_card(
                EDUNI_BADUK_URL,
                "바둑",
                "9×9 바둑판에서 AI와 한 수씩 두는 입문 바둑",
                "AI 대국",
                "portal-game-amber",
            )

    setattr(portal_card_with_baduk, _BADUK_CARD_MARKER, True)
    routes._portal_card = portal_card_with_baduk


install_baduk_portal_card()
