from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
import ipaddress
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


def _is_local_or_private_host(hostname: str) -> bool:
    host = hostname.strip().lower()
    if host in {"localhost", "host.docker.internal"}:
        return True
    if "." not in host and ":" not in host:
        # Docker/Compose service names such as "eduni-llm".
        return True
    if host.endswith(".local"):
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    return bool(address.is_private or address.is_loopback or address.is_link_local)


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
        if parsed.username or parsed.password:
            raise AIConfigError("EDUNI_AI_BASE_URL must not contain credentials")
        if not parsed.hostname or not _is_local_or_private_host(parsed.hostname):
            raise AIConfigError("EDUNI_AI_BASE_URL must target a local or private host")
        if not model:
            raise AIConfigError("EDUNI_AI_MODEL is required for local provider")

    return AIConfig(
        provider=provider,
        base_url=base_url,
        model=model,
        timeout_seconds=timeout_seconds,
    )
