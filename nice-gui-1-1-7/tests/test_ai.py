from __future__ import annotations

import json
import socket
import unittest
from unittest.mock import patch
from urllib.error import URLError

from portal_app.ai.config import AIConfig, AIConfigError, load_ai_config
from portal_app.ai.providers.base import (
    ProviderProtocolError,
    ProviderResponse,
    ProviderTimeoutError,
    ProviderToolCall,
    ProviderUnavailableError,
)
from portal_app.ai.providers.local_openai import LocalOpenAIProvider
from portal_app.ai.routes import ai_chat, ai_health
from portal_app.ai.service import (
    AIChatResult,
    AIProcessingError,
    AIService,
)
from portal_app.ai.tools import (
    AITool,
    AIToolInputError,
    AIToolNotAllowedError,
    AIToolRegistry,
    DEFAULT_TOOL_REGISTRY,
)


def response_json(response) -> dict:
    return json.loads(response.body.decode("utf-8"))


class FakeHttpResponse:
    def __init__(self, payload: object, *, raw: bytes | None = None) -> None:
        self._raw = raw if raw is not None else json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def read(self) -> bytes:
        return self._raw


class SequenceProvider:
    name = "local"

    def __init__(self, responses: list[ProviderResponse]) -> None:
        self.responses = list(responses)
        self.calls: list[tuple[list[dict], list[dict]]] = []

    def complete(self, messages: list[dict], tools: list[dict]) -> ProviderResponse:
        self.calls.append((list(messages), list(tools)))
        if not self.responses:
            raise AssertionError("fake provider ran out of responses")
        return self.responses.pop(0)


class AIConfigTests(unittest.TestCase):
    def test_default_is_disabled(self) -> None:
        config = load_ai_config({})
        self.assertEqual("disabled", config.provider)
        self.assertFalse(config.configured)
        self.assertEqual(30, config.timeout_seconds)

    def test_invalid_provider_is_rejected(self) -> None:
        with self.assertRaises(AIConfigError):
            load_ai_config({"EDUNI_AI_PROVIDER": "cloud"})

    def test_local_requires_base_url_and_model(self) -> None:
        with self.assertRaises(AIConfigError):
            load_ai_config({"EDUNI_AI_PROVIDER": "local", "EDUNI_AI_MODEL": "model"})
        with self.assertRaises(AIConfigError):
            load_ai_config(
                {
                    "EDUNI_AI_PROVIDER": "local",
                    "EDUNI_AI_BASE_URL": "http://eduni-llm:8080/v1",
                }
            )
        with self.assertRaises(AIConfigError):
            load_ai_config(
                {
                    "EDUNI_AI_PROVIDER": "local",
                    "EDUNI_AI_BASE_URL": "file:///tmp/model",
                    "EDUNI_AI_MODEL": "model",
                }
            )

    def test_timeout_bounds_are_validated(self) -> None:
        for value in ("0", "121", "not-a-number"):
            with self.subTest(value=value), self.assertRaises(AIConfigError):
                load_ai_config({"EDUNI_AI_TIMEOUT_SECONDS": value})


