from __future__ import annotations

from nicegui import ui

from .content_loader import load_activities
from .database import configured_parent_pin_hash, initialize_database, verify_parent_pin
from .jungle_expedition import JUNGLE_EXPEDITION_ACTIVITY_ID, render_jungle_expedition
from .pattern_train import render_pattern_train
from .registry import get_world


HANJA_URL = "http://100.75.214.95:8080/hanja"


def _head() -> None:
    ui.add_head_html(
        """
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          :root { color-scheme: light; --ink:#111827; --muted:#667085; --teal:#0f766e; --blue:#2563eb; --violet:#7c3aed; --green:#65a30d; --rose:#e11d48; --shadow:0 18px 48px rgba(16,24,39,.12); }
          body {
            background:
              linear-gradient(135deg, rgba(20,184,166,.12), transparent 32%),
              linear-gradient(225deg, rgba(37,99,235,.12), transparent 34%),
              #f6f8fb;
            color: var(--ink);
            font-family: "Segoe UI", "Malgun Gothic", sans-serif;
          }
          .portal-shell { width: min(1120px, calc(100vw - 28px)); margin: 0 auto; padding: 22px 0 34px; }
          .portal-hero { min-height: 250px; padding: 28px; display:grid; grid-template-columns:1.2fr .8fr; align-items:center; gap:22px; border:1px solid rgba(16,24,39,.08); border-radius:8px; background:rgba(255,255,255,.94); box-shadow:var(--shadow); }
          .portal-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; }
          .portal-card { min-height:150px; padding:18px; border:1px solid rgba(16,24,39,.08); border-radius:8px; background:rgba(255,255,255,.94); box-shadow:0 8px 20px rgba(16,24,39,.06); }
          .portal-card-link { display:grid; align-content:space-between; gap:18px; transition:transform .14s ease, box-shadow .14s ease; }
          .portal-card-link:hover, .portal-card-link:focus-visible { transform:translateY(-2px); box-shadow:0 16px 28px rgba(16,24,39,.14); outline:none; }
          .portal-action { min-height:46px; border-radius:8px; font-weight:800; }
          .world-icon { width:48px; height:48px; display:grid; place-items:center; border-radius:8px; color:white; font-size:24px; font-weight:900; }
          .muted { color:#667085; }
          .portal-eyebrow { margin:0 0 8px; color:var(--teal); font-size:15px; font-weight:900; }
          .portal-title { margin:0; max-width:680px; font-size:clamp(38px,6vw,62px); line-height:1.04; letter-spacing:0; font-weight:950; }
          .portal-copy { margin:12px 0 0; max-width:660px; color:#475467; font-size:18px; font-weight:800; line-height:1.55; }
          .portal-console { min-height:178px; padding:18px; display:grid; align-content:center; gap:12px; border-radius:8px; background:linear-gradient(145deg,rgba(16,24,39,.94),rgba(30,41,59,.88)); border:1px solid rgba(255,255,255,.16); color:#fff; }
          .portal-tiles { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
          .portal-tile { min-height:70px; display:grid; place-items:center; border-radius:8px; background:rgba(255,255,255,.94); color:#101827; font-size:28px; font-weight:1000; }
          .portal-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
          .portal-stat { min-height:56px; display:grid; align-content:center; text-align:center; border-radius:8px; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.18); }
          .portal-stat b { font-size:18px; }
          .portal-stat span { color:rgba(255,255,255,.76); font-size:12px; font-weight:900; }
          .portal-section-title { margin:22px 0 10px; display:flex; align-items:end; justify-content:space-between; gap:12px; }
          .portal-section-title h2 { margin:0; font-size:24px; font-weight:900; }
          .portal-section-title p { margin:0; color:var(--muted); font-size:14px; font-weight:800; text-align:right; }
          .portal-quick { display:grid; grid-template-columns:1.2fr repeat(3,minmax(0,.8fr)); gap:12px; }
          .portal-worlds { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
          .portal-start { min-height:174px; color:#fff; background:linear-gradient(135deg,#0f766e,#14b8a6); }
          .portal-game-blue { background:linear-gradient(135deg,#e0f2fe,#fff); }
          .portal-game-amber { background:linear-gradient(135deg,#fff7ed,#fff); }
          .portal-game-green { background:linear-gradient(135deg,#ecfdf5,#fff); }
          .portal-pill { width:fit-content; min-height:34px; display:inline-flex; align-items:center; padding:0 12px; border-radius:999px; background:rgba(255,255,255,.78); border:1px solid rgba(16,24,39,.1); font-size:13px; font-weight:1000; }
          .portal-notice { padding:14px 16px; border:1px solid #bfdbfe; border-radius:8px; background:#eff6ff; color:#1e3a8a; font-weight:850; line-height:1.5; }
          .portal-card strong { display:block; font-size:24px; letter-spacing:0; }
          .portal-card small { display:block; margin-top:7px; color:var(--muted); font-size:14px; font-weight:800; line-height:1.45; }
          .portal-start small { color:rgba(255,255,255,.84); }
          .pattern-train-track { display:block; max-width:100%; overflow-x:auto; padding:18px; border-radius:14px; background:#eef6ff; font-size:clamp(30px,8vw,56px); line-height:1.5; white-space:nowrap; }
          .pattern-choice-row { display:flex; flex-wrap:wrap; gap:12px; }
          .pattern-choice { min-width:82px; min-height:72px; font-size:32px; }
          .pattern-feedback { min-height:28px; color:#0f766e; font-size:18px; font-weight:800; }
          @media (max-width:880px) { .portal-hero { grid-template-columns:1fr; } .portal-quick,.portal-worlds { grid-template-columns:repeat(2,minmax(0,1fr)); } .portal-start { grid-column:1/-1; } }
          @media (max-width:560px) { .portal-shell { width:min(100vw - 18px,1120px); padding-top:12px; } .portal-hero,.portal-card { padding:14px; } .portal-hero { min-height:auto; } .portal-copy { font-size:16px; } .portal-quick,.portal-worlds { grid-template-columns:1fr; } .portal-section-title { align-items:start; flex-direction:column; } .portal-section-title p { text-align:left; } .portal-card strong { font-size:22px; } }
        </style>
        """
    )


