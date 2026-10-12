"""Keep the existing Windows EDUNI ChatGPT bridge alive after interactive user logon.

This is a host-side supervisor only. It does not run Docker or copy DPAPI secrets.
The task must run as the *same interactive Windows user* who registered ChatGPT.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from scripts import eduni_chatgpt_bridge as bridge
from scripts import run_companion_bridge as trial

PORT = trial.BRIDGE_PORT
HOST = trial.BRIDGE_HOST
APP = trial.APP
ENV_FILE = trial.ENV_FILE
CHECK_INTERVAL = 5
RETRY_SECONDS = 30
KEY_NAME = trial.KEY_NAME
REQUIRED = set(trial.TRIAL_VALUES) | {KEY_NAME, "EDUNI_AI_COMPANION_ORIGIN"}


@dataclass(frozen=True)
class Config:
    key: str
    origin: str


def load_config(path: Path = ENV_FILE) -> Config:
    """Read existing ignored settings without creating or changing any secrets."""
    try:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
    except (OSError, UnicodeError) as exc:
        raise RuntimeError("Companion settings unavailable; run the supervised setup first") from exc
    values: dict[str, str] = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        if name in REQUIRED:
            if name in values:
                raise RuntimeError("Duplicate companion setting")
            values[name] = value.strip()
    if not REQUIRED.issubset(values):
        raise RuntimeError("Companion settings incomplete")
    if any(values[name] != wanted for name, wanted in trial.TRIAL_VALUES.items()):
        raise RuntimeError("Companion settings do not match the running portal")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", values[KEY_NAME]):
        raise RuntimeError("Invalid companion bridge key")
    origin = trial.validate_https_origin(values["EDUNI_AI_COMPANION_ORIGIN"])
    if origin != values["EDUNI_AI_COMPANION_ORIGIN"]:
        raise RuntimeError("Invalid companion origin")
    return Config(values[KEY_NAME], origin)


def health_probe(key: str, *, port: int = PORT, timeout: float = 2) -> bool:
    """A valid-key malformed request must yield the bridge's 400; never invoke GPT."""
    request = Request(
        f"http://{HOST}:{port}/chat",
        data=b"{}",
        headers={"Content-Type": "application/json", "X-EDUNI-Bridge-Key": key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout):
            return False
    except HTTPError as exc:
        try:
            return exc.code == 400 and json.loads(exc.read(256)) == {"error": "invalid_request"}
        except (OSError, UnicodeError, ValueError):
            return False
        finally:
            exc.close()
    except (URLError, TimeoutError, OSError, ValueError):
        return False


def port_available(port: int = PORT) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind((HOST, port))
        return True
    except OSError:
        return False


def registration_path() -> Path:
    local = os.environ.get("LOCALAPPDATA")
    if not local:
        raise RuntimeError("LOCALAPPDATA unavailable; use interactive-user task logon")
    return Path(local) / "EDUNI" / "ChatGPT" / "registration.dpapi"


def registration_ready() -> bool:
    """Verify that the current user's DPAPI context can access registration."""
    path = registration_path()
    if not path.is_file():
        raise RuntimeError("ChatGPT registration not found for this Windows user")
    try:
        bridge.credentials(path)
    except Exception as exc:
        raise RuntimeError(
            "ChatGPT registration could not be opened/refreshed in this user session"
        ) from exc
    return True


@contextmanager
def supervisor_lock():
    """Prevent two supervisors; bridge.py keeps its separate existing worker lock."""
    if os.name != "nt":
        raise RuntimeError("Windows interactive user session required")
    import msvcrt

    path = registration_path().parent / "companion_supervisor.lock"
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as stream:
        stream.seek(0)
        if stream.read(1) == b"":
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        except OSError as exc:
            raise RuntimeError("Another companion supervisor is already running") from exc
        try:
            yield
        finally:
            stream.seek(0)
            msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)


def get_logger() -> logging.Logger:
    directory = registration_path().parent
    directory.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("eduni.companion.supervisor")
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = RotatingFileHandler(
            directory / "companion_supervisor.log",
            maxBytes=512_000, backupCount=3, encoding="utf-8",
        )
        handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
        logger.addHandler(handler)
    return logger


