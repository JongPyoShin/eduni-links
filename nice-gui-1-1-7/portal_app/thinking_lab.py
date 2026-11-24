"""Guided, adult-assisted thinking missions. No AI calls, uploads or child free-text."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from nicegui import ui

from .thinking_parent import render_parent_guide

from .thinking_pilot import PILOT_IDS, PILOT_VERSION, render_pilot, update_choice_highlight
from .thinking_expanded import VISUAL_IDS, VERSION as VISUAL_VERSION, visual_key, stage_for, simulate, render_visual

from .database import (
    database_connection,
    default_child_profile_id,
    initialize_database,
    utc_now,
)

CONTENT_FILE = Path(__file__).resolve().parents[1] / "content" / "thinking_missions.json"
STAGES = ("발견", "정의", "대안", "실험", "성찰")

SCHEMA = """
CREATE TABLE IF NOT EXISTS thinking_mission_progress (
    child_profile_id INTEGER NOT NULL,
    mission_id TEXT NOT NULL,
    step_index INTEGER NOT NULL DEFAULT 0,
    answers_json TEXT NOT NULL DEFAULT '{}',
    completed INTEGER NOT NULL DEFAULT 0,
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (child_profile_id, mission_id),
    FOREIGN KEY(child_profile_id) REFERENCES child_profile(id)
);
"""


class ProgressConflict(RuntimeError):
    """Another tab has changed this child's mission progress."""


