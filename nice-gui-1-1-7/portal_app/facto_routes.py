from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse
from nicegui import app


FACTO_PREP_URL = "/facto"
_GAME_STATIC_DIR = Path(__file__).resolve().parent / "static_games"


_FACTO_ARROW_PATCH = r"""
<style>
.facto-arrow-board{display:grid;grid-template-columns:120px 120px 120px;grid-template-rows:92px 92px 92px;gap:8px;align-items:center;justify-items:center;margin:auto}
.facto-arrow-center{width:76px;height:62px;display:grid;place-items:center;border:3px solid #334155;border-radius:10px;background:#fff0a8;font-size:25px;font-weight:950}
.facto-arrow-target{min-width:92px;min-height:60px;display:grid;place-items:center;border:2px dashed #64748b;border-radius:10px;background:#fff;font-size:20px;font-weight:900}
.facto-arrow{font-size:18px;font-weight:950;text-align:center;line-height:1.35;color:#1f2937}
.facto-arrow .big{display:block;font-size:32px;line-height:1}
.facto-arrow-order{display:block;margin-top:3px;font-size:12px;color:#7c2d12}
.facto-turn{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;font-size:18px;font-weight:900}
.facto-turn .step{padding:10px 12px;border:2px solid #94a3b8;border-radius:10px;background:#f8fafc}
@media(max-width:600px){.facto-arrow-board{grid-template-columns:92px 92px 92px;grid-template-rows:82px 82px 82px;gap:4px}.facto-arrow-target{min-width:74px}.facto-arrow-center{width:68px}.facto-arrow{font-size:15px}.facto-arrow .big{font-size:28px}}
</style>
<script>
(() => {
  const originalVisual = window.visual;
  if (typeof originalVisual !== 'function') return;

  window.visual = function(q) {
    if (q.family === '100수표') {
      return `
        <div>
          <div class="facto-arrow-board" aria-label="100수표 화살표 이동 문제">
            <div></div>
            <div><div class="facto-arrow-target">?</div><div class="facto-arrow"><span class="big">↑</span>${q.u}칸<span class="facto-arrow-order">① 위</span></div></div>
            <div></div>
            <div><div class="facto-arrow-target">?</div><div class="facto-arrow"><span class="big">←</span>${q.l}칸<span class="facto-arrow-order">② 왼쪽</span></div></div>
            <div class="facto-arrow-center">${q.center}</div>
            <div><div class="facto-arrow-target">?</div><div class="facto-arrow"><span class="big">→</span>${q.r}칸<span class="facto-arrow-order">③ 오른쪽</span></div></div>
            <div></div>
            <div><div class="facto-arrow"><span class="facto-arrow-order">④ 아래</span>${q.d}칸<span class="big">↓</span></div><div class="facto-arrow-target">?</div></div>
            <div></div>
          </div>
          <div style="margin-top:10px;text-align:center;font-size:13px;color:#667085;font-weight:800">가로 1칸은 1, 세로 1칸은 10만큼 달라져요. ①→②→③→④ 순서로 답을 써요.</div>
        </div>`;
    }

    if (q.family === '복합100수표') {
      return `
        <div>
          <div class="facto-turn">
            <span class="facto-arrow-center">${q.center}</span>
            <span class="step">① ↑ 위로 ${q.u}칸 → ?</span>
            <span class="step">② → 오른쪽 ${q.r}칸 → ?</span>
            <span class="step">③ ↑ ${q.u}칸 간 뒤 → ${q.r}칸 → ?</span>
          </div>
          <div style="margin-top:12px;text-align:center;font-size:13px;color:#667085;font-weight:800">①, ②, ③ 순서로 답을 써요.</div>
        </div>`;
    }

    return originalVisual(q);
  };
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
    html = html.replace("</body>", f"{_FACTO_ARROW_PATCH}</body>")
    return HTMLResponse(html)


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
