from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .registry import DIFFICULTIES, PROCESS_BADGES, WORLD_BY_ID

PRIVACY_BLOCKED_FIELDS = {
    "voice",
    "voice_url",
    "voice_recording",
    "audio_upload",
    "photo",
    "photo_url",
    "camera",
    "geolocation",
    "location",
    "latitude",
    "longitude",
    "analytics",
    "ad_id",
    "advertising",
    "social_share",
    "public_profile",
}

ACTIVITY_FIELDS = {
    "id",
    "world",
    "title",
    "activity_type",
    "difficulty",
    "estimated_minutes",
    "skills",
    "curriculum_tags",
    "prompt",
    "items",
    "hints",
    "process_badges",
    "offline_mission",
    "enabled",
    "version",
}


def find_blocked_privacy_fields(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in PRIVACY_BLOCKED_FIELDS:
                found.add(key)
            found.update(find_blocked_privacy_fields(nested))
    elif isinstance(value, list):
        for item in value:
            found.update(find_blocked_privacy_fields(item))
    return found


try:
    from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

    class Activity(BaseModel):
        model_config = ConfigDict(extra="forbid")

        id: str
        world: str
        title: str
        activity_type: str
        difficulty: str
        estimated_minutes: int = Field(ge=1, le=15)
        skills: list[str] = Field(default_factory=list)
        curriculum_tags: list[str] = Field(default_factory=list)
        prompt: str
        items: list[dict[str, Any]] = Field(default_factory=list)
        hints: list[str] = Field(default_factory=list, max_length=3)
        process_badges: list[str] = Field(default_factory=list)
        offline_mission: str = ""
        enabled: bool = True
        version: int = Field(default=1, ge=1)

        @field_validator("world")
        @classmethod
        def validate_world(cls, value: str) -> str:
            if value not in WORLD_BY_ID:
                raise ValueError(f"unknown world: {value}")
            return value

        @field_validator("difficulty")
        @classmethod
        def validate_difficulty(cls, value: str) -> str:
            if value not in DIFFICULTIES:
                raise ValueError(f"unknown difficulty: {value}")
            return value

        @field_validator("process_badges")
        @classmethod
        def validate_badges(cls, value: list[str]) -> list[str]:
            unknown = sorted(set(value) - PROCESS_BADGES)
            if unknown:
                raise ValueError(f"unknown process badges: {', '.join(unknown)}")
            return value

        @model_validator(mode="before")
        @classmethod
        def reject_private_fields(cls, value: Any) -> Any:
            blocked = sorted(find_blocked_privacy_fields(value))
            if blocked:
                raise ValueError(f"privacy-blocked fields: {', '.join(blocked)}")
            return value

except ImportError:
    @dataclass
    class Activity:
        id: str
        world: str
        title: str
        activity_type: str
        difficulty: str
        estimated_minutes: int
        prompt: str
        skills: list[str] = field(default_factory=list)
        curriculum_tags: list[str] = field(default_factory=list)
        items: list[dict[str, Any]] = field(default_factory=list)
        hints: list[str] = field(default_factory=list)
        process_badges: list[str] = field(default_factory=list)
        offline_mission: str = ""
        enabled: bool = True
        version: int = 1

        def __init__(self, **data: Any) -> None:
            unknown_fields = sorted(set(data) - ACTIVITY_FIELDS)
            if unknown_fields:
                raise ValueError(f"unknown fields: {', '.join(unknown_fields)}")
            blocked = sorted(find_blocked_privacy_fields(data))
            if blocked:
                raise ValueError(f"privacy-blocked fields: {', '.join(blocked)}")
            required = ["id", "world", "title", "activity_type", "difficulty", "estimated_minutes", "prompt"]
            missing = [key for key in required if key not in data]
            if missing:
                raise ValueError(f"missing required fields: {', '.join(missing)}")
            if data["world"] not in WORLD_BY_ID:
                raise ValueError(f"unknown world: {data['world']}")
            if data["difficulty"] not in DIFFICULTIES:
                raise ValueError(f"unknown difficulty: {data['difficulty']}")
            minutes = int(data["estimated_minutes"])
            if minutes < 1 or minutes > 15:
                raise ValueError("estimated_minutes must be 1..15")
            hints = list(data.get("hints", []))
            if len(hints) > 3:
                raise ValueError("hints must contain at most 3 items")
            badges = list(data.get("process_badges", []))
            unknown = sorted(set(badges) - PROCESS_BADGES)
            if unknown:
                raise ValueError(f"unknown process badges: {', '.join(unknown)}")

            self.id = str(data["id"])
            self.world = str(data["world"])
            self.title = str(data["title"])
            self.activity_type = str(data["activity_type"])
            self.difficulty = str(data["difficulty"])
            self.estimated_minutes = minutes
            self.prompt = str(data["prompt"])
            self.skills = list(data.get("skills", []))
            self.curriculum_tags = list(data.get("curriculum_tags", []))
            self.items = list(data.get("items", []))
            self.hints = hints
            self.process_badges = badges
            self.offline_mission = str(data.get("offline_mission", ""))
            self.enabled = bool(data.get("enabled", True))
            self.version = int(data.get("version", 1))
