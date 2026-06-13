from __future__ import annotations

from random import choice

from nicegui import ui

JUNGLE_EXPEDITION_ACTIVITY_ID = "jungle.expedition.001"
BIRD_POSITION_CLASSES = (
    "bird-position-left-high",
    "bird-position-left-low",
    "bird-position-right-high",
    "bird-position-right-low",
)


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
            background: repeating-linear-gradient(180deg, #fef3c7 0 48px, #f59e0b 48px 64px);
            background-position: center 0;
            box-shadow: inset 0 0 0 8px rgba(120, 53, 15, .14);
            animation: jungle-road-flow 2.2s linear infinite paused;
          }
          .jungle-stage.is-moving .jungle-path { animation-play-state: running; }
          .jungle-moving {
            animation: jungle-object-flow 4.8s linear infinite paused;
          }
          .jungle-stage.is-moving .jungle-moving { animation-play-state: running; }
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
          .jungle-object.tree-left { left: 18px; top: 220px; }
          .jungle-object.tree-right { right: 18px; top: 350px; animation-delay: -1.8s; }
          .jungle-object.branch-left { left: 38px; top: 430px; animation-delay: -3.1s; }
          .jungle-object.branch-right { right: 40px; top: 170px; animation-delay: -2.4s; }
          .jungle-object.bird {
            z-index: 3;
            min-width: 64px;
            min-height: 64px;
            outline: 4px solid rgba(250, 204, 21, .7);
          }
          .bird-position-left-high { left: 28px; top: 210px; }
          .bird-position-left-low { left: 46px; top: 430px; }
          .bird-position-right-high { right: 30px; top: 230px; }
          .bird-position-right-low { right: 48px; top: 450px; }
          .jungle-truck {
            position: absolute;
            left: 50%;
            bottom: 112px;
            transform: translateX(-50%);
            display: grid;
            place-items: center;
            width: 94px;
            height: 94px;
            border-radius: 22px;
            background: #fefce8;
            border: 5px solid #854d0e;
            font-size: 48px;
            box-shadow: 0 12px 24px rgba(15, 23, 42, .2);
          }
          .jungle-card {
            position: absolute;
            z-index: 5;
            left: 18px;
            right: 18px;
            bottom: 216px;
            padding: 14px;
            border-radius: 8px;
            background: rgba(255,255,255,.94);
            border: 1px solid rgba(22, 101, 52, .24);
            font-weight: 800;
          }
          .jungle-hud {
            position: relative;
            z-index: 4;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 14px;
            font-weight: 900;
          }
          .jungle-status {
            position: absolute;
            z-index: 4;
            top: 52px;
            left: 14px;
            right: 14px;
            padding: 8px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, .78);
            font-weight: 800;
          }
          .jungle-controls {
            position: absolute;
            z-index: 6;
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
          @keyframes jungle-road-flow {
            from { background-position: center 0; }
            to { background-position: center 128px; }
          }
          @keyframes jungle-object-flow {
            from { transform: translateY(-80px); }
            to { transform: translateY(520px); }
          }
          @media (max-width: 420px) {
            .jungle-stage { min-height: calc(100vh - 40px); }
            .jungle-touch { min-height: 54px; }
          }
        </style>
        """
    )

    state = {"moving": False}

    def set_motion(moving: bool) -> None:
        state["moving"] = moving
        if moving:
            stage.classes(add="is-moving")
            status.set_text("전진 중 · 좌우 나뭇가지를 살펴보자!")
            return
        stage.classes(remove="is-moving")
        status.set_text("정지 · 발견한 새를 눌러보자!")

    def place_bird() -> None:
        bird.classes(remove=" ".join(BIRD_POSITION_CLASSES), add=choice(BIRD_POSITION_CLASSES))

    def move_forward() -> None:
        discovery_card.set_visibility(False)
        bird.set_visibility(True)
        place_bird()
        set_motion(True)

    def stop_moving() -> None:
        set_motion(False)

    def discover_bird() -> None:
        set_motion(False)
        bird.set_visibility(False)
        discovery_card.set_visibility(True)

    def close_discovery() -> None:
        discovery_card.set_visibility(False)
        bird.set_visibility(True)
        place_bird()

    def show_cargo_placeholder() -> None:
        ui.notify("짐칸 도감은 Phase C에서 열려요.")

    with ui.element("section").classes("jungle-stage").props('aria-label="정글 대탐험 데모"') as stage:
        with ui.element("div").classes("jungle-hud"):
            ui.label("정글 대탐험")
            ui.label("Phase A")
        status = ui.label("정지 · 발견한 새를 눌러보자!").classes("jungle-status")
        with ui.element("div").classes("jungle-canopy"):
            for _ in range(4):
                ui.element("span").classes("jungle-leaf")
        ui.element("div").classes("jungle-path")
        ui.label("🌳").classes("jungle-object jungle-moving tree-left")
        ui.label("🌴").classes("jungle-object jungle-moving tree-right")
        ui.label("🪵").classes("jungle-object jungle-moving branch-left")
        ui.label("🌿").classes("jungle-object jungle-moving branch-right")
        bird = ui.button("🐦", on_click=discover_bird).classes("jungle-object jungle-moving bird").props('flat round aria-label="새 발견"')
        ui.label("🚚").classes("jungle-truck")
        discovery_card = ui.element("div").classes("jungle-card")
        with discovery_card:
            ui.label("새를 발견했어!").classes("text-h6")
            ui.label("다음 Phase에서는 여기에 랜덤 학습 문제가 나타나요.")
            ui.button("탐험 화면으로 돌아가기", on_click=close_discovery).classes("q-mt-sm")
        discovery_card.set_visibility(False)
        with ui.element("div").classes("jungle-controls"):
            ui.button("전진", on_click=move_forward).classes("jungle-touch")
            ui.button("정지", on_click=stop_moving).classes("jungle-touch")
            ui.button("짐칸", on_click=show_cargo_placeholder).classes("jungle-touch")

    place_bird()
