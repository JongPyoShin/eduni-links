from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

APP_ROOT = Path(__file__).resolve().parents[1]
QUESTION_PATH = APP_ROOT / "content" / "questions" / "jungle_questions.json"
BIRD_PATH = APP_ROOT / "content" / "birds" / "jungle_birds.json"
RARITY_WEIGHTS = {
    "common": 68,
    "rare": 26,
    "legendary": 6,
}


def load_jungle_birds(path: Path = BIRD_PATH) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    birds = payload.get("birds")
    if not isinstance(birds, list):
        raise ValueError("jungle_birds.json must contain a birds list")
    enabled: list[dict[str, Any]] = []
    for bird in birds:
        validate_bird(bird)
        if bird["enabled"]:
            enabled.append(dict(bird))
    if not enabled:
        raise ValueError("jungle_birds.json must contain at least one enabled bird")
    return enabled


def validate_bird(bird: dict[str, Any]) -> None:
    required = ("id", "emoji", "name", "rarity", "rarity_label", "stars", "description", "asset_key", "enabled")
    for key in required:
        if key not in bird:
            raise ValueError(f"jungle bird missing {key}")
    for key in ("id", "emoji", "name", "rarity", "rarity_label", "stars", "description", "asset_key"):
        if not isinstance(bird[key], str) or not bird[key]:
            raise ValueError(f"{bird.get('id', 'unknown')}: {key} must be text")
    if bird["rarity"] not in RARITY_WEIGHTS:
        raise ValueError(f"{bird['id']}: unsupported rarity {bird['rarity']}")
    if not isinstance(bird["enabled"], bool):
        raise ValueError(f"{bird['id']}: enabled must be boolean")


BIRDS: tuple[dict[str, Any], ...] = tuple(load_jungle_birds())


def choose_bird(birds: list[dict[str, Any]] | tuple[dict[str, Any], ...] = BIRDS) -> dict[str, Any]:
    if not birds:
        raise ValueError("choose_bird requires at least one bird")
    weights = [RARITY_WEIGHTS[str(bird["rarity"])] for bird in birds]
    return dict(random.choices(list(birds), weights=weights, k=1)[0])


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
