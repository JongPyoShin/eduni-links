from __future__ import annotations

from typing import Any

from .database import complete_activity_session, latest_completed_activity_session, start_activity_session
from .schemas import Activity

PATTERN_TRAIN_ACTIVITY_ID = "math.pattern_train.001"


def get_pattern_train_items(activity: Activity) -> list[dict[str, Any]]:
    if activity.activity_type != "pattern_sequence":
        return []

    if not activity.items:
        raise ValueError(f"{activity.id}: pattern_sequence requires at least one item")
    if len(activity.hints) < 2:
        raise ValueError(f"{activity.id}: pattern_sequence requires two hints")

    validated: list[dict[str, Any]] = []
    level_titles: dict[int, str] = {}
    for index, raw in enumerate(activity.items, start=1):
        sequence = raw.get("sequence")
        choices = raw.get("choices")
        answer = raw.get("answer")
        level = raw.get("level", 1)
        level_title = raw.get("level_title", "기초 반복")
        prompt = raw.get("prompt", "다음 칸에 올 모양은 무엇일까?")
        hints = raw.get("hints", activity.hints)
        if not isinstance(sequence, list) or len(sequence) < 2 or not all(isinstance(value, str) and value for value in sequence):
            raise ValueError(f"{activity.id}: item {index} sequence must contain at least two text symbols")
        if not isinstance(choices, list) or len(choices) != 3 or not all(isinstance(value, str) and value for value in choices):
            raise ValueError(f"{activity.id}: item {index} choices must contain exactly three text symbols")
        if len(set(choices)) != len(choices):
            raise ValueError(f"{activity.id}: item {index} choices must not contain duplicates")
        if answer not in choices:
            raise ValueError(f"{activity.id}: item {index} answer must be one of the choices")
        if isinstance(level, bool) or not isinstance(level, int) or level < 1:
            raise ValueError(f"{activity.id}: item {index} level must be a positive integer")
        if not isinstance(level_title, str) or not level_title:
            raise ValueError(f"{activity.id}: item {index} level_title must be text")
        if not isinstance(prompt, str) or not prompt:
            raise ValueError(f"{activity.id}: item {index} prompt must be text")
        if not isinstance(hints, list) or len(hints) < 2 or not all(isinstance(value, str) and value for value in hints):
            raise ValueError(f"{activity.id}: item {index} hints must contain at least two text hints")
        if level in level_titles and level_titles[level] != level_title:
            raise ValueError(f"{activity.id}: level {level} must use one level_title")
        level_titles[level] = level_title
        validated.append({
            "sequence": sequence,
            "choices": choices,
            "answer": answer,
            "level": level,
            "level_title": level_title,
            "prompt": prompt,
            "hints": hints,
        })

    levels = [item["level"] for item in validated]
    unique_levels = sorted(set(levels))
    if unique_levels != list(range(1, max(unique_levels) + 1)):
        raise ValueError(f"{activity.id}: levels must start at 1 and be consecutive")
    if levels != sorted(levels):
        raise ValueError(f"{activity.id}: items must be ordered by level")
    return validated


def group_pattern_train_levels(items: list[dict[str, Any]]) -> list[tuple[int, list[dict[str, Any]]]]:
    grouped: dict[int, list[dict[str, Any]]] = {}
    for item in items:
        grouped.setdefault(item["level"], []).append(item)
    return [(level, grouped[level]) for level in sorted(grouped)]


def validate_activity_content(activity: Activity) -> None:
    if activity.activity_type == "pattern_sequence":
        get_pattern_train_items(activity)