def load_thinking_missions(path: Path = CONTENT_FILE) -> dict[str, dict[str, Any]]:
    """Strict, small JSON contract: no user-authored HTML or arbitrary fields."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not payload:
        raise ValueError("thinking missions must be a non-empty array")
    missions: dict[str, dict[str, Any]] = {}
    allowed = {"id", "title", "category", "estimated_minutes", "skills", "offline_task", "steps"}
    for mission in payload:
        if not isinstance(mission, dict) or set(mission) != allowed:
            raise ValueError("unexpected mission fields")
        mission_id = mission["id"]
        if (not isinstance(mission_id, str) or not mission_id.isascii()
                or not mission_id.replace("_", "").isalnum()
                or mission_id in missions):
            raise ValueError("invalid or duplicate mission id")
        for key in ("title", "category", "offline_task"):
            if not isinstance(mission[key], str) or not 1 <= len(mission[key]) <= 500:
                raise ValueError(f"invalid {key}")
        if type(mission["estimated_minutes"]) is not int or not 1 <= mission["estimated_minutes"] <= 15:
            raise ValueError("invalid estimated_minutes")
        if (not isinstance(mission["skills"], list) or not mission["skills"]
                or not all(isinstance(s, str) and 0 < len(s) <= 30 for s in mission["skills"])):
            raise ValueError("invalid skills")
        steps = mission["steps"]
        if not isinstance(steps, list) or len(steps) != len(STAGES):
            raise ValueError("missions need five stages")
        for index, step in enumerate(steps):
            if not isinstance(step, dict) or set(step) != {"label", "prompt", "options", "parent_tip"}:
                raise ValueError("invalid step fields")
            if step["label"] != STAGES[index]:
                raise ValueError("invalid step order")
            for key in ("prompt", "parent_tip"):
                if not isinstance(step[key], str) or not 1 <= len(step[key]) <= 500:
                    raise ValueError(f"invalid {key}")
            choices = step["options"]
            if (not isinstance(choices, list) or not 2 <= len(choices) <= 4
                    or not all(isinstance(c, str) and 1 <= len(c) <= 140 for c in choices)):
                raise ValueError("invalid options")
        missions[mission_id] = mission
    return missions


def init_thinking_storage(path: Path | None = None) -> None:
    initialize_database(path)
    with database_connection(path) as conn:
        conn.execute(SCHEMA)


def read_progress(
    mission_id: str, *, child_profile_id: int | None = None, path: Path | None = None,
) -> dict[str, Any]:
    init_thinking_storage(path)
    profile = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with database_connection(path) as conn:
        row = conn.execute(
            """SELECT step_index, answers_json, completed, revision
               FROM thinking_mission_progress
               WHERE child_profile_id = ? AND mission_id = ?""",
            (profile, mission_id),
        ).fetchone()
    if row is None:
        return {"step_index": 0, "answers": {}, "completed": False, "revision": 0}
    return {
        "step_index": int(row[0]),
        "answers": json.loads(row[1]),
        "completed": bool(row[2]),
        "revision": int(row[3]),
    }


def save_choice(
    mission_id: str, step_index: int, option_index: int, revision: int, *,
    child_profile_id: int | None = None, path: Path | None = None,
    missions: dict[str, dict[str, Any]] | None = None,
    pilot_verified: bool = False,
    visual: bool = False,
    allow_edit: bool = False,
) -> dict[str, Any]:
    missions = missions if missions is not None else load_thinking_missions()
    mission = missions.get(mission_id)
    if mission is None:
        raise ValueError("unknown mission")
    if type(step_index) is not int or not 0 <= step_index < len(STAGES):
        raise ValueError("invalid step")
    if visual and mission_id not in VISUAL_IDS:
        raise ValueError("unknown visual mission")
    storage_id = visual_key(mission_id) if visual else mission_id
    choices = range(3) if visual else mission["steps"][step_index]["options"]
    if type(option_index) is not int or not 0 <= option_index < len(choices):
        raise ValueError("invalid choice")
    if type(revision) is not int or revision < 0:
        raise ValueError("invalid revision")
    if (mission_id in PILOT_IDS or visual) and step_index == 3 and pilot_verified is not True:
        raise ValueError("family activity must be acknowledged before recording an outcome")

    init_thinking_storage(path)
    profile = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    next_step = step_index + 1
    with database_connection(path) as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            """SELECT step_index, answers_json, completed, revision
               FROM thinking_mission_progress
               WHERE child_profile_id = ? AND mission_id = ?""",
            (profile, storage_id),
        ).fetchone()
        if row is None:
            if step_index != 0 or revision != 0:
                raise ProgressConflict("mission was changed")
            answers = {"0": option_index}
            if visual:
                answers["_visual_v"] = VISUAL_VERSION
            if mission_id in PILOT_IDS:
                answers["_pilot_v"] = PILOT_VERSION
            conn.execute(
                """INSERT INTO thinking_mission_progress
                   (child_profile_id, mission_id, step_index, answers_json, completed, revision, updated_at)
                   VALUES (?, ?, ?, ?, 0, 1, ?)""",
                (profile, storage_id, 1, json.dumps(answers), utc_now()),
            )
        else:
            stored_step, stored_answers, completed, stored_revision = row
            reviewing = allow_edit is True and step_index < stored_step
            if stored_revision != revision or (not reviewing and (completed or stored_step != step_index)):
                raise ProgressConflict("mission was changed")
            answers = json.loads(stored_answers)
            # A version mismatch must never reinterpret an older stored answer, even at step zero.
            if visual and answers.get("_visual_v") != VISUAL_VERSION:
                raise ProgressConflict("incompatible visual progress")
            if mission_id in PILOT_IDS and answers.get("_pilot_v") != PILOT_VERSION:
                raise ProgressConflict("legacy pilot progress cannot be silently reinterpreted")
            if reviewing:
                if str(step_index) not in answers:
                    raise ProgressConflict("missing earlier answer")
                if answers[str(step_index)] == option_index:
                    # Reading/confirming the same answer does not truncate or write progress.
                    return {"step_index": stored_step, "answers": answers,
                            "completed": bool(completed), "revision": stored_revision}
                # Downstream answers depend on earlier choices. Invalidate only the suffix.
                for key in list(answers):
                    if key.isdecimal() and int(key) > step_index:
                        del answers[key]
                if step_index <= 3:
                    answers.pop("_activity_confirmed", None)
            if visual:
                stage = stage_for(mission_id, step_index, answers)
                if step_index == 3:
                    if stage.get("screen") and option_index != simulate(mission_id, answers["1"])["outcome"]:
                        raise ValueError("observation does not match screen result")
                    answers["_activity_confirmed"] = "screen_model" if stage.get("screen") else "family_observation"
                if step_index == 4 and not answers.get("_activity_confirmed"):
                    raise ValueError("activity evidence missing")
            if mission_id in PILOT_IDS:
                if answers.get("_pilot_v") != PILOT_VERSION:
                    raise ProgressConflict("legacy pilot progress cannot be silently reinterpreted")
                if step_index == 4 and not answers.get("_activity_confirmed"):
                    raise ValueError("no family activity evidence; cannot complete")
                if step_index == 3:
                    answers["_activity_confirmed"] = "family_roleplay" if mission_id == "playground" else "hands_on_observation"
            answers[str(step_index)] = option_index
            cursor = conn.execute(
                """UPDATE thinking_mission_progress
                   SET step_index = ?, answers_json = ?, completed = ?, revision = revision + 1,
                       updated_at = ?
                   WHERE child_profile_id = ? AND mission_id = ? AND step_index = ?
                         AND revision = ? AND completed = ?""",
                (
                    next_step, json.dumps(answers), int(next_step == len(STAGES)),
                    utc_now(), profile, storage_id, stored_step, revision, completed,
                ),
            )
            if cursor.rowcount != 1:
                raise ProgressConflict("mission was changed")
    return read_progress(storage_id, child_profile_id=profile, path=path)


def reset_progress(
    mission_id: str, revision: int, *, child_profile_id: int | None = None,
    path: Path | None = None, visual: bool = False,
) -> dict[str, Any]:
    """Explicitly reset only one mission/profile; keep monotonic revision to reject stale tabs."""
    if mission_id not in load_thinking_missions() or (visual and mission_id not in VISUAL_IDS):
        raise ValueError("unknown mission")
    if type(revision) is not int or revision < 0:
        raise ValueError("invalid revision")
    storage_id = visual_key(mission_id) if visual else mission_id
    profile = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    answers = {}
    if visual:
        answers["_visual_v"] = VISUAL_VERSION
    if mission_id in PILOT_IDS:
        answers["_pilot_v"] = PILOT_VERSION
    init_thinking_storage(path)
    with database_connection(path) as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            """SELECT revision FROM thinking_mission_progress
               WHERE child_profile_id = ? AND mission_id = ?""", (profile, storage_id),
        ).fetchone()
        if row is None:
            if revision != 0:
                raise ProgressConflict("mission was changed")
            return {"step_index": 0, "answers": {}, "completed": False, "revision": 0}
        if row[0] != revision:
            raise ProgressConflict("mission was changed")
        cur = conn.execute(
            """UPDATE thinking_mission_progress SET step_index = 0, answers_json = ?,
               completed = 0, revision = revision + 1, updated_at = ?
               WHERE child_profile_id = ? AND mission_id = ? AND revision = ?""",
            (json.dumps(answers), utc_now(), profile, storage_id, revision),
        )
        if cur.rowcount != 1:
            raise ProgressConflict("mission was changed")
    return {"step_index": 0, "answers": answers, "completed": False, "revision": revision + 1}


def reset_control(mission_id: str, title: str, progress: dict[str, Any], profile: int, *, visual: bool = False, legacy: bool = False) -> None:
    # Capture the current revision when opening, not when confirming.
    with ui.dialog() as dialog, ui.card().classes("w-full max-w-sm"):
        ui.label("이 미션을 처음부터 다시 할까요?").classes("text-h6")
        ui.label("이 미션의 선택과 실험 기록만 지워져요. 다른 미션 기록은 그대로예요.")
        opened = {"revision": progress["revision"]}
        def confirm():
            dialog.close()
            try:
                reset_progress(mission_id, opened["revision"], child_profile_id=profile, visual=visual)
            except ProgressConflict:
                ui.notify("다른 화면에서 기록이 바뀌었어요. 다시 확인해 주세요.")
            except (sqlite3.Error, ValueError):
                ui.notify("초기화하지 못했어요. 기록을 다시 확인해 주세요.")
                return
            ui.navigate.to(f"/portal/thinking/{mission_id}" + ("?legacy=true" if legacy else ""))
        with ui.row().classes("w-full justify-end"):
            ui.button("취소", on_click=dialog.close).props("flat no-caps")
            ui.button("초기화하고 다시 시작", on_click=confirm, color="negative").props("no-caps")
    def open_dialog():
        opened["revision"] = progress["revision"]
        dialog.open()
    ui.button("미션 초기화", icon="restart_alt", on_click=open_dialog).props("outline no-caps color=grey-8").classes("self-end")


def recent_thinking_progress(
    *, child_profile_id: int | None = None, path: Path | None = None, limit: int = 8,
) -> list[dict[str, Any]]:
    init_thinking_storage(path)
    profile = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    with database_connection(path) as conn:
        rows = conn.execute(
            """SELECT mission_id, step_index, completed, updated_at
               FROM thinking_mission_progress
               WHERE child_profile_id = ?
               ORDER BY updated_at DESC LIMIT ?""",
            (profile, max(1, min(limit, 30))),
        ).fetchall()
    titles = {mid: mission["title"] for mid, mission in load_thinking_missions().items()}
    titles.update({visual_key(mid): titles[mid] + " (그림 미션)" for mid in VISUAL_IDS})
    return [
        {"mission_id": mid, "title": titles.get(mid, mid),
         "step_index": step, "completed": bool(done), "updated_at": updated}
        for mid, step, done, updated in rows
    ]


# Stable URL slugs and display names; keep stored curriculum category and mission IDs unchanged.
CATEGORY_TILES = (
    ("detective", "문제 탐정단", "🔎", "꼬마 탐정단", "문제와 단서를 찾아요"),
    ("science", "과학 탐구실", "🧪", "과학 실험실", "궁금한 것을 실험해요"),
    ("invention", "발명 연구실", "🛠️", "발명 공작소", "새로운 방법을 만들어요"),
    ("stories", "이야기 법정", "📖", "이야기 세상", "친구의 마음을 생각해요"),
    ("home", "우리집 프로젝트", "🏠", "우리집 해결사", "생활 속 문제를 해결해요"),
    ("robot", "규칙·논리 실험실", "🤖", "로봇 연구소", "규칙과 순서를 찾아요"),
    ("math", "수학·자료 탐험", "🧩", "수학 탐험대", "숫자와 자료로 생각해요"),
    ("earth", "자연과 지구", "🌱", "지구 탐험대", "자연과 환경을 알아봐요"),
)
MISSION_ICONS = dict(
    playground="🎠", missing_sign="🚪", leaf_dry="🍃", water_absorb="💧",
    paper_bridge="🌉", ball_run="⚽", lost_toy="🚗", raincoat_story="☔",
    tidy_room="🧸", family_turns="👫", sorting_cards="🔢", route_debug="🤖",
    snack_votes="🍎", fair_share="🧱", reusable_pack="🎒", seed_sun="🌱",
)
MISSION_TITLES = {
    "missing_sign": "자동차 상자를 찾아라!",
    "leaf_dry": "어느 나뭇잎이 먼저 마를까?",
    "water_absorb": "무엇이 물을 빨리 빨아들일까?",
    "lost_toy": "장난감의 주인은 누구일까?",
    "family_turns": "우리 가족 차례 정하기",
    "snack_votes": "가족 간식 투표",
    "seed_sun": "어디에서 식물이 더 많이 자랄까?",
}


def mission_title(mission: dict[str, Any]) -> str:
    return MISSION_TITLES.get(mission["id"], mission["title"])


def thinking_overview(
    missions: dict[str, dict[str, Any]], *,
    child_profile_id: int | None = None, path: Path | None = None,
) -> tuple[dict[str, dict[str, Any]], str | None, str | None]:
    """Read active-format progress in one query. Never count legacy records as visual progress."""
    init_thinking_storage(path)
    profile = child_profile_id if child_profile_id is not None else default_child_profile_id(path)
    keys = {visual_key(mid) if mid in VISUAL_IDS else mid: mid for mid in missions}
    states = {mid: {"step_index": 0, "completed": False, "compatible": True} for mid in missions}
    with database_connection(path) as conn:
        rows = conn.execute(
            """SELECT mission_id, step_index, completed, answers_json
               FROM thinking_mission_progress WHERE child_profile_id = ?
               ORDER BY updated_at DESC, mission_id""", (profile,),
        ).fetchall()
    resume = None
    for key, step, completed, raw in rows:
        mid = keys.get(key)
        if mid is None:
            continue
        answers = json.loads(raw)
        compatible = not step or (
            (mid not in PILOT_IDS or answers.get("_pilot_v") == PILOT_VERSION)
            and (mid not in VISUAL_IDS or answers.get("_visual_v") == VISUAL_VERSION)
        )
        states[mid] = {"step_index": int(step), "completed": bool(completed), "compatible": compatible}
        if resume is None and 0 < step < len(STAGES) and not completed and compatible:
            resume = mid
    recommendation = next(
        (m["id"] for _, category, *_ in CATEGORY_TILES for m in missions.values()
         if m["category"] == category and states[m["id"]]["step_index"] == 0
         and not states[m["id"]]["completed"]), None,
    )
    return states, resume, recommendation


def mission_tile(mission: dict[str, Any], state: dict[str, Any], prefix: str = "") -> None:
    mid = mission["id"]
    if not state["compatible"]:
        status = "이전 형식 기록"
    elif state["completed"]:
        status = "탐험 완료 ✓"
    elif state["step_index"]:
        status = f"탐험 중 · {state['step_index']} / 5단계 완료"
    else:
        status = "아직 시작 전"
    activity = "화면에서 확인" if mid in ("sorting_cards", "route_debug", "fair_share") else "가족과 직접 해보기"
    ui.link(
        f"{prefix}{MISSION_ICONS.get(mid, '🔎')}  {mission_title(mission)}\n{status}\n{activity}",
        f"/portal/thinking/{mid}",
    ).classes(
        "block w-full rounded-xl border-2 border-solid border-teal-3 bg-white text-teal-10 "
        "p-4 text-body1 no-underline"
    ).style("white-space: pre-line; overflow-wrap: anywhere; min-height: 88px; line-height: 1.5;")


@ui.page("/portal/thinking")
def thinking_home(category: str = "") -> None:
    missions = load_thinking_missions()
    states, resume, recommendation = thinking_overview(missions)
    category_info = next((item for item in CATEGORY_TILES if item[0] == category), None)
    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-4"):
        ui.link("← 가족 포털", "/portal")
        if category and category_info is None:
            ui.label("이 탐험방을 찾을 수 없어요.")
            ui.link("← 생각탐험 연구소", "/portal/thinking")
            return
        if category_info:
            _, stored_name, icon, title, desc = category_info
            ui.link("← 생각탐험 연구소", "/portal/thinking")
            ui.label(f"{icon} {title}").classes("text-h4 text-weight-bold")
            ui.label(desc).classes("text-body1")
            for mission in missions.values():
                if mission["category"] == stored_name:
                    mission_tile(mission, states[mission["id"]])
            return
        ui.label("🔎 생각탐험 연구소").classes("text-h4 text-weight-bold")
        ui.label("오늘은 어떤 탐험을 해볼까?").classes("text-h6")
        if resume:
            ui.label("이어서 탐험하기").classes("text-h6 text-teal-9")
            mission_tile(missions[resume], states[resume])
        elif recommendation:
            ui.label("오늘의 추천 탐험").classes("text-h6 text-teal-9")
            mission_tile(missions[recommendation], states[recommendation])
        with ui.grid(columns=2).classes("w-full gap-3").style("grid-template-columns: repeat(2, minmax(0, 1fr));"):
            for slug, stored_name, icon, title, desc in CATEGORY_TILES:
                members = [m for m in missions.values() if m["category"] == stored_name]
                done = sum(states[m["id"]]["completed"] and states[m["id"]]["compatible"] for m in members)
                ui.link(
                    f"{icon} {title}\n{desc}\n{done}/{len(members)}개 완료",
                    f"/portal/thinking?category={slug}",
                ).classes(
                    "block w-full rounded-xl border-2 border-solid border-teal-3 bg-teal-1 "
                    "p-3 text-body1 text-teal-10 no-underline text-center"
                ).style("white-space: pre-line; overflow-wrap: anywhere; min-height: 116px; line-height: 1.6;")


@ui.page("/portal/thinking/{mission_id}")
def thinking_mission(mission_id: str, legacy: bool = False) -> None:
    missions = load_thinking_missions()
    mission = missions.get(mission_id)
    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-4"):
        ui.link("← 생각탐험 연구소", "/portal/thinking")
        if mission is None:
            ui.label("미션을 찾을 수 없어요.").classes("text-h5")
            return
        category_info = next((item for item in CATEGORY_TILES if item[1] == mission["category"]), None)
        if category_info:
            ui.link(f"← {category_info[3]}", f"/portal/thinking?category={category_info[0]}")
        if mission_id in VISUAL_IDS and not legacy:
            profile = default_child_profile_id()
            key = visual_key(mission_id)
            progress = read_progress(key, child_profile_id=profile)
            reset_control(mission_id, mission_title(mission), progress, profile, visual=True)
            old = read_progress(mission_id, child_profile_id=profile)
            if old["step_index"] > 0:
                ui.link("이전 질문형 기록 보기", f"/portal/thinking/{mission_id}?legacy=true")
            def save_visual(step, option, revision, verified, reviewing):
                return save_choice(mission_id, step, option, revision, child_profile_id=profile,
                                   missions=missions, pilot_verified=verified, visual=True,
                                   allow_edit=reviewing)
            def reload_visual():
                return read_progress(key, child_profile_id=profile)
            render_visual(mission_id, mission_title(mission), progress, save_visual, reload_visual,
                          ProgressConflict, update_choice_highlight)
            return
        if mission_id in PILOT_IDS:
            profile = default_child_profile_id()
            progress = read_progress(mission_id, child_profile_id=profile)

            reset_control(mission_id, mission_title(mission), progress, profile)

            def save_pilot_step(step: int, option: int, revision: int, verified: bool, reviewing: bool) -> dict[str, Any]:
                return save_choice(
                    mission_id, step, option, revision, child_profile_id=profile,
                    missions=missions, pilot_verified=verified, allow_edit=reviewing,
                )

            def reload_pilot() -> dict[str, Any]:
                return read_progress(mission_id, child_profile_id=profile)

            render_pilot(mission_id, progress, save_pilot_step, reload_pilot, ProgressConflict)
            return
        profile = default_child_profile_id()
        progress = read_progress(mission_id, child_profile_id=profile)
        reset_control(mission_id, mission_title(mission), progress, profile, legacy=legacy)
        ui.label(mission["category"]).classes("text-caption text-teal-8")
        ui.label(mission_title(mission)).classes("text-h4 text-weight-bold")
        ui.label("어떤 선택에도 벌점은 없어요. 가족과 이야기하며 한 단계씩 해보세요.")
        stage_area = ui.column().classes("w-full gap-3")
        view = {"step": progress["step_index"], "generation": 0}

        def render() -> None:
            view["generation"] += 1
            generation = view["generation"]
            revision = progress["revision"]
            stage_area.clear()
            with stage_area:
                step = view["step"]

                def go_to(target: int) -> None:
                    if view["generation"] == generation:
                        view["step"] = target
                        render()

                if step == len(STAGES):
                    ui.label("🎉 탐험을 마쳤어요!").classes("text-h5 text-weight-bold")
                    ui.label("무엇을 새로 발견했는지 가족과 이야기해 보세요.")
                    ui.button("처음부터 다시 보기", on_click=lambda: go_to(0))
                    ui.button("이전 단계", on_click=lambda: go_to(len(STAGES) - 1))
                    ui.link("다른 미션 고르기", "/portal/thinking").classes("text-h6")
                    return
                reviewing = step < progress["step_index"]
                stage = mission["steps"][step]
                ui.label(f"{step + 1} / {len(STAGES)} · {stage['label']}").classes(
                    "text-subtitle1 text-teal-8"
                )
                ui.linear_progress(value=step / len(STAGES)).classes("w-full")
                ui.label(stage["prompt"]).classes("text-h5 text-weight-medium")
                if step == 3:
                    with ui.card().classes("w-full bg-amber-1"):
                        ui.label("🏠 화면 밖 미션").classes("text-weight-bold")
                        ui.label(mission["offline_task"])
                selected = {"value": None}
                choice_text = ui.label("생각과 가장 가까운 것을 골라 보세요.").classes(
                    "text-caption"
                )
                option_buttons: list[Any] = []

                def select(option: int) -> None:
                    selected["value"] = option
                    choice_text.set_text(f"선택했어요: {stage['options'][option]}")
                    update_choice_highlight(option_buttons, stage["options"], option)

                for index, option_text in enumerate(stage["options"]):
                    option_buttons.append(
                        ui.button(option_text, on_click=lambda i=index: select(i))
                        .props("outline no-caps color=teal-9 aria-pressed=false")
                        .style("border: 2px solid #94a3b8; border-radius: 12px;")
                        .classes("w-full min-h-14 text-left")
                    )

                if reviewing:
                    select(progress["answers"][str(step)])
                    ui.label("이전 선택을 바꾸고 저장하면 그 뒤의 답을 다시 골라야 해요.").classes("text-caption")

                render_parent_guide(mission_id, step, progress["answers"], stage["parent_tip"], legacy=True)

                def advance() -> None:
                    if view["generation"] != generation:
                        return
                    if selected["value"] is None:
                        ui.notify("한 가지를 고르고 다음으로 가보자.")
                        return
                    try:
                        updated = save_choice(
                            mission_id, step, selected["value"], revision,
                            child_profile_id=profile, missions=missions, allow_edit=reviewing,
                        )
                    except ProgressConflict:
                        ui.notify("다른 화면에서 진행했어요. 최신 기록을 불러올게요.")
                        progress.update(read_progress(mission_id, child_profile_id=profile))
                        view["step"] = progress["step_index"]
                        render()
                        return
                    except sqlite3.Error:
                        ui.notify("저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.")
                        return
                    progress.update(updated)
                    view["step"] = min(step + 1, progress["step_index"])
                    render()

                if step > 0:
                    ui.button("이전 단계", on_click=lambda: go_to(step - 1)).props(
                        "outline no-caps"
                    ).classes("w-full min-h-12")
                ui.button(
                    "탐험 완료" if step == len(STAGES) - 1 else "저장하고 다음 단계",
                    on_click=advance,
                ).classes("w-full min-h-12 bg-teal text-white q-mt-md")

        render()
