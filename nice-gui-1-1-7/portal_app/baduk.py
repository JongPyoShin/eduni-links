from __future__ import annotations

from fastapi.responses import HTMLResponse
from nicegui import app

from . import routes
from .baduk_endgame_safety import integrate_endgame_safety
from .baduk_v2_integration import integrate_v2_coach


EDUNI_BADUK_URL = "/baduk"
_BADUK_CARD_MARKER = "__eduni_baduk_card_injected__"
_BADUK_HTML = "eduni_baduk_v2.html"
_BADUK_COACH_LOGIC_JS = "eduni_baduk_coach_logic.js"
_BADUK_COACH_JS = "eduni_baduk_coach.js"
_BADUK_AI_STRATEGY_JS = "eduni_baduk_ai_strategy.js"
_BADUK_PERSISTENCE_JS = "eduni_baduk_persistence.js"

_AI_SCORE_BLOCK = """          const afterAtari = enemyAtariCount(result.board, WHITE);\n          let score = result.captured * 60;\n          score += Math.max(0, afterAtari - beforeAtari) * 8;\n          score += result.liberties * 1.6;\n          score += neighbors * 2.2;\n          score += (8 - centerDistance) * 0.7;\n          if (row === 0 || row === 8 || col === 0 || col === 8) score -= 2.5;\n          score += Math.random() * 2.2;"""

_AI_SCORE_BLOCK_WITH_COACH = """          const afterAtari = enemyAtariCount(result.board, WHITE);\n          const captureScore = result.captured * 60;\n          const atariScore = Math.max(0, afterAtari - beforeAtari) * 8;\n          const libertiesScore = result.liberties * 1.6;\n          const neighborsScore = neighbors * 2.2;\n          const centerScore = (8 - centerDistance) * 0.7;\n          const edgeScore = (row === 0 || row === 8 || col === 0 || col === 8) ? -2.5 : 0;\n          const jitterScore = Math.random() * 2.2;\n          const score = captureScore + atariScore + libertiesScore + neighborsScore + centerScore + edgeScore + jitterScore;\n          move.aiAnalysis = {\n            total: score,\n            beforeAtari,\n            afterAtari,\n            components: {\n              capture: captureScore,\n              atari: atariScore,\n              liberties: libertiesScore,\n              neighbors: neighborsScore,\n              center: centerScore,\n              edge: edgeScore,\n              jitter: jitterScore,\n            },\n          };"""

_SCHEDULE_AI_BLOCK = """          const move = aiPickMove(board, previousPosition);\n          aiThinking = false;\n          if (!move) {\n            passTurn('ai');\n            return;\n          }\n          playMove(move.row, move.col, WHITE, 'ai');"""

_SCHEDULE_AI_BLOCK_WITH_COACH = """          const coachBeforeBoard = cloneBoard(board);\n          const coachKoState = previousPosition;\n          const move = aiPickMove(board, previousPosition);\n          aiThinking = false;\n          if (!move) {\n            passTurn('ai');\n            return;\n          }\n          const moved = playMove(move.row, move.col, WHITE, 'ai');\n          if (moved && window.EDUNIBadukCoach?.showAiMove) {\n            window.EDUNIBadukCoach.showAiMove(move, {\n              beforeBoard: coachBeforeBoard,\n              afterBoard: cloneBoard(board),\n              koState: coachKoState,\n            });\n          }"""

_POINTER_BLOCK = """      canvas.addEventListener('pointerup', event => {\n        if (gameOver || aiThinking) return;\n        if (mode === 'ai' && currentPlayer === WHITE) return;\n        const point = pointFromEvent(event);\n        if (!point) return;\n        if (playMove(point.row, point.col, currentPlayer) && mode === 'ai' && currentPlayer === WHITE) scheduleAi();\n      });"""

_POINTER_BLOCK_WITH_COACH = """      function coachState() {\n        return {\n          board: cloneBoard(board),\n          currentPlayer,\n          previousPosition,\n          captures: {...captures},\n          moveCount,\n          consecutivePasses,\n          lastMove: lastMove ? {...lastMove} : null,\n          gameOver,\n          aiThinking,\n          mode,\n        };\n      }\n\n      function playHumanMove(row, col) {\n        if (gameOver || aiThinking) return false;\n        if (mode === 'ai' && currentPlayer === WHITE) return false;\n        const coachBeforeBoard = cloneBoard(board);\n        const coachKoState = previousPosition;\n        const color = currentPlayer;\n        const moved = playMove(row, col, color, 'human');\n        if (!moved) return false;\n        if (window.EDUNIBadukCoach?.afterHumanMove) {\n          window.EDUNIBadukCoach.afterHumanMove({\n            beforeBoard: coachBeforeBoard,\n            afterBoard: cloneBoard(board),\n            koState: coachKoState,\n            row,\n            col,\n            color,\n            mode,\n          });\n        }\n        if (mode === 'ai' && currentPlayer === WHITE) scheduleAi();\n        return true;\n      }\n\n      canvas.addEventListener('pointerup', event => {\n        if (gameOver || aiThinking) return;\n        if (mode === 'ai' && currentPlayer === WHITE) return;\n        const point = pointFromEvent(event);\n        if (!point) return;\n        if (window.EDUNIBadukCoach?.isEnabled?.()) {\n          window.EDUNIBadukCoach.previewMove(point, coachState(), window.EDUNIBadukEngine);\n          return;\n        }\n        playHumanMove(point.row, point.col);\n      });"""

