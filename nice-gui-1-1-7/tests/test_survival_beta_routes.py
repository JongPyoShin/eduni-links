from __future__ import annotations

import unittest
from pathlib import Path

from nicegui import app
from starlette.routing import Match

from portal_app.routes import EDUNI_GAME_PORTAL_URL, EDUNI_SURVIVAL_URL, eduni_survival_game, register_pages


ROOT = Path(__file__).resolve().parents[1]


def route_for(path: str):
    scope = {"type": "http", "method": "GET", "path": path, "headers": []}
    for route in app.routes:
        match, _ = route.matches(scope)
        if match is Match.FULL:
            return route
    return None


class SurvivalBetaRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        register_pages()

    def test_beta_route_and_static_files_are_available(self) -> None:
        self.assertEqual("/survival", EDUNI_SURVIVAL_URL)
        self.assertIsNotNone(route_for("/survival"))
        self.assertIsNotNone(route_for("/survival/"))
        self.assertEqual("/portal/games", EDUNI_GAME_PORTAL_URL)
        self.assertIsNotNone(route_for(EDUNI_GAME_PORTAL_URL))
        self.assertIsNotNone(route_for("/survival-static/logic.js"))
        self.assertIsNotNone(route_for("/survival-static/game.js"))
        self.assertIsNotNone(route_for("/survival-static/render25d.js"))
        self.assertIsNotNone(route_for("/survival-static/worlds.js"))
        self.assertIsNotNone(route_for("/survival-static/worldart25d.js"))

    def test_beta_html_includes_original_child_rules(self) -> None:
        response = eduni_survival_game()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        for expected in (
            'id="livesRange"', 'max="35"', 'min="1"',
            'data-character="explorer"', 'data-character="bunny"',
            'data-dir="up"', 'data-dir="down"',
            '/survival-static/logic.js', '/survival-static/render25d.js',
            '/survival-static/worlds.js', '/survival-static/worldart25d.js', '/survival-static/game.js',
            'viewport-fit=cover',
            'id="miniMapCanvas"', 'id="miniMapPanel"', 'id="miniMapTitle"',
            'hud-extra', '.shell:has(#gameScreen:not([hidden]))',
            '게임 화면의 🗺️ 버튼을 눌러 지도를 펼쳐',
        ):
            with self.subTest(expected=expected):
                self.assertIn(expected, html)

    def test_fullscreen_mobile_hud_and_floating_minimap(self) -> None:
        html = eduni_survival_game().body.decode("utf-8")
        main_canvas = html.index('<canvas id="gameCanvas"')
        main_end = html.index('id="resultOverlay"')
        mini_map = html.index('<canvas id="miniMapCanvas"')
        controls = html.index('<aside class="side"')
        self.assertLess(main_canvas, main_end)
        self.assertLess(main_end, mini_map)
        self.assertLess(mini_map, controls)
        for marker in (
            'body:has(#gameScreen:not([hidden]))',
            'height:100dvh; overflow:hidden;',
            'position:fixed; inset:0; width:100%; height:100dvh;',
            'object-fit:cover; object-position:center center;',
            'id="mobileLives"', 'id="mobileTime"', 'id="mobileGoal"',
            'id="mobileArea"', 'id="mobileStars"', 'id="mobileKey"',
            'id="mobileHide"', 'id="mobileDanger"',
            'mini-map-drawer[open]', 'mini-map-drawer summary',
            'aria-label="미니맵 열기 또는 닫기"',
            'class="portal-icon-link"', 'href="/portal/games"',
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, html)
        self.assertNotIn('href="../survival/?v=7"', html)
        self.assertIn('/survival-static/game.js?v=11', html)

    def test_mobile_camera_fits_without_cover_crop(self) -> None:
        html = eduni_survival_game().body.decode("utf-8")
        script = (ROOT / "portal_app" / "survival_static" / "game.js").read_text(encoding="utf-8")
        world_art = (ROOT / "portal_app" / "survival_static" / "worldart25d.js").read_text(encoding="utf-8")
        for marker in (
            "object-fit:fill", "--control-dock-height:clamp(108px,19dvh,142px)",
            "width:min(156px,42vw)", "height:100dvh; overflow:hidden;",
            "id=\"miniMapPanel\"", "id=\"miniMapCanvas\"",
            "mini-map-drawer .map-legend { display:none; }",
            "/survival-static/game.js?v=11",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, html)
        self.assertNotIn("object-fit:cover", html)
        for marker in (
            "function fitCanvasToStage()", "function visibleViewport()",
            "function cameraForScreen(player)", "canvas.width = viewW",
            "canvas.height = viewH", "visibleViewport().viewH",
            "if (fitCanvasToStage()) state.camera = cameraForScreen(state.player)",
        ):
            with self.subTest(marker=marker):
                self.assertIn(marker, script)
        self.assertIn("camera.viewH||720", world_art)

    def test_webgl_three_dimensional_mode_and_fallback(self) -> None:
        html = eduni_survival_game().body.decode("utf-8")
        script = (ROOT / "portal_app" / "survival_static" / "game.js").read_text(encoding="utf-8")
        engine = (ROOT / "portal_app" / "survival_static" / "survival3d.module.js").read_text(encoding="utf-8")
        for fragment in (
            'id="graphicsToggle"', 'type="module"',
            '/survival-static/survival3d.module.js?v=11',
            'survival-webgl-view',
            '3D ADVENTURE', '2D 기본 화면',
        ):
            with self.subTest(fragment=fragment):
                self.assertIn(fragment, html + engine)
        self.assertIn('window.SurvivalThreeD?.render(state, view)', script)
        self.assertIn("renderer=new THREE.WebGLRenderer", engine)
        self.assertIn("window.SurvivalThreeD=Object.freeze", engine)
        self.assertIn('webglcontextlost', engine)
        self.assertIn('canvas.style.visibility=enabled?', engine)
        self.assertNotIn('new THREE.WebGLRenderer', script, "Renderer must stay isolated from game rules")

    def test_sandboxed_beta_does_not_change_existing_game_routes(self) -> None:
        for path in ("/jungle", "/jungle-3d", "/link", "/omok", "/portal"):
            self.assertIsNotNone(route_for(path), path)
        portal_source = (ROOT / "portal_app" / "routes.py").read_text(encoding="utf-8")
        self.assertIn('_portal_card(EDUNI_SURVIVAL_URL, "마주치지 마! 서바이벌"', portal_source)
        self.assertIn('ui.link("🎮 게임포털", EDUNI_GAME_PORTAL_URL)', portal_source)
        self.assertIn('_portal_card(EDUNI_GAME_PORTAL_URL, "🎮 의준이 게임포털"', portal_source)
        game_hub = (ROOT.parent / "games" / "index.html").read_text(encoding="utf-8")
        landing = (ROOT.parent / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="../survival/?v=11"', game_hub)
        self.assertIn('href="./games/"', landing)
        self.assertNotIn('class="survival" href="./survival/"', landing)
        app_source = (ROOT / "app.py").read_text(encoding="utf-8")
        for game_path in ("@ui.page('/')", "@ui.page('/bubble')", "@ui.page('/bubble-shooter')"):
            self.assertIn(game_path, app_source)


if __name__ == "__main__":
    unittest.main()
