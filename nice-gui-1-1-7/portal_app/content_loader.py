from __future__ import annotations

import json
from pathlib import Path

from .pattern_train import validate_activity_content
from .schemas import Activity

APP_ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = APP_ROOT / "content" / "activities"


class ContentValidationError(Exception):
    pass


def activity_from_file(path: Path) -> Activity:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ContentValidationError(f"{path}: invalid JSON: {exc}") from exc

    try:
        activity = Activity(**payload)
        validate_activity_content(activity)
        return activity
    except Exception as exc:
        raise ContentValidationError(f"{path}: {exc}") from exc


def load_activities(root: Path = CONTENT_ROOT) -> list[Activity]:
    activities: list[Activity] = []
    seen: dict[str, Path] = {}
    for path in sorted(root.rglob("*.json")):
        activity = activity_from_file(path)
        if activity.id in seen:
            raise ContentValidationError(f"{path}: duplicate activity id {activity.id} also in {seen[activity.id]}")
        seen[activity.id] = path
        if activity.enabled:
            activities.append(activity)
    return activities
