from __future__ import annotations

from typing import Any

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
    for index, raw in enumerate(activity.items, start=1):
        sequence = raw.get("sequence")
        choices = raw.get("choices")
        answer = raw.get("answer")
        stage = raw.get("stage", "규칙 탐험")
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
        if not isinstance(stage, str) or not stage:
            raise ValueError(f"{activity.id}: item {index} stage must be text")
        if not isinstance(prompt, str) or not prompt:
            raise ValueError(f"{activity.id}: item {index} prompt must be text")
        if not isinstance(hints, list) or len(hints) < 2 or not all(isinstance(value, str) and value for value in hints):
            raise ValueError(f"{activity.id}: item {index} hints must contain at least two text hints")
        validated.append({
            "sequence": sequence,
            "choices": choices,
            "answer": answer,
            "stage": stage,
            "prompt": prompt,
            "hints": hints,
        })
    return validated


def validate_activity_content(activity: Activity) -> None:
    if activity.activity_type == "pattern_sequence":
        get_pattern_train_items(activity)


def render_pattern_train(activity: Activity) -> None:
    from nicegui import ui

    items = get_pattern_train_items(activity)
    state = {"index": 0, "hint_level": 0, "answered": False}

    ui.label("규칙 기차").classes("text-h4 text-weight-bold")
    ui.label("쉬운 규칙부터 숫자 도전까지 차근차근 탐험해 보자!").classes("muted text-subtitle1")
    stage = ui.label("").classes("text-subtitle2 text-weight-bold q-mt-md")
    progress = ui.label("").classes("text-weight-bold")
    train = ui.label("").classes("pattern-train-track q-mt-md")
    question_prompt = ui.label("").classes("text-h6 text-weight-bold q-mt-lg")
    choices = ui.row().classes("pattern-choice-row q-mt-sm")
    feedback = ui.label("").classes("pattern-feedback q-mt-md")
    hint_text = ui.label("").classes("muted q-mt-sm")
    controls = ui.row().classes("q-gutter-sm q-mt-md")
    next_button = ui.button("다음 문제").classes("portal-action")
    next_button.set_visibility(False)

    def show_complete() -> None:
        choices.clear()
        controls.clear()
        next_button.set_visibility(False)
        stage.set_text("탐험 완료!")
        progress.set_text(f"완료! {len(items)}문제를 모두 살펴봤어.")
        train.set_text("🚂  ⭐  ⭐  ⭐  ⭐  ⭐")
        question_prompt.set_text("어떤 규칙이 가장 재미있었는지 이야기해 보자.")
        feedback.set_text("끝까지 규칙을 찾아냈구나! 천천히 살펴보고 다시 도전한 과정이 멋져.")
        hint_text.set_text(f"화면 밖 미션: {activity.offline_mission}")
        with controls:
            ui.link("수학탐험대로 돌아가기", "/portal/world/math").classes("portal-action q-btn q-btn-item q-btn--standard bg-dark text-white q-px-md")
            ui.link("포털 홈", "/portal").classes("portal-action q-btn q-btn-item q-btn--outline q-px-md")

    def render_question() -> None:
        item = items[state["index"]]
        state["hint_level"] = 0
        state["answered"] = False
        stage.set_text(item["stage"])
        progress.set_text(f"{state['index'] + 1} / {len(items)} 문제")
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
                feedback.set_text("정답! 규칙을 잘 찾았네!")
                next_button.set_text("완료 보기" if state["index"] == len(items) - 1 else "다음 문제")
                next_button.set_visibility(True)
                return
            feedback.set_text("괜찮아. 규칙을 다시 천천히 살펴보자.")
            if state["hint_level"] == 0:
                state["hint_level"] = 1
                hint_text.set_text(f"힌트 1: {item['hints'][0]}")

        def make_handler(symbol: str):
            return lambda: choose_answer(symbol)

        for symbol in item["choices"]:
            ui.button(symbol, on_click=make_handler(symbol)).classes("pattern-choice portal-action")

    def show_hint() -> None:
        item = items[state["index"]]
        index = min(state["hint_level"], len(item["hints"]) - 1)
        state["hint_level"] = min(state["hint_level"] + 1, len(item["hints"]))
        hint_text.set_text(f"힌트 {index + 1}: {item['hints'][index]}")

    def next_question() -> None:
        if not state["answered"]:
            return
        state["index"] += 1
        if state["index"] >= len(items):
            show_complete()
            return
        render_question()

    with controls:
        ui.button("힌트 보기", on_click=show_hint).classes("portal-action")
    next_button.on("click", next_question)
    render_question()
