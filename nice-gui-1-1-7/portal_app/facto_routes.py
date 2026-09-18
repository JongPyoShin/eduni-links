from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse
from nicegui import app


FACTO_PREP_URL = "/facto"
_GAME_STATIC_DIR = Path(__file__).resolve().parent / "static_games"


# Keep the question card visually close to the source worksheets, but make every
# instruction self-contained.  In particular, do not rely on arrows or implied
# movement that may be missing/unclear on a mobile screen.
_FACTO_CLARITY_PATCH = r"""
<script>
(() => {
  if (typeof Q === 'undefined') return;

  for (const q of Q) {
    if (q.family === '100수표') {
      q.title = `${q.center}에서 위로 ${q.u}칸, 왼쪽으로 ${q.l}칸, 오른쪽으로 ${q.r}칸, 아래로 ${q.d}칸 이동한 곳의 수를 이 순서대로 쓰세요.`;
    } else if (q.family === '복합100수표') {
      q.title = `${q.center}에서 ① 위로 ${q.u}칸 이동한 수, ② 오른쪽으로 ${q.r}칸 이동한 수, ③ 위로 ${q.u}칸 간 뒤 오른쪽으로 ${q.r}칸 간 수를 순서대로 쓰세요.`;
    } else if (q.family === '뺄셈수직선') {
      q.title = `${q.a}에서 왼쪽으로 ${q.b}칸 이동합니다. 도착한 수를 쓰세요.`;
    } else if (q.family === '묶어세기') {
      q.title = `10개 묶음 ${q.bundles}개와 낱개 ${q.singles}개가 있습니다. 모두 몇 개인지 쓰세요.`;
    }
  }
})();
</script>
"""


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

    html = path.read_text(encoding="utf-8")
    html = html.replace("</body>", f"{_FACTO_CLARITY_PATCH}</body>")
    return HTMLResponse(
        html,
        headers={"Cache-Control": "no-store, max-age=0"},
    )


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
