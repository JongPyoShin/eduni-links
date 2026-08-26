"""Portal World Home Slice A: visual shell, four existing game routes, and focus ownership."""

from __future__ import annotations

from dataclasses import dataclass

from nicegui import ui


@dataclass(frozen=True)
class PortalGameCard:
    """A visible Portal card backed by an existing route or Android launch contract."""

    id: str
    title: str
    description: str
    route: str
    asset: str
    identity: str


PORTAL_GAME_CARDS: tuple[PortalGameCard, ...] = (
    PortalGameCard(
        "jungle",
        "Jungle Adventure",
        "숲과 새를 따라 떠나는 탐험",
        "/jungle",
        "portal_card_jungle_normal_v01.png",
        "탐험 · 숲 · 새",
    ),
    PortalGameCard(
        "crazy",
        "Crazy Arcade",
        "물풍선으로 즐기는 신나는 대결",
        "eduni://portal/crazyarcade",
        "portal_card_crazy_normal_v01.png",
        "물놀이 · 액션",
    ),
    PortalGameCard(
        "bubble",
        "Bubble Shooter",
        "알록달록한 버블로 배우는 놀이",
        "/bubble-shooter",
        "portal_card_bubble_normal_v01.png",
        "버블 · 학습",
    ),
    PortalGameCard(
        "omok",
        "Omok",
        "차분하게 생각하는 오목 한 판",
        "/omok",
        "portal_card_omok_normal_v01.png",
        "전략 · 나무판",
    ),
)


def _add_world_home_head() -> None:
    """Install Slice A presentation and own only Portal World card keys.

    MainActivity injects a generic /portal focus shim after page load. This listener is
    registered first in capture phase and stops supported card-navigation events so a
    single D-pad or A press produces a single Portal action.
    """

    ui.add_head_html(
        """
        <style>
          :root { --world-ink:#173c40; --world-deep:#0c3d43; --world-gold:#f4b63d; --world-paper:#fffdf6; --world-shadow:0 18px 40px rgba(23,60,64,.18); }
          .portal-world-shell { width:min(1180px, calc(100vw - 48px)); margin:0 auto; padding:26px 0 36px; }
          .portal-world-header { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:22px; }
          .portal-world-brand { display:flex; align-items:center; gap:12px; }
          .portal-world-brand-mark { width:48px; height:48px; display:grid; place-items:center; border-radius:16px; background:var(--world-deep); color:#fff; font-size:26px; font-weight:950; box-shadow:0 9px 18px rgba(12,61,67,.24); }
          .portal-world-kicker { margin:0; color:#38646a; font-size:12px; font-weight:950; letter-spacing:.09em; }
          .portal-world-title { margin:2px 0 0; color:var(--world-ink); font-size:clamp(28px,4vw,46px); font-weight:950; line-height:1.05; }
          .portal-world-help { margin:0; padding:10px 14px; border-radius:999px; background:rgba(255,255,255,.72); color:var(--world-ink); font-size:14px; font-weight:850; }
          .portal-world-intro { margin:0 0 18px; color:#41646a; font-size:17px; font-weight:800; }
          .portal-world-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
          .portal-world-card { position:relative; display:grid; min-height:236px; overflow:hidden; border-radius:26px; background:var(--world-paper); color:#fff; text-decoration:none; box-shadow:0 11px 22px rgba(31,82,72,.16); transition:transform 140ms cubic-bezier(.23,1,.32,1), box-shadow 140ms cubic-bezier(.23,1,.32,1), filter 140ms cubic-bezier(.23,1,.32,1); outline:none; }
          .portal-world-card::before { content:""; position:absolute; inset:0; z-index:1; background:linear-gradient(90deg,rgba(9,48,53,.86),rgba(9,48,53,.16) 76%); }
          .portal-world-card-art { position:absolute!important; inset:0; width:100%; height:100%; }
          .portal-world-card-art img { width:100%; height:100%; object-fit:cover; }
          .portal-world-card-copy { position:relative; z-index:2; align-self:end; max-width:74%; padding:21px; }
          .portal-world-card-kicker { display:block; margin-bottom:5px; font-size:12px; font-weight:950; letter-spacing:.08em; }
          .portal-world-card-title { display:block; font-size:clamp(24px,3vw,32px); font-weight:950; line-height:1.05; }
          .portal-world-card-description { display:block; margin-top:8px; font-size:14px; font-weight:800; line-height:1.4; }
          .portal-world-card-badge { position:absolute; z-index:3; top:14px; right:14px; padding:7px 10px; border:2px solid rgba(255,255,255,.84); border-radius:999px; background:#fff8de; color:var(--world-ink); font-size:11px; font-weight:950; }
          .portal-world-card:hover { transform:translateY(-3px); box-shadow:var(--world-shadow); }
          .portal-world-card.portal-world-focused { z-index:4; transform:translateY(-4px) scale(1.018); box-shadow:0 0 0 4px rgba(255,255,255,.95), 0 0 0 9px var(--world-gold), 0 20px 34px rgba(23,60,64,.26); }
          .portal-world-card.portal-world-focused::after { content:""; position:absolute; z-index:4; inset:5px; border:2px solid rgba(255,255,255,.92); border-radius:21px; animation:portal-world-pulse 1.1s infinite alternate; pointer-events:none; }
          .portal-world-card.portal-world-focused .portal-world-card-copy, .portal-world-card.portal-world-focused .portal-world-card-badge { z-index:5; }
          @keyframes portal-world-pulse { to { opacity:.38; transform:scale(.985); } }
          @media (max-width:760px) { .portal-world-shell { width:min(100vw - 28px,1180px); padding-top:16px; } .portal-world-header { align-items:flex-start; flex-direction:column; } .portal-world-grid { grid-template-columns:1fr; } .portal-world-card { min-height:210px; } }
          @media (prefers-reduced-motion:reduce) { .portal-world-card, .portal-world-card::after { animation:none!important; transition:none!important; } }
        </style>
        <script>
        (function () {
          if (window.__eduniPortalWorldFocusInstalled) return;
          window.__eduniPortalWorldFocusInstalled = true;
          var index = 0;
          var selector = '[data-portal-game-card]';
          function cards() { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
          function paint(next) {
            var list = cards();
            if (!list.length) return;
            index = Math.max(0, Math.min(next, list.length - 1));
            list.forEach(function (card, i) {
              card.classList.toggle('portal-world-focused', i === index);
              card.setAttribute('aria-current', i === index ? 'true' : 'false');
            });
          }
          function move(key) {
            var column = index % 2;
            if (key === 'ArrowLeft' && column === 1) paint(index - 1);
            if (key === 'ArrowRight' && column === 0) paint(index + 1);
            if (key === 'ArrowUp' && index >= 2) paint(index - 2);
            if (key === 'ArrowDown' && index < 2) paint(index + 2);
          }
          window.addEventListener('keydown', function (event) {
            var key = event.key;
            var owned = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '];
            if (owned.indexOf(key) === -1 || event.defaultPrevented) return;
            if (key.indexOf('Arrow') === 0 && event.repeat) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (key.indexOf('Arrow') === 0) { move(key); return; }
            if (key === 'Enter' || key === ' ') { var selected = cards()[index]; if (selected) selected.click(); return; }
          }, true);
          document.addEventListener('click', function (event) {
            var card = event.target.closest(selector);
            if (!card) return;
            paint(cards().indexOf(card));
          });
          window.addEventListener('load', function () { window.setTimeout(function () { paint(0); }, 0); });
        })();
        </script>
        """
    )


