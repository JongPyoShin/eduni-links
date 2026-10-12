from __future__ import annotations

from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import logging
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch

from scripts import companion_bridge_daemon as daemon


class CompanionBridgeDaemonTests(unittest.TestCase):
    def test_reads_ignored_companion_settings_and_preserves_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / ".env.companion"
            original = (
                "EDUNI_AI_COMPANION_ENABLED=1\n"
                "EDUNI_AI_COMPANION_PROVIDER=bridge\n"
                "EDUNI_AI_COMPANION_BRIDGE_URL=http://host.docker.internal:8765\n"
                "EDUNI_AI_COMPANION_ORIGIN=https://portal.example:8443\n"
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "a" * 64 + "\n"
            )
            path.write_text(original, encoding="utf-8")
            config = daemon.load_config(path)
            self.assertEqual("a" * 64, config.key)
            self.assertEqual("https://portal.example:8443", config.origin)
            self.assertEqual(original, path.read_text(encoding="utf-8"))

    def test_fail_closed_on_missing_duplicate_invalid_or_disabled_settings(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / ".env.companion"
            with self.assertRaisesRegex(RuntimeError, "unavailable"):
                daemon.load_config(path)
            for text in (
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "a" * 64 + "\n",
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "a" * 64 + "\n" +
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "b" * 64 + "\n",
                "EDUNI_AI_COMPANION_ENABLED=0\n" +
                "EDUNI_AI_COMPANION_PROVIDER=bridge\n" +
                "EDUNI_AI_COMPANION_BRIDGE_URL=http://host.docker.internal:8765\n" +
                "EDUNI_AI_COMPANION_ORIGIN=https://portal.example\n" +
                "EDUNI_AI_COMPANION_BRIDGE_KEY=" + "a" * 64 + "\n",
            ):
                path.write_text(text, encoding="utf-8")
                with self.assertRaises(RuntimeError):
                    daemon.load_config(path)

    def test_authenticated_malformed_probe_does_not_invoke_ai(self):
        class Handler(BaseHTTPRequestHandler):
            calls = 0

            def log_message(self, *args):
                pass

            def do_POST(self):
                Handler.calls += 1
                if self.headers.get("X-EDUNI-Bridge-Key") == "test-secret" and self.path == "/chat" and self.rfile.read(int(self.headers["Content-Length"])) == b"{}":
                    self.send_response(400)
                    body = b'{"error":"invalid_request"}'
                else:
                    self.send_response(403)
                    body = b'{"error":"request_rejected"}'
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        with HTTPServer(("127.0.0.1", 0), Handler) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            try:
                port = server.server_address[1]
                self.assertTrue(daemon.health_probe("test-secret", port=port))
                self.assertFalse(daemon.health_probe("wrong", port=port))
                self.assertEqual(2, Handler.calls)
            finally:
                server.shutdown()
                worker.join(timeout=5)

    def test_registration_uses_current_users_dpapi_file(self):
        with tempfile.TemporaryDirectory() as temp:
            with patch.dict("os.environ", {"LOCALAPPDATA": temp}):
                with self.assertRaisesRegex(RuntimeError, "not found"):
                    daemon.registration_ready()
                file = daemon.registration_path()
                file.parent.mkdir(parents=True)
                file.write_bytes(b"encrypted-placeholder")
                with patch.object(daemon.bridge, "credentials", return_value={"scopes": []}) as mocked:
                    self.assertTrue(daemon.registration_ready())
                    mocked.assert_called_once_with(file)
                with patch.object(daemon.bridge, "credentials", side_effect=ValueError("sensitive")):
                    with self.assertRaisesRegex(RuntimeError, "could not be opened"):
                        daemon.registration_ready()

    def test_existing_bridge_is_observed_not_killed(self):
        class EndLoop(Exception):
            pass

        logger = Mock(spec=logging.Logger)
        with (
            patch.object(daemon, "health_probe", return_value=True),
            patch.object(daemon.time, "sleep", side_effect=EndLoop),
            patch.object(daemon.subprocess, "Popen") as spawned,
            self.assertRaises(EndLoop),
        ):
            daemon.supervise(daemon.Config("a" * 64, "https://portal.example"), logger)
        spawned.assert_not_called()
        logger.info.assert_called_once()

    def test_foreign_port_owner_is_never_terminated(self):
        class EndLoop(Exception):
            pass

        with (
            patch.object(daemon, "health_probe", return_value=False),
            patch.object(daemon, "port_available", return_value=False),
            patch.object(daemon.time, "sleep", side_effect=EndLoop),
            patch.object(daemon.subprocess, "Popen") as spawned,
            self.assertRaises(EndLoop),
        ):
            daemon.supervise(daemon.Config("a" * 64, "https://portal.example"), Mock(spec=logging.Logger))
        spawned.assert_not_called()

    def test_launches_only_existing_bridge_module(self):
        class EndLoop(Exception):
            pass

        child = Mock()
        child.poll.return_value = None
        logger = Mock(spec=logging.Logger)
        with (
            patch.object(daemon, "health_probe", return_value=False),
            patch.object(daemon, "port_available", return_value=True),
            patch.object(daemon, "registration_ready", return_value=True),
            patch.object(daemon.subprocess, "Popen", return_value=child) as spawned,
            patch.object(daemon.time, "sleep", side_effect=EndLoop),
            self.assertRaises(EndLoop),
        ):
            daemon.supervise(daemon.Config("a" * 64, "https://portal.example"), logger)
        self.assertEqual(["-m", "scripts.eduni_chatgpt_bridge"], spawned.call_args.args[0][1:])
        self.assertEqual("a" * 64, spawned.call_args.kwargs["env"][daemon.KEY_NAME])
        child.terminate.assert_called_once()


if __name__ == "__main__":
    unittest.main()
