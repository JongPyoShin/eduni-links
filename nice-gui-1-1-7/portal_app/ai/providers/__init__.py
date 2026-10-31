from __future__ import annotations

from ..config import AIConfig
from .base import ChatProvider
from .disabled import DisabledProvider
from .local_openai import LocalOpenAIProvider


def build_provider(config: AIConfig) -> ChatProvider:
    if config.provider == "disabled":
        return DisabledProvider()
    if config.provider == "local":
        return LocalOpenAIProvider(config)
    raise ValueError("unsupported AI provider")