def render_portal_world_home() -> None:
    """Render the Slice A Home shell without adding state, preview, or debug behavior."""

    _add_world_home_head()
    with ui.element("main").classes("portal-world-shell").props('data-eduni-portal-world-home=""'):
        with ui.element("header").classes("portal-world-header"):
            with ui.element("div").classes("portal-world-brand"):
                ui.label("E").classes("portal-world-brand-mark")
                with ui.element("div"):
                    ui.label("EDUNI GAME CONSOLE").classes("portal-world-kicker")
                    ui.label("게임 월드").classes("portal-world-title")
            ui.label("방향키 이동 · Enter 선택 · B 뒤로").classes("portal-world-help")

        ui.label("좋아하는 게임을 골라 바로 시작해요.").classes("portal-world-intro")
        with ui.element("section").classes("portal-world-grid").props('aria-label="게임 월드"'):
            for card in PORTAL_GAME_CARDS:
                with ui.link(target=card.route).classes("portal-world-card").props(
                    f'data-portal-game-card data-game-id="{card.id}" aria-label="{card.title}"'
                ):
                    ui.image(f"/portal-world-assets/{card.asset}").props('alt=""').classes("portal-world-card-art")
                    ui.label(card.identity).classes("portal-world-card-badge")
                    with ui.element("span").classes("portal-world-card-copy"):
                        ui.label(card.identity).classes("portal-world-card-kicker")
                        ui.label(card.title).classes("portal-world-card-title")
                        ui.label(card.description).classes("portal-world-card-description")
