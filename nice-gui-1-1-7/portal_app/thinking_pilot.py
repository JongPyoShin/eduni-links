"""Two picture-led, logically linked missions for parent-assisted learning.

No external media, AI, uploads, or user-supplied HTML. All artwork is our own
trusted, static SVG overlay for NiceGUI's interactive_image.
"""
from __future__ import annotations

import sqlite3
from typing import Any, Callable

from nicegui import ui

from .thinking_parent import render_parent_guide

PILOT_IDS = frozenset({"playground", "water_absorb"})
PILOT_VERSION = 2

PLAY_ISSUES = (
    {
        "name": "미끄러운 물웅덩이",
        "goals": ("친구가 젖은 길을 피해서 지나가기", "위험한 곳을 친구에게 알려주기", "어른에게 위험한 곳을 알리기"),
        "solutions": ("친구에게 안전한 다른 길 알려주기", "친구에게 멈추라고 말하고 어른 부르기", "어른에게 도움을 청해 안전한 길 찾기"),
        "results_by_goal": (
            ("친구가 물웅덩이를 피해서 지나갔어", "아직 물웅덩이를 밟는 친구가 있어", "해봤지만 잘 모르겠어"),
            ("친구가 위험한 곳을 알아차렸어", "아직 위험을 모르는 친구가 있어", "해봤지만 잘 모르겠어"),
            ("어른에게 위험을 알렸어", "어른에게 아직 알리지 못했어", "해봤지만 잘 모르겠어"),
        ),
    },
    {
        "name": "그네를 기다리는 친구들",
        "goals": ("모두 차례를 알 수 있게 하기", "기다리는 시간이 비슷하도록 하기", "다투지 않고 차례를 정하기"),
        "solutions": ("한 번 타고 다음 친구에게 양보하기", "어른과 함께 짧은 시간을 정해 번갈아 타기", "그림으로 차례를 표시하기"),
        "results_by_goal": (
            ("모두 자기 차례를 알았어", "아직 차례를 모르는 친구가 있어", "해봤지만 잘 모르겠어"),
            ("친구들이 비슷하게 기다렸어", "한 친구가 훨씬 오래 기다렸어", "해봤지만 잘 모르겠어"),
            ("다투지 않고 차례를 정했어", "차례 때문에 다투는 일이 있었어", "해봤지만 잘 모르겠어"),
        ),
    },
    {
        "name": "쉬는 자리가 부족한 벤치",
        "goals": ("쉬고 싶은 친구도 앉을 수 있게 하기", "오래 쉬는 친구와 새로 온 친구가 배려하기", "모두가 쉬는 자리를 찾게 하기"),
        "solutions": ("서로 양보할 차례 정하기", "근처의 다른 안전한 벤치 찾아보기", "가족과 역할을 바꾸어 필요한 자리 이야기하기"),
        "results_by_goal": (
            ("쉬고 싶은 친구가 앉을 수 있었어", "아직 앉지 못한 친구가 있어", "해봤지만 잘 모르겠어"),
            ("친구들이 서로 자리를 양보했어", "서로 양보하기 어려웠어", "해봤지만 잘 모르겠어"),
            ("모두 쉴 자리를 찾았어", "아직 쉴 자리가 없는 친구가 있어", "해봤지만 잘 모르겠어"),
        ),
    },
)
WATER_PARTS = (
    ("종이타월", "천수건"),
    ("천수건", "스펀지"),
    ("종이타월", "스펀지"),
)

