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

MODELS = ["DW99F79E1USWS", "DW99F79E1B00S"]
OFFICIAL_URL = "https://www.samsung.com/sec/dishwashers/DW99F79E1USWS/"
REVIEW_URL = "https://search.shopping.naver.com/search/all?query=DW99F79E1USWS"


def comparison_data() -> dict:
    return {
        "products": [
            {"category": "식기세척기", "name": "Infinite AI 식기세척기 빌트인 14인용", "model": MODELS[0]},
            {"category": "식기세척기", "name": "Infinite AI 식기세척기 트루빌트인 14인용", "model": MODELS[1]},
        ]
    }


def request_body(data: dict | None = None) -> dict:
    return {
        "prompt": "선택 제품을 웹 조사로 비교해줘.",
        "context": {
            "activity": "appliance_compare",
            "question": json.dumps(data if data is not None else comparison_data(), ensure_ascii=False),
            "choices": [],
            "selected": "",
        },
    }


def source_catalog() -> list[dict[str, str]]:
    return [
        {"url": OFFICIAL_URL, "title": "삼성전자 제품 정보"},
        {"url": REVIEW_URL, "title": "네이버 쇼핑 후기 검색"},
    ]


def cited_source_urls() -> set[str]:
    return {OFFICIAL_URL, REVIEW_URL}


def research_data(models: list[str] | None = None) -> dict:
    chosen = models or MODELS
    return {
        "overall_summary": "두 제품의 공개 기능은 비슷하고, 설치 방식과 공개 후기 근거를 함께 확인하세요.",
        "overall_source_urls": [OFFICIAL_URL, REVIEW_URL],
        "products": [
            {
                "model": chosen[0],
                "features": [{"feature": "세척 용량", "value": "14인용", "source_urls": [OFFICIAL_URL]}],
                "advantages": [{"text": "컵 맞춤 세척 기능을 제공합니다.", "source_urls": [OFFICIAL_URL]}],
                "cautions": [{"text": "빌트인 설치 공간을 구매 전에 확인하세요.", "source_urls": [OFFICIAL_URL]}],
                "reviews": {
                    "summary": "검색된 후기에서 반복 경향을 단정할 만큼 충분한 자료를 찾지 못했습니다.",
                    "scope": "네이버 쇼핑의 공개 후기 검색 결과를 기준으로 확인했습니다.",
                    "source_urls": [REVIEW_URL],
                },
            },
            {
                "model": chosen[1],
                "features": [{"feature": "세척 용량", "value": "14인용, 트루빌트인", "source_urls": [OFFICIAL_URL]}],
                "advantages": [{"text": "가구 전면과 맞추는 설치 형태입니다.", "source_urls": [OFFICIAL_URL]}],
                "cautions": [{"text": "패널 미포함 여부와 설치 규격을 확인하세요.", "source_urls": [OFFICIAL_URL]}],
                "reviews": {
                    "summary": "모델 코드가 일치하는 후기 표본은 충분히 확인되지 않았습니다.",
                    "scope": "후기 자료가 적어 전체 사용자 평가로 일반화하지 않았습니다.",
                    "source_urls": [REVIEW_URL],
                },
            },
        ],
    }


def completion_sources() -> dict:
    return {"output": [{
        "type": "web_search_call",
        "action": {"sources": source_catalog()},
    }, {
        "type": "message",
        "content": [{"type": "output_text", "text": "제품 정보를 비교합니다.", "annotations": [
            {"type": "url_citation", "url": source["url"], "title": source["title"]}
            for source in source_catalog()
        ]}],
    }]}


