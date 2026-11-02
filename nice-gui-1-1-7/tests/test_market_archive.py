import unittest

from scripts.market_archive_migrate import _article_content, _article_url, _publish_date


class MarketArchiveImportTests(unittest.TestCase):
    def test_plain_text_is_preserved_without_html_normalization(self):
        original = "  시장 본문 &amp; 그대로\n둘째 줄  "
        self.assertEqual(_article_content({"text": original, "html": "<p>ignored</p>"}), original)

    def test_html_is_parsed_only_when_plain_text_is_missing(self):
        self.assertEqual(_article_content({"text": "", "html": "<p>시장 &amp; 분석</p>"}), "시장 & 분석")

    def test_publish_date_and_canonical_source_url(self):
        self.assertEqual(_publish_date("\n2024.04.14. 오후 7:20\n"), "2024-04-14")
        self.assertTrue(_article_url("240414192007897hr", "").endswith("/240414192007897hr"))
        with self.assertRaises(ValueError):
            _article_url("240414192007897hr", "https://example.com/article")

    def test_publish_date_rejects_missing_date(self):
        with self.assertRaises(ValueError):
            _publish_date("날짜 정보 없음")


if __name__ == "__main__":
    unittest.main()