class AIHealthAndRouteTests(unittest.TestCase):
    def test_disabled_health_is_non_sensitive(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            response = ai_health()
        self.assertEqual(200, response.status_code)
        body = response_json(response)
        self.assertEqual(
            {
                "ok": True,
                "provider": "disabled",
                "configured": False,
                "tools": ["reading_search"],
            },
            body,
        )

    def test_local_health_does_not_expose_base_url_or_model(self) -> None:
        env = {
            "EDUNI_AI_PROVIDER": "local",
            "EDUNI_AI_BASE_URL": "http://secret-host:9999/v1",
            "EDUNI_AI_MODEL": "secret-model",
        }
        with patch.dict("os.environ", env, clear=True):
            response = ai_health()
        self.assertEqual(200, response.status_code)
        body = response_json(response)
        self.assertEqual("local", body["provider"])
        self.assertTrue(body["configured"])
        serialized = json.dumps(body)
        self.assertNotIn("secret-host", serialized)
        self.assertNotIn("secret-model", serialized)

    def test_chat_validation_rejects_empty_long_and_override_payloads(self) -> None:
        self.assertEqual(400, ai_chat(None).status_code)
        self.assertEqual(400, ai_chat({"message": "   "}).status_code)
        self.assertEqual(400, ai_chat({"message": "x" * 2001}).status_code)
        for key in ("provider", "model", "tools", "system_prompt", "base_url", "child_profile_id"):
            with self.subTest(key=key):
                response = ai_chat({"message": "안녕", key: "override"})
                self.assertEqual(400, response.status_code)
                self.assertEqual("invalid_request", response_json(response)["error"])

    def test_disabled_chat_returns_structured_503(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            response = ai_chat({"message": "안녕"})
        self.assertEqual(503, response.status_code)
        self.assertEqual({"ok": False, "error": "ai_unavailable"}, response_json(response))

    def test_route_hides_internal_service_error_details(self) -> None:
        env = {
            "EDUNI_AI_PROVIDER": "local",
            "EDUNI_AI_BASE_URL": "http://secret-host:9999/v1",
            "EDUNI_AI_MODEL": "secret-model",
        }
        with (
            patch.dict("os.environ", env, clear=True),
            patch("portal_app.ai.routes.AIService") as service_cls,
        ):
            service_cls.return_value.chat.side_effect = AIProcessingError(
                "secret-host traceback details"
            )
            response = ai_chat({"message": "안녕"})
        self.assertEqual(502, response.status_code)
        body = response_json(response)
        self.assertEqual({"ok": False, "error": "ai_failed"}, body)
        self.assertNotIn("secret-host", response.body.decode("utf-8"))

    def test_success_response_is_minimal(self) -> None:
        env = {
            "EDUNI_AI_PROVIDER": "local",
            "EDUNI_AI_BASE_URL": "http://eduni-llm:8080/v1",
            "EDUNI_AI_MODEL": "local-model",
        }
        with (
            patch.dict("os.environ", env, clear=True),
            patch("portal_app.ai.routes.AIService") as service_cls,
        ):
            service_cls.return_value.chat.return_value = AIChatResult(
                answer="안녕! 무엇을 같이 알아볼까?",
                provider="local",
                tool_calls=0,
            )
            response = ai_chat({"message": "안녕"})
        self.assertEqual(200, response.status_code)
        self.assertEqual(
            {
                "ok": True,
                "answer": "안녕! 무엇을 같이 알아볼까?",
                "provider": "local",
                "tool_calls": 0,
            },
            response_json(response),
        )


class AIToolTests(unittest.TestCase):
    def test_phase_one_exposes_exactly_reading_search(self) -> None:
        self.assertEqual(["reading_search"], DEFAULT_TOOL_REGISTRY.names())

    def test_unknown_tool_is_rejected(self) -> None:
        with self.assertRaises(AIToolNotAllowedError):
            DEFAULT_TOOL_REGISTRY.execute("delete_reading_record", {})

    def test_reading_search_caps_limit_and_sanitizes_parent_data(self) -> None:
        record = {
            "id": 7,
            "title": "달빛 고양이",
            "author": "밤출판",
            "read_date": "2026-09-01",
            "reading_mode": "together",
            "rating": 4,
            "child_comment": "고양이가 귀여워",
            "favorite_part": "달을 보는 장면",
            "parent_note": "아이에게 보여주지 않을 부모 메모",
            "cover_filename": "secret.png",
            "created_at": "2026-09-01T00:00:00+00:00",
        }
        with patch(
            "portal_app.ai.tools.search_reading_records",
            return_value=([record], 1),
        ) as search:
            result = DEFAULT_TOOL_REGISTRY.execute(
                "reading_search",
                {"q": "고양이", "limit": 999},
            )

        kwargs = search.call_args.kwargs
        self.assertEqual(10, kwargs["limit"])
        self.assertEqual(0, kwargs["offset"])
        self.assertFalse(kwargs["search_parent_note"])
        self.assertNotIn("child_profile_id", kwargs)
        self.assertEqual(1, result["total"])
        safe = result["records"][0]
        self.assertNotIn("parent_note", safe)
        self.assertNotIn("cover_filename", safe)
        self.assertNotIn("created_at", safe)

    def test_reading_search_rejects_child_profile_and_invalid_arguments(self) -> None:
        with self.assertRaises(AIToolInputError):
            DEFAULT_TOOL_REGISTRY.execute(
                "reading_search",
                {"child_profile_id": 999},
            )
        with self.assertRaises(AIToolInputError):
            DEFAULT_TOOL_REGISTRY.execute("reading_search", {"rating": 6})
        with self.assertRaises(AIToolInputError):
            DEFAULT_TOOL_REGISTRY.execute("reading_search", {"limit": 0})
        with self.assertRaises(AIToolInputError):
            DEFAULT_TOOL_REGISTRY.execute(
                "reading_search",
                {"date_from": "2026-09-30", "date_to": "2026-09-01"},
            )


class LocalProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = AIConfig(
            provider="local",
            base_url="http://eduni-llm:8080/v1",
            model="local-model",
            timeout_seconds=7,
        )

    def test_parses_normal_assistant_response_and_request_contract(self) -> None:
        captured: dict = {}

        def opener(request, timeout):
            captured["url"] = request.full_url
            captured["timeout"] = timeout
            captured["body"] = json.loads(request.data.decode("utf-8"))
            return FakeHttpResponse(
                {"choices": [{"message": {"content": "안녕!", "tool_calls": []}}]}
            )

        provider = LocalOpenAIProvider(self.config, opener=opener)
        result = provider.complete(
            [{"role": "user", "content": "안녕"}],
            [{"type": "function", "function": {"name": "reading_search"}}],
        )
        self.assertEqual("안녕!", result.content)
        self.assertEqual((), result.tool_calls)
        self.assertEqual(
            "http://eduni-llm:8080/v1/chat/completions",
            captured["url"],
        )
        self.assertEqual(7, captured["timeout"])
        self.assertEqual("local-model", captured["body"]["model"])
        self.assertEqual("auto", captured["body"]["tool_choice"])

    def test_parses_null_content_tool_call(self) -> None:
        payload = {
            "choices": [
                {
                    "message": {
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call-1",
                                "type": "function",
                                "function": {
                                    "name": "reading_search",
                                    "arguments": '{"q":"고양이"}',
                                },
                            }
                        ],
                    }
                }
            ]
        }
        provider = LocalOpenAIProvider(
            self.config,
            opener=lambda request, timeout: FakeHttpResponse(payload),
        )
        result = provider.complete([], [])
        self.assertIsNone(result.content)
        self.assertEqual("reading_search", result.tool_calls[0].name)

    def test_malformed_provider_response_is_controlled(self) -> None:
        for raw, payload in (
            (b"not-json", {}),
            (None, {}),
        ):
            with self.subTest(raw=raw):
                provider = LocalOpenAIProvider(
                    self.config,
                    opener=lambda request, timeout, raw=raw, payload=payload: FakeHttpResponse(
                        payload, raw=raw
                    ),
                )
                with self.assertRaises(ProviderProtocolError):
                    provider.complete([], [])

    def test_connection_and_timeout_are_controlled(self) -> None:
        def unavailable(request, timeout):
            raise URLError("connection refused")

        with self.assertRaises(ProviderUnavailableError):
            LocalOpenAIProvider(self.config, opener=unavailable).complete([], [])

        def timeout(request, timeout):
            raise socket.timeout()

        with self.assertRaises(ProviderTimeoutError):
            LocalOpenAIProvider(self.config, opener=timeout).complete([], [])