_ENGINE_EXPORT_BLOCK = """      window.EDUNIBadukEngine = {\n        SIZE, EMPTY, BLACK, WHITE, KOMI,\n        createBoard, cloneBoard, boardKey, groupAt, tryMove, legalMoves, scoreBoard, aiPickMove,\n      };"""

_ENGINE_EXPORT_BLOCK_WITH_COACH = """      window.EDUNIBadukEngine = {\n        SIZE, EMPTY, BLACK, WHITE, KOMI,\n        createBoard, cloneBoard, boardKey, groupAt, tryMove, legalMoves, scoreBoard, aiPickMove,\n        getState: coachState,\n        playHumanMove,\n      };"""


def _inject_beginner_coach(source: str, logic_script: str, coach_script: str) -> str:
    """Patch small integration hooks into the stable single-file Baduk game.

    The current level-based v2 page is wired by ``integrate_v2_coach``. This
    legacy path remains for the preserved Phase 1 page and fails safe when its
    expected source markers drift.
    """
    replacements = (
        (_AI_SCORE_BLOCK, _AI_SCORE_BLOCK_WITH_COACH),
        (_SCHEDULE_AI_BLOCK, _SCHEDULE_AI_BLOCK_WITH_COACH),
        (_POINTER_BLOCK, _POINTER_BLOCK_WITH_COACH),
        (_ENGINE_EXPORT_BLOCK, _ENGINE_EXPORT_BLOCK_WITH_COACH),
    )
    if not logic_script.strip() or not coach_script.strip() or any(old not in source for old, _ in replacements):
        return source

    patched = source
    for old, new in replacements:
        patched = patched.replace(old, new, 1)

    inline_script = f"\n  <script>\n{logic_script}\n{coach_script}\n  </script>\n"
    if "</body>" not in patched:
        return source
    return patched.replace("</body>", f"{inline_script}</body>", 1)


def _baduk_html_response() -> HTMLResponse:
    game_path = routes.GAME_STATIC_DIR / _BADUK_HTML
    if not game_path.exists():
        return routes._game_html_response(_BADUK_HTML)
    source = game_path.read_text(encoding="utf-8")
    logic_path = routes.GAME_STATIC_DIR / _BADUK_COACH_LOGIC_JS
    coach_path = routes.GAME_STATIC_DIR / _BADUK_COACH_JS
    strategy_path = routes.GAME_STATIC_DIR / _BADUK_AI_STRATEGY_JS
    persistence_path = routes.GAME_STATIC_DIR / _BADUK_PERSISTENCE_JS
    if logic_path.exists():
        logic_script = logic_path.read_text(encoding="utf-8")
        if _BADUK_HTML == "eduni_baduk_v2.html":
            strategy_script = strategy_path.read_text(encoding="utf-8") if strategy_path.exists() else ""
            persistence_script = persistence_path.read_text(encoding="utf-8") if persistence_path.exists() else ""
            source = integrate_v2_coach(source, logic_script, strategy_script, persistence_script)
            source = integrate_endgame_safety(source)
        elif coach_path.exists():
            source = _inject_beginner_coach(
                source,
                logic_script,
                coach_path.read_text(encoding="utf-8"),
            )
    return HTMLResponse(source)


@app.get("/baduk", response_class=HTMLResponse)
@app.get("/baduk/", response_class=HTMLResponse)
def eduni_baduk_game() -> HTMLResponse:
    return _baduk_html_response()


@app.get("/games/eduni-baduk", response_class=HTMLResponse)
@app.get("/games/eduni-baduk/", response_class=HTMLResponse)
def eduni_baduk_redirect() -> HTMLResponse:
    return routes._redirect_html("EDUNI 바둑으로 이동", EDUNI_BADUK_URL)


def install_baduk_portal_card() -> None:
    """Inject the Baduk card immediately after the existing Omok quick-start card."""
    portal_card = routes._portal_card
    if getattr(portal_card, _BADUK_CARD_MARKER, False):
        return

    def portal_card_with_baduk(
        href: str,
        title: str,
        subtitle: str,
        pill: str,
        classes: str = "",
        icon: str | None = None,
        accent: str | None = None,
    ) -> None:
        portal_card(href, title, subtitle, pill, classes, icon=icon, accent=accent)
        if href == routes.EDUNI_OMOK_URL:
            portal_card(
                EDUNI_BADUK_URL,
                "바둑",
                "9×9부터 19×19까지 레벨별로 배우는 실시간 코치 바둑",
                "AI 대국",
                "portal-game-amber",
            )

    setattr(portal_card_with_baduk, _BADUK_CARD_MARKER, True)
    routes._portal_card = portal_card_with_baduk


install_baduk_portal_card()
