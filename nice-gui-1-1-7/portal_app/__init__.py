"""Phase 0 learning portal foundation."""

from . import space_routes as _space_routes  # noqa: F401
from .space_direction_clarity import install_direction_clarity
from .space_logic_reasoning import install_logic_reasoning

install_direction_clarity()
install_logic_reasoning()
