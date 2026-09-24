from __future__ import annotations

from typing import Any

from fastapi import Body
from fastapi.responses import JSONResponse
from nicegui import app

from .config import AIConfigError, load_ai_config
from .service import (
    AIProcessingError,
    AIService,
    AITimeoutError,
    AIUnavailableError,
)
from .tools import DEFAULT_TOOL_REGISTRY


MAX_CHAT_MESSAGE_LENGTH = 2000


def _error_response(error: str, status_code: int) -> JSONResponse:
    return JSONResponse({"ok": False, "error": error}, status_code=status_code)


@app.get("/ai/health")
def ai_health() -> JSONResponse:
    try:
        config = load_ai_config()
    except AIConfigError:
        return JSONResponse(
            {
                "ok": False,
                "provider": "invalid",
                "configured": False,
                "tools": DEFAULT_TOOL_REGISTRY.names(),
                "error": "invalid_configuration",
            },
            status_code=503,
        )

    return JSONResponse(
        {
            "ok": True,
            "provider": config.provider,
            "configured": config.configured,
            "tools": DEFAULT_TOOL_REGISTRY.names(),
        }
    )


@app.post("/ai/chat")
def ai_chat(payload: Any = Body(default=None)) -> JSONResponse:
    if not isinstance(payload, dict):
        return _error_response("invalid_request", 400)

    if set(payload) != {"message"}:
        return _error_response("invalid_request", 400)

    raw_message = payload.get("message")
    if not isinstance(raw_message, str):
        return _error_response("invalid_request", 400)

    message = raw_message.strip()
    if not message or len(message) > MAX_CHAT_MESSAGE_LENGTH:
        return _error_response("invalid_request", 400)

    try:
        config = load_ai_config()
    except AIConfigError:
        return _error_response("ai_unavailable", 503)

    if config.provider == "disabled":
        return _error_response("ai_unavailable", 503)

    service = AIService(config)
    try:
        result = service.chat(message)
    except AITimeoutError:
        return _error_response("ai_timeout", 504)
    except AIUnavailableError:
        return _error_response("ai_unavailable", 503)
    except AIProcessingError:
        return _error_response("ai_failed", 502)

    return JSONResponse(
        {
            "ok": True,
            "answer": result.answer,
            "provider": result.provider,
            "tool_calls": result.tool_calls,
        }
    )
