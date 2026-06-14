from __future__ import annotations

from random import choice

from nicegui import ui

from .jungle_question_selector import BIRDS, choose_bird, load_jungle_questions, remember_question, select_question
from .jungle_storage import count_total_captures, load_collection, record_capture

JUNGLE_EXPEDITION_ACTIVITY_ID = "jungle.expedition.001"
BIRD_POSITION_CLASSES = (
    "bird-position-left-high",
    "bird-position-left-low",
    "bird-position-right-high",
    "bird-position-right-low",
)


def format_bird_badge(bird_info: dict[str, object]) -> str:
    return f'{bird_info["stars"]} {bird_info["rarity_label"]}'


def format_cargo_items(collection: list[dict[str, str | int]]) -> str:
    labels: list[str] = []
    for item in collection:
        label = f'{item["emoji"]} {item["bird_name"]} {item["stars"]}'
        count = int(item["capture_count"])
        if count > 1:
            label = f"{label} x {count}개"
        labels.append(label)
    return ", ".join(labels)


def collection_by_bird_id(collection: list[dict[str, str | int]]) -> dict[str, dict[str, str | int]]:
    return {str(item["bird_id"]): item for item in collection}


def format_capture_date(value: str | int | object) -> str:
    text = str(value)
    if "T" in text:
        return text.split("T", maxsplit=1)[0]
    return text


def format_codex_summary(birds: tuple[dict[str, str], ...], collection: list[dict[str, str | int]]) -> str:
    discovered = collection_by_bird_id(collection)
    total_captures = sum(int(item["capture_count"]) for item in collection)
    return f"도감 발견: {len(discovered)}/{len(birds)}종 · 총 {total_captures}마리"


def format_codex_items(birds: tuple[dict[str, str], ...], collection: list[dict[str, str | int]]) -> str:
    discovered = collection_by_bird_id(collection)
    labels: list[str] = []
    for bird in birds:
        bird_id = str(bird["id"])
        if bird_id in discovered:
            item = discovered[bird_id]
            count = int(item["capture_count"])
            label = f'{item["emoji"]} {item["bird_name"]} {item["stars"]} {item["rarity_label"]}'
            if count > 1:
                label = f"{label} x {count}개"
            labels.append(label)
            continue
        labels.append(f'❔ ??? {bird["stars"]} {bird["rarity_label"]}')
    return "\n".join(labels)


