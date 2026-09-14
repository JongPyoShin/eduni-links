from pathlib import Path
import unittest


APP_ROOT = Path(__file__).resolve().parents[1]
PORTAL_APP = APP_ROOT / "portal_app"
BADUK_MODULE = PORTAL_APP / "baduk.py"
BADUK_HTML = PORTAL_APP / "static_games" / "eduni_baduk.html"


class BadukGameTests(unittest.TestCase):
    def test_baduk_route_extension_is_registered(self) -> None:
        package_source = (PORTAL_APP / "__init__.py").read_text(encoding="utf-8")
        route_source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("from . import baduk as _baduk", package_source)
        self.assertIn('@app.get("/baduk"', route_source)
        self.assertIn('@app.get("/baduk/"', route_source)
        self.assertIn('EDUNI_BADUK_URL = "/baduk"', route_source)

    def test_baduk_portal_card_is_injected_after_omok(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn("routes.EDUNI_OMOK_URL", source)
        self.assertIn('"바둑"', source)
        self.assertIn('"AI 대국"', source)
        self.assertIn("EDUNI_BADUK_URL", source)

    def test_baduk_static_game_contains_core_engine_and_controls(self) -> None:
        self.assertTrue(BADUK_HTML.exists())
        source = BADUK_HTML.read_text(encoding="utf-8")
        for marker in (
            "EDUNI 바둑",
            "const SIZE = 9",
            "function groupAt",
            "function tryMove",
            "function scoreBoard",
            "function aiPickMove",
            "previousPosition",
            "consecutivePasses",
            "자충수",
            "패 때문에",
            "window.EDUNIBadukEngine",
            'href="/portal"',
        ):
            self.assertIn(marker, source)

    def test_baduk_has_no_external_runtime_dependency(self) -> None:
        source = BADUK_HTML.read_text(encoding="utf-8").lower()
        self.assertNotIn("<script src=", source)
        self.assertNotIn("https://", source)
        self.assertNotIn("http://", source)


if __name__ == "__main__":
    unittest.main()
