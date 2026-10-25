"""Reviewed educational image matching and API contract regression tests."""
from __future__ import annotations

import asyncio
import json
import unittest
from unittest.mock import patch

from portal_app.ai import companion
from portal_app.ai.educational_photos import PHOTOS, select_photo
from starlette.requests import Request


def make_request(body: bytes) -> Request:
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {
        "type": "http", "http_version": "1.1", "method": "POST", "scheme": "http",
        "path": "/ai/companion/chat", "raw_path": b"/ai/companion/chat",
        "query_string": b"", "root_path": "",
        "headers": [(b"host", b"testserver"), (b"origin", b"http://testserver"),
                    (b"x-requested-with", b"XMLHttpRequest"),
                    (b"content-type", b"application/json")],
        "server": ("testserver", 80), "client": ("127.0.0.1", 12345),
    }
    return Request(scope, receive)


class VerifiedEducationalPhotoTests(unittest.TestCase):
    def test_catalog_has_unique_reviewed_commons_files_and_attribution(self):
        self.assertEqual(7, len(PHOTOS))
        self.assertEqual(len(PHOTOS), len({p.topic for p in PHOTOS}))
        self.assertEqual(len(PHOTOS), len({p.file for p in PHOTOS}))
        for photo in PHOTOS:
            with self.subTest(photo=photo.topic):
                data = photo.public_data()
                self.assertTrue(data["url"].startswith("https://commons.wikimedia.org/wiki/Special:FilePath/"))
                self.assertTrue(data["url"].endswith("?width=640"))
                self.assertTrue(data["source_url"].startswith("https://commons.wikimedia.org/wiki/File:"))
                self.assertTrue(data["credit"] and data["license"] and data["license_url"])
                self.assertTrue(data["alt"] and data["title"])

    def test_matching_real_children_questions_and_explicit_picture_request(self):
        for prompt, topic in (
            ("북극곰은 어떻게 생겼어? 사진 보여줘!", "polar_bear"),
            ("펭귄은 어디서 살아?", "penguin"),
            ("고양이는 왜 골골거려?", "cat"),
            ("강아지 사진 보여줘", "dog"),
            ("사자는 어떻게 생겼어?", "lion"),
            ("지구를 보여줘", "earth"),
            ("달 사진 보여 줘", "moon"),
            ("Please show me a polar bear photo", "polar_bear"),
            ("Tell me about cats", "cat"),
        ):
            with self.subTest(prompt=prompt):
                self.assertEqual(topic, select_photo(prompt)["topic"])

    def test_ambiguous_irrelevant_and_negative_requests_show_no_photos(self):
        for prompt in (
            "수학 문제의 답 알려줘", "고양이와 강아지 중 누가 빨라?",
            "북극곰과 펭귄 비교해 줘", "고양이 사진은 보여주지 마",
            "사진 필요 없어, 사자 설명만 해줘", "달리기 잘하려면?",
            "catfish", "사적인 가족사진 보여줘", "공룡의 진짜 사진 보여줘",
            "<img src=x onerror=alert(1)>", "x" * 501,
        ):
            with self.subTest(prompt=prompt):
                self.assertIsNone(select_photo(prompt))

    def test_photo_unavailable_reply_is_corrected_only_when_photo_is_attached(self):
        fallback_answer = (
            "지금은 사진을 직접 보여 줄 수 없어요.\n"
            "인터넷에서 **“북극곰 사진”**을 검색하거나, 보호자에게 도와달라고 해 보세요."
        )
        payload = json.dumps({"prompt": "북극곰 사진 보여 줘",
                              "context": {"activity": "general"}}, ensure_ascii=False).encode()
        canonical_answer = "요청한 북극곰 사진을 아래에 준비했어요. 출처도 같이 살펴봐요."

        def call_with_provider_answer(provider_answer):
            with patch.dict("os.environ", {"EDUNI_AI_COMPANION_ENABLED": "1"}, clear=True), \
                    patch.object(companion, "_run_provider", return_value=(0, provider_answer)):
                return asyncio.run(companion.companion_chat(make_request(payload)))

        response = call_with_provider_answer(fallback_answer)
        answer = json.loads(response.body)
        self.assertEqual(canonical_answer, answer["answer"])
        self.assertEqual("polar_bear", answer["photo"]["topic"])

        payload = json.dumps({"prompt": "북극곰과 펭귄 비교해 줘",
                              "context": {"activity": "general"}}, ensure_ascii=False).encode()
        response = call_with_provider_answer(fallback_answer)
        answer = json.loads(response.body)
        self.assertEqual(fallback_answer, answer["answer"])
        self.assertNotIn("photo", answer)

        payload = json.dumps({"prompt": "북극곰 사진 보여 줘",
                              "context": {"activity": "general"}}, ensure_ascii=False).encode()
        for provider_answer in (
            "지금은 사진을 직접 보여 줄 수는 없어요.",
            "지금 화면에는 북극곰 사진이 보이지 않아요.\n사진을 볼 수 있는 앱이나 검색에서 ‘북극곰 사진’을 찾아보세요.",
            "사진을 보여 드리기 어려워요. 온라인에서 북극곰 사진을 찾아보세요.",
            "사진을 가져올 수 없어요. 인터넷에서 찾아보세요.",
            "지금은 사진을 보여 줄 수 없어요. 아래 사진을 볼 수 없어서 인터넷에서 검색해 봐요.",
        ):
            with self.subTest(provider_answer=provider_answer):
                response = call_with_provider_answer(provider_answer)
                self.assertEqual(canonical_answer, json.loads(response.body)["answer"])

        for provider_answer in (
            "‘사진을 보여 줄 수 없어요’라는 말은 틀렸어요. 아래 사진을 확인해 보세요.",
            "위험한 사진을 보여 줄 수 없어요. 보호자에게 사진을 찾아 달라고 해 보세요.",
            "사진은 부적절해서 보여 드릴 수 없어요. 보호자에게 찾아 달라고 해 보세요.",
            "사진은 무서워서 보여 드릴 수 없어요. 인터넷 검색은 하지 마세요.",
        ):
            with self.subTest(provider_answer=provider_answer):
                response = call_with_provider_answer(provider_answer)
                self.assertEqual(provider_answer, json.loads(response.body)["answer"])

    def test_success_returns_photo_but_preserves_text_reply_and_errors(self):
        payload = json.dumps({"prompt": "북극곰 사진 보여 줘",
                              "context": {"activity": "general"}}, ensure_ascii=False).encode()
        with patch.dict("os.environ", {"EDUNI_AI_COMPANION_ENABLED": "1"}, clear=True), \
                patch.object(companion, "_run_provider", return_value=(0, "북극곰은 털이 하얗게 보여요.")):
            response = asyncio.run(companion.companion_chat(make_request(payload)))
        self.assertEqual(200, response.status_code)
        answer = json.loads(response.body)
        self.assertEqual("북극곰은 털이 하얗게 보여요.", answer["answer"])
        self.assertEqual("polar_bear", answer["photo"]["topic"])
        self.assertNotIn("<img", json.dumps(answer))
        self.assertEqual("no-store", response.headers["cache-control"])

        payload = json.dumps({"prompt": "수학 힌트 줘", "context": {}}, ensure_ascii=False).encode()
        with patch.dict("os.environ", {"EDUNI_AI_COMPANION_ENABLED": "1"}, clear=True), \
                patch.object(companion, "_run_provider", return_value=(0, "하나씩 살펴보자.")):
            response = asyncio.run(companion.companion_chat(make_request(payload)))
        self.assertEqual({"ok": True, "answer": "하나씩 살펴보자."}, json.loads(response.body))


if __name__ == "__main__":
    unittest.main()