def format_codex_detail(bird: dict[str, str], collection: list[dict[str, str | int]]) -> tuple[str, str]:
    discovered = collection_by_bird_id(collection)
    bird_id = str(bird["id"])
    if bird_id not in discovered:
        title = f'❔ ??? {bird["stars"]} {bird["rarity_label"]}'
        body = "아직 미발견\n전진해서 새를 만나고 문제를 맞히면 도감에 기록돼."
        return title, body

    item = discovered[bird_id]
    count = int(item["capture_count"])
    title = f'{item["emoji"]} {item["bird_name"]} {item["stars"]} {item["rarity_label"]}'
    body = "\n".join(
        [
            f"잡은 횟수: {count}회",
            f'처음 포획: {format_capture_date(item["first_captured_at"])}',
            f'마지막 포획: {format_capture_date(item["last_captured_at"])}',
            f'설명: {bird["description"]}',
        ]
    )
    return title, body


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
          .jungle-leaf:nth-child(2) { left: 92px; top: -54px; transform: rotate(-9deg); opacity: .9; }
          .jungle-leaf:nth-child(3) { right: 90px; top: -48px; transform: rotate(10deg); opacity: .92; }
          .jungle-leaf:nth-child(4) { right: 12px; transform: rotate(-18deg); }
          .jungle-path {
            position: absolute;
            left: 50%;
            bottom: -42px;
            width: 150px;
            height: 710px;
            transform: translateX(-50%);
            border-radius: 82px 82px 0 0;
            background: repeating-linear-gradient(180deg, #fef3c7 0 48px, #f59e0b 48px 64px);
            background-position: center 0;
            box-shadow: inset 0 0 0 8px rgba(120, 53, 15, .14);
            animation: jungle-road-flow 2.2s linear infinite paused;
          }
          .jungle-stage.is-moving .jungle-path { animation-play-state: running; }
          .jungle-moving { animation: jungle-object-flow 4.8s linear infinite paused; }
          .jungle-far { opacity: .48; transform: scale(.78); animation-duration: 7.2s; }
          .jungle-mid { opacity: .76; transform: scale(.92); animation-duration: 5.6s; }
          .jungle-near { opacity: .98; transform: scale(1.08); animation-duration: 4.2s; }
          .jungle-stage.is-moving .jungle-moving { animation-play-state: running; }
          .jungle-object {
            position: absolute;
            display: grid;
            place-items: center;
            min-width: 56px;
            min-height: 56px;
            border-radius: 999px;
            font-size: 32px;
            background: rgba(255, 255, 255, .7);
            box-shadow: 0 10px 20px rgba(15, 23, 42, .14);
          }
          .tree-left-a { left: 12px; top: 150px; animation-delay: -1.1s; }
          .tree-left-b { left: 42px; top: 340px; animation-delay: -3.5s; }
          .tree-left-c { left: 4px; top: 500px; animation-delay: -5.2s; }
          .tree-right-a { right: 18px; top: 175px; animation-delay: -2.4s; }
          .tree-right-b { right: 46px; top: 315px; animation-delay: -4.7s; }
          .tree-right-c { right: 8px; top: 515px; animation-delay: -6.1s; }
          .branch-left-a { left: 34px; top: 245px; animation-delay: -2.8s; }
          .branch-left-b { left: 20px; top: 440px; animation-delay: -4.1s; }
          .branch-right-a { right: 34px; top: 260px; animation-delay: -1.8s; }
          .branch-right-b { right: 26px; top: 455px; animation-delay: -5.3s; }
          .jungle-object.bird {
            z-index: 3;
            min-width: 64px;
            min-height: 64px;
            outline: 4px solid rgba(250, 204, 21, .7);
            font-size: 36px;
          }
          .bird-position-left-high { left: 28px; top: 210px; }
          .bird-position-left-low { left: 46px; top: 430px; }
          .bird-position-right-high { right: 30px; top: 230px; }
          .bird-position-right-low { right: 48px; top: 450px; }
          .jungle-truck {
            position: absolute;
            z-index: 4;
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
            z-index: 7;
            left: 18px;
            right: 18px;
            bottom: 220px;
            box-sizing: border-box;
            max-height: min(62vh, 430px);
            overflow-y: auto;
            padding: 14px;
            border-radius: 8px;
            background: rgba(255,255,255,.95);
            border: 1px solid rgba(22, 101, 52, .24);
            font-weight: 800;
            -webkit-overflow-scrolling: touch;
          }
          .jungle-question-prompt {
            font-size: 20px;
            line-height: 1.45;
            font-weight: 900;
            margin-top: 8px;
            color: #0f172a;
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
            z-index: 8;
            left: 14px;
            right: 14px;
            bottom: max(18px, env(safe-area-inset-bottom));
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .jungle-touch {
            min-height: 58px;
            border-radius: 8px;
            font-weight: 900;
          }
          .jungle-answer-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
          .jungle-answer { flex: 1 1 82px; min-height: 52px; min-width: 82px; border-radius: 8px; font-weight: 900; }
          .jungle-codex-list { display: grid; gap: 8px; max-height: min(34vh, 240px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
          .jungle-codex-entry { width: 100%; justify-content: flex-start; text-align: left; border-radius: 8px; font-weight: 900; }
          .jungle-codex-undiscovered { opacity: .72; }
          .jungle-detail-card { margin-top: 12px; padding: 10px; border-radius: 8px; border: 1px solid rgba(22,101,52,.22); background: rgba(236, 253, 245, .86); }
          .jungle-detail-body { white-space: pre-line; line-height: 1.55; }
          @keyframes jungle-road-flow {
            from { background-position: center 0; }
            to { background-position: center 128px; }
          }
          @keyframes jungle-object-flow {
            from { margin-top: -90px; }
            to { margin-top: 520px; }
          }
          @media (max-width: 420px) {
            .jungle-stage { min-height: calc(100vh - 40px); }
            .jungle-card { left: 10px; right: 10px; bottom: 190px; max-height: calc(100vh - 286px); }
            .jungle-question-prompt { font-size: 21px; }
            .jungle-controls { left: 10px; right: 10px; gap: 8px; }
            .jungle-touch { min-height: 52px; }
          }
        </style>
        """
    )

    questions = load_jungle_questions()
    recent_questions: dict[str, list[str]] = {}
    state: dict[str, object] = {"moving": False, "bird": choose_bird(), "question": None, "answered": False}

    def set_motion(moving: bool) -> None:
        state["moving"] = moving
        if moving:
            stage.classes(add="is-moving")
            status.set_text("전진 중 · 좌우 숲에서 새를 찾아보자!")
            return
        stage.classes(remove="is-moving")
        status.set_text("새를 발견하면 눌러서 문제를 풀어보자!")

    def choose_bird_position() -> str:
        return choice(BIRD_POSITION_CLASSES)

    def place_bird() -> None:
        bird_info = choose_bird()
        state["bird"] = bird_info
        bird.set_text(str(bird_info["emoji"]))
        bird.props(f'aria-label="{bird_info["name"]} {format_bird_badge(bird_info)} 발견"')
        bird.classes(remove=" ".join(BIRD_POSITION_CLASSES), add=choose_bird_position())

    def move_forward() -> None:
        question_card.set_visibility(False)
        cargo_card.set_visibility(False)
        codex_card.set_visibility(False)
        bird.set_visibility(True)
        place_bird()
        set_motion(True)

    def render_question() -> None:
        bird_info = state["bird"]
        if not isinstance(bird_info, dict):
            return
        question = select_question(questions, str(bird_info["id"]), recent_questions)
        state["question"] = question
        state["answered"] = False
        remember_question(recent_questions, str(bird_info["id"]), question["id"])
        question_title.set_text(f'{bird_info["emoji"]} {bird_info["name"]} 발견! {format_bird_badge(bird_info)}')
        question_prompt.set_text(question["prompt"])
        hint_text.set_text(str(bird_info["description"]))
        feedback.set_text("")
        hint_button.set_visibility(True)
        continue_button.set_visibility(False)
        answer_row.clear()
        with answer_row:
            for choice_text in question["choices"]:
                ui.button(choice_text, on_click=lambda value=choice_text: answer_question(value)).classes("jungle-answer")
        question_card.set_visibility(True)

    def discover_bird() -> None:
        set_motion(False)
        bird.set_visibility(False)
        render_question()

    def show_hint() -> None:
        question = state.get("question")
        if isinstance(question, dict):
            hint_text.set_text(f'힌트: {question["hint"]}')

    def answer_question(choice_text: str) -> None:
        if state["answered"]:
            return
        question = state.get("question")
        bird_info = state["bird"]
        if not isinstance(question, dict) or not isinstance(bird_info, dict):
            return
        if choice_text != question["answer"]:
            feedback.set_text("아직 아니야. 힌트를 보고 다시 골라보자.")
            return
        state["answered"] = True
        bird_capture_count = record_capture(bird_info, question)
        total_captures = count_total_captures()
        feedback.set_text(
            f'{bird_info["name"]} 포획 성공! {format_bird_badge(bird_info)} · '
            f'이 새 {bird_capture_count}번 · 전체 {total_captures}마리'
        )
        hint_button.set_visibility(False)
        continue_button.set_visibility(True)

    def continue_expedition() -> None:
        question_card.set_visibility(False)
        move_forward()

    def show_cargo() -> None:
        set_motion(False)
        question_card.set_visibility(False)
        codex_card.set_visibility(False)
        collection = load_collection()
        if collection:
            cargo_summary.set_text(f"저장된 수집 수: {count_total_captures()}마리 · 종류: {len(collection)}종")
            cargo_names.set_text(format_cargo_items(collection))
        else:
            cargo_summary.set_text("저장된 수집 수: 0")
            cargo_names.set_text("아직 잡은 새가 없어. 전진해서 새를 찾아보자.")
        cargo_card.set_visibility(True)

    def close_cargo() -> None:
        move_forward()

    def render_codex_entries(collection: list[dict[str, str | int]]) -> None:
        discovered = collection_by_bird_id(collection)
        codex_list.clear()
        codex_detail_card.set_visibility(False)
        with codex_list:
            for bird_info in BIRDS:
                bird_id = str(bird_info["id"])
                if bird_id in discovered:
                    item = discovered[bird_id]
                    count = int(item["capture_count"])
                    label = f'{item["emoji"]} {item["bird_name"]} {item["stars"]} {item["rarity_label"]}'
                    if count > 1:
                        label = f"{label} x {count}개"
                    ui.button(
                        label,
                        on_click=lambda bird=bird_info, current_collection=collection: show_codex_detail(
                            bird, current_collection
                        ),
                    ).classes("jungle-codex-entry")
                    continue
                ui.button(
                    f'❔ ??? {bird_info["stars"]} {bird_info["rarity_label"]}',
                    on_click=lambda bird=bird_info, current_collection=collection: show_codex_detail(
                        bird, current_collection
                    ),
                ).classes("jungle-codex-entry jungle-codex-undiscovered")

    def show_codex_detail(bird_info: dict[str, str], collection: list[dict[str, str | int]]) -> None:
        title, body = format_codex_detail(bird_info, collection)
        codex_detail_title.set_text(title)
        codex_detail_body.set_text(body)
        codex_detail_card.set_visibility(True)

    def close_codex_detail() -> None:
        codex_detail_card.set_visibility(False)

    def show_codex() -> None:
        set_motion(False)
        question_card.set_visibility(False)
        cargo_card.set_visibility(False)
        collection = load_collection()
        codex_summary.set_text(format_codex_summary(BIRDS, collection))
        render_codex_entries(collection)
        codex_card.set_visibility(True)

    def close_codex() -> None:
        move_forward()

    with ui.element("section").classes("jungle-stage").props('aria-label="정글 대탐험 데모"') as stage:
        with ui.element("div").classes("jungle-hud"):
            ui.label("정글 대탐험")
            ui.label("Phase C-5")
        status = ui.label("전진을 눌러 새를 찾아보자!").classes("jungle-status")
        with ui.element("div").classes("jungle-canopy"):
            for _ in range(4):
                ui.element("span").classes("jungle-leaf")
        ui.element("div").classes("jungle-path")
        ui.label("🌳").classes("jungle-object jungle-moving jungle-far tree-left-a")
        ui.label("🌿").classes("jungle-object jungle-moving jungle-mid branch-left-a")
        ui.label("🌲").classes("jungle-object jungle-moving jungle-near tree-left-b")
        ui.label("🪵").classes("jungle-object jungle-moving jungle-mid branch-left-b")
        ui.label("🌴").classes("jungle-object jungle-moving jungle-far tree-left-c")
        ui.label("🌴").classes("jungle-object jungle-moving jungle-far tree-right-a")
        ui.label("🌱").classes("jungle-object jungle-moving jungle-mid branch-right-a")
        ui.label("🌳").classes("jungle-object jungle-moving jungle-near tree-right-b")
        ui.label("🌿").classes("jungle-object jungle-moving jungle-mid branch-right-b")
        ui.label("🌲").classes("jungle-object jungle-moving jungle-far tree-right-c")
        bird = ui.button("", on_click=discover_bird).classes("jungle-object jungle-moving bird").props("flat round")
        ui.label("🚚").classes("jungle-truck")
        question_card = ui.element("div").classes("jungle-card")
        with question_card:
            question_title = ui.label("").classes("text-h6")
            question_prompt = ui.label("").classes("jungle-question-prompt")
            answer_row = ui.element("div").classes("jungle-answer-row")
            hint_text = ui.label("").classes("muted q-mt-sm")
            feedback = ui.label("").classes("q-mt-sm")
            with ui.row().classes("q-gutter-sm q-mt-sm"):
                hint_button = ui.button("힌트", on_click=show_hint).classes("jungle-answer")
                continue_button = ui.button("탐험 계속", on_click=continue_expedition).classes("jungle-answer")
        question_card.set_visibility(False)
        continue_button.set_visibility(False)
        cargo_card = ui.element("div").classes("jungle-card")
        with cargo_card:
            ui.label("짐칸").classes("text-h6")
            cargo_summary = ui.label("")
            cargo_names = ui.label("").classes("muted")
            ui.button("닫기", on_click=close_cargo).classes("q-mt-sm")
        cargo_card.set_visibility(False)
        codex_card = ui.element("div").classes("jungle-card")
        with codex_card:
            ui.label("새 도감").classes("text-h6")
            codex_summary = ui.label("")
            codex_list = ui.element("div").classes("jungle-codex-list")
            codex_detail_card = ui.element("div").classes("jungle-detail-card")
            with codex_detail_card:
                codex_detail_title = ui.label("").classes("text-subtitle1")
                codex_detail_body = ui.label("").classes("muted jungle-detail-body")
                ui.button("상세 닫기", on_click=close_codex_detail).classes("q-mt-sm")
            ui.button("닫기", on_click=close_codex).classes("q-mt-sm")
        codex_card.set_visibility(False)
        codex_detail_card.set_visibility(False)
        with ui.element("div").classes("jungle-controls"):
            ui.button("전진", on_click=move_forward).classes("jungle-touch")
            ui.button("짐칸", on_click=show_cargo).classes("jungle-touch")
            ui.button("도감", on_click=show_codex).classes("jungle-touch")

    place_bird()
