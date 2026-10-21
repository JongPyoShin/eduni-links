from __future__ import annotations

import logging
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

from scripts import companion_bridge_daemon as daemon


class CompanionBridgeDaemonTests(unittest.TestCase):
    def test_run_returns_nonzero_if_logger_cannot_initialize_without_console(self) -> None:
        with (
            patch.object(daemon, "get_logger", side_effect=RuntimeError("LOCALAPPDATA unavailable")),
            patch.object(sys, "stdout", None),
            patch.object(sys, "stderr", None),
        ):
            result = daemon.main(["--run"])

        self.assertEqual(result, 1)

    def test_run_logs_startup_failure_without_console_streams_or_secrets(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            log_path = Path(temp_dir) / "supervisor.log"
            logger = logging.getLogger(f"test.companion.supervisor.{id(self)}")
            logger.handlers.clear()
            logger.setLevel(logging.INFO)
            logger.propagate = False
            handler = logging.FileHandler(log_path, encoding="utf-8")
            logger.addHandler(handler)
            try:
                with (
                    patch.object(daemon, "get_logger", return_value=logger),
                    patch.object(daemon, "load_config", side_effect=RuntimeError("private-key-marker")),
                    patch.object(sys, "stdout", None),
                    patch.object(sys, "stderr", None),
                ):
                    result = daemon.main(["--run", "--config-path", str(Path(temp_dir) / "missing.env")])

                handler.flush()
                logged = log_path.read_text(encoding="utf-8")
                self.assertEqual(result, 2)
                self.assertIn("Companion configuration load failed (RuntimeError).", logged)
                self.assertNotIn("private-key-marker", logged)
            finally:
                logger.removeHandler(handler)
                handler.close()


if __name__ == "__main__":
    unittest.main()
