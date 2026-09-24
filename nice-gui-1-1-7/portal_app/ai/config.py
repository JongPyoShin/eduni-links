from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import os
from urllib.parse import urlparse


class AIConfigError(ValueError):
    """Raised when EDUNI AI environment configuration is invalid."""


@dataclass(frozen=True)
class AIConfig:
    provider: str
    base_url: str
    model: str
    timeout_seconds: int

    @property
    def configured(self) -> bool:
        return self.provider == "local"


def load_ai_config(environ: Mapping[str, str] | None = None) -> AIConfig:
    env = os.environ if environ is None else environ

    provider = str(env.get("EDUNI_AI_PROVIDER", "disabled") or "disabled").strip().lower()
    if provider not in {"disabled", "local"}:
        raise AIConfigError("EDUNI_AI_PROVIDER must be disabled or local")

    timeout_text = str(env.get("EDUNI_AI_TIMEOUT_SECONDS", "30") or "30").strip()
    try:
        timeout_seconds = int(timeout_text)
    except ValueError as exc:
        raise AIConfigError("EDUNI_AI_TIMEOUT_SECONDS must be an integer") from exc
    if timeout_seconds < 1 or timeout_seconds > 120:
        raise AIConfigError("EDUNI_AI_TIMEOUT_SECONDS must be between 1 and 120")

    base_url = str(env.get("EDUNI_AI_BASE_URL", "") or "").strip().rstrip("/")
    model = str(env.get("EDUNI_AI_MODEL", "") or "").strip()

    if provider == "local":
        if not base_url:
            raise AIConfigError("EDUNI_AI_BASE_URL is required for local provider")
        parsed = urlparse(base_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise AIConfigError("EDUNI_AI_BASE_URL must be an http or https URL")
        if not model:
            raise AIConfigError("EDUNI_AI_MODEL is required for local provider")

    return AIConfig(
        provider=provider,
        base_url=base_url,
        model=model,
        timeout_seconds=timeout_seconds,
    )
