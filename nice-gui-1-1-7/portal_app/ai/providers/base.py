from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class ProviderError(RuntimeError):
    """Base class for controlled provider failures."""


class ProviderUnavailableError(ProviderError):
    """The configured provider cannot be reached or used."""


class ProviderTimeoutError(ProviderError):
    """The configured provider did not answer within the configured timeout."""


class ProviderProtocolError(ProviderError):
    """The provider returned a malformed OpenAI-compatible response."""


@dataclass(frozen=True)
class ProviderToolCall:
    id: str
    name: str
    arguments: str


@dataclass(frozen=True)
class ProviderResponse:
    content: str | None
    tool_calls: tuple[ProviderToolCall, ...] = ()


class ChatProvider(Protocol):
    name: str

    def complete(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        ...
