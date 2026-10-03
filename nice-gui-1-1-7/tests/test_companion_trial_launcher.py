from __future__ import annotations

from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch

from scripts import run_companion_bridge as launcher


class CompanionTrialLauncherTests(unittest.TestCase):
    def test_writes_only_separate_companion_env_and_reuses_key(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            postgres_env = root / ".env"
            postgres_contents = "EDUNI_POSTGRES_PASSWORD=DO_NOT_TOUCH_SENTINEL\n"
            postgres_env.write_text(postgres_contents, encoding="utf-8")
            companion_env = root / ".env.companion"
            generated = "ab" * 32
            origin = "https://portal.example:8443/"
            with patch.object(launcher.secrets, "token_hex", return_value=generated):
                key = launcher.ensure_trial_env(companion_env, origin)
            contents = companion_env.read_text(encoding="utf-8")
            self.assertEqual(generated, key)
            self.assertEqual(postgres_contents, postgres_env.read_text(encoding="utf-8"))
            self.assertIn("EDUNI_AI_COMPANION_ENABLED=1", contents)
            self.assertIn("EDUNI_AI_COMPANION_PROVIDER=bridge", contents)
            self.assertIn("EDUNI_AI_COMPANION_BRIDGE_URL=http://host.docker.internal:8765", contents)
            self.assertIn("EDUNI_AI_COMPANION_ORIGIN=https://portal.example:8443", contents)
            self.assertIn(f"EDUNI_AI_COMPANION_BRIDGE_KEY={generated}", contents)
            self.assertEqual(generated, launcher.ensure_trial_env(companion_env, origin))
            self.assertEqual(contents, companion_env.read_text(encoding="utf-8"))

    def test_duplicate_or_invalid_keys_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env.companion"
            path.write_text(
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "a" * 64 + "\n" +
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "b" * 64 + "\n",
                encoding="utf-8",
            )
            with self.assertRaisesRegex(RuntimeError, "duplicate"):
                launcher.ensure_trial_env(path, "https://portal.example")
            path.write_text("EDUNI_AI_COMPANION_BRIDGE_KEY=short\n", encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "invalid"):
                launcher.ensure_trial_env(path, "https://portal.example")

    def test_origin_must_be_exact_https_origin(self):
        for invalid in ("http://portal.example", "https://u:p@portal.example", "https://portal.example/path",
                        "https://portal.example?x=1", "https://portal.example#fragment", "https:///missing"):
            with self.subTest(invalid=invalid), self.assertRaisesRegex(RuntimeError, "HTTPS"):
                launcher.validate_https_origin(invalid)
        self.assertEqual("https://portal.example:8443", launcher.validate_https_origin("https://portal.example:8443/"))
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(RuntimeError, "explicit"):
                launcher.ensure_trial_env(Path(directory) / ".env.companion")

    def test_refuses_a_busy_loopback_port_without_killing_owner(self):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind((launcher.BRIDGE_HOST, 0))
            listener.listen()
            with self.assertRaisesRegex(RuntimeError, "already in use"):
                launcher.ensure_port_available(listener.getsockname()[1])
            self.assertIsNotNone(listener.getsockname())

    def test_compose_keeps_feature_disabled_by_default_and_loopback_proxy(self):
        compose = (Path(__file__).resolve().parents[2] / "docker-compose.yml").read_text(encoding="utf-8")
        gitignore = (Path(__file__).resolve().parents[2] / ".gitignore").read_text(encoding="utf-8")
        dockerignore = (Path(__file__).resolve().parents[2] / ".dockerignore").read_text(encoding="utf-8")
        self.assertIn("EDUNI_AI_COMPANION_ENABLED: ${EDUNI_AI_COMPANION_ENABLED:-0}", compose)
        self.assertIn("EDUNI_AI_COMPANION_PROVIDER: ${EDUNI_AI_COMPANION_PROVIDER:-disabled}", compose)
        self.assertIn("EDUNI_AI_COMPANION_BRIDGE_URL: ${EDUNI_AI_COMPANION_BRIDGE_URL:-http://host.docker.internal:8765}", compose)
        self.assertIn("EDUNI_AI_COMPANION_ORIGIN: ${EDUNI_AI_COMPANION_ORIGIN:-}", compose)
        self.assertIn('"127.0.0.1:8081:18081"', compose)
        self.assertIn(".env.companion", gitignore)
        self.assertIn(".env.companion", dockerignore)
        self.assertIn(".env", dockerignore)


if __name__ == "__main__":
    unittest.main()