def _section_title(title: str, subtitle: str) -> None:
    with ui.element("div").classes("portal-section-title"):
        ui.html(f"<h2>{title}</h2>")
        ui.html(f"<p>{subtitle}</p>")


def _portal_card(
    href: str,
    title: str,
    subtitle: str,
    pill: str,
    classes: str = "",
    icon: str | None = None,
    accent: str | None = None,
) -> None:
    with ui.link(target=href).classes(f"portal-card portal-card-link {classes}").style("text-decoration:none; color:inherit;"):
        if icon is not None:
            with ui.row().classes("items-start justify-between no-wrap"):
                ui.label(icon).classes("world-icon").style(f"background:{accent or '#101827'}")
                ui.label(pill).classes("portal-pill")
        with ui.element("span"):
            ui.html(f"<strong>{title}</strong><small>{subtitle}</small>")
        if icon is None:
            ui.label(pill).classes("portal-pill")


def register_pages() -> None:
    @ui.page("/portal")
    def portal_home() -> None:
        _head()
        initialize_database()
        with ui.element("main").classes("portal-shell"):
            with ui.element("section").classes("portal-hero"):
                with ui.element("div"):
                    ui.label("EDUNI PORTAL").classes("portal-eyebrow")
                    ui.label("가족 학습 포털로 바로 들어가기").classes("portal-title")
                    ui.label("이 화면이 실제 EDUNI 서버 포털입니다. Tailscale이 켜진 모바일, 태블릿, PC에서는 같은 Wi-Fi가 아니어도 바로 접속할 수 있습니다.").classes("portal-copy")
                    with ui.row().classes("q-mt-md q-gutter-sm"):
                        ui.link("EDUNI 포털 열기", "/portal").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-px-md")
                        ui.link("수학 바로가기", "/portal/world/math").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")
                        ui.link("부모 화면", "/portal/parent").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")
                with ui.element("div").classes("portal-console"):
                    with ui.element("div").classes("portal-tiles"):
                        for text in ("漢", "A", "+", "탐험"):
                            ui.label(text).classes("portal-tile")
                    with ui.element("div").classes("portal-stats"):
                        for value, label in (("8", "학습 세계"), ("3", "게임 링크"), ("1", "서버 포털")):
                            ui.html(f"<div class='portal-stat'><b>{value}</b><span>{label}</span></div>")

            ui.label("외부에서 바로 접속하려면 해당 기기에 Tailscale이 연결되어 있어야 합니다. 같은 Wi-Fi 여부와는 별개로, Tailscale 가족망 안이면 이 서버 주소가 통합니다.").classes("portal-notice q-mt-md")

            _section_title("빠른 시작", "자주 쓰는 학습과 게임으로 바로 이동합니다.")
            with ui.element("section").classes("portal-quick"):
                _portal_card("/portal", "EDUNI 학습 포털", "서버에서 실행되는 실제 포털 홈입니다.", "열기", "portal-start")
                _portal_card("/bubble-shooter", "한자 슈터", "목표 한자를 맞히는 버블 슈터 게임", "게임", "portal-game-blue")
                _portal_card("/bubble", "버블 게임", "짧게 집중해서 푸는 한자 게임", "게임", "portal-game-amber")
                _portal_card("/", "블록 퍼즐", "가볍게 머리를 깨우는 퍼즐", "게임", "portal-game-green")

            _section_title("학습 세계", "동적 포털의 실제 학습 경로와 맞췄습니다.")
            with ui.element("section").classes("portal-worlds"):
                _portal_card(HANJA_URL, "한자마을", "한자 시험과 한자 게임으로 이동", "운영 중", icon="漢", accent="#e11d48")
                _portal_card("/portal/world/math", "수학탐험대", "패턴 기차와 정글 탐험 활동", "포털", icon="+", accent="#7c3aed")
                _portal_card("/portal", "영어", "다음 단계에서 확장 예정", "준비 중", icon="A", accent="#2563eb")
                _portal_card("/portal", "과학", "다음 단계에서 확장 예정", "준비 중", icon="S", accent="#14b8a6")

    @ui.page("/portal/world/{world_id}")
    def world_page(world_id: str) -> None:
        _head()
        world = get_world(world_id)
        with ui.element("main").classes("portal-shell"):
            ui.link("포털 홈", "/portal").classes("muted")
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
                ui.label("아직 준비 중입니다. 새로운 활동이 곧 추가됩니다.").classes("muted")

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
            ui.link("수학탐험대", "/portal/world/math").classes("muted")
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
            ui.link("포털 홈", "/portal").classes("muted")
            ui.label("부모 화면").classes("text-h3 text-weight-bold q-mt-lg")
            stored_hash = configured_parent_pin_hash()
            if not stored_hash:
                ui.label("부모 화면은 아직 활성화되지 않았습니다.").classes("text-h6 text-weight-bold q-mt-md")
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
                        ui.label("최근 활동, 시도 횟수, 과정 배지는 Phase 1에서 실제 세션 기록과 연결합니다.").classes("muted")

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
