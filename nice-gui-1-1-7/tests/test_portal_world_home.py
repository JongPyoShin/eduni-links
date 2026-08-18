from __future__ import annotations

import unittest

from portal_app.world_home import PORTAL_GAME_CARDS


class PortalWorldHomeTests(unittest.TestCase):
    def test_slice_a_preserves_existing_game_targets(self) -> None:
        routes = {card.id: card.route for card in PORTAL_GAME_CARDS}

        self.assertEqual(routes, {
            "jungle": "/jungle",
            "crazy": "eduni://portal/crazyarcade",
            "bubble": "/bubble-shooter",
            "omok": "/omok",
        })

    def test_slice_a_has_four_distinct_card_assets(self) -> None:
        self.assertEqual(len(PORTAL_GAME_CARDS), 4)
        self.assertEqual(len({card.asset for card in PORTAL_GAME_CARDS}), 4)


if __name__ == "__main__":
    unittest.main()
