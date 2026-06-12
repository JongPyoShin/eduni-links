from __future__ import annotations

from nicegui import ui

from .content_loader import load_activities
from .database import configured_parent_pin_hash, initialize_database
from .recommendation import today_world
from .registry import WORLDS, get_world


def _head() -> None:
    ui.add_head_html(
        """
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          body { background: #f6f8fb; color: #111827; font-family: "Segoe UI", "Malgun Gothic", sans-serif; }
          .portal-shell { width: min(1120px, calc(100vw - 28px)); margin: 0 auto; padding: 22px 0 34px; }
          .portal-hero { padding: 22px; border: 1px solid #d9e2ec; border-radius: 8px; background: #fff; box-shadow: 0 14px 36px rgba(16,24,39,.08); }
          .portal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
          .portal-card { min-height: 150px; padding: 18px; border: 1px solid #d9e2ec; border-radius: 8px; background: #fff; box-shadow: 0 8px 20px rgba(16,24,39,.06); }
          .portal-action { min-height: 46px; border-radius: 8px; font-weight: 800; }
          .world-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; color: white; font-size: 24px; font-weight: 900; }
          .muted { color: #667085; }
          @media (max-width: 560px) { .portal-shell { width: min(100vw - 18px, 1120px); padding-top: 12px; } }
        </style>
        """
    )


def register_pages() -> None:
    @ui.page("/portal")
    def portal_home() -> None:
        _head()
        initialize_database()
        activities = load_activities()
        suggested = today_world()
        with ui.element("main").classes("portal-shell"):
            with ui.element("section").classes("portal-hero"):
                ui.label("오늘은 무엇을 탐험할까?").classes("text-h3 text-weight-bold")
                ui.label("짧은 활동을 고르고, 해 보고, 설명해 보는 가족용 학습 포털입니다.").classes("muted text-subtitle1")
                with ui.row().classes("q-mt-md q-gutter-sm"):
                    ui.link("오늘의 탐험 시작", f"/portal/world/{suggested.id}").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-px-md")
                    ui.link("잠깐 놀이: 테트리스", "/").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")

            ui.label("학습 세계").classes("text-h5 text-weight-bold q-mt-lg")
            with ui.element("section").classes("portal-grid"):
                for world in WORLDS:
                    world_activities = [activity for activity in activities if activity.world == world.id]
                    with ui.card().classes("portal-card"):
                        with ui.row().classes("items-center justify-between no-wrap"):
                            ui.label(world.icon).classes("world-icon").style(f"background: {world.accent}")
                            ui.label(f"{len(world_activities)}개 준비").classes("muted text-weight-bold")
                        ui.label(world.title).classes("text-h6 text-weight-bold q-mt-md")
                        ui.label(world.description).classes("muted")
                        ui.link("들어가기", f"/portal/world/{world.id}").classes("portal-action q-btn q-btn-item q-btn--outline q-mt-md")

            ui.label("잠깐 놀이").classes("text-h5 text-weight-bold q-mt-lg")
            with ui.row().classes("q-gutter-sm"):
                ui.link("테트리스", "/").classes("portal-action q-btn q-btn-item q-btn--outline")
                ui.link("버블팝", "/bubble").classes("portal-action q-btn q-btn-item q-btn--outline")
                ui.link("한자 슈터", "/bubble-shooter").classes("portal-action q-btn q-btn-item q-btn--outline")
            ui.link("부모 화면", "/portal/parent").classes("q-mt-lg muted")

    @ui.page("/portal/world/{world_id}")
    def world_page(world_id: str) -> None:
        _head()
        world = get_world(world_id)
        with ui.element("main").classes("portal-shell"):
            ui.link("← 포털 홈", "/portal").classes("muted")
            if world is None:
                ui.label("아직 준비되지 않은 학습 세계입니다.").classes("text-h4 text-weight-bold q-mt-lg")
                return
            ui.label(world.title).classes("text-h3 text-weight-bold q-mt-lg")
            ui.label(world.skill).classes("muted text-subtitle1")
            ui.separator().classes("q-my-md")
            activities = [activity for activity in load_activities() if activity.world == world.id]
            if activities:
                with ui.element("section").classes("portal-grid"):
                    for activity in activities:
                        with ui.card().classes("portal-card"):
                            ui.label(activity.title).classes("text-h6 text-weight-bold")
                            ui.label(activity.prompt).classes("muted")
                            ui.label(f"{activity.difficulty} · {activity.estimated_minutes}분").classes("muted q-mt-sm")
            else:
                ui.label("Phase 0에서는 활동 실행 화면을 만들지 않고, 세계별 자리만 준비합니다.").classes("muted")

    @ui.page("/portal/parent")
    def parent_page() -> None:
        _head()
        initialize_database()
        with ui.element("main").classes("portal-shell"):
            ui.link("← 포털 홈", "/portal").classes("muted")
            ui.label("부모 화면").classes("text-h3 text-weight-bold q-mt-lg")
            if configured_parent_pin_hash():
                ui.label("PIN 해시가 환경변수로 설정되어 있습니다. Phase 0에서는 대시보드 자리만 제공합니다.").classes("muted")
            else:
                ui.label("아직 부모 PIN이 설정되지 않았습니다. 평문 PIN은 코드나 JSON에 저장하지 않습니다.").classes("muted")
            with ui.card().classes("portal-card q-mt-md"):
                ui.label("대시보드 준비 중").classes("text-h6 text-weight-bold")
                ui.label("최근 활동, 힌트 사용, 과정 배지는 Phase 1에서 실제 세션 기록과 연결합니다.").classes("muted")

