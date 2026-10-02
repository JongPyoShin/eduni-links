from __future__ import annotations

import asyncio
import json
from http.server import HTTPServer
from pathlib import Path
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request as URLRequest, urlopen
from unittest.mock import patch

from starlette.requests import Request

from portal_app.ai import companion
from portal_app.ai.config import AIConfig
from portal_app.ai.providers.base import ProviderError, ProviderResponse, ProviderToolCall, ProviderTimeoutError, ProviderUnavailableError
from scripts import eduni_chatgpt_bridge as bridge


def make_request(body: bytes, *, origin="http://testserver", requested="XMLHttpRequest", content_type="application/json"):
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    headers = [(b"host", b"testserver"), (b"content-type", content_type.encode())]
    if origin is not None:
        headers.append((b"origin", origin.encode()))
    if requested is not None:
        headers.append((b"x-requested-with", requested.encode()))
    scope = {"type": "http", "http_version": "1.1", "method": "POST", "scheme": "http",
             "path": "/ai/companion/chat", "raw_path": b"/ai/companion/chat", "query_string": b"",
             "root_path": "", "headers": headers, "server": ("testserver", 80), "client": ("127.0.0.1", 12345)}
    return Request(scope, receive)


class CompanionValidationTests(unittest.TestCase):
    def test_allowlist_and_bounds(self):
        p, context = companion.validate_companion_payload({"prompt": "힌트", "context": {
            "activity": "sudoku", "question": "현재 보드 ·", "choices": ["1", "2"], "selected": "2행 1열"}})
        self.assertEqual("힌트", p)
        self.assertEqual("sudoku", context["activity"])
        for data in (
            {"prompt": "x", "context": {"parent_note": "private"}},
            {"prompt": "x", "context": {"answer": "hidden"}},
            {"prompt": "x" * 501, "context": {}},
            {"prompt": "x", "context": {"choices": [1]}},
            {"prompt": "x", "context": {"choices": ["x"] * 10}},
        ):
            with self.subTest(data=data), self.assertRaises(ValueError):
                companion.validate_companion_payload(data)

    def test_local_provider_receives_no_tools(self):
        class FakeProvider:
            def complete(self, messages, tools):
                self.messages, self.tools = messages, tools
                return ProviderResponse("한 줄씩 살펴봐!")

        fake = FakeProvider()
        with (patch.dict("os.environ", {"EDUNI_AI_COMPANION_PROVIDER": "local", "EDUNI_AI_PROVIDER": "local",
                                         "EDUNI_AI_BASE_URL": "http://localhost:9999/v1", "EDUNI_AI_MODEL": "fake"}, clear=True),
              patch.object(companion, "load_ai_config", return_value=AIConfig("local", "http://localhost:9999/v1", "fake", 1)),
              patch.object(companion, "build_provider", return_value=fake)):
            status, answer = companion._run_provider("힌트 줘", {"activity": "general", "question": "", "choices": [], "selected": ""}, "test-one")
        self.assertEqual((0, "한 줄씩 살펴봐!"), (status, answer))
        self.assertEqual([], fake.tools)
        self.assertNotIn("reading_search", str(fake.messages))

    def test_local_provider_rejects_tool_calls(self):
        class FakeProvider:
            def complete(self, _messages, _tools):
                return ProviderResponse("answer", (ProviderToolCall("1", "reading_search", "{}"),))
        with (patch.dict("os.environ", {"EDUNI_AI_COMPANION_PROVIDER": "local", "EDUNI_AI_PROVIDER": "local"}, clear=True),
              patch.object(companion, "load_ai_config", return_value=AIConfig("local", "http://localhost", "fake", 1)),
              patch.object(companion, "build_provider", return_value=FakeProvider())):
            with self.assertRaises(ProviderError):
                companion._run_provider("힌트", {"activity": "general", "question": "", "choices": [], "selected": ""}, "tool-test")

    def test_asset_insertion_only_adds_trusted_registered_tags(self):
        page = companion.inject_companion_assets("<html><head></head><body></body></html>")
        self.assertEqual(1, page.count("eduni_companion.css"))
        self.assertEqual(1, page.count("eduni_companion.js"))
        self.assertEqual("<body>api</body>", companion.inject_companion_assets("<body>api</body>"))

    def test_bridge_rejects_public_endpoints_and_uses_caller_key(self):
        payload = {"activity": "general", "question": "", "choices": [], "selected": ""}
        with patch.dict("os.environ", {"EDUNI_AI_COMPANION_BRIDGE_URL": "https://api.example.test", "EDUNI_AI_COMPANION_BRIDGE_KEY": "x" * 40}, clear=False):
            with self.assertRaises(ProviderUnavailableError):
                companion._bridge_answer("hint", payload)
        class FakeResponse:
            def __enter__(self): return self
            def __exit__(self, *_args): return False
            def read(self, _size): return b'{"answer":"fake bridge"}'
        class FakeOpener:
            def open(self, request, timeout):
                self.request, self.timeout = request, timeout
                return FakeResponse()
        opener = FakeOpener()
        with patch.dict("os.environ", {"EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765", "EDUNI_AI_COMPANION_BRIDGE_KEY": "x" * 40}, clear=False), patch.object(companion, "build_opener", return_value=opener):
            self.assertEqual("fake bridge", companion._bridge_answer("hint", payload))
        self.assertEqual("x" * 40, opener.request.get_header("X-eduni-bridge-key"))

    def test_route_disabled_origin_and_oversize(self):
        with patch.dict("os.environ", {}, clear=True):
            response = asyncio.run(companion.companion_chat(make_request(b'{"prompt":"x","context":{}}')))
        self.assertEqual(503, response.status_code)
        payload = json.dumps({"prompt": "힌트", "context": {}}, ensure_ascii=False).encode()
        env = {"EDUNI_AI_COMPANION_ENABLED": "1", "EDUNI_AI_COMPANION_PROVIDER": "disabled"}
        with patch.dict("os.environ", env, clear=True):
            self.assertEqual(403, asyncio.run(companion.companion_chat(make_request(payload, origin="http://evil.test"))).status_code)
            self.assertEqual(400, asyncio.run(companion.companion_chat(make_request(b"x" * 8_001))).status_code)
            self.assertEqual(403, asyncio.run(companion.companion_chat(make_request(payload, requested=None))).status_code)
            self.assertEqual(403, asyncio.run(companion.companion_chat(make_request(payload, origin=None))).status_code)
            self.assertEqual(400, asyncio.run(companion.companion_chat(make_request(payload, content_type="text/plain"))).status_code)

    def test_route_sanitizes_timeout_and_unavailable(self):
        payload = json.dumps({"prompt": "힌트", "context": {}}, ensure_ascii=False).encode()
        env = {"EDUNI_AI_COMPANION_ENABLED": "1"}
        with patch.dict("os.environ", env, clear=True), patch.object(companion, "_run_provider", side_effect=ProviderTimeoutError()):
            self.assertEqual(504, asyncio.run(companion.companion_chat(make_request(payload))).status_code)
        with patch.dict("os.environ", env, clear=True), patch.object(companion, "_run_provider", side_effect=ProviderUnavailableError()):
            self.assertEqual(503, asyncio.run(companion.companion_chat(make_request(payload))).status_code)

    def test_voice_requires_guardian_and_discards_old_recognition(self):
        source = (Path(__file__).resolve().parents[1] / "portal_app" / "static_games" / "eduni_companion.js").read_text(encoding="utf-8")
        voice = source[source.index('panel.querySelector(\'[data-action="voice"]\')'):source.index('window.addEventListener("pagehide"')]
        self.assertLess(voice.index("guardian"), voice.index("new Recognition"))
        self.assertIn("recognition===activeRecognition", voice)
        self.assertIn("token===generation", voice)
        self.assertIn('status.textContent=""; panel.classList.remove("open")', source)


