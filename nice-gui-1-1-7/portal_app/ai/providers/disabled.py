from __future__ import annotations

from typing import Any

from .base import ProviderResponse, ProviderUnavailableError


class DisabledProvider:
    name = "disabled"

    def complete(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
    ) -> ProviderResponse:
        raise ProviderUnavailableError("AI provider is disabled")