def render_pattern_train(activity: Activity) -> None:
    from nicegui import ui

    items = get_pattern_train_items(activity)
    levels = group_pattern_train_levels(items)
    previous_result = latest_completed_activity_session(activity.id)
    session_id = start_activity_session(activity.id, activity.difficulty)
    state = {
        "level_index": 0,
        "item_index": 0,
        "hint_level": 0,
        "answered": False,
        "correct_count": 0,
        "hint_count": 0,
        "retry_count": 0,
        "completed": False,
    }

    ui.label("규칙 기차").classes("text-h4 text-weight-bold")
    ui.label("한 레벨씩 깨고, 준비되면 다음 레벨에 도전해 보자!").classes("muted text-subtitle1")
    if previous_result is not None:
        previous_score = previous_result["result_summary"].get("score", 0)
        ui.label(f"지난 완료 기록: {previous_score}점 · {previous_result['completed_at']}").classes("muted q-mt-sm")
    stage = ui.label("").classes("text-subtitle2 text-weight-bold q-mt-md")
    progress = ui.label("").classes("text-weight-bold")
    train = ui.label("").classes("pattern-train-track q-mt-md")
    question_prompt = ui.label("").classes("text-h6 text-weight-bold q-mt-lg")
    choices = ui.row().classes("pattern-choice-row q-mt-sm")
    feedback = ui.label("").classes("pattern-feedback q-mt-md")
    hint_text = ui.label("").classes("muted q-mt-sm")
    action_row = ui.row().classes("q-gutter-sm q-mt-md")
    level_actions = ui.row().classes("q-gutter-sm q-mt-md")

    def current_level() -> tuple[int, list[dict[str, Any]]]:
        return levels[state["level_index"]]

    def show_level_complete() -> None:
        level, level_items = current_level()
        choices.clear()
        action_row.set_visibility(False)
        level_actions.clear()
        stage.set_text(f"레벨 {level} 완료!")
        progress.set_text(f"{len(level_items)}문제를 모두 풀었어.")
        train.set_text("🚂  ⭐  ⭐  ⭐  ⭐  ⭐")
        if state["level_index"] < len(levels) - 1:
            next_level = levels[state["level_index"] + 1][0]
            question_prompt.set_text(f"다음은 레벨 {next_level}이야. 더 어려운 규칙에 도전해 볼까?")
            feedback.set_text("여기까지 풀어낸 것도 멋져! 준비되면 다음 레벨로 출발하자.")
            hint_text.set_text("잠깐 쉬었다가 다시 도전해도 좋아.")
            with level_actions:
                ui.button("다음 레벨 도전", on_click=start_next_level).classes("portal-action")
                ui.link("여기까지 하기", "/portal/world/math").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")
            return
        complete_pattern_train_session()
        question_prompt.set_text("어떤 규칙이 가장 재미있었는지 이야기해 보자.")
        feedback.set_text("모든 레벨 완료! 끝까지 규칙을 찾아낸 과정이 정말 멋져.")
        hint_text.set_text(f"화면 밖 미션: {activity.offline_mission}")
        with level_actions:
            ui.link("수학탐험대로 돌아가기", "/portal/world/math").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-px-md")
            ui.link("포털 홈", "/portal").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")

    def render_question() -> None:
        level, level_items = current_level()
        item = level_items[state["item_index"]]
        state["hint_level"] = 0
        state["answered"] = False
        action_row.set_visibility(True)
        level_actions.clear()
        stage.set_text(f"레벨 {level} · {item['level_title']}")
        progress.set_text(f"{state['item_index'] + 1} / {len(level_items)} 문제")
        train.set_text("  ".join([*item["sequence"], "❓"]))
        question_prompt.set_text(item["prompt"])
        feedback.set_text("")
        hint_text.set_text("")
        next_button.set_visibility(False)
        choices.clear()

        def choose_answer(symbol: str) -> None:
            if state["answered"]:
                return
            if symbol == item["answer"]:
                state["answered"] = True
                state["correct_count"] += 1
                feedback.set_text("정답! 규칙을 잘 찾았네!")
                next_button.set_text("레벨 완료 보기" if state["item_index"] == len(level_items) - 1 else "다음 문제")
                next_button.set_visibility(True)
                return
            state["retry_count"] += 1
            feedback.set_text("괜찮아. 규칙을 다시 천천히 살펴보자.")
            if state["hint_level"] == 0:
                state["hint_level"] = 1
                hint_text.set_text(f"힌트 1: {item['hints'][0]}")

        def make_handler(symbol: str):
            return lambda: choose_answer(symbol)

        for symbol in item["choices"]:
            ui.button(symbol, on_click=make_handler(symbol)).classes("pattern-choice portal-action")

    def show_hint() -> None:
        _, level_items = current_level()
        item = level_items[state["item_index"]]
        index = min(state["hint_level"], len(item["hints"]) - 1)
        state["hint_level"] = min(state["hint_level"] + 1, len(item["hints"]))
        state["hint_count"] += 1
        hint_text.set_text(f"힌트 {index + 1}: {item['hints'][index]}")

    def complete_pattern_train_session() -> None:
        if state["completed"]:
            return
        total_questions = len(items)
        score = round((state["correct_count"] / total_questions) * 100) if total_questions else 0
        complete_activity_session(
            session_id,
            score=score,
            hint_count=state["hint_count"],
            retry_count=state["retry_count"],
            result_summary={
                "correct_answers": state["correct_count"],
                "total_questions": total_questions,
                "levels_completed": len(levels),
            },
        )
        state["completed"] = True

    def next_question() -> None:
        if not state["answered"]:
            return
        _, level_items = current_level()
        state["item_index"] += 1
        if state["item_index"] >= len(level_items):
            show_level_complete()
            return
        render_question()

    def start_next_level() -> None:
        if state["level_index"] >= len(levels) - 1:
            return
        state["level_index"] += 1
        state["item_index"] = 0
        render_question()

    with action_row:
        ui.button("힌트 보기", on_click=show_hint).classes("portal-action")
        next_button = ui.button("다음 문제", on_click=next_question).classes("portal-action")
    next_button.set_visibility(False)
    render_question()