class BridgeContractTests(unittest.TestCase):
    class Stream:
        def __init__(self, events):
            self.lines = iter(events)
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def readline(self, _limit=-1): return next(self.lines, b"")

    def test_fixed_model_store_false_and_completed_required(self):
        events = ['data: {"type":"response.output_text.delta","delta":"힌트를 찾아보자."}\n'.encode(),
                  b'data: {"type":"response.completed"}\n']
        class FakeOpener:
            def open(self, request, timeout):
                self.payload = json.loads(request.data)
                self.authorization = request.get_header("Authorization")
                self.timeout = timeout
                return BridgeContractTests.Stream(events)
        opener = FakeOpener()
        with patch.object(bridge, "_opener", opener):
            result = bridge.complete("힌트 줘", {"activity": "sudoku", "question": "보드 ·", "choices": ["1"], "selected": "빈칸"},
                                     lambda: {"access_token": "test-only"})
        self.assertEqual({"answer": "힌트를 찾아보자."}, result)
        self.assertEqual("gpt-5.6-luna", opener.payload["model"])
        self.assertFalse(opener.payload["store"])
        self.assertTrue(opener.payload["stream"])
        self.assertEqual("Bearer test-only", opener.authorization)

    def test_requires_completed_event_and_bounds_sse(self):
        class FakeOpener:
            def __init__(self, lines): self.lines=lines
            def open(self, *_args, **_kwargs): return BridgeContractTests.Stream(self.lines)
        with patch.object(bridge, "_opener", FakeOpener([b'data: {"type":"response.output_text.delta","delta":"partial"}\n'])):
            with self.assertRaisesRegex(ValueError, "completed"):
                bridge.complete("hint", {"activity":"general"}, lambda: {"access_token":"test-only"})
        oversized = ("data: " + json.dumps({"type": "response.output_text.delta", "delta": "x" * 1201}) + "\n").encode()
        with patch.object(bridge, "_opener", FakeOpener([oversized])):
            with self.assertRaisesRegex(ValueError, "answer limit"):
                bridge.complete("hint", {"activity":"general"}, lambda: {"access_token":"test-only"})
        with patch.object(bridge, "_opener", FakeOpener([b'data: {"type":"response.failed"}\n'])):
            with self.assertRaisesRegex(ValueError, "incomplete"):
                bridge.complete("hint", {"activity":"general"}, lambda: {"access_token":"test-only"})
        with patch.object(bridge, "_opener", FakeOpener([b"x" * 512_001])):
            with self.assertRaisesRegex(ValueError, "response limit"):
                bridge.complete("hint", {"activity":"general"}, lambda: {"access_token":"test-only"})
        with patch.object(bridge, "_opener", FakeOpener([b'data: {"type":"response.output_text.delta","delta":"partial"}\n'])), patch.object(bridge.time, "monotonic", side_effect=[1, 47]):
            with self.assertRaisesRegex(TimeoutError, "deadline"):
                bridge.complete("hint", {"activity":"general"}, lambda: {"access_token":"test-only"})

    def test_redirects_are_not_followed(self):
        handler = bridge._NoRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, "Found", {}, "https://example.test/"))

    def test_bridge_requires_private_caller_key(self):
        key = "test-only-bridge-key-that-is-long-enough-123"
        server = HTTPServer(("127.0.0.1", 0), bridge.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        payload = json.dumps({"prompt": "hint", "context": {"activity": "general"}}).encode()
        try:
            with patch.dict("os.environ", {"EDUNI_AI_COMPANION_BRIDGE_KEY": key}, clear=False), patch.object(bridge, "complete", return_value={"answer": "fake"}):
                endpoint = f"http://127.0.0.1:{server.server_port}/chat"
                accepted = urlopen(URLRequest(endpoint, data=payload, headers={"Content-Type": "application/json", "X-EDUNI-Bridge-Key": key}), timeout=3)
                self.assertEqual(200, accepted.status)
                self.assertEqual({"answer": "fake"}, json.loads(accepted.read()))
                with self.assertRaises(HTTPError) as rejected:
                    urlopen(URLRequest(endpoint, data=payload, headers={"Content-Type": "application/json", "X-EDUNI-Bridge-Key": "wrong"}), timeout=3)
                self.assertEqual(403, rejected.exception.code)
                with patch.object(bridge, "complete", side_effect=TimeoutError()):
                    with self.assertRaises(HTTPError) as timed_out:
                        urlopen(URLRequest(endpoint, data=payload, headers={"Content-Type": "application/json", "X-EDUNI-Bridge-Key": key}), timeout=3)
                    self.assertEqual(504, timed_out.exception.code)
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=1)

    def test_context_does_not_accept_solution_or_private_fields(self):
        with self.assertRaises(ValueError):
            bridge._context_prompt("hint", {"activity": "sudoku", "solution": "secret"})
        with self.assertRaises(ValueError):
            bridge._context_prompt("hint", {"activity": "general", "choices": list(range(10))})


if __name__ == "__main__":
    unittest.main()
