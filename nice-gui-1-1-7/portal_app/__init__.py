"""Phase 0 learning portal foundation."""

from . import space_routes as _space_routes  # noqa: F401
from .space_direction_clarity import install_direction_clarity
from .space_logic_reasoning import install_logic_reasoning
from .space_quality_guard import install_quality_guard
from .space_full_audit_guard import install_full_audit_guard

install_direction_clarity()
install_logic_reasoning()
install_quality_guard()
install_full_audit_guard()
