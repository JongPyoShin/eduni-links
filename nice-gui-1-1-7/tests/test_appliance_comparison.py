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
        class Stream:
            def __init__(self):
                self.lines = iter((
                    b'data: {"type":"response.output_text.delta","delta":"comparison result"}\n',
                    b'data: {"type":"response.completed"}\n',
                ))

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def readline(self, _limit):
                return next(self.lines, b"")

        class Opener:
            def __init__(self):
                self.payloads = []

            def open(self, request, timeout):
                self.payloads.append(json.loads(request.data))
                return Stream()

        opener = Opener()
        with patch.object(bridge, "_opener", opener):
            result = bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})
            child_context = {"activity": "general", "question": "", "choices": [], "selected": ""}
            bridge.complete("문제", child_context, lambda: {"access_token": "test-token"})
        self.assertEqual(result["answer"], "comparison result")
        self.assertIn("성인 사용자의 가전 구매 비교", opener.payloads[0]["instructions"])
        self.assertIn("분류별 추천", opener.payloads[0]["instructions"])
        self.assertNotIn("성인 사용자의 가전 구매 비교", opener.payloads[1]["instructions"])
        self.assertIn("주요 이용 대상은 7세 남아", opener.payloads[1]["instructions"])

    def test_ui_allows_precise_home_size_and_discloses_transmitted_note(self) -> None:
        html = (APP_ROOT / "portal_app" / "static_games" / "eduni_moving_planner.html").read_text(encoding="utf-8")
        self.assertIn('id="homeSize" name="homeSize" type="number" min="0" max="200" step="any"', html)
        self.assertIn("비교 메모에 적은 내용도 그대로 전송되므로", html)
        self.assertIn("분류별 추천", html)
        self.assertIn("종합 1위를 뽑지 마", html)
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
        self.assertNotIn("답은 쉬운 낱말로 2~4문장", provider.message_sets[0][0]["content"])
        self.assertIn("주요 이용 대상은 7세 남아", provider.message_sets[1][0]["content"])


if __name__ == "__main__":
    unittest.main()
