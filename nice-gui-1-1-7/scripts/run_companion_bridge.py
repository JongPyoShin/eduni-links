"""Start the loopback-only Windows ChatGPT bridge for a supervised trial."""
from __future__ import annotations

import os
import argparse
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "nice-gui-1-1-7"
ENV_FILE = ROOT / ".env.companion"
BRIDGE_HOST = "127.0.0.1"
BRIDGE_PORT = 8765
BRIDGE_URL = f"http://host.docker.internal:{BRIDGE_PORT}"
KEY_NAME = "EDUNI_AI_COMPANION_BRIDGE_KEY"
TRIAL_VALUES = {
    "EDUNI_AI_COMPANION_ENABLED": "1",
    "EDUNI_AI_COMPANION_PROVIDER": "bridge",
    "EDUNI_AI_COMPANION_BRIDGE_URL": BRIDGE_URL,
}


def validate_https_origin(value: str) -> str:
    value = value.strip()
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as exc:
        raise RuntimeError("A valid HTTPS --origin is required") from exc
    if (parsed.scheme.lower() != "https" or not parsed.hostname or parsed.username or parsed.password
            or parsed.path not in {"", "/"} or parsed.query or parsed.fragment
            or (port is not None and not 1 <= port <= 65535)):
        raise RuntimeError("A valid HTTPS --origin is required")
    return value.rstrip("/")


def _valid_key(value: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-fA-F]{64}", value))


def _write_atomically(path: Path, text: str) -> None:
    fd, temporary = tempfile.mkstemp(prefix=".companion-env-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def ensure_trial_env(path: Path = ENV_FILE, origin: str | None = None) -> str:
    """Create/update only the ignored companion env file; never display its contents."""
    if origin is None:
        raise RuntimeError("An explicit HTTPS --origin is required")
    origin = validate_https_origin(origin)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        original = path.read_text(encoding="utf-8") if path.exists() else ""
    except (OSError, UnicodeError) as exc:
        raise RuntimeError("Companion env file cannot be read") from exc

    lines = original.splitlines()
    found: dict[str, tuple[int, str]] = {}
    for index, line in enumerate(lines):
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name in {*TRIAL_VALUES, KEY_NAME, "EDUNI_AI_COMPANION_ORIGIN"}:
            if name in found:
                raise RuntimeError("Companion env file contains duplicate settings")
            found[name] = (index, value)

    existing_key = found.get(KEY_NAME, (0, ""))[1]
    if existing_key and not _valid_key(existing_key):
        raise RuntimeError("Existing companion bridge key is invalid")
    key = existing_key or secrets.token_hex(32)
    if not _valid_key(key):
        raise RuntimeError("Generated companion bridge key is invalid")

    updates = {**TRIAL_VALUES, "EDUNI_AI_COMPANION_ORIGIN": origin, KEY_NAME: key}
    for name, value in updates.items():
        if name in found:
            lines[found[name][0]] = f"{name}={value}"
        else:
            lines.append(f"{name}={value}")
    text = "\n".join(lines).rstrip("\n") + "\n"
    if text != original:
        _write_atomically(path, text)
    return key


def ensure_env_is_ignored() -> None:
    result = subprocess.run(
        ["git", "check-ignore", "--quiet", "--", ".env.companion"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(".env.companion must be ignored by Git before it can be written")


def ensure_port_available(port: int = BRIDGE_PORT) -> None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.bind((BRIDGE_HOST, port))
    except OSError as exc:
        raise RuntimeError("Loopback bridge port is already in use; no process was stopped") from exc


def wait_until_ready(process: subprocess.Popen, timeout: float = 30) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Bridge exited before readiness; output suppressed")
        try:
            with socket.create_connection((BRIDGE_HOST, BRIDGE_PORT), timeout=0.25):
                return
        except OSError:
            time.sleep(0.2)
    raise RuntimeError("Bridge readiness timed out; output suppressed")


def start_supervised(origin: str) -> None:
    if os.name != "nt":
        raise RuntimeError("The DPAPI companion bridge must run on its Windows credential host")
    ensure_port_available()
    ensure_env_is_ignored()
    key = ensure_trial_env(origin=origin)
    environment = os.environ.copy()
    environment.update(
        EDUNI_AI_COMPANION_BRIDGE_KEY=key,
        EDUNI_AI_COMPANION_BRIDGE_PORT=str(BRIDGE_PORT),
    )
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    bridge = subprocess.Popen(
        [sys.executable, "-m", "scripts.eduni_chatgpt_bridge"],
        cwd=APP,
        env=environment,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=flags,
    )
    try:
        wait_until_ready(bridge)
        print("Supervised bridge ready on loopback 127.0.0.1:8765. Companion env saved in ignored .env.companion.")
        print("Keep this terminal open; Ctrl+C stops only the bridge. Compose is not started by this launcher.")
        while bridge.poll() is None:
            time.sleep(0.5)
        raise RuntimeError("Bridge process stopped; output suppressed")
    finally:
        if bridge.poll() is None:
            bridge.terminate()
            try:
                bridge.wait(timeout=5)
            except subprocess.TimeoutExpired:
                bridge.kill()
                bridge.wait()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the loopback-only bridge for a supervised trial")
    parser.add_argument("--supervised", action="store_true", required=True)
    parser.add_argument("--origin", required=True, help="Exact HTTPS portal origin, e.g. https://portal.example:8443")
    try:
        args = parser.parse_args(argv)
        origin = validate_https_origin(args.origin)
    except (SystemExit, RuntimeError):
        return 2
    try:
        start_supervised(origin)
    except KeyboardInterrupt:
        print("Supervised bridge stopped.")
    except RuntimeError as exc:
        print(str(exc))
        return 1
    except OSError:
        print("The supervised bridge could not start; details suppressed.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
