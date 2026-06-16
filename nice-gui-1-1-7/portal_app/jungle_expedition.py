from __future__ import annotations

from random import choice

from nicegui import ui

from .jungle_question_selector import BIRDS, choose_bird, load_jungle_questions, remember_question, select_question
from .jungle_storage import count_total_captures, load_collection, record_capture

JUNGLE_EXPEDITION_ACTIVITY_ID = "jungle.expedition.001"
BIRD_POSITION_CLASSES = (
    "bird-lane-left",
    "bird-lane-center",
    "bird-lane-right",
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
        labels.append(f'❔ 미발견 {bird["stars"]} {bird["rarity_label"]}')
    return "\n".join(labels)


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
            border: 6px solid #2f1f12;
            border-radius: 0;
            background:
              linear-gradient(180deg, rgba(117, 191, 255, .86) 0 16%, rgba(117, 191, 255, 0) 34%),
              repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 32px, transparent 32px 64px),
              linear-gradient(180deg, #79c85a 0%, #3fa34d 48%, #26743b 100%);
            box-shadow: 0 18px 0 #1f130b, 0 24px 44px rgba(17, 24, 39, .22);
            color: #102a1f;
            touch-action: manipulation;
            image-rendering: pixelated;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          }
          .jungle-stage::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px);
            background-size: 32px 32px;
            mix-blend-mode: soft-light;
            opacity: .72;
          }
          .jungle-stage::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 210px;
            pointer-events: none;
            background:
              repeating-linear-gradient(90deg, rgba(26, 92, 43, .72) 0 32px, rgba(45, 128, 54, .72) 32px 64px),
              linear-gradient(180deg, rgba(58, 143, 62, .08), rgba(21, 83, 38, .54));
            clip-path: polygon(0 24%, 12% 18%, 28% 27%, 45% 17%, 62% 29%, 80% 18%, 100% 24%, 100% 100%, 0 100%);
          }
          .jungle-canopy {
            position: absolute;
            inset: 0 0 auto;
            height: 250px;
            pointer-events: none;
            z-index: 1;
          }
          .jungle-leaf {
            position: absolute;
            top: -22px;
            width: 96px;
            height: 168px;
            border-radius: 0;
            transform-origin: top center;
            background:
              repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 12px, transparent 12px 24px),
              linear-gradient(180deg, #14532d, #22c55e);
            border: 4px solid #174421;
            box-shadow: inset -10px -10px 0 rgba(0,0,0,.14), 0 8px 0 rgba(24, 65, 47, .3);
          }
          .jungle-leaf:nth-child(1) { left: 10px; transform: rotate(7deg); }
          .jungle-leaf:nth-child(2) { left: 106px; top: -46px; transform: rotate(-4deg); opacity: .94; }
          .jungle-leaf:nth-child(3) { right: 100px; top: -42px; transform: rotate(5deg); opacity: .94; }
          .jungle-leaf:nth-child(4) { right: 8px; transform: rotate(-8deg); }
          .jungle-path {
            position: absolute;
            z-index: 1;
            left: 50%;
            bottom: -42px;
            width: 168px;
            height: 710px;
            transform: translateX(-50%);
            border-radius: 0;
            background:
              repeating-linear-gradient(0deg, rgba(255,255,255,.10) 0 28px, transparent 28px 56px),
              repeating-linear-gradient(90deg, #a16207 0 34px, #854d0e 34px 68px);
            background-position: center 0;
            box-shadow: inset 0 0 0 8px rgba(68, 35, 12, .35);
            animation: jungle-road-flow 2.2s steps(8) infinite paused;
          }
          .jungle-stage.is-moving .jungle-path { animation-play-state: running; }
          .jungle-moving { animation: jungle-object-flow 4.8s steps(8) infinite paused; }
          .jungle-far { opacity: .56; transform: scale(.78); animation-duration: 7.2s; }
          .jungle-mid { opacity: .82; transform: scale(.92); animation-duration: 5.6s; }
          .jungle-near { opacity: .98; transform: scale(1.08); animation-duration: 4.2s; }
          .jungle-stage.is-moving .jungle-moving { animation-play-state: running; }
          .jungle-object {
            position: absolute;
            z-index: 2;
            display: grid;
            place-items: center;
            min-width: 58px;
            min-height: 58px;
            border-radius: 0;
            font-size: 34px;
            background: rgba(221, 255, 202, .84);
            border: 4px solid rgba(36, 91, 36, .72);
            box-shadow: inset -8px -8px 0 rgba(0,0,0,.13), 0 8px 0 rgba(20, 55, 30, .24);
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
            z-index: 5;
            top: -78px;
            min-width: 82px;
            min-height: 82px;
            outline: none;
            border: 5px solid #5c3b00;
            background: #facc15;
            font-size: 48px;
            box-shadow: inset -10px -10px 0 rgba(120, 53, 15, .24), 0 10px 0 rgba(92, 59, 0, .35);
            animation: jungle-bird-drop 9s steps(14) infinite paused;
          }
          .jungle-object.bird::after {
            content: "";
            position: absolute;
            inset: -12px;
            border: 4px solid rgba(250, 204, 21, .48);
            pointer-events: none;
          }
          .jungle-stage.is-moving .jungle-object.bird { animation-play-state: running; }
          .bird-lane-left { left: 28px; }
          .bird-lane-center { left: 50%; margin-left: -41px; }
          .bird-lane-right { right: 28px; }
          .jungle-truck {
            position: absolute;
            z-index: 4;
            left: 50%;
            bottom: 132px;
            transform: translateX(-50%);
            display: grid;
            place-items: center;
            width: 104px;
            height: 104px;
            border-radius: 0;
            background: #eab308;
            border: 6px solid #713f12;
            font-size: 54px;
            box-shadow: inset -12px -12px 0 rgba(120, 53, 15, .2), 0 12px 0 rgba(68, 35, 12, .35);
          }
          .jungle-card {
            position: absolute;
            z-index: 7;
            left: 18px;
            right: 18px;
            bottom: 232px;
            box-sizing: border-box;
            max-height: min(62vh, 430px);
            overflow-y: auto;
            padding: 14px;
            border-radius: 0;
            background: rgba(254, 252, 232, .97);
            border: 5px solid #3f2a16;
            font-weight: 900;
            box-shadow: 0 10px 0 rgba(63, 42, 22, .25);
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
            z-index: 6;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 12px;
            font-weight: 900;
            color: #fefce8;
            text-shadow: 2px 2px 0 #1f130b;
          }
          .jungle-status {
            position: absolute;
            z-index: 6;
            top: 50px;
            left: 12px;
            right: 12px;
            padding: 8px 10px;
            border-radius: 0;
            background: rgba(254, 252, 232, .88);
            border: 4px solid rgba(63, 42, 22, .88);
            font-weight: 900;
          }
          .jungle-controls {
            position: absolute;
            z-index: 8;
            left: 12px;
            right: 12px;
            bottom: max(14px, env(safe-area-inset-bottom));
            display: grid;
            grid-template-columns: 1.25fr 1.25fr 1fr 1fr;
            gap: 8px;
          }
          .jungle-touch {
            min-height: 62px;
            border-radius: 0;
            border: 4px solid #3f2a16;
            font-size: 16px;
            font-weight: 900;
            box-shadow: 0 7px 0 rgba(63, 42, 22, .32);
          }
          .jungle-catch {
            min-height: 70px;
            font-size: 18px;
          }
          .jungle-answer-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
          .jungle-answer { flex: 1 1 82px; min-height: 52px; min-width: 82px; border-radius: 0; font-weight: 900; }
          .jungle-codex-list { white-space: pre-line; max-height: min(34vh, 240px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
          @keyframes jungle-road-flow {
            from { background-position: center 0; }
            to { background-position: center 128px; }
          }
          @keyframes jungle-object-flow {
            from { margin-top: -90px; }
            to { margin-top: 520px; }
          }
          @keyframes jungle-bird-drop {
            0% {
              transform: translateY(-90px) scale(.82);
              opacity: 0;
            }
            8% {
              opacity: 1;
            }
            84% {
              opacity: 1;
            }
            100% {
              transform: translateY(870px) scale(1.08);
              opacity: 0;
            }
          }
          @media (max-width: 420px) {
            .jungle-stage { min-height: calc(100vh - 40px); }
            .jungle-card { left: 10px; right: 10px; bottom: 218px; max-height: calc(100vh - 318px); }
            .jungle-question-prompt { font-size: 21px; }
            .jungle-controls { left: 10px; right: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
            .jungle-touch { min-height: 58px; }
            .jungle-catch { min-height: 68px; }
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
            status.set_text("블록 정글 전진 중 · 새가 보이면 새 잡기를 눌러보자!")
            return
        stage.classes(remove="is-moving")
        status.set_text("새가 보이면 화면의 새 또는 아래 새 잡기 버튼을 눌러보자!")

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

    def catch_bird() -> None:
        if question_card.visible or cargo_card.visible or codex_card.visible:
            return
        discover_bird()

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

    def show_codex() -> None:
        set_motion(False)
        question_card.set_visibility(False)
        cargo_card.set_visibility(False)
        collection = load_collection()
        codex_summary.set_text(format_codex_summary(BIRDS, collection))
        codex_names.set_text(format_codex_items(BIRDS, collection))
        codex_card.set_visibility(True)

    def close_codex() -> None:
        move_forward()

    with ui.element("section").classes("jungle-stage").props('aria-label="블록 정글 대탐험 데모"') as stage:
        with ui.element("div").classes("jungle-hud"):
            ui.label("블록 정글 대탐험")
            ui.label("Voxel Mode")
        status = ui.label("전진을 누르고, 새가 보이면 새 잡기를 눌러보자!").classes("jungle-status")
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
        bird = ui.button("", on_click=discover_bird).classes("jungle-object bird").props("flat square")
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
            codex_names = ui.label("").classes("muted jungle-codex-list")
            ui.button("닫기", on_click=close_codex).classes("q-mt-sm")
        codex_card.set_visibility(False)
        with ui.element("div").classes("jungle-controls"):
            ui.button("▶ 전진", on_click=move_forward).classes("jungle-touch")
            ui.button("🐤 새 잡기", on_click=catch_bird).classes("jungle-touch jungle-catch")
            ui.button("🎒 짐칸", on_click=show_cargo).classes("jungle-touch")
            ui.button("📖 도감", on_click=show_codex).classes("jungle-touch")

    place_bird()