class AIServiceLoopTests(unittest.TestCase):
    def _registry(self, calls: list[dict]) -> AIToolRegistry:
        def handler(arguments: dict) -> dict:
            calls.append(arguments)
            return {"records": [{"title": "달빛 고양이"}], "total": 1}

        return AIToolRegistry(
            (
                AITool(
                    name="reading_search",
                    description="test",
                    parameters={"type": "object"},
                    handler=handler,
                ),
            )
        )

    def test_tool_call_then_final_answer(self) -> None:
        tool_calls: list[dict] = []
        provider = SequenceProvider(
            [
                ProviderResponse(
                    content=None,
                    tool_calls=(
                        ProviderToolCall(
                            id="call-1",
                            name="reading_search",
                            arguments='{"q":"고양이"}',
                        ),
                    ),
                ),
                ProviderResponse(content="응. 달빛 고양이 기록이 있어."),
            ]
        )
        service = AIService(
            AIConfig("local", "http://unused/v1", "fake", 30),
            provider=provider,
            registry=self._registry(tool_calls),
        )
        result = service.chat("고양이 책 읽었어?")
        self.assertEqual("응. 달빛 고양이 기록이 있어.", result.answer)
        self.assertEqual(1, result.tool_calls)
        self.assertEqual([{"q": "고양이"}], tool_calls)
        second_messages = provider.calls[1][0]
        self.assertEqual("tool", second_messages[-1]["role"])
        self.assertIn("달빛 고양이", second_messages[-1]["content"])

    def test_unknown_tool_and_malformed_arguments_fail_safely(self) -> None:
        registry = self._registry([])
        for call in (
            ProviderToolCall("call-1", "delete_record", "{}"),
            ProviderToolCall("call-2", "reading_search", "not-json"),
        ):
            with self.subTest(call=call.name):
                provider = SequenceProvider(
                    [ProviderResponse(content=None, tool_calls=(call,))]
                )
                service = AIService(
                    AIConfig("local", "http://unused/v1", "fake", 30),
                    provider=provider,
                    registry=registry,
                )
                with self.assertRaises(AIProcessingError):
                    service.chat("테스트")

    def test_tool_call_bound_is_enforced(self) -> None:
        calls = tuple(
            ProviderToolCall(
                id=f"call-{index}",
                name="reading_search",
                arguments="{}",
            )
            for index in range(6)
        )
        service = AIService(
            AIConfig("local", "http://unused/v1", "fake", 30),
            provider=SequenceProvider(
                [ProviderResponse(content=None, tool_calls=calls)]
            ),
            registry=self._registry([]),
        )
        with self.assertRaises(AIProcessingError):
            service.chat("테스트")


if __name__ == "__main__":
    unittest.main()
