from pathlib import Path
import unittest

from portal_app.baduk_v2_integration import integrate_v2_coach


APP_ROOT = Path(__file__).resolve().parents[1]
STATIC = APP_ROOT / "portal_app" / "static_games"
BADUK_V2_HTML = STATIC / "eduni_baduk_v2.html"
BADUK_COACH_LOGIC = STATIC / "eduni_baduk_coach_logic.js"
BADUK_AI_STRATEGY = STATIC / "eduni_baduk_ai_strategy.js"
BADUK_PERSISTENCE = STATIC / "eduni_baduk_persistence.js"
BADUK_MODULE = APP_ROOT / "portal_app" / "baduk.py"


class BadukPersistenceIntegrationTests(unittest.TestCase):
    def _served_source(self) -> str:
        return integrate_v2_coach(
            BADUK_V2_HTML.read_text(encoding="utf-8"),
            BADUK_COACH_LOGIC.read_text(encoding="utf-8"),
            BADUK_AI_STRATEGY.read_text(encoding="utf-8"),
            BADUK_PERSISTENCE.read_text(encoding="utf-8"),
        )

    def test_runtime_injects_persistence_helper(self) -> None:
        served = self._served_source()
        self.assertIn("EDUNIBadukPersistence", served)
        self.assertIn("eduni.baduk.v1", served)

    def test_persistence_clears_on_reset_game(self) -> None:
        served = self._served_source()
        self.assertIn("EDUNIBadukPersistence.clear()", served)

    def test_persistence_save_game_on_engine(self) -> None:
        served = self._served_source()
        self.assertIn("saveGame", served)
        self.assertIn("EDUNIBadukPersistence.save(", served)

    def test_persistence_restore_block_injected(self) -> None:
        served = self._served_source()
        self.assertIn("_eduniRestore", served)

    def test_baduk_route_loads_persistence_asset(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn('_BADUK_PERSISTENCE_JS = "eduni_baduk_persistence.js"', source)
        self.assertIn("persistence_path", source)
        self.assertIn("persistence_script", source)

    def test_4arg_integrate_v2_coach_signature(self) -> None:
        source = BADUK_MODULE.read_text(encoding="utf-8")
        self.assertIn(
            "integrate_v2_coach(source, logic_script, strategy_script, persistence_script)",
            source,
        )


if __name__ == "__main__":
    unittest.main()
