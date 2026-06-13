from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parents[1]
QUESTION_PATH = APP_ROOT / "content" / "questions" / "jungle_questions.json"

BIRDS: tuple[dict[str, str], ...] = (
    {"id": "bird.sparrow", "emoji": "🐦", "name": "참새"},
    {"id": "bird.parrot", "emoji": "🦜", "name": "앵무새"},
    {"id": "bird.owl", "emoji": "🦉", "name": "부엉이"},
    {"id": "bird.peacock", "emoji": "🦚", "name": "공작"},
    {"id": "bird.duck", "emoji": "🦆", "name": "오리"},
    {"id": "bird.eagle", "emoji": "🦅", "name": "독수리"},
)


def choose_bird() -> dict[str, str]:
    return dict(random.choice(BIRDS))


def load_jungle_questions(path: Path = QUESTION_PATH) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    questions = payload.get("questions")
    if not isinstance(questions, list):
        raise ValueError("jungle_questions.json must contain a questions list")
    for question in questions:
        validate_question(question)
    return questions


def validate_question(question: dict[str, Any]) -> None:
    required = ("id", "subject", "difficulty", "prompt", "choices", "answer", "hint")
    for key in required:
        if key not in question:
            raise ValueError(f"jungle question missing {key}")
    if not isinstance(question["choices"], list) or len(question["choices"]) != 3:
        raise ValueError(f"{question['id']}: choices must contain exactly 3 options")
    if question["answer"] not in question["choices"]:
        raise ValueError(f"{question['id']}: answer must be one of the choices")


def select_question(
    questions: list[dict[str, Any]],
    bird_id: str,
    recent_by_bird: dict[str, list[str]],
) -> dict[str, Any]:
    recent_ids = set(recent_by_bird.get(bird_id, [])[-4:])
    fresh = [question for question in questions if question["id"] not in recent_ids]
    pool = fresh or questions
    return dict(random.choice(pool))


def remember_question(recent_by_bird: dict[str, list[str]], bird_id: str, question_id: str) -> None:
    history = recent_by_bird.setdefault(bird_id, [])
    history.append(question_id)
    del history[:-8]
