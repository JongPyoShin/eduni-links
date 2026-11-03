from __future__ import annotations

import json
import unittest
from pathlib import Path

from portal_app.ai import companion


APP_ROOT = Path(__file__).resolve().parents[1]


class CompanionPageContextTests(unittest.TestCase):
    def test_reading_page_guide_is_useful_and_server_discards_client_record_data(self) -> None:
        client_context = {
            "activity": "reading",
            "question": "비밀 책제목, 비밀 글쓴이, 비밀 아이 메모, 비밀 부모 메모, 비밀 검색어, 비밀 사진.jpg",
            "choices": ["비밀 감상"],
            "selected": "비밀 영상.mp4",
        }
        prompt, safe_context = companion.validate_companion_payload({
            "prompt": "지금 페이지 설명해줘",
            "context": client_context,
        })
        guide = safe_context["question"]

        self.assertEqual(prompt, "지금 페이지 설명해줘")
        self.assertEqual(safe_context["activity"], "reading")
        self.assertEqual(safe_context["choices"], [])
        self.assertEqual(safe_context["selected"], "")
        for page_feature in ("우리 책장", "달력", "말과 장면", "새 기록", "표지 찾기", "읽은 날짜", "검색", "필터"):
            with self.subTest(page_feature=page_feature):
                self.assertIn(page_feature, guide)
        self.assertIn("GPT 분석 코멘트", guide)
        self.assertIn("선택한 달의 기록 수", guide)
        self.assertIn("검색어·사진/영상·집계가 자동 포함되지 않습니다", guide)
        for monthly_aggregate in ("선택한 달의 기록 수", "서로 다른 책 수", "반복 읽기 수", "또 읽고 싶은 책 수", "읽기 방식별 수", "지난달 대비 변화량"):
            with self.subTest(monthly_aggregate=monthly_aggregate):
                self.assertIn(monthly_aggregate, guide)
        self.assertIn("책 제목·글쓴이/출판사", guide)
        self.assertIn("읽기 방식(혼자·같이·읽어주기)", guide)
        self.assertIn("아이의 말", guide)
        self.assertIn("기억에 남는 장면", guide)
        self.assertIn("부모 메모", guide)
        self.assertLessEqual(len(guide), 600)  # The host bridge accepts reading context questions up to 600 characters.
        serialized_context = json.dumps(safe_context, ensure_ascii=False)
        for private_value in ("비밀 책제목", "비밀 글쓴이", "비밀 아이 메모", "비밀 부모 메모", "비밀 검색어", "비밀 사진.jpg", "비밀 감상", "비밀 영상.mp4"):
            with self.subTest(private_value=private_value):
                self.assertNotIn(private_value, serialized_context)

        client_js = (APP_ROOT / "portal_app" / "static_games" / "eduni_companion.js").read_text(encoding="utf-8")
        self.assertNotIn(companion.READING_CONTEXT_QUESTION, client_js)
        self.assertIn('const readingContext = Object.freeze({activity:"reading",question:"",choices:Object.freeze([]),selected:""});', client_js)
        self.assertIn('label:"함께 보는 화면: 독서기록 · 페이지 안내"', client_js)
        self.assertIn('data-prompt="독서기록 페이지의 목적과 메뉴·기록 방법을 설명해줘">이 페이지 설명</button>', client_js)

        reading_page = (APP_ROOT / "portal_app" / "static_games" / "eduni_reading_journal.html").read_text(encoding="utf-8")
        self.assertIn("지난달 대비 변화량이 전송돼요", reading_page)
        self.assertIn("개별 책 제목, 아이의 말, 부모 메모, 사진·영상은 보내지 않아요", reading_page)


if __name__ == "__main__":
    unittest.main()
