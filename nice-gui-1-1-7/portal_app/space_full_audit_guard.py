from __future__ import annotations

from fastapi.responses import HTMLResponse

from . import space_routes


_AUDIT_MARKER = (
    "      function makeQuestion(type) {\n"
    "        for (let attempt=0;attempt<40;attempt+=1) {"
)

_AUDIT_GUARDED_MARKER = (
    "      function requireFullQuestionAudit() {\n"
    "        const audit=window.EDUNI_SPACE_FULL_AUDIT;\n"
    "        if (!audit || audit.ok!==true || audit.checked!==470 || audit.total!==470) {\n"
    "          throw new Error('EDUNI question audit did not pass 470/470; gameplay blocked');\n"
    "        }\n"
    "        return audit;\n"
    "      }\n\n"
    "      function makeQuestion(type) {\n"
    "        requireFullQuestionAudit();\n"
    "        for (let attempt=0;attempt<40;attempt+=1) {"
)


def _inject_full_audit_gate(html: str) -> str:
    if "function requireFullQuestionAudit()" in html:
        return html
    if _AUDIT_MARKER not in html:
        raise RuntimeError("EDUNI full audit question-generation marker missing")
    return html.replace(_AUDIT_MARKER, _AUDIT_GUARDED_MARKER, 1)


def install_full_audit_guard() -> None:
    current = space_routes._space_game_html
    if getattr(current, "_eduni_full_audit_guard", False):
        return

    def _space_game_html_with_full_audit_guard() -> HTMLResponse:
        response = current()
        if response.status_code != 200:
            return response
        html = response.body.decode("utf-8")
        return HTMLResponse(_inject_full_audit_gate(html), status_code=response.status_code)

    _space_game_html_with_full_audit_guard._eduni_full_audit_guard = True  # type: ignore[attr-defined]
    space_routes._space_game_html = _space_game_html_with_full_audit_guard