# The 720×320 coordinate system is fixed, so click zones work on scaled screens.
# Drawing contains no copied source artwork or external assets.
PLAY_SCENE = """
<rect width="720" height="320" rx="22" fill="#d8f1fe"/>
<circle cx="635" cy="60" r="31" fill="#ffdb70"/>
<path d="M0 201 Q180 182 350 204 Q550 175 720 196 V320 H0Z" fill="#a5d985"/>
<path d="M0 275 Q230 223 720 269 V320 H0Z" fill="#e6d4aa"/>
<path d="M58 235 Q120 211 198 245 Q183 278 77 272Z" fill="#75c6ee" stroke="#3b8cbb" stroke-width="4"/>
<path d="M87 251 L97 244 M119 257 L135 250 M159 248 L171 242" stroke="#e3f7ff" stroke-width="5"/>
<g stroke="#64748b" stroke-width="8" stroke-linecap="round" fill="none">
  <path d="M350 215 L392 92 L490 92 L532 215 M392 92 H490"/>
  <path d="M417 102 L414 166 M460 102 L463 166"/>
</g>
<rect x="400" y="163" width="78" height="16" rx="8" fill="#f1a97c"/>
<circle cx="387" cy="222" r="18" fill="#f6bc8a"/>
<path d="M386 240 V275" stroke="#627fc6" stroke-width="17" stroke-linecap="round"/>
<circle cx="447" cy="220" r="18" fill="#e9a77d"/>
<path d="M445 239 V274" stroke="#ef9aa7" stroke-width="17" stroke-linecap="round"/>
<circle cx="498" cy="224" r="17" fill="#d8a06e"/>
<path d="M498 240 V275" stroke="#7caf70" stroke-width="17" stroke-linecap="round"/>
<rect x="562" y="219" width="125" height="15" rx="5" fill="#aa7047"/>
<rect x="569" y="233" width="10" height="40" rx="4" fill="#8d5b3a"/>
<rect x="673" y="233" width="10" height="40" rx="4" fill="#8d5b3a"/>
<circle cx="624" cy="189" r="20" fill="#c28b62"/>
<path d="M624 209 V225" stroke="#edc3b4" stroke-width="18" stroke-linecap="round"/>
<g fill="white" stroke="#246b9c" stroke-width="3">
<circle cx="140" cy="224" r="28" stroke-dasharray="5 5"/>
<circle cx="445" cy="150" r="28" stroke-dasharray="5 5"/>
<circle cx="623" cy="220" r="29" stroke-dasharray="5 5"/>
</g>
<g font-size="19" font-weight="800" text-anchor="middle" fill="#14416f">
<text x="140" y="231">1</text><text x="445" y="157">2</text><text x="623" y="227">3</text>
</g>
"""
WATER_SCENE = """
<rect width="720" height="320" rx="22" fill="#fff0da"/>
<rect x="52" y="62" width="616" height="206" rx="18" fill="#dfae7f" stroke="#b98056" stroke-width="6"/>
<path d="M105 186 Q188 120 310 183 Q293 234 157 235 Q91 226 105 186Z" fill="#7ecbe9" stroke="#3387b1" stroke-width="4"/>
<path d="M153 183 L192 166 M208 208 L252 190" stroke="#f2fcff" stroke-width="8" stroke-linecap="round"/>
<rect x="404" y="80" width="178" height="122" rx="8" fill="#fdfdfd" stroke="#88a8bb" stroke-width="6" transform="rotate(-7 500 140)"/>
<path d="M434 111 L551 111 M431 135 L547 135 M428 159 L544 159" stroke="#b9ccdc" stroke-width="4"/>
<rect x="599" y="124" width="48" height="90" rx="16" fill="#8eb0d4"/>
<rect x="608" y="128" width="30" height="13" rx="5" fill="#b8d9eb"/>
<path d="M647 219 Q661 226 661 242" fill="none" stroke="#5badd1" stroke-width="5"/>
<g fill="white" stroke="#246b9c" stroke-width="3">
<circle cx="210" cy="194" r="30" stroke-dasharray="5 5"/>
<circle cx="505" cy="137" r="30" stroke-dasharray="5 5"/>
<circle cx="629" cy="220" r="30" stroke-dasharray="5 5"/>
</g>
<g font-size="19" font-weight="800" text-anchor="middle" fill="#14416f">
<text x="210" y="201">1</text><text x="505" y="144">2</text><text x="629" y="227">3</text>
</g>
"""

SCENE_DESCRIPTIONS = {
    "playground": "비가 그친 놀이터. 왼쪽 1번은 물웅덩이, 가운데 2번은 그네를 기다리는 친구들, 오른쪽 3번은 비좁은 벤치예요.",
    "water_absorb": "책상 왼쪽 1번에 물이 고였고, 가운데 2번에는 공책이 있고, 오른쪽 3번에는 책상 끝이 있어요.",
}


