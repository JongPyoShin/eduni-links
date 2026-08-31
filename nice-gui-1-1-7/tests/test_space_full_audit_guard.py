from __future__ import annotations

import unittest

from portal_app.space_routes import _space_game_html


class SpaceFullAuditGuardTests(unittest.TestCase):
    def test_question_generation_requires_full_470_audit(self) -> None:
        response = _space_game_html()
        self.assertEqual(200, response.status_code)
        html = response.body.decode("utf-8")
        self.assertIn("function requireFullQuestionAudit()", html)
        self.assertIn("audit.ok!==true", html)
        self.assertIn("audit.checked!==470", html)
        self.assertIn("audit.total!==470", html)
        self.assertIn("gameplay blocked", html)
        self.assertIn("requireFullQuestionAudit();", html)

    def test_runtime_audit_loads_before_question_builder(self) -> None:
        html = _space_game_html().body.decode("utf-8")
        audit_script_index = html.index('/space-full-audit.js')
        question_builder_index = html.index('function requireFullQuestionAudit()')
        self.assertLess(audit_script_index, question_builder_index)


if __name__ == "__main__":
    unittest.main()
