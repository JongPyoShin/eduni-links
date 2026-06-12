from __future__ import annotations

from .registry import WORLDS, World


def today_world() -> World:
    return WORLDS[0]