def scene_content(mission_id: str, selected: int | None = None) -> str:
    if mission_id not in PILOT_IDS:
        raise ValueError("unsupported pilot mission")
    scene = PLAY_SCENE if mission_id == "playground" else WATER_SCENE
    if selected is None:
        return scene
    centers = ((140, 224), (445, 150), (623, 220)) if mission_id == "playground" else (
        (210, 194), (505, 137), (629, 220))
    x, y = centers[selected]
    return scene + f'<circle cx="{x}" cy="{y}" r="39" fill="none" stroke="#e5484d" stroke-width="7"/>'


def scene_hit(mission_id: str, x: float, y: float) -> int | None:
    if mission_id not in PILOT_IDS:
        return None
    centers = ((140, 224), (445, 150), (623, 220)) if mission_id == "playground" else (
        (210, 194), (505, 137), (629, 220))
    for i, (cx, cy) in enumerate(centers):
        if (x - cx) ** 2 + (y - cy) ** 2 <= 48 ** 2:
            return i
    return None


def pilot_stage(mission_id: str, step: int, answers: dict[str, Any]) -> dict[str, Any]:
    """Return text/choices based on the SAME issue, goal, prediction, and observation."""
    if mission_id not in PILOT_IDS or type(step) is not int or step not in range(5):
        raise ValueError("invalid pilot stage")
    for previous in range(step):
        if str(previous) not in answers or type(answers[str(previous)]) is not int:
            raise ValueError("missing previous choice")
    if step and answers.get("_pilot_v") != PILOT_VERSION:
        raise ValueError("legacy progress is not compatible with this lesson")
    if mission_id == "playground":
        if step == 0:
            return {
                "label": "발견", "prompt": "놀이터를 잘 살펴봐. 어디를 먼저 도와주고 싶어?",
                "options": [entry["name"] for entry in PLAY_ISSUES],
                "hint": "그림에 표시된 1, 2, 3번을 보고 어떤 친구가 불편할지 먼저 이야기해 주세요.",
                "context": "한 가지 문제를 고르면 그 문제를 마지막까지 해결해 볼 거예요.",
            }
        issue = PLAY_ISSUES[answers["0"]]
        if step == 1:
            return {
                "label": "문제 정의", "prompt": ("물웅덩이 때문에 친구들이 불편해. 어떻게 되면 좋을까?", "친구들이 그네를 기다리고 있어. 어떻게 되면 좋을까?", "벤치에 자리가 부족해. 어떻게 되면 좋을까?")[answers["0"]],
                "options": list(issue["goals"]),
                "hint": "누가 무엇을 할 수 있게 되면 성공인지 아이의 말로 다시 물어보세요.",
                "context": "",
            }
        goal = issue["goals"][answers["1"]]
        if step == 2:
            return {
                "label": "방법 찾기", "prompt": (
                    ("친구가 물웅덩이를 피하려면 어떻게 도와줄까?", "친구에게 위험한 곳을 어떻게 알려줄까?", "어른에게 위험한 곳을 알리려면 어떻게 할까?"),
                    ("모두 자기 차례를 알려면 어떻게 할까?", "친구들이 비슷한 시간 동안 기다리려면 어떻게 할까?", "다투지 않고 차례를 정하려면 어떻게 할까?"),
                    ("쉬고 싶은 친구가 앉으려면 어떻게 할까?", "친구들이 서로 양보하려면 어떻게 할까?", "모두 쉴 곳을 찾으려면 어떻게 할까?"),
                )[answers["0"]][answers["1"]],
                "options": list(issue["solutions"]),
                "hint": "다른 안전한 방법이 있다면 가족끼리 이야기해도 좋아요.",
                "context": "",
            }
        solution = issue["solutions"][answers["2"]]
        if step == 3:
            return {
                "label": "역할놀이 결과", "prompt": "가족과 함께 해 보자. 해 보니 무슨 일이 있었어?",
                "options": list(issue["results_by_goal"][answers["1"]]),
                "hint": "실제 위험한 놀이터를 고치거나 접근하지 말고, 실내에서 역할을 나눠 이야기해 보세요.",
                "context": "",
                "offline": f"실내에서 가족과 역할을 나눠 '{solution}' 방법을 해 보세요. 처음 정한 목표에 어떤 변화가 있었는지 살펴보세요.",
                "verified_label": "보호자와 역할놀이를 해봤어요. (결과는 우리 가족이 관찰한 내용이에요.)",
            }
        result = issue["results_by_goal"][answers["1"]][answers["3"]]
        if answers["3"] == 0:
            question = "잘 해결된 것 같아! 다음에는 무엇을 해 볼까?"
        elif answers["3"] == 1:
            question = "아직 문제가 남았네. 무엇을 바꿔볼까?"
        else:
            question = "아직 잘 모르겠구나. 다음에는 무엇을 해 볼까?"
        return {
            "label": "다시 생각하기", "prompt": question,
            "options": (
                ["물웅덩이를 피하는 다른 방법도 해 볼래", "친구에게 위험한 곳을 더 쉽게 알려줄래", "어디가 위험한지 다시 살펴볼래"],
                ["차례를 정하는 다른 방법도 해 볼래", "친구에게 그네 타는 약속을 더 쉽게 설명할래", "친구들이 기다리는 모습을 다시 살펴볼래"],
                ["모두 쉴 수 있는 다른 방법도 해 볼래", "친구에게 자리 양보 방법을 더 쉽게 설명할래", "쉬는 자리가 얼마나 있는지 다시 살펴볼래"],
            )[answers["0"]],
            "hint": "성공 기준과 관찰한 사실이 실제로 맞는지 확인하고, 마음에 들지 않으면 다시 시도하게 해주세요.",
            "context": "",
            "reflection": (goal, result),
        }
    # Water absorption: a single, measurable question is held constant.
    if step == 0:
        return {
            "label": "발견", "prompt": "앗, 책상에 물이 쏟아졌네! 어디가 눈에 띄거나 걱정돼?",
            "options": ["책상에 물이 고여 있어", "공책 가까이에 물이 있어", "책상 끝까지 물이 갈 수 있어"],
            "hint": "눈으로 본 사실과 앞으로 일어날 수 있는 일을 구분해 말하게 해 주세요.",
            "context": "",
        }
    if step == 1:
        return {
            "label": "문제 정의", "prompt": "물을 빨리 닦으려면 무엇이 좋을까? 두 가지 재료를 골라 볼래?",
            "options": [f"{first} / {second}" for first, second in WATER_PARTS],
            "hint": "실험 목적은 흡수 속도 비교로 고정합니다. 양·크기·관찰 시작을 같게 해야 해요.",
            "context": ("물이 더 넓게 퍼지기 전에 닦아 보자.", "공책이 젖기 전에 물을 닦아 보자.", "물이 책상 밖으로 흐르기 전에 닦아 보자.")[answers["0"]],
        }
    a, b = WATER_PARTS[answers["1"]]
    # Display actual material names, not undefined A/B labels.
    a_name = "종이 타월" if a == "종이타월" else "수건" if a == "천수건" else a
    b_name = "종이 타월" if b == "종이타월" else "수건" if b == "천수건" else b
    a_subject = a_name + ("가" if a_name == "스펀지" else "이")
    b_subject = b_name + ("가" if b_name == "스펀지" else "이")
    if step == 2:
        return {
            "label": "먼저 예상하기", "prompt": "두 재료에 물을 3방울씩 떨어뜨려 보자. 어느 쪽이 더 빠를 것 같아?",
            "options": [f"{a_subject} 더 빠를 것 같아", f"{b_subject} 더 빠를 것 같아", "둘이 비슷할 것 같아"],
            "hint": "아이가 이유를 설명한 뒤 실험하세요. 예상은 틀려도 괜찮습니다.",
            "context": f"비교 재료: {a}와 {b} · 같은 크기, 같은 물 3방울",
        }
    predicted = (a_name, b_name, "둘이 비슷할 것 같아")[answers["2"]]
    if step == 3:
        return {
            "label": "실험 결과", "prompt": "직접 해 보니 어느 쪽이 물을 더 빨리 빨아들였어?",
            "options": [f"{a_subject} 물을 먼저 빨아들였어", f"{b_subject} 물을 먼저 빨아들였어", "비슷하거나 구별하기 어려웠어"],
            "hint": "같은 크기의 재료 두 개에 같은 양(3방울)을 떨어뜨리고 물이 표면에서 사라질 때까지 관찰합니다. 흐르거나 퍼지면 '구별 어려움'을 고르세요.",
            "context": "",
            "offline": "보호자가 같은 크기 재료와 물을 준비합니다. 3방울씩 같은 높이에서 떨어뜨려 흡수되는 모습을 비교하세요. 전기기구에서 멀리 진행하세요.",
            "verified_label": "보호자와 실제로 물 3방울씩 시험하고 관찰했어요.",
        }
    outcome = (a_name, b_name, "비슷하거나 구별하기 어려웠어")[answers["3"]]
    matched = answers["2"] == answers["3"] and answers["3"] != 2
    if answers["3"] == 2:
        prompt = "어느 쪽이 빠른지 알기 어려웠네. 다음에는 무엇을 해 볼까?"
    elif matched:
        prompt = "생각한 대로 됐네! 다음에는 무엇을 해 볼까?"
    else:
        prompt = "예상과 다른 결과가 나왔어. 무엇을 다시 해볼까?"
    return {
        "label": "다시 생각하기", "prompt": prompt,
        "options": ["같은 크기의 재료에 같은 양의 물을 떨어뜨려 다시 해 볼래", "다른 재료로 바꿔서 비교해 볼래", "어떤 재료에서 물이 흘렀는지 살펴볼래"],
        "hint": "얼마나 빨리 흡수했는지 기록했을 뿐 성적을 매기지 않습니다. 다른 결과도 발견이에요.",
        "context": "",
        "reflection": (predicted, outcome),
    }


