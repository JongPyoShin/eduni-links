from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

from .config import AIConfig
from .prompts import CHILD_SYSTEM_PROMPT
from .providers import build_provider
from .providers.base import (
    ChatProvider,
    ProviderError,
    ProviderProtocolError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)
from .tools import (
    AIToolError,
    AIToolRegistry,
    DEFAULT_TOOL_REGISTRY,
)


MAX_PROVIDER_ROUNDS = 3
MAX_TOTAL_TOOL_CALLS = 5


class AIServiceError(RuntimeError):
    """Base class for sanitized AI-service failures."""


class AIUnavailableError(AIServiceError):
    """The configured AI provider is disabled or unreachable."""


class AITimeoutError(AIServiceError):
    """The configured AI provider timed out."""


class AIProcessingError(AIServiceError):
    """The AI request could not be completed safely."""


@dataclass(frozen=True)
class AIChatResult:
    answer: str
    provider: str
    tool_calls: int


class AIService:
    def __init__(
        self,
        config: AIConfig,
        *,
        provider: ChatProvider | None = None,
        registry: AIToolRegistry = DEFAULT_TOOL_REGISTRY,
    ) -> None:
        self._config = config
        self._provider = provider if provider is not None else build_provider(config)
        self._registry = registry

    def chat(self, message: str) -> AIChatResult:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": CHILD_SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ]
        tool_definitions = self._registry.provider_definitions()
        tool_call_count = 0

        for round_index in range(MAX_PROVIDER_ROUNDS):
            try:
                response = self._provider.complete(messages, tool_definitions)
            except ProviderTimeoutError as exc:
                raise AITimeoutError("AI provider timed out") from exc
            except ProviderUnavailableError as exc:
                raise AIUnavailableError("AI provider is unavailable") from exc
            except ProviderError as exc:
                raise AIProcessingError("AI provider response failed") from exc

            if response.tool_calls:
                if round_index == MAX_PROVIDER_ROUNDS - 1:
                    raise AIProcessingError("AI tool loop exceeded the round limit")
                if tool_call_count + len(response.tool_calls) > MAX_TOTAL_TOOL_CALLS:
                    raise AIProcessingError("AI tool loop exceeded the call limit")

                assistant_message: dict[str, Any] = {
                    "role": "assistant",
                    "content": response.content,
                    "tool_calls": [
                        {
                            "id": call.id,
                            "type": "function",
                            "function": {
                                "name": call.name,
                                "arguments": call.arguments,
                            },
                        }
                        for call in response.tool_calls
                    ],
                }
                messages.append(assistant_message)

                for call in response.tool_calls:
                    tool_call_count += 1
                    try:
                        arguments = json.loads(call.arguments)
                    except json.JSONDecodeError as exc:
                        raise AIProcessingError("AI tool arguments were malformed") from exc
                    if not isinstance(arguments, dict):
                        raise AIProcessingError("AI tool arguments must be an object")

                    try:
                        tool_result = self._registry.execute(call.name, arguments)
                    except AIToolError as exc:
                        raise AIProcessingError("AI tool request was rejected") from exc
                    except Exception as exc:
                        raise AIProcessingError("AI tool execution failed") from exc

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.id,
                            "name": call.name,
                            "content": json.dumps(
                                {"ok": True, "result": tool_result},
                                ensure_ascii=False,
                            ),
                        }
                    )
                continue

            answer = (response.content or "").strip()
            if not answer:
                raise AIProcessingError("AI provider returned an empty response")
            return AIChatResult(
                answer=answer,
                provider=self._provider.name,
                tool_calls=tool_call_count,
            )

        raise AIProcessingError("AI request did not complete")
