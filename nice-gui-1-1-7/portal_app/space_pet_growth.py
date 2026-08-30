from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


def _replace_once(html: str, old: str, new: str) -> str:
    if old not in html:
        raise RuntimeError(f"EDUNI pet growth marker missing: {old[:80]}")
    return html.replace(old, new, 1)


def _replace_if_present(html: str, old: str, new: str) -> str:
    return html.replace(old, new, 1) if old in html else html


def _inject_pet_growth(html: str) -> str:
    if "{min:0,next:10,label:'1단계 · 꼬물이'}" in html:
        return html

    html = _replace_if_present(
        html,
        "{min:0,next:3,label:'1단계 · 꼬물이'},",
        "{min:0,next:10,label:'1단계 · 꼬물이'},",
    )
    html = _replace_if_present(
        html,
        "{min:3,next:8,label:'2단계 · 아기 펫'},",
        "{min:10,next:30,label:'2단계 · 아기 펫'},",
    )
    html = _replace_if_present(
        html,
        "{min:8,next:15,label:'3단계 · 쑥쑥 크는 펫'},",
        "{min:30,next:60,label:'3단계 · 쑥쑥 크는 펫'},",
    )
    html = _replace_if_present(
        html,
        "{min:15,next:null,label:'4단계 · 멋진 어른 펫'},",
        "{min:60,next:null,label:'4단계 · 멋진 어른 펫'},",
    )
    html = _replace_if_present(html, "if (care>=15) return 3;", "if (care>=60) return 3;")
    html = _replace_if_present(html, "if (care>=8) return 2;", "if (care>=30) return 2;")
    html = _replace_if_present(html, "if (care>=3) return 1;", "if (care>=10) return 1;")

    html = _replace_if_present(
        html,
        "`돌봄 ${pet.care}회 · 최고 성장 단계에 도착했어요!`",
        "`돌봄 경험치 ${pet.care} · 최고 성장 단계에 도착했어요!`",
    )
    html = _replace_if_present(
        html,
        "`돌봄 ${pet.care}회 · 다음 성장까지 ${STAGES[index].next-pet.care}회`",
        "`돌봄 경험치 ${pet.care} · 다음 성장까지 ${STAGES[index].next-pet.care} 경험치`",
    )
    html = _replace_once(
        html,
        "message:'맛있게 먹었어! 🍎 돌봄 +1'",
        "message:'맛있게 먹었어! 🍎 돌봄 경험치 +1'",
    )
    html = _replace_once(
        html,
        "message:'신나게 놀았어! 🎾 돌봄 +2'",
        "message:'신나게 놀았어! 🎾 돌봄 경험치 +2'",
    )

    start_button = '<button id="startBtn" class="primary" type="button">🚀 탐험 시작</button>'
    html = _replace_once(
        html,
        start_button,
        start_button
        + '\n        <p id="petGrowthHint" class="best">🪙 문제를 맞혀 포인트를 모으고, 먹이와 놀이로 나만의 펫을 키워요!</p>',
    )
    return html


def install_pet_growth() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_pet_growth", False):
        return

    def _space_game_html_with_pet_growth() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        html = response.body.decode("utf-8")
        return HTMLResponse(_inject_pet_growth(html), status_code=response.status_code)

    _space_game_html_with_pet_growth._eduni_pet_growth = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_pet_growth
