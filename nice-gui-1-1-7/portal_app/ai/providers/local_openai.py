from __future__ import annotations

import json
import socket
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..config import AIConfig
from .base import (
    ProviderProtocolError,
    ProviderResponse,
    ProviderTimeoutError,
    ProviderToolCall,
    ProviderUnavailableError,
)


class LocalOpenAIProvider:
    name = "local"

    def __init__(
        self,
        config: AIConfig,
        *,
        opener: Callable[..., Any] = urlopen,
    ) -> None:
        self._config = config
        self._opener = opener

    def complete(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        payload: dict[str, Any] = {
            "model": self._config.model,
            "messages": messages,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        request = Request(
            self._config.base_url + "/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with self._opener(request, timeout=self._config.timeout_seconds) as response:
                raw = response.read()
        except (TimeoutError, socket.timeout) as exc:
            raise ProviderTimeoutError("AI provider timed out") from exc
        except HTTPError as exc:
            raise ProviderUnavailableError("AI provider returned an HTTP error") from exc
        except URLError as exc:
            if isinstance(exc.reason, (TimeoutError, socket.timeout)):
                raise ProviderTimeoutError("AI provider timed out") from exc
            raise ProviderUnavailableError("AI provider is unavailable") from exc
        except OSError as exc:
            raise ProviderUnavailableError("AI provider is unavailable") from exc

        try:
            data = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ProviderProtocolError("AI provider returned invalid JSON") from exc

        if not isinstance(data, dict):
            raise ProviderProtocolError("AI provider response must be an object")
        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise ProviderProtocolError("AI provider response is missing choices")

        first = choices[0]
        if not isinstance(first, dict) or not isinstance(first.get("message"), dict):
            raise ProviderProtocolError("AI provider response is missing message")
        message = first["message"]

        content = message.get("content")
        if content is not None and not isinstance(content, str):
            raise ProviderProtocolError("AI provider content must be text or null")

        raw_calls = message.get("tool_calls") or []
        if not isinstance(raw_calls, list):
            raise ProviderProtocolError("AI provider tool_calls must be a list")

        parsed_calls: list[ProviderToolCall] = []
        for item in raw_calls:
            if not isinstance(item, dict):
                raise ProviderProtocolError("AI provider tool call must be an object")
            call_id = item.get("id")
            function = item.get("function")
            if not isinstance(call_id, str) or not call_id:
                raise ProviderProtocolError("AI provider tool call id is invalid")
            if not isinstance(function, dict):
                raise ProviderProtocolError("AI provider tool call function is invalid")
            name = function.get("name")
            arguments = function.get("arguments")
            if not isinstance(name, str) or not name:
                raise ProviderProtocolError("AI provider tool call name is invalid")
            if isinstance(arguments, dict):
                arguments = json.dumps(arguments, ensure_ascii=False)
            if not isinstance(arguments, str):
                raise ProviderProtocolError("AI provider tool arguments are invalid")
            parsed_calls.append(
                ProviderToolCall(id=call_id, name=name, arguments=arguments)
            )

        return ProviderResponse(content=content, tool_calls=tuple(parsed_calls))
