from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Callable

from ..reading_journal import search_reading_records


MAX_AI_READING_RESULTS = 10
DEFAULT_AI_READING_RESULTS = 5


class AIToolError(ValueError):
    """Base class for controlled AI tool errors."""


class AIToolNotAllowedError(AIToolError):
    """Raised when a model requests a tool outside the allow-list."""


class AIToolInputError(AIToolError):
    """Raised when a model supplies invalid tool arguments."""


@dataclass(frozen=True)
class AITool:
    name: str
    description: str
    parameters: dict[str, Any]
    handler: Callable[[dict[str, Any]], dict[str, Any]]

    def openai_definition(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


def _optional_date(value: Any, field: str) -> str | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise AIToolInputError(f"{field} must be YYYY-MM-DD")
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise AIToolInputError(f"{field} must be YYYY-MM-DD") from exc


def _reading_search_handler(arguments: dict[str, Any]) -> dict[str, Any]:
    allowed = {"q", "date_from", "date_to", "reading_mode", "rating", "limit"}
    unknown = set(arguments) - allowed
    if unknown:
        raise AIToolInputError("unsupported reading_search argument")

    q = arguments.get("q", "")
    if q is None:
        q = ""
    if not isinstance(q, str):
        raise AIToolInputError("q must be text")
    q = q.strip()
    if len(q) > 200:
        raise AIToolInputError("q is too long")

    date_from = _optional_date(arguments.get("date_from"), "date_from")
    date_to = _optional_date(arguments.get("date_to"), "date_to")
    if date_from and date_to and date_from > date_to:
        raise AIToolInputError("date_from must be on or before date_to")

    reading_mode = arguments.get("reading_mode")
    if reading_mode in (None, ""):
        reading_mode = None
    elif reading_mode not in {"alone", "together", "read_aloud"}:
        raise AIToolInputError("reading_mode is invalid")

    rating = arguments.get("rating")
    if rating is not None:
        if isinstance(rating, bool) or not isinstance(rating, int) or rating < 1 or rating > 5:
            raise AIToolInputError("rating must be between 1 and 5")

    requested_limit = arguments.get("limit", DEFAULT_AI_READING_RESULTS)
    if isinstance(requested_limit, bool) or not isinstance(requested_limit, int):
        raise AIToolInputError("limit must be an integer")
    if requested_limit < 1:
        raise AIToolInputError("limit must be positive")
    limit = min(requested_limit, MAX_AI_READING_RESULTS)

    try:
        records, total = search_reading_records(
            limit=limit,
            offset=0,
            query=q,
            date_from=date_from,
            date_to=date_to,
            reading_mode=reading_mode,
            rating=rating,
            search_parent_note=False,
        )
    except ValueError as exc:
        raise AIToolInputError("reading_search arguments are invalid") from exc

    safe_records = [
        {
            "id": record["id"],
            "title": record["title"],
            "author": record["author"],
            "read_date": record["read_date"],
            "reading_mode": record["reading_mode"],
            "rating": record["rating"],
            "child_comment": record["child_comment"],
            "favorite_part": record["favorite_part"],
        }
        for record in records
    ]
    return {"records": safe_records, "total": total}


READING_SEARCH_TOOL = AITool(
    name="reading_search",
    description=(
        "아이의 저장된 독서기록에서 책 제목, 글쓴이, 아이가 한 말, 기억에 남는 내용을 "
        "읽기 전용으로 찾는다."
    ),
    parameters={
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "q": {"type": "string", "maxLength": 200},
            "date_from": {"type": "string", "format": "date"},
            "date_to": {"type": "string", "format": "date"},
            "reading_mode": {
                "type": "string",
                "enum": ["alone", "together", "read_aloud"],
            },
            "rating": {"type": "integer", "minimum": 1, "maximum": 5},
            "limit": {"type": "integer", "minimum": 1, "maximum": 10},
        },
    },
    handler=_reading_search_handler,
)


class AIToolRegistry:
    def __init__(self, tools: tuple[AITool, ...]) -> None:
        self._tools = {tool.name: tool for tool in tools}

    def names(self) -> list[str]:
        return list(self._tools)

    def provider_definitions(self) -> list[dict[str, Any]]:
        return [tool.openai_definition() for tool in self._tools.values()]

    def execute(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        tool = self._tools.get(name)
        if tool is None:
            raise AIToolNotAllowedError("tool is not allowed")
        return tool.handler(arguments)


DEFAULT_TOOL_REGISTRY = AIToolRegistry((READING_SEARCH_TOOL,))
