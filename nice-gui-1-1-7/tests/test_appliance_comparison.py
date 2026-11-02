from __future__ import annotations

import importlib.util
import json
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from portal_app.ai import companion

APP_ROOT = Path(__file__).resolve().parents[1]
BRIDGE_PATH = APP_ROOT / "scripts" / "eduni_chatgpt_bridge.py"
BRIDGE_SPEC = importlib.util.spec_from_file_location("eduni_chatgpt_bridge_test", BRIDGE_PATH)
assert BRIDGE_SPEC and BRIDGE_SPEC.loader
bridge = importlib.util.module_from_spec(BRIDGE_SPEC)
BRIDGE_SPEC.loader.exec_module(bridge)


def comparison_data() -> dict:
    product = {
        "category": "식기세척기",
        "name": "Infinite AI 식기세척기 빌트인 14인용",
        "model": "DW99F79E1USWS",
        "employee_price": 1_399_000,
        "external_price": None,
        "seller": "",
        "checked_at": "",
        "note": "필터 내장형, 컵 맞춤 세척",
    }
    return {
        "home": {"size_py": 24.56, "room_count": 3},
        "products": [product, {**product, "model": "DW99F79E1B00S", "employee_price": 1_449_000}],
    }


def request_body(data: dict | None = None) -> dict:
    return {
        "prompt": "가전 후보를 비교해줘.",
        "context": {
            "activity": "appliance_compare",
            "question": json.dumps(data if data is not None else comparison_data(), ensure_ascii=False),
            "choices": [],
            "selected": "",
        },
    }


class FakeSSEStream:
    def __init__(self, answer: str):
        self.lines = iter((
            b'data: ' + json.dumps({"type": "response.output_text.delta", "delta": answer}, ensure_ascii=False).encode() + b"\n",
            b'data: {"type":"response.completed"}\n',
        ))

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def readline(self, _limit):
        return next(self.lines, b"")


class FakeBridgeResponse:
    def __init__(self, body: bytes):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, size: int) -> bytes:
        return self.body[:size]


class FakeBridgeOpener:
    def __init__(self, body: bytes):
        self.response = FakeBridgeResponse(body)

    def open(self, _request, timeout):
        return self.response


