from __future__ import annotations

import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = REPO_ROOT / "nice-gui-1-1-7"

RUNTIME_FILES = (
    REPO_ROOT / "docker-compose.yml",
    APP_ROOT / "Dockerfile",
    APP_ROOT / "app.py",
    APP_ROOT / "scripts" / "start_eduni_services.ps1",
    APP_ROOT / "scripts" / "watch_eduni_services.ps1",
    REPO_ROOT / "portal" / "config" / "links.json",
    REPO_ROOT / "db" / "index.html",
    REPO_ROOT / "files-mentioned-by-the-user-oracle" / "app.py",
    REPO_ROOT / "files-mentioned-by-the-user-oracle" / "start_external_access.ps1",
)

EXACT_8080 = re.compile(r"(?<!\d)8080(?!\d)")


class PortConfigurationTests(unittest.TestCase):
    def test_runtime_configuration_does_not_use_port_8080(self) -> None:
        offenders: list[str] = []
        for path in RUNTIME_FILES:
            text = path.read_text(encoding="utf-8-sig")
            if EXACT_8080.search(text):
                offenders.append(str(path.relative_to(REPO_ROOT)))
        self.assertEqual([], offenders, f"runtime files still use port 8080: {offenders}")

    def test_db_hanja_uses_18080(self) -> None:
        oracle_app = (
            REPO_ROOT / "files-mentioned-by-the-user-oracle" / "app.py"
        ).read_text(encoding="utf-8-sig")
        start_script = (
            APP_ROOT / "scripts" / "start_eduni_services.ps1"
        ).read_text(encoding="utf-8-sig")
        watch_script = (
            APP_ROOT / "scripts" / "watch_eduni_services.ps1"
        ).read_text(encoding="utf-8-sig")

        self.assertIn("port=18080", oracle_app)
        self.assertIn("Stop-PortOwner 18080", start_script)
        self.assertIn("http://127.0.0.1:18080/hanja", start_script)
        self.assertIn("http://127.0.0.1:18080/hanja", watch_script)

    def test_eduni_external_8081_and_internal_18081_are_explicit(self) -> None:
        compose = (REPO_ROOT / "docker-compose.yml").read_text(encoding="utf-8")
        dockerfile = (APP_ROOT / "Dockerfile").read_text(encoding="utf-8")
        app_source = (APP_ROOT / "app.py").read_text(encoding="utf-8")

        self.assertIn("PORT: 18081", compose)
        self.assertIn('"100.75.214.95:8081:18081"', compose)
        self.assertIn("http://127.0.0.1:18081/healthz", compose)
        self.assertIn("PORT=18081", dockerfile)
        self.assertIn("EXPOSE 18081", dockerfile)
        self.assertIn("os.environ.get('PORT', '18081')", app_source)

    def test_static_db_links_use_18080(self) -> None:
        links = (REPO_ROOT / "portal" / "config" / "links.json").read_text(
            encoding="utf-8"
        )
        redirect = (REPO_ROOT / "db" / "index.html").read_text(encoding="utf-8")
        self.assertIn("http://100.75.214.95:18080/", links)
        self.assertIn("http://100.75.214.95:18080/hanja", links)
        self.assertIn("http://100.75.214.95:18080", redirect)


if __name__ == "__main__":
    unittest.main()