class FakeSSEStream:
    def __init__(self, answer: str, response: dict | None = None):
        complete = {"type": "response.completed"}
        if response is not None:
            complete["response"] = response
        self.lines = iter((
            b"data: " + json.dumps({"type": "response.output_text.delta", "delta": answer}, ensure_ascii=False).encode() + b"\n",
            b"data: " + json.dumps(complete, ensure_ascii=False).encode() + b"\n",
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
    def test_validation_accepts_only_selected_product_identifiers(self) -> None:
        prompt, context = companion.validate_companion_payload(request_body())
        data = json.loads(context["question"])
        self.assertEqual(prompt, "선택 제품을 웹 조사로 비교해줘.")
        self.assertEqual(data, comparison_data())
        self.assertNotIn("home", data)
        self.assertTrue(all(set(item) == {"category", "name", "model"} for item in data["products"]))

    def test_app_and_bridge_reject_extra_fields_and_wrong_product_count(self) -> None:
        invalid_data = comparison_data()
        invalid_data["products"][0]["note"] = "사용자 메모"
        for validate in (companion.validate_companion_payload, lambda body: bridge._context_prompt(body["prompt"], body["context"])):
            with self.subTest(validate=validate), self.assertRaises(ValueError):
                validate(request_body(invalid_data))

        invalid_data = comparison_data()
        invalid_data["products"] = invalid_data["products"][:1]
        for validate in (companion.validate_companion_payload, lambda body: bridge._context_prompt(body["prompt"], body["context"])):
            with self.subTest(validate=validate), self.assertRaises(ValueError):
                validate(request_body(invalid_data))

    def test_blank_product_name_or_model_is_rejected_by_app_and_bridge(self) -> None:
        for field in ("name", "model"):
            invalid_data = comparison_data()
            invalid_data["products"][0][field] = "  "
            for validate in (companion.validate_companion_payload, lambda body: bridge._context_prompt(body["prompt"], body["context"])):
                with self.subTest(field=field, validate=validate), self.assertRaises(ValueError):
                    validate(request_body(invalid_data))

    def test_bridge_requires_web_search_and_returns_a_source_backed_matrix(self) -> None:
        response_text = json.dumps(research_data(), ensure_ascii=False)

        class Opener:
            def __init__(self):
                self.payloads = []

            def open(self, request, timeout):
                self.payloads.append(json.loads(request.data))
                context = self.payloads[-1]["input"][0]["content"]
                if "DW99F79E1USWS" in context:
                    return FakeSSEStream(response_text, completion_sources())
                return FakeSSEStream("어떤 게임을 하고 있나요?")

        opener = Opener()
        with patch.object(bridge, "_opener", opener):
            result = bridge.complete(request_body()["prompt"], request_body()["context"], lambda: {"access_token": "test-token"})
            child_context = {"activity": "general", "question": "", "choices": [], "selected": ""}
            bridge.complete("문제", child_context, lambda: {"access_token": "test-token"})

        self.assertEqual(result["research"], research_data())
        self.assertEqual(result["answer"], research_data()["overall_summary"])
        self.assertEqual(result["sources"], source_catalog())
        self.assertEqual(opener.payloads[0]["tools"], [{"type": "web_search"}])
        self.assertEqual(opener.payloads[0]["tool_choice"], "required")
        self.assertEqual(opener.payloads[0]["include"], ["web_search_call.action.sources"])
        self.assertEqual(opener.payloads[0]["text"]["format"]["type"], "json_schema")
        self.assertTrue(opener.payloads[0]["text"]["format"]["strict"])
        schema = opener.payloads[0]["text"]["format"]["schema"]
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["products"]["maxItems"], 3)
        item_schema = schema["properties"]["products"]["items"]["properties"]
        self.assertEqual(item_schema["features"]["maxItems"], 5)
        self.assertEqual(item_schema["advantages"]["maxItems"], 3)
        self.assertEqual(item_schema["cautions"]["maxItems"], 3)
        self.assertEqual(item_schema["features"]["items"]["properties"]["source_urls"]["maxItems"], 3)
        feature_schema = item_schema["features"]["items"]["properties"]
        self.assertIn("{1,292}", feature_schema["source_urls"]["items"]["pattern"])
        self.assertIn("{0,80}", feature_schema["feature"]["pattern"])
        self.assertIn("{0,220}", feature_schema["value"]["pattern"])
        self.assertIn("{0,500}", schema["properties"]["overall_summary"]["pattern"])
        self.assertNotIn("tools", opener.payloads[1])
        sent_context = opener.payloads[0]["input"][0]["content"]
        self.assertNotIn("가격", sent_context)
        self.assertNotIn("사용자 메모", sent_context)
        self.assertNotIn("home", sent_context)

    def test_bridge_drops_claims_without_a_cited_source(self) -> None:
        bad = research_data()
        bad["products"][0]["features"][0]["source_urls"] = ["https://invented.invalid/fake"]
        clean = bridge._validate_research_output(bad, MODELS, source_catalog(), cited_source_urls())
        self.assertEqual(clean["products"][0]["features"], [])

    def test_feature_matrix_keeps_only_shared_rows_in_the_same_order(self) -> None:
        value = research_data()
        value["products"][0]["features"].append({
            "feature": "건조 방식", "value": "열풍 건조", "source_urls": [OFFICIAL_URL],
        })
        value["products"][1]["features"].append({
            "feature": "설치 방식", "value": "트루빌트인", "source_urls": [OFFICIAL_URL],
        })
        clean = bridge._validate_research_output(value, MODELS, source_catalog(), cited_source_urls())
        self.assertEqual([[row["feature"] for row in product["features"]] for product in clean["products"]], [
            ["세척 용량"], ["세척 용량"],
        ])

    def test_long_summary_is_clipped_to_the_portal_contract(self) -> None:
        value = research_data()
        value["overall_summary"] = "설치와 실사용 후기의 구체적 차이를 확인하세요. " * 30
        clean = bridge._validate_research_output(value, MODELS, source_catalog(), cited_source_urls())
        self.assertEqual(len(clean["overall_summary"]), 500)
        self.assertTrue(clean["overall_summary"].endswith("…"))

    def test_bridge_rejects_model_order_mismatch(self) -> None:
        with self.assertRaisesRegex(ValueError, "models do not match"):
            bridge._validate_research_output(research_data(list(reversed(MODELS))), MODELS, source_catalog(), cited_source_urls())

    def test_uncited_claims_are_removed_and_uncited_reviews_are_not_reported(self) -> None:
        value = research_data()
        value["products"][0]["features"][0]["value"] = "근거 없는 사양 주장"
        value["products"][0]["features"][0]["source_urls"] = []
        value["products"][0]["reviews"]["summary"] = "긍정 후기가 많습니다."
        value["products"][0]["reviews"]["scope"] = "여러 사이트에서 반복 확인했습니다."
        value["products"][0]["reviews"]["source_urls"] = []
        clean = bridge._validate_research_output(value, MODELS, source_catalog(), cited_source_urls())
        self.assertEqual(clean["products"][0]["features"], [])
        self.assertEqual(clean["products"][0]["reviews"]["summary"], "출처를 확인할 수 있는 공개 후기 근거가 없습니다.")
        self.assertEqual(clean["products"][0]["reviews"]["source_urls"], [])

        value["overall_source_urls"] = []
        clean = bridge._validate_research_output(value, MODELS, source_catalog(), cited_source_urls())
        self.assertEqual(clean["overall_summary"], "출처가 연결된 종합 비교 근거가 없어 출처가 붙은 항목만 확인하세요.")

    def test_consulted_but_uncited_pages_cannot_support_comparison_claims(self) -> None:
        uncited = "https://example.com/search-result-only"
        sources = source_catalog() + [{"url": uncited, "title": "검색 결과 목록"}]
        value = research_data()
        value["products"][0]["features"][0]["source_urls"] = [uncited]
        clean = bridge._validate_research_output(value, MODELS, sources, cited_source_urls())
        self.assertEqual(clean["products"][0]["features"], [])

    def test_cited_pages_are_prioritized_over_consulted_results(self) -> None:
        cited = "https://example.com/cited-page"
        consulted = [{"url": f"https://example.com/search-{index}", "title": "검색 결과"} for index in range(35)]
        response = {"output": [{
            "type": "web_search_call", "action": {"sources": consulted},
        }, {
            "type": "message", "content": [{"type": "output_text", "text": "인용", "annotations": [
                {"type": "url_citation", "url": cited, "title": "인용 페이지"},
            ]}],
        }]}
        sources, cited_urls = bridge._web_research_sources(response, [cited])
        self.assertEqual(sources[0]["url"], cited)
        self.assertIn(cited, cited_urls)
        self.assertEqual(len(sources), 1)

    def test_portal_accepts_only_safe_sources_and_exact_models(self) -> None:
        context = companion.validate_companion_payload(request_body())[1]
        body = {
            "answer": research_data()["overall_summary"],
            "research": research_data(),
            "sources": source_catalog(),
        }
        self.assertEqual(companion._validate_appliance_research(body, context), body)

        bad_source = json.loads(json.dumps(body))
        bad_source["sources"][0]["url"] = "javascript:alert(1)"
        with self.assertRaisesRegex(companion.ProviderError, "invalid appliance research source"):
            companion._validate_appliance_research(bad_source, context)

        bad_model = json.loads(json.dumps(body))
        bad_model["research"]["products"][0]["model"] = "OTHER-MODEL"
        with self.assertRaisesRegex(companion.ProviderError, "models do not match"):
            companion._validate_appliance_research(bad_model, context)

    def test_portal_bridge_packages_verified_research_for_the_ui(self) -> None:
        context = companion.validate_companion_payload(request_body())[1]
        body = {
            "answer": research_data()["overall_summary"],
            "research": research_data(),
            "sources": source_catalog(),
        }
        encoded = json.dumps(body, ensure_ascii=False).encode()
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(encoded)):
            packed = companion._bridge_compare("조사", context)
        self.assertEqual(json.loads(packed), body)

        body["research"]["products"][0]["reviews"]["source_urls"] = ["https://not-returned.invalid/review"]
        encoded = json.dumps(body, ensure_ascii=False).encode()
        with patch.dict(os.environ, {
            "EDUNI_AI_COMPANION_BRIDGE_URL": "http://127.0.0.1:8765",
            "EDUNI_AI_COMPANION_BRIDGE_KEY": "test-key",
        }), patch.object(companion, "build_opener", return_value=FakeBridgeOpener(encoded)):
            with self.assertRaisesRegex(companion.ProviderError, "invalid appliance research citations"):
                companion._bridge_compare("조사", context)

    def test_bridge_keeps_general_chat_separate_from_web_research(self) -> None:
        class Opener:
            def open(self, request, timeout):
                payload = json.loads(request.data)
                self.payload = payload
                return FakeSSEStream("어떤 게임을 하고 있나요?")

        opener = Opener()
        context = {"activity": "general", "question": "", "choices": [], "selected": ""}
        with patch.object(bridge, "_opener", opener):
            result = bridge.complete("문제", context, lambda: {"access_token": "test-token"})
        self.assertEqual(result, {"answer": "어떤 게임을 하고 있나요?"})
        self.assertNotIn("tools", opener.payload)
        self.assertNotIn("tool_choice", opener.payload)

    def test_local_provider_does_not_claim_to_have_web_researched_products(self) -> None:
        class Config:
            provider = "local"

        class Provider:
            def complete(self, _messages, _tools):
                raise AssertionError("comparison must use sourced web research")

        with patch.dict(os.environ, {"EDUNI_AI_COMPANION_PROVIDER": "local"}), \
                patch.object(companion, "load_ai_config", return_value=Config()), \
                patch.object(companion, "build_provider", return_value=Provider()):
            compare_status, compare_answer = companion._run_provider("비교", {"activity": "appliance_compare", "question": "{}"}, "compare-test")
        self.assertEqual((compare_status, compare_answer), (503, ""))

    def test_ui_discloses_research_and_sends_only_product_identifiers(self) -> None:
        html = (APP_ROOT / "portal_app" / "static_games" / "eduni_moving_planner.html").read_text(encoding="utf-8")
        self.assertIn("제품명·모델 코드·분류만 전송", html)
        self.assertIn("가격·메모·집 정보는 보내지 않습니다.", html)
        self.assertIn("공개 사용자 후기 경향", html)
        self.assertIn("renderProductComparison(chosen,data.research,data.sources)", html)
        self.assertIn('target="_blank"; link.rel="noopener noreferrer"', html)
        self.assertIn('link.textContent=(title.length>54?title.slice(0,51)+"…":title)+" ↗"', html)
        self.assertNotIn("employee_price:numericForAI", html)
        self.assertNotIn("home:{size_py:", html)
        prompt = html.split('const prompt="', 1)[1].split('";', 1)[0]
        self.assertLessEqual(len(prompt), 500)


if __name__ == "__main__":
    unittest.main()
