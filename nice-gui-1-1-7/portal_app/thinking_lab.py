"""Guided, adult-assisted thinking missions. No AI calls, uploads or child free-text."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from nicegui import ui

from .thinking_pilot import PILOT_IDS, PILOT_VERSION, render_pilot

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
) -> dict[str, Any]:
    missions = missions if missions is not None else load_thinking_missions()
    mission = missions.get(mission_id)
    if mission is None:
        raise ValueError("unknown mission")
    if type(step_index) is not int or not 0 <= step_index < len(STAGES):
        raise ValueError("invalid step")
    choices = mission["steps"][step_index]["options"]
    if type(option_index) is not int or not 0 <= option_index < len(choices):
        raise ValueError("invalid choice")
    if type(revision) is not int or revision < 0:
        raise ValueError("invalid revision")
    if mission_id in PILOT_IDS and step_index == 3 and pilot_verified is not True:
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
            (profile, mission_id),
        ).fetchone()
        if row is None:
            if step_index != 0 or revision != 0:
                raise ProgressConflict("mission was changed")
            answers = {"0": option_index}
            if mission_id in PILOT_IDS:
                answers["_pilot_v"] = PILOT_VERSION
            conn.execute(
                """INSERT INTO thinking_mission_progress
                   (child_profile_id, mission_id, step_index, answers_json, completed, revision, updated_at)
                   VALUES (?, ?, ?, ?, 0, 1, ?)""",
                (profile, mission_id, 1, json.dumps(answers), utc_now()),
            )
        else:
            stored_step, stored_answers, completed, stored_revision = row
            if completed or stored_step != step_index or stored_revision != revision:
                raise ProgressConflict("mission was changed")
            answers = json.loads(stored_answers)
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
                         AND revision = ? AND completed = 0""",
                (
                    next_step, json.dumps(answers), int(next_step == len(STAGES)),
                    utc_now(), profile, mission_id, step_index, revision,
                ),
            )
            if cursor.rowcount != 1:
                raise ProgressConflict("mission was changed")
    return read_progress(mission_id, child_profile_id=profile, path=path)


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
    return [
        {"mission_id": mid, "title": titles.get(mid, mid),
         "step_index": step, "completed": bool(done), "updated_at": updated}
        for mid, step, done, updated in rows
    ]


@ui.page("/portal/thinking")
def thinking_home() -> None:
    missions = load_thinking_missions()
    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-4"):
        ui.link("← 가족 포털", "/portal")
        ui.label("🔎 생각탐험 연구소").classes("text-h4 text-weight-bold")
        ui.label("정답보다 좋은 질문을 찾아보자! 어른과 함께 실제로 탐험해요.")
        grouped: dict[str, list[dict[str, Any]]] = {}
        for mission in missions.values():
            grouped.setdefault(mission["category"], []).append(mission)
        for category, members in grouped.items():
            ui.label(f"{category} · {len(members)}개 미션").classes(
                "text-h6 text-weight-bold q-mt-lg"
            )
            for mission in members:
                with ui.card().classes("w-full p-4"):
                    ui.label(mission["title"]).classes("text-h6 text-weight-bold")
                    ui.label(" · ".join(mission["skills"])).classes("text-caption text-teal-8")
                    ui.label(f"화면 탐험 약 {mission['estimated_minutes']}분 + 현실 활동")
                    ui.link("이 미션 시작하기 →", f"/portal/thinking/{mission['id']}").classes(
                        "text-h6 q-mt-sm"
                    )


@ui.page("/portal/thinking/{mission_id}")
def thinking_mission(mission_id: str) -> None:
    missions = load_thinking_missions()
    mission = missions.get(mission_id)
    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-4"):
        ui.link("← 생각탐험 연구소", "/portal/thinking")
        if mission is None:
            ui.label("미션을 찾을 수 없어요.").classes("text-h5")
            return
        if mission_id in PILOT_IDS:
            profile = default_child_profile_id()
            progress = read_progress(mission_id, child_profile_id=profile)

            def save_pilot_step(step: int, option: int, revision: int, verified: bool) -> dict[str, Any]:
                return save_choice(
                    mission_id, step, option, revision, child_profile_id=profile,
                    missions=missions, pilot_verified=verified,
                )

            def reload_pilot() -> dict[str, Any]:
                return read_progress(mission_id, child_profile_id=profile)

            render_pilot(mission_id, progress, save_pilot_step, reload_pilot, ProgressConflict)
            return
        profile = default_child_profile_id()
        progress = read_progress(mission_id, child_profile_id=profile)
        ui.label(mission["category"]).classes("text-caption text-teal-8")
        ui.label(mission["title"]).classes("text-h4 text-weight-bold")
        ui.label("어떤 선택에도 벌점은 없어요. 가족과 이야기하며 한 단계씩 해보세요.")
        stage_area = ui.column().classes("w-full gap-3")

        def render() -> None:
            stage_area.clear()
            with stage_area:
                step = progress["step_index"]
                if progress["completed"]:
                    ui.label("🎉 탐험을 마쳤어요!").classes("text-h5 text-weight-bold")
                    ui.label("무엇을 새로 발견했는지 가족과 이야기해 보세요.")
                    ui.link("다른 미션 고르기", "/portal/thinking").classes("text-h6")
                    return
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

                def select(option: int) -> None:
                    selected["value"] = option
                    choice_text.set_text(f"선택했어요: {stage['options'][option]}")

                for index, option_text in enumerate(stage["options"]):
                    ui.button(
                        option_text, on_click=lambda i=index: select(i),
                    ).props("outline no-caps").classes("w-full min-h-14 text-left")

                with ui.expansion("보호자 질문 힌트").classes("w-full"):
                    ui.label(stage["parent_tip"])

                def advance() -> None:
                    if selected["value"] is None:
                        ui.notify("한 가지를 고르고 다음으로 가보자.")
                        return
                    try:
                        updated = save_choice(
                            mission_id, step, selected["value"], progress["revision"],
                            child_profile_id=profile, missions=missions,
                        )
                    except ProgressConflict:
                        ui.notify("다른 화면에서 진행했어요. 최신 기록을 불러올게요.")
                        progress.update(read_progress(mission_id, child_profile_id=profile))
                        render()
                        return
                    except sqlite3.Error:
                        ui.notify("저장할 수 없어요. 잠시 뒤 다시 시도해 주세요.")
                        return
                    progress.update(updated)
                    render()

                ui.button(
                    "탐험 완료" if step == len(STAGES) - 1 else "저장하고 다음 단계",
                    on_click=advance,
                ).classes("w-full min-h-12 bg-teal text-white q-mt-md")

        render()
