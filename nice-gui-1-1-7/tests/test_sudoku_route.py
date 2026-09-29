import unittest

from portal_app.routes import eduni_sudoku_game


class SudokuRouteTests(unittest.TestCase):
    def test_sudoku_page_has_game_and_local_core(self):
        response = eduni_sudoku_game()
        self.assertEqual(response.status_code, 200)
        body = response.body.decode("utf-8")
        self.assertIn('id="board"', body)
        self.assertIn("/sudoku-assets/eduni_sudoku_core.js", body)
        self.assertIn("스도쿠 탐험", body)


if __name__ == "__main__":
    unittest.main()
