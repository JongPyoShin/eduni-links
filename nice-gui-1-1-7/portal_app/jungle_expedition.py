from __future__ import annotations

from nicegui import ui

JUNGLE_EXPEDITION_ACTIVITY_ID = "jungle.expedition.001"


def render_jungle_expedition() -> None:
    ui.add_head_html(
        """
        <style>
          .jungle-stage {
            position: relative;
            width: min(430px, calc(100vw - 28px));
            min-height: 760px;
            margin: 0 auto;
            overflow: hidden;
            border: 1px solid #18412f;
            border-radius: 8px;
            background:
              linear-gradient(180deg, rgba(255,255,255,.72), rgba(255,255,255,0) 22%),
              linear-gradient(180deg, #d9f99d 0%, #86efac 34%, #166534 100%);
            box-shadow: 0 16px 36px rgba(17, 24, 39, .16);
            color: #102a1f;
            touch-action: manipulation;
          }
          .jungle-canopy {
            position: absolute;
            inset: 0 0 auto;
            height: 250px;
            pointer-events: none;
          }
          .jungle-leaf {
            position: absolute;
            top: -34px;
            width: 104px;
            height: 210px;
            border-radius: 52px 52px 8px 8px;
            transform-origin: top center;
            background: linear-gradient(180deg, #14532d, #22c55e);
            box-shadow: inset 0 -18px 0 rgba(255,255,255,.12);
          }
          .jungle-leaf:nth-child(1) { left: 16px; transform: rotate(17deg); }
          .jungle-leaf:nth-child(2) { left: 92px; top: -54px; transform: rotate(-9deg); }
          .jungle-leaf:nth-child(3) { right: 90px; top: -48px; transform: rotate(10deg); }
          .jungle-leaf:nth-child(4) { right: 12px; transform: rotate(-18deg); }
          .jungle-path {
            position: absolute;
            left: 50%;
            bottom: -42px;
            width: 168px;
            height: 710px;
            transform: translateX(-50%);
            border-radius: 90px 90px 0 0;
            background: linear-gradient(180deg, #fef3c7, #d97706);
            box-shadow: inset 0 0 0 8px rgba(120, 53, 15, .14);
          }
          .jungle-object {
            position: absolute;
            display: grid;
            place-items: center;
            min-width: 64px;
            min-height: 64px;
            border-radius: 999px;
            font-size: 34px;
            background: rgba(255, 255, 255, .72);
            box-shadow: 0 10px 20px rgba(15, 23, 42, .14);
          }
          .jungle-object.tree { left: 24px; top: 250px; }
          .jungle-object.branch { right: 34px; top: 330px; }
          .jungle-object.bird { left: 34px; bottom: 180px; outline: 4px solid rgba(250, 204, 21, .7); }
          .jungle-ranger {
            position: absolute;
            left: 50%;
            bottom: 118px;
            transform: translateX(-50%);
            display: grid;
            place-items: center;
            width: 92px;
            height: 92px;
            border-radius: 999px;
            background: #fefce8;
            border: 5px solid #854d0e;
            font-size: 46px;
            box-shadow: 0 12px 24px rgba(15, 23, 42, .2);
          }
          .jungle-card {
            position: absolute;
            left: 18px;
            right: 18px;
            bottom: 216px;
            padding: 14px;
            border-radius: 8px;
            background: rgba(255,255,255,.9);
            border: 1px solid rgba(22, 101, 52, .24);
            font-weight: 800;
          }
          .jungle-hud {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 14px;
            font-weight: 900;
          }
          .jungle-controls {
            position: absolute;
            left: 14px;
            right: 14px;
            bottom: 18px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .jungle-touch {
            min-height: 58px;
            border-radius: 8px;
            font-weight: 900;
          }
          @media (max-width: 420px) {
            .jungle-stage { min-height: calc(100vh - 40px); }
            .jungle-touch { min-height: 54px; }
          }
        </style>
        """
    )

    with ui.element("section").classes("jungle-stage").props('aria-label="정글 대탐험 데모"'):
        with ui.element("div").classes("jungle-hud"):
            ui.label("정글 대탐험")
            ui.label("Phase A")
        with ui.element("div").classes("jungle-canopy"):
            for _ in range(4):
                ui.element("span").classes("jungle-leaf")
        ui.element("div").classes("jungle-path")
        ui.label("🌳").classes("jungle-object tree")
        ui.label("🪵").classes("jungle-object branch")
        ui.label("🐦").classes("jungle-object bird")
        ui.label("🧭").classes("jungle-ranger")
        with ui.element("div").classes("jungle-card"):
            ui.label("희귀 새를 발견했어! 다음 Phase에서 문제 카드가 여기에 나타나요.")
        with ui.element("div").classes("jungle-controls"):
            ui.button("전진").classes("jungle-touch")
            ui.button("정지").classes("jungle-touch")
            ui.button("지망").classes("jungle-touch")