class ApplianceComparisonTests(unittest.TestCase):
    def test_validation_preserves_all_selected_products_and_decimal_home_size(self) -> None:
        prompt, context = companion.validate_companion_payload(request_body())
        data = json.loads(context["question"])
        self.assertEqual(prompt, "가전 후보를 비교해줘.")
        self.assertEqual(data["home"], {"size_py": 24.56, "room_count": 3})
        self.assertEqual([item["model"] for item in data["products"]], ["DW99F79E1USWS", "DW99F79E1B00S"])
        self.assertIsNone(data["products"][0]["external_price"])

    def test_bridge_accepts_and_preserves_comparison_context(self) -> None:
        body = request_body()
        result = bridge._context_prompt(body["prompt"], body["context"])
        self.assertIn("24.56", result)
        self.assertIn("DW99F79E1B00S", result)
        self.assertIn("appliance_compare", result)

    def test_bridge_sends_adult_comparison_instructions_only_for_comparison_activity(self) -> None:
        class Opener:
            def __init__(self):
                self.payloads = []

            def open(self, request, timeout):
                self.payloads.append(json.loads(request.data))
                return FakeSSEStream("comparison result")

        opener = Opener()
        with patch.object(bridge, "_opener", opener):
            result = bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})
            child_context = {"activity": "general", "question": "", "choices": [], "selected": ""}
            bridge.complete("문제", child_context, lambda: {"access_token": "test-token"})
        self.assertEqual(result["answer"], "comparison result")
        self.assertIn("성인 사용자의 가전 구매 비교", opener.payloads[0]["instructions"])
        self.assertIn("분류별 추천", opener.payloads[0]["instructions"])
        self.assertIn("가격 차액을 계산하거나 답변에 쓰지 않는다", opener.payloads[0]["instructions"])
        self.assertIn("분류가 기타이거나 알 수 없으면 같은 비교군으로 보지 말고", opener.payloads[0]["instructions"])
        self.assertNotIn("성인 사용자의 가전 구매 비교", opener.payloads[1]["instructions"])
        self.assertIn("주요 이용 대상은 7세 남아", opener.payloads[1]["instructions"])

    def test_bridge_allows_3000_comparison_chars_but_keeps_general_limit(self) -> None:
        class Opener:
            def __init__(self, answer: str):
                self.answer = answer

            def open(self, _request, timeout):
                return FakeSSEStream(self.answer)

        exact_limit = "가" * bridge.MAX_APPLIANCE_COMPARE_ANSWER_CHARS
        with patch.object(bridge, "_opener", Opener(exact_limit)):
            compared_at_limit = bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})
        self.assertEqual(len(compared_at_limit["answer"]), bridge.MAX_APPLIANCE_COMPARE_ANSWER_CHARS)

        long_answer = "가" * 1_201
        with patch.object(bridge, "_opener", Opener(long_answer)):
            compared = bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})
        self.assertEqual(len(compared["answer"]), 1_201)

        general_context = {"activity": "general", "question": "", "choices": [], "selected": ""}
        with patch.object(bridge, "_opener", Opener(long_answer)):
            with self.assertRaisesRegex(ValueError, "answer limit"):
                bridge.complete("질문", general_context, lambda: {"access_token": "test-token"})

        too_long = "가" * (bridge.MAX_APPLIANCE_COMPARE_ANSWER_CHARS + 1)
        with patch.object(bridge, "_opener", Opener(too_long)):
            with self.assertRaisesRegex(ValueError, "answer limit"):
                bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})

    def test_portal_bridge_accepts_escaped_hangul_over_16kb_only_with_compare_limit(self) -> None:
        context = companion.validate_companion_payload(request_body())[1]
        answer = "한" * 3_000
        body = json.dumps({"answer": answer}, ensure_ascii=True).encode("ascii")
        self.assertGreater(len(body), 16_384)
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(body)):
            result = companion._bridge_answer("비교", context)
        self.assertEqual(result, answer)

        supplementary_answer = "\U0001d11e" * 3_000
        supplementary_body = json.dumps({"answer": supplementary_answer}, ensure_ascii=True).encode("ascii")
        self.assertGreater(len(supplementary_body), 16_384)
        self.assertLess(len(supplementary_body), companion.MAX_BRIDGE_RESPONSE_BYTES)
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(supplementary_body)):
            result = companion._bridge_answer("비교", context)
        self.assertEqual(result, supplementary_answer)

        general_context = {"activity": "general", "question": "", "choices": [], "selected": ""}
        general_body = json.dumps({"answer": "a" * 1_201}, ensure_ascii=True).encode("ascii")
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(general_body)):
            with self.assertRaisesRegex(companion.ProviderError, "invalid bridge response"):
                companion._bridge_answer("질문", general_context)

    def test_portal_rejects_bridge_json_over_64000_bytes(self) -> None:
        context = companion.validate_companion_payload(request_body())[1]
        body = b"x" * (companion.MAX_BRIDGE_RESPONSE_BYTES + 1)
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(body)):
            with self.assertRaisesRegex(companion.ProviderError, "bridge response too large"):
                companion._bridge_answer("비교", context)

    def test_price_facts_calculate_only_comparable_entered_prices(self) -> None:
        data = comparison_data()
        data["products"][0]["external_price"] = 1_500_000
        data["products"][1]["external_price"] = None
        context = companion.validate_companion_payload(request_body(data))[1]
        facts = companion._appliance_price_facts(context)
        self.assertIn("사용자 입력 가격 기준·실시간 검증 아님", facts)
        self.assertIn("임직원가가 외부 최저가보다 101,000원 낮습니다", facts)
        self.assertIn("임직원가 차액 50,000원(DW99F79E1USWS 낮음)", facts)
        self.assertIn("외부 최저가 차액 생략(입력 가격 누락)", facts)

        fully_priced = comparison_data()
        fully_priced["products"][0]["external_price"] = 1_500_000
        fully_priced["products"][1]["external_price"] = 1_450_000
        fully_priced_context = companion.validate_companion_payload(request_body(fully_priced))[1]
        fully_priced_facts = companion._appliance_price_facts(fully_priced_context)
        self.assertIn("임직원가가 외부 최저가보다 1,000원 낮습니다", fully_priced_facts)
        self.assertIn("외부 최저가 차액 50,000원(DW99F79E1B00S 낮음)", fully_priced_facts)

        mixed = comparison_data()
        mixed["products"][1]["category"] = "인덕션"
        mixed_context = companion.validate_companion_payload(request_body(mixed))[1]
        mixed_facts = companion._appliance_price_facts(mixed_context)
        self.assertIn("동일한 알려진 분류 후보끼리", mixed_facts)
        self.assertNotIn("차액 50,000원", mixed_facts)

        blank_category = comparison_data()
        blank_category["products"][0]["category"] = " "
        blank_category["products"][1]["category"] = ""
        blank_category_context = companion.validate_companion_payload(request_body(blank_category))[1]
        blank_category_facts = companion._appliance_price_facts(blank_category_context)
        self.assertIn("동일한 알려진 분류 후보끼리", blank_category_facts)
        self.assertNotIn("차액 50,000원", blank_category_facts)

        unknown_category = comparison_data()
        unknown_category["products"][0]["category"] = "기타"
        unknown_category["products"][1]["category"] = "기타"
        unknown_category_context = companion.validate_companion_payload(request_body(unknown_category))[1]
        unknown_category_facts = companion._appliance_price_facts(unknown_category_context)
        self.assertIn("동일한 알려진 분류 후보끼리", unknown_category_facts)
        self.assertNotIn("차액 50,000원", unknown_category_facts)

        external_only = comparison_data()
        external_only["products"][0]["employee_price"] = None
        external_only["products"][0]["external_price"] = 1_500_000
        external_only["products"][1]["employee_price"] = None
        external_only["products"][1]["external_price"] = None
        external_only_context = companion.validate_companion_payload(request_body(external_only))[1]
        external_only_facts = companion._appliance_price_facts(external_only_context)
        self.assertIn("외부 최저가 1,500,000원, 임직원가 입력 누락", external_only_facts)
        self.assertIn("임직원가와 외부 최저가 입력 누락", external_only_facts)

        missing = comparison_data()
        missing["products"][0]["employee_price"] = None
        missing["products"][1]["employee_price"] = None
        missing_context = companion.validate_companion_payload(request_body(missing))[1]
        missing_facts = companion._appliance_price_facts(missing_context)
        self.assertIn("임직원가 차액 생략(입력 가격 누락)", missing_facts)
        self.assertNotIn("임직원가 차액 0원", missing_facts)

    def test_portal_final_comparison_includes_calculations_within_4000_chars(self) -> None:
        context = companion.validate_companion_payload(request_body())[1]
        final = companion._append_appliance_price_facts("가" * 4_000, context)
        self.assertLessEqual(len(final), companion.MAX_PORTAL_ANSWER_CHARS)
        self.assertTrue(final.endswith(companion._appliance_price_facts(context)))

    def test_ui_allows_precise_home_size_and_discloses_transmitted_note(self) -> None:
        html = (APP_ROOT / "portal_app" / "static_games" / "eduni_moving_planner.html").read_text(encoding="utf-8")
        self.assertIn('id="homeSize" name="homeSize" type="number" min="0" max="200" step="any"', html)
        self.assertIn("비교 메모에 적은 내용도 그대로 전송되므로", html)
        self.assertIn("분류별 추천", html)
        self.assertIn("종합 1위를 뽑지 마", html)
        self.assertIn("가격 차액은 계산하거나 답변에 쓰지 말고", html)
        self.assertIn("분류가 기타이면 같은 비교군으로 다루지 마", html)
        prompt = html.split('const prompt="', 1)[1].split('";', 1)[0]
        self.assertLessEqual(len(prompt), 500)

    def test_invalid_comparison_shapes_are_rejected_by_app_and_bridge(self) -> None:
        invalid_data = comparison_data()
        invalid_data["products"] = invalid_data["products"] * 2
        for validate in (companion.validate_companion_payload, lambda body: bridge._context_prompt(body["prompt"], body["context"])):
            with self.subTest(validate=validate):
                with self.assertRaises(ValueError):
                    validate(request_body(invalid_data))

    def test_blank_product_name_or_model_is_rejected_by_app_and_bridge(self) -> None:
        for field in ("name", "model"):
            invalid_data = comparison_data()
            invalid_data["products"][0][field] = "  "
            for validate in (companion.validate_companion_payload, lambda body: bridge._context_prompt(body["prompt"], body["context"])):
                with self.subTest(field=field, validate=validate):
                    with self.assertRaises(ValueError):
                        validate(request_body(invalid_data))

    def test_appliance_comparison_uses_adult_advice_while_general_keeps_child_persona(self) -> None:
        class Config:
            provider = "local"

        class Provider:
            def __init__(self):
                self.message_sets = []

            def complete(self, messages, _tools):
                self.message_sets.append(messages)
                return type("Result", (), {"tool_calls": [], "content": "비교 결과"})()

        provider = Provider()
        with patch.dict(os.environ, {"EDUNI_AI_COMPANION_PROVIDER": "local"}), patch.object(companion, "load_ai_config", return_value=Config()), patch.object(companion, "build_provider", return_value=provider):
            status, answer = companion._run_provider("비교", {"activity": "appliance_compare", "question": "{}"}, "compare-test")
            child_status, _ = companion._run_provider("문제", {"activity": "general", "question": ""}, "general-test")
        self.assertEqual((status, answer), (0, "비교 결과"))
        self.assertEqual(child_status, 0)
        self.assertIn("성인 사용자의 가전 구매 비교", provider.message_sets[0][0]["content"])
        self.assertIn("가격 차액을 계산하거나 답변에 쓰지 않는다", provider.message_sets[0][0]["content"])
        self.assertIn("분류가 기타이거나 알 수 없으면 같은 비교군으로 보지 말고", provider.message_sets[0][0]["content"])
        self.assertNotIn("답은 쉬운 낱말로 2~4문장", provider.message_sets[0][0]["content"])
        self.assertIn("주요 이용 대상은 7세 남아", provider.message_sets[1][0]["content"])

    def test_local_provider_uses_3000_compare_limit_and_1200_general_limit(self) -> None:
        class Config:
            provider = "local"

        class Provider:
            def complete(self, _messages, _tools):
                return type("Result", (), {"tool_calls": [], "content": "가" * 3_500})()

        with patch.dict(os.environ, {"EDUNI_AI_COMPANION_PROVIDER": "local"}), patch.object(companion, "load_ai_config", return_value=Config()), patch.object(companion, "build_provider", return_value=Provider()):
            compare_status, compare_answer = companion._run_provider("비교", {"activity": "appliance_compare", "question": "{}"}, "compare-limit")
            general_status, general_answer = companion._run_provider("질문", {"activity": "general", "question": ""}, "general-limit")
        self.assertEqual(compare_status, 0)
        self.assertEqual(len(compare_answer), companion.MAX_APPLIANCE_COMPARE_ANSWER_CHARS)
        self.assertEqual(general_status, 0)
        self.assertEqual(len(general_answer), companion.MAX_ANSWER_CHARS)


if __name__ == "__main__":
    unittest.main()