def update_choice_highlight(buttons: list[Any], options: list[str], chosen: int) -> None:
    """Show a clear selected rectangle, check mark, and accessible pressed state."""
    if not 0 <= chosen < len(options) or len(buttons) != len(options):
        raise ValueError("invalid choice buttons")
    for index, button in enumerate(buttons):
        if index == chosen:
            button.set_text(f"✓ {options[index]}")
            button.props(add="unelevated color=teal-9 aria-pressed=true", remove="outline")
            button.style(add="border: 3px solid #115e59; border-radius: 12px;")
        else:
            button.set_text(options[index])
            button.props(add="outline color=teal-9 aria-pressed=false", remove="unelevated")
            button.style(add="border: 2px solid #94a3b8; border-radius: 12px;")


def render_pilot(
    mission_id: str,
    progress: dict[str, Any],
    on_save: Callable[[int, int, int, bool, bool], dict[str, Any]],
    on_reload: Callable[[], dict[str, Any]],
    conflict_type: type[Exception],
) -> None:
    """Render isolated pilot UX inside the existing route, without changing other missions."""
    with ui.column().classes("w-full max-w-3xl mx-auto p-4 gap-3"):
        ui.link("← 생각탐험 연구소", "/portal/thinking")
        title = "놀이터 문제 탐정" if mission_id == "playground" else "무엇이 물을 빨리 빨아들일까?"
        ui.label(f"🔎 {title}").classes("text-h4 text-weight-bold")
        ui.label("정답보다 내 생각과 실제 결과가 중요해요. 어른과 함께해요.")
        area = ui.column().classes("w-full gap-3")
        view = {"step": progress["step_index"], "generation": 0}

        def render() -> None:
            view["generation"] += 1
            generation = view["generation"]
            revision = progress["revision"]
            area.clear()
            with area:
                step = view["step"]
                answers = progress["answers"]

                def go_to(target: int) -> None:
                    if view["generation"] == generation:
                        view["step"] = target
                        render()

                if step == 5:
                    ui.label("탐험을 마쳤어요! 🌟").classes("text-h5")
                    ui.label("실제로 관찰한 것과 다음에 바꾸고 싶은 것을 가족에게 이야기해 주세요.")
                    if answers.get("_pilot_v") == PILOT_VERSION:
                        ui.button("처음부터 다시 보기", on_click=lambda: go_to(0))
                        ui.button("이전 단계", on_click=lambda: go_to(4))
                    ui.link("다른 미션", "/portal/thinking")
                    return
                if progress["step_index"] > 0 and answers.get("_pilot_v") != PILOT_VERSION:
                    ui.label("이전 형식으로 진행한 기록이에요. 기록을 지우지 않고 보존했습니다.")
                    ui.label("새 미션 형식에서는 이전 선택을 그대로 해석할 수 없어 여기서 중단해요.")
                    ui.link("다른 미션", "/portal/thinking")
                    return
                reviewing = step < progress["step_index"]
                stage = pilot_stage(mission_id, step, answers)
                ui.label(f"{step + 1}/5 · {stage['label']}").classes("text-subtitle1 text-teal-8")
                ui.linear_progress(value=step / 5).classes("w-full")
                if stage["context"]:
                    ui.label(stage["context"]).classes("text-body2")
                if step == 4:
                    with ui.expansion("처음 생각과 실제 결과 비교").classes("w-full"):
                        before, after = stage["reflection"]
                        ui.label(("처음 목표: " if mission_id == "playground" else "처음 생각: ") + before)
                        ui.label("실제로 본 것: " + after)
                selected = {"index": None}
                if step == 0:
                    def on_scene(e: Any) -> None:
                        idx = scene_hit(mission_id, e.image_x, e.image_y)
                        if idx is None:
                            ui.notify("번호가 표시된 곳을 눌러 보자.")
                        else:
                            choose(idx)
                    picture = ui.interactive_image(
                        size=(720, 320),
                        content=scene_content(mission_id),
                        on_mouse=on_scene,
                        events=["click"],
                        sanitize=False,  # ONLY static trusted artwork, never user-supplied input.
                    ).classes("w-full rounded-xl")
                    ui.label(SCENE_DESCRIPTIONS[mission_id]).classes("text-caption text-grey-7")
                elif mission_id == "playground" and step < 3:
                    ui.interactive_image(
                        size=(720, 320),
                        content=scene_content(mission_id, answers["0"]),
                        sanitize=False,  # Constant SVG; no user-controlled HTML.
                    ).classes("w-full rounded-xl")
                    # The highlighted scene itself carries the selected location.
                performed = None
                if step == 3:
                    with ui.card().classes("w-full bg-amber-1"):
                        ui.label("🏠 직접 해보기").classes("text-weight-bold")
                        ui.label(stage["offline"])
                    performed = ui.checkbox(
                        stage["verified_label"],
                        value=reviewing and bool(answers.get("_activity_confirmed")),
                    )

                ui.label(stage["prompt"]).classes("text-h6 text-weight-medium")
                selection_label = ui.label("그림 번호나 아래 버튼으로 선택해 보세요." if step == 0 else "한 가지를 선택해 보세요.")
                option_buttons: list[Any] = []

                def choose(index: int) -> None:
                    selected["index"] = index
                    selection_label.set_text(f"선택: {stage['options'][index]}")
                    update_choice_highlight(option_buttons, stage["options"], index)
                    if step == 0:
                        picture.set_content(scene_content(mission_id, index))

                for index, label in enumerate(stage["options"]):
                    option_buttons.append(
                        ui.button(label, on_click=lambda i=index: choose(i))
                        .props("outline no-caps color=teal-9 aria-pressed=false")
                        .style("border: 2px solid #94a3b8; border-radius: 12px;")
                        .classes("w-full min-h-14 text-left")
                    )

                if reviewing:
                    choose(answers[str(step)])
                    ui.label("이전 선택을 바꾸고 저장하면 그 뒤의 답을 다시 골라야 해요.").classes("text-caption")


                render_parent_guide(mission_id, step, answers, stage["hint"])

                def advance() -> None:
                    if view["generation"] != generation:
                        return
                    if selected["index"] is None:
                        ui.notify("그림을 살펴보고 하나를 골라 주세요.")
                        return
                    confirmed = bool(performed.value) if performed is not None else False
                    if step == 3 and not confirmed:
                        ui.notify("실제로 해보지 않았다면 다음으로 넘어가지 않아도 괜찮아요.")
                        return
                    try:
                        updated = on_save(step, selected["index"], revision, confirmed, reviewing)
                    except conflict_type:
                        ui.notify("다른 화면에서 이미 진행했어요. 최신 기록으로 갱신할게요.")
                        progress.update(on_reload())
                        view["step"] = progress["step_index"]
                        render()
                        return
                    except (sqlite3.Error, ValueError):
                        ui.notify("저장할 수 없어요. 현재 화면을 유지합니다.")
                        return
                    progress.update(updated)
                    view["step"] = min(step + 1, progress["step_index"])
                    render()

                if step > 0:
                    ui.button("이전 단계", on_click=lambda: go_to(step - 1)).props(
                        "outline no-caps"
                    ).classes("w-full min-h-12")
                ui.button("관찰 기록하고 완료" if step == 4 else "저장하고 다음으로", on_click=advance).classes(
                    "w-full min-h-12 bg-teal text-white"
                )
        render()
