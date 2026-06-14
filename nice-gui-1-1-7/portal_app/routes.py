from __future__ import annotations

from dataclasses import dataclass

from nicegui import ui

from .content_loader import load_activities
from .database import configured_parent_pin_hash, initialize_database, verify_parent_pin
from .jungle_expedition import JUNGLE_EXPEDITION_ACTIVITY_ID, render_jungle_expedition
from .pattern_train import render_pattern_train
from .recommendation import today_world
from .registry import WORLDS, get_world


@dataclass(frozen=True)
class QuickLink:
    title: str
    prompt: str
    href: str
    meta: str


FEATURED_ACTIVITY_IDS = (
    JUNGLE_EXPEDITION_ACTIVITY_ID,
    "math.pattern_train.001",
)

QUICK_GAME_LINKS = (
    QuickLink("테트리스", "블록을 돌리고 쌓으며 공간 감각을 연습해요.", "/", "잠깐 놀이"),
    QuickLink("버블팝", "버블을 터뜨리며 빠르게 관찰하고 반응해요.", "/bubble", "잠깐 놀이"),
    QuickLink("한자 슈터", "한자를 보고 뜻을 맞히는 빠른 복습 게임이에요.", "/bubble-shooter", "잠깐 놀이"),
)


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
          .portal-feature-card { min-height: 170px; border: 2px solid rgba(22, 101, 52, .22); background: linear-gradient(180deg, #ffffff, #f0fdf4); }
          .portal-quick-card { min-height: 160px; border: 2px solid rgba(37, 99, 235, .18); background: linear-gradient(180deg, #ffffff, #eff6ff); }
          .portal-action { min-height: 46px; border-radius: 8px; font-weight: 800; }
          .world-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 8px; color: white; font-size: 24px; font-weight: 900; }
          .muted { color: #667085; }
          .pattern-train-track { display: block; max-width: 100%; overflow-x: auto; padding: 18px; border-radius: 14px; background: #eef6ff; font-size: clamp(30px, 8vw, 56px); line-height: 1.5; white-space: nowrap; }
          .pattern-choice-row { display: flex; flex-wrap: wrap; gap: 12px; }
          .pattern-choice { min-width: 82px; min-height: 72px; font-size: 32px; }
          .pattern-feedback { min-height: 28px; color: #0f766e; font-size: 18px; font-weight: 800; }
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
        activity_by_id = {activity.id: activity for activity in activities}
        featured_activities = [activity_by_id[activity_id] for activity_id in FEATURED_ACTIVITY_IDS if activity_id in activity_by_id]
        suggested = today_world()
        with ui.element("main").classes("portal-shell"):
            with ui.element("section").classes("portal-hero"):
                ui.label("오늘은 무엇을 탐험할까?").classes("text-h3 text-weight-bold")
                ui.label("자주 쓰는 학습 활동과 놀이를 바로 시작하는 가족용 학습 포털입니다.").classes("muted text-subtitle1")
                with ui.row().classes("q-mt-md q-gutter-sm"):
                    ui.link("오늘의 탐험 시작", f"/portal/world/{suggested.id}").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-px-md")
                    ui.link("정글 대탐험 바로가기", f"/portal/activity/{JUNGLE_EXPEDITION_ACTIVITY_ID}").classes("portal-action q-btn q-btn-item q-btn--standard bg-green text-white q-px-md")

            ui.label("바로 시작").classes("text-h5 text-weight-bold q-mt-lg")
            with ui.element("section").classes("portal-grid"):
                for activity in featured_activities:
                    with ui.card().classes("portal-card portal-feature-card"):
                        world = get_world(activity.world)
                        ui.label(activity.title).classes("text-h6 text-weight-bold")
                        ui.label(activity.prompt).classes("muted")
                        if world:
                            ui.label(f"{world.short_title} · {activity.difficulty} · {activity.estimated_minutes}분").classes("muted q-mt-sm")
                        else:
                            ui.label(f"{activity.difficulty} · {activity.estimated_minutes}분").classes("muted q-mt-sm")
                        ui.link("시작하기", f"/portal/activity/{activity.id}").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-mt-md")
                for quick_link in QUICK_GAME_LINKS:
                    with ui.card().classes("portal-card portal-quick-card"):
                        ui.label(quick_link.title).classes("text-h6 text-weight-bold")
                        ui.label(quick_link.prompt).classes("muted")
                        ui.label(quick_link.meta).classes("muted q-mt-sm")
                        ui.link("시작하기", quick_link.href).classes("portal-action q-btn q-btn-item q-btn--outline q-mt-md")

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
                            ui.link("시작하기", f"/portal/activity/{activity.id}").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-mt-md")
            else:
                ui.label("아직 준비 중입니다. 새로운 놀이가 곧 추가됩니다.").classes("muted")

    @ui.page("/portal/activity/{activity_id}")
    def activity_page(activity_id: str) -> None:
        _head()
        if activity_id == JUNGLE_EXPEDITION_ACTIVITY_ID:
            with ui.element("main").classes("portal-shell"):
                render_jungle_expedition()
            return
        activities = {activity.id: activity for activity in load_activities()}
        activity = activities.get(activity_id)
        with ui.element("main").classes("portal-shell"):
            ui.link("← 수학탐험대", "/portal/world/math").classes("muted")
            if activity is None:
                ui.label("활동을 찾을 수 없습니다.").classes("text-h4 text-weight-bold q-mt-lg")
                return
            with ui.element("section").classes("portal-hero q-mt-md"):
                if activity.activity_type == "pattern_sequence":
                    render_pattern_train(activity)
                    return
                ui.label("이 활동은 아직 준비 중입니다.").classes("text-h5 text-weight-bold")

    @ui.page("/portal/parent")
    def parent_page() -> None:
        _head()
        initialize_database()
        with ui.element("main").classes("portal-shell"):
            ui.link("← 포털 홈", "/portal").classes("muted")
            ui.label("부모 화면").classes("text-h3 text-weight-bold q-mt-lg")
            stored_hash = configured_parent_pin_hash()
            if not stored_hash:
                ui.label("부모 화면이 아직 활성화되지 않았습니다.").classes("text-h6 text-weight-bold q-mt-md")
                ui.label("EDUNI_PARENT_PIN_HASH 환경변수를 PBKDF2 해시 문자열로 설정한 뒤 다시 시작하세요. 평문 PIN은 코드, JSON, 로그, DB에 저장하지 않습니다.").classes("muted")
                return

            ui.label("PIN을 입력하면 Phase 0 대시보드 자리로 이동합니다.").classes("muted")
            pin_input = ui.input("PIN").props("type=password autocomplete=current-password").classes("q-mt-md")
            message = ui.label("").classes("muted q-mt-sm")
            dashboard = ui.column().classes("q-mt-md")

            def show_dashboard() -> None:
                dashboard.clear()
                with dashboard:
                    with ui.card().classes("portal-card"):
                        ui.label("대시보드 준비 중").classes("text-h6 text-weight-bold")
                        ui.label("최근 활동, 힌트 사용, 과정 배지는 Phase 1에서 실제 세션 기록과 연결합니다.").classes("muted")

            def verify_pin() -> None:
                if verify_parent_pin(pin_input.value or "", stored_hash):
                    message.set_text("")
                    pin_input.value = ""
                    show_dashboard()
                    return
                dashboard.clear()
                pin_input.value = ""
                message.set_text("PIN을 확인할 수 없습니다. 다시 입력해 주세요.")

            ui.button("확인", on_click=verify_pin).classes("portal-action q-mt-sm")