def stop_owned(process: subprocess.Popen | None) -> None:
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def supervise(config: Config, logger: logging.Logger, *, interval: int = CHECK_INTERVAL) -> None:
    """Observe an already-running bridge; otherwise restart only our own worker."""
    owned: subprocess.Popen | None = None
    state = ""
    failures = 0
    retry_after = 0.0

    def log_transition(new: str, message: str) -> None:
        nonlocal state
        if state != new:
            logger.info(message)
            state = new

    try:
        while True:
            healthy = health_probe(config.key)
            if healthy:
                failures = 0
                if owned is None:
                    log_transition("adopted", "Existing authenticated bridge found; monitoring without terminating it.")
                else:
                    log_transition("healthy", "Managed bridge is healthy.")
                time.sleep(interval)
                continue

            if owned is not None and owned.poll() is None:
                failures += 1
                if failures < 3:
                    time.sleep(interval)
                    continue
                logger.warning("Managed bridge failed three authenticated checks; restarting its own process.")
                stop_owned(owned)

            if owned is not None:
                logger.warning("Managed bridge stopped or became unhealthy.")
                owned = None
                retry_after = max(retry_after, time.monotonic() + RETRY_SECONDS)

            if not port_available():
                log_transition("occupied", "Port 8765 is occupied by an unverified listener; refusing to terminate it.")
                time.sleep(interval)
                continue

            if time.monotonic() < retry_after:
                time.sleep(interval)
                continue

            try:
                registration_ready()
            except RuntimeError as exc:
                log_transition("registration", str(exc))
                retry_after = time.monotonic() + RETRY_SECONDS
                time.sleep(interval)
                continue

            env = os.environ.copy()
            env[KEY_NAME] = config.key
            env["EDUNI_AI_COMPANION_BRIDGE_PORT"] = str(PORT)
            try:
                owned = subprocess.Popen(
                    [sys.executable, "-m", "scripts.eduni_chatgpt_bridge"],
                    cwd=APP,
                    env=env,
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
                failures = 0
                log_transition("starting", "Launching existing Windows ChatGPT bridge.")
            except OSError:
                logger.error("Unable to start bridge Python process.")
                retry_after = time.monotonic() + RETRY_SECONDS
            time.sleep(interval)
    finally:
        stop_owned(owned)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="EDUNI Windows companion bridge supervisor")
    operation = parser.add_mutually_exclusive_group(required=True)
    operation.add_argument("--run", action="store_true", help="Run the long-lived supervisor")
    operation.add_argument("--status", action="store_true", help="Test existing bridge without using GPT")
    operation.add_argument("--check-config", action="store_true", help="Validate existing .env.companion")
    operation.add_argument("--check-registration", action="store_true", help="Check current-user DPAPI registration")
    parser.add_argument("--config-path", type=Path, default=ENV_FILE, help="Existing companion settings file")
    args = parser.parse_args(argv)
    try:
        config = load_config(args.config_path)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    if args.check_config:
        print("Companion configuration valid; no secrets displayed.")
        return 0
    if args.check_registration:
        if os.name != "nt":
            print("A Windows interactive registration is required.", file=sys.stderr)
            return 2
        try:
            registration_ready()
        except RuntimeError as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print("Current Windows user can access ChatGPT registration.")
        return 0
    if args.status:
        ok = health_probe(config.key)
        print("Companion bridge healthy." if ok else "Companion bridge unavailable.")
        return 0 if ok else 1
    if os.name != "nt":
        print("The companion supervisor requires the registered Windows user.", file=sys.stderr)
        return 2
    try:
        with supervisor_lock():
            logger = get_logger()
            logger.info("Companion supervisor started for interactive Windows logon.")
            supervise(config, logger)
    except KeyboardInterrupt:
        return 0
    except (RuntimeError, OSError) as exc:
        # Do not log process environment, DPAPI contents, keys, or OAuth response.
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
