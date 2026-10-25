"""Small, human-reviewed educational photo catalog for the EDUNI AI companion.

Never search arbitrary internet images or accept model-authored image URLs.
Photos are opt-in by topic recognition and link to original Commons file pages.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import quote


@dataclass(frozen=True)
class Photo:
    topic: str
    title: str
    alt: str
    file: str
    credit: str
    license: str
    license_url: str
    korean: tuple[str, ...]
    english: tuple[str, ...] = ()

    def public_data(self) -> dict[str, str]:
        # Wikimedia Commons resolves only these reviewed filenames to image media.
        file_name = quote(self.file.replace(" ", "_"), safe="")
        return {
            "topic": self.topic,
            "title": self.title,
            "alt": self.alt,
            "url": f"https://commons.wikimedia.org/wiki/Special:FilePath/{file_name}?width=640",
            "source_url": f"https://commons.wikimedia.org/wiki/File:{file_name}",
            "credit": self.credit,
            "license": self.license,
            "license_url": self.license_url,
        }


CC_BY_SA_3 = "https://creativecommons.org/licenses/by-sa/3.0/"
CC_BY_2 = "https://creativecommons.org/licenses/by/2.0/"
PUBLIC_DOMAIN = "https://commons.wikimedia.org/wiki/Commons:Licensing"

# Every file below was checked against its actual Commons description and license.
# Additions must have a reviewed photo, exact filename, attribution and license.
PHOTOS = (
    Photo("polar_bear", "북극곰", "알래스카 해안에 있는 실제 북극곰 사진",
          "Polar Bear.jpg", "U.S. Fish and Wildlife Service", "공개 도메인", PUBLIC_DOMAIN,
          ("북극곰",), ("polar bear", "polar bears")),
    Photo("penguin", "황제펭귄", "남극의 황제펭귄 사진",
          "Emperor penguin.jpg", "Michael Van Woert / NOAA", "공개 도메인", PUBLIC_DOMAIN,
          ("펭귄", "황제펭귄"), ("penguin", "penguins", "emperor penguin")),
    Photo("cat", "고양이", "실제 줄무늬 고양이 사진",
          "Cat November 2010-1a.jpg", "Alvesgaspar", "CC BY-SA 3.0", CC_BY_SA_3,
          ("고양이", "냥이", "아기 고양이"), ("cat", "kitten", "cats")),
    Photo("dog", "강아지", "실제 노란 래브라도 리트리버 사진",
          "YellowLabradorLooking new.jpg", "Elf / Djmirko / FT2", "CC BY-SA 3.0", CC_BY_SA_3,
          ("강아지", "멍멍이", "리트리버", "반려견"), ("dog", "puppy", "labrador")),
    Photo("lion", "사자", "나미비아 초원에 앉아 있는 실제 수사자 사진",
          "Lion waiting in Namibia.jpg", "Kevin Pluck", "CC BY 2.0", CC_BY_2,
          ("사자",), ("lion", "lions")),
    Photo("earth", "지구", "우주에서 촬영한 실제 지구 사진",
          "The Earth seen from Apollo 17.jpg", "NASA / Apollo 17 crew", "공개 도메인", PUBLIC_DOMAIN,
          ("지구", "푸른 행성"), ("earth", "blue marble")),
    Photo("moon", "달", "망원경으로 촬영한 실제 보름달 사진",
          "FullMoon2010.jpg", "Gregory H. Revera", "CC BY-SA 3.0", CC_BY_SA_3,
          ("보름달", "달 사진", "달은", "달이", "달의", "달 표면"), ("moon", "full moon")),
)

# This is not a general image search. The companion only presents exactly one
# unambiguous reviewed topic, drawn from the user's own question (not hidden
# screen context or potentially hallucinated model output).
NEGATIVE = re.compile(
    r"사진.{0,24}(?:보여주지\s*마|필요\s*없|안\s*보여|그만)|"
    r"(?:don't|do not|no)\s+(?:show|want|need)\s+(?:an?\s+)?(?:image|photo|picture)",
    re.IGNORECASE,
)


def select_photo(prompt: str) -> dict[str, str] | None:
    if not isinstance(prompt, str) or len(prompt) > 500 or NEGATIVE.search(prompt):
        return None
    text = prompt.lower()
    topics = []
    for photo in PHOTOS:
        korean_match = any(token in text for token in photo.korean)
        english_match = any(re.search(r"(?<![a-z])" + re.escape(word) + r"(?![a-z])", text)
                            for word in photo.english)
        if korean_match or english_match:
            topics.append(photo)
    if len(topics) == 1:
        return topics[0].public_data()
    return None
