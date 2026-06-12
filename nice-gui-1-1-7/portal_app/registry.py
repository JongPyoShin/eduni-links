from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class World:
    id: str
    title: str
    short_title: str
    skill: str
    description: str
    accent: str
    icon: str


WORLDS: tuple[World, ...] = (
    World("hanja", "한자마을", "한자", "형태, 뜻, 소리 연결", "그림과 글자를 살펴보며 한자의 뜻을 찾아갑니다.", "#e11d48", "漢"),
    World("math", "수학탐험대", "수학", "수 감각, 패턴, 공간", "보석을 나누고 규칙을 발견하는 활동을 준비합니다.", "#7c3aed", "+"),
    World("thinking", "생각숲 연구소", "생각", "관찰, 추론, 분류", "단서를 모아 설명하는 탐정식 활동을 준비합니다.", "#0f766e", "?"),
    World("korean", "말글 공방", "국어", "어휘, 이야기, 읽기", "낱말과 그림 순서를 엮는 언어 활동을 준비합니다.", "#65a30d", "가"),
    World("english", "영어 소리마을", "영어", "듣기, 소리, 그림 연결", "짧은 영어 소리와 그림을 연결하는 활동을 준비합니다.", "#2563eb", "A"),
    World("creative", "창의 작업실", "창의", "조합, 발상, 표현", "새로운 생각을 만들고 설명하는 활동을 준비합니다.", "#f59e0b", "*"),
    World("coding", "로봇 코딩 놀이터", "코딩", "순서, 조건, 디버깅", "명령을 놓고 고쳐 보는 기초 코딩 활동을 준비합니다.", "#0891b2", "{}"),
    World("life", "마음·생활 탐험", "생활", "정서 표현, 습관, 안전", "기분과 선택을 말해 보는 생활 활동을 준비합니다.", "#db2777", "♡"),
)

WORLD_BY_ID = {world.id: world for world in WORLDS}
DIFFICULTIES = {"easy", "normal", "challenge"}
PROCESS_BADGES = {"retry", "explain", "new_method", "careful_observer"}


def get_world(world_id: str) -> World | None:
    return WORLD_BY_ID.get(world_id)

