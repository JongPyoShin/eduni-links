"""Versioned picture-led missions: original diagrams, no external assets or AI."""
from __future__ import annotations
import json
import sqlite3
from html import escape
from typing import Any

from nicegui import ui

CONTENT = json.loads(r'''{
  "paper_bridge": {
    "scene": [
      "책 사이의 평평한 종이 다리",
      "▰ ━━━━━ ▰",
      "동전을 올리면 종이가 휘어요"
    ],
    "look": [
      "종이가 휘는 부분",
      "책 사이의 빈 공간",
      "동전을 놓는 자리"
    ],
    "goal": "같은 간격에서 동전 3개를 버티는 종이 다리 만들기",
    "methods": [
      [
        "종이를 지그재그로 접기",
        "종이 한 장을 지그재그로 접어 책 두 권에 걸쳐 놓아요."
      ],
      [
        "종이 양끝을 위로 접기",
        "같은 크기 종이의 양쪽 가장자리를 접어 다리를 만들어요."
      ],
      [
        "평평한 종이 그대로 쓰기",
        "같은 크기 종이를 펼쳐 다리를 만들어요."
      ]
    ],
    "activity": "책 사이를 10cm 정도로 고정하고 같은 동전 3개를 가운데에 하나씩 놓아요. 어른과 함께하고 동전을 입에 넣지 않아요.",
    "observed": [
      "동전 3개를 버텼어",
      "3개 전에 종이가 주저앉았어",
      "결과를 잘 모르겠어"
    ]
  },
  "missing_sign": {
    "scene": [
      "장난감 상자를 찾는 친구",
      "문 → 빈 표지 → 상자 3개",
      "상자가 세 개 있지만 이름이 없어요."
    ],
    "look": [
      "문에서 상자까지의 길",
      "표시가 없는 세 상자",
      "어느 상자인지 알 수 없어"
    ],
    "goal": "처음 보는 친구가 말로 설명하지 않아도 자동차 상자 찾기",
    "methods": [
      [
        "자동차 그림 붙이기",
        "상자에 자동차 그림을 붙여요."
      ],
      [
        "화살표와 자동차 그림 붙이기",
        "문에서 상자까지 화살표와 자동차 그림을 붙여요."
      ],
      [
        "색깔과 자동차 그림 쓰기",
        "입구에 색깔 약속표를 만들고 상자에도 같은 색을 붙여요."
      ]
    ],
    "activity": "서로 다른 상자 3개로 준비하고 가족 한 명이 처음 온 친구 역할을 해요. 말로 답을 알려주지 않고 자동차 상자를 찾는지 봐요.",
    "observed": [
      "친구가 혼자 찾았어",
      "친구가 다른 상자를 열었거나 도움을 받았어",
      "결과를 잘 모르겠어"
    ]
  },
  "leaf_dry": {
    "scene": [
      "물에 젖은 나뭇잎 두 장",
      "잎 A  💧     잎 B  💧",
      "같은 크기·같은 물"
    ],
    "look": [
      "두 잎의 물방울",
      "잎의 크기",
      "잎을 놓을 자리"
    ],
    "goal": "두 조건에서 잎의 겉물이 어느 쪽에서 먼저 마르는지 비교하기",
    "methods": [
      [
        "바람 있는 곳과 없는 곳",
        "같은 방에서 한쪽만 약한 선풍기 바람을 받게 해요."
      ],
      [
        "밝은 창가와 그늘",
        "같은 방의 창가와 그늘을 비교해요. 빛과 온도가 함께 달라질 수 있어 장소 비교로 기록해요."
      ],
      [
        "종이 위와 접시 위",
        "같은 장소에서 한 잎은 종이, 다른 잎은 접시에 놓아요."
      ]
    ],
    "activity": "비슷한 잎 2장에 같은 물 3방울을 놓고 시작해요. 10분마다 어른과 함께 살펴보고 먼저 표면 물방울이 사라진 쪽을 기록해요. 가열하지 않아요.",
    "observed": [
      "첫 번째 조건의 잎이 먼저 말랐어",
      "두 번째 조건의 잎이 먼저 말랐어",
      "비슷하거나 구별하기 어려웠어"
    ],
    "compare": true,
    "conditions": [
      [
        "바람이 있는 쪽",
        "바람이 없는 쪽"
      ],
      [
        "창가",
        "그늘"
      ],
      [
        "종이 위",
        "접시 위"
      ]
    ]
  },
  "ball_run": {
    "scene": [
      "탁구공이 상자까지 가는 길",
      "● ↘ ━━━ → □",
      "길이 너무 평평하면 공이 멈춰요"
    ],
    "look": [
      "공의 출발점",
      "종이 길",
      "도착 상자"
    ],
    "goal": "탁구공이 손으로 밀지 않아도 상자 안에 들어가기",
    "methods": [
      [
        "낮은 경사 만들기",
        "종이 길의 시작을 책 한 권 높이만큼 올려요."
      ],
      [
        "조금 더 높은 경사 만들기",
        "책 두 권 높이로 시작점을 올려요."
      ],
      [
        "옆에 낮은 벽 붙이기",
        "책 한 권 높이의 길 옆에 종이 벽을 세워요."
      ]
    ],
    "activity": "어른과 탁자 위에 같은 길이의 종이 길과 도착 상자를 놓아요. 공을 같은 위치에서 놓고 2번 시험해요. 가위는 어른이 사용해요.",
    "observed": [
      "두 번 모두 상자에 들어갔어",
      "한 번 이상 멈추거나 밖으로 나갔어",
      "결과를 잘 모르겠어"
    ]
  },
  "lost_toy": {
    "scene": [
      "벤치에 남은 자동차",
      "벤치 + 빨간 자동차 / 이름표 없음",
      "친구가 자기 것이라고 말했어요"
    ],
    "look": [
      "벤치의 자동차",
      "이름표가 없는 자동차",
      "내 것이라고 말하는 친구"
    ],
    "goal": "추측만으로 주인을 정하지 않고 어른과 함께 확인하기",
    "methods": [
      [
        "잃어버린 곳과 모양 묻기",
        "어른과 함께 주인이라고 말한 친구에게 자동차를 보기 전에 잃어버린 장소와 모양을 말해 달라고 해요."
      ],
      [
        "다른 단서도 묻기",
        "어른에게 물건을 맡기고 친구에게 자동차의 특징을 더 물어요."
      ],
      [
        "어른에게 먼저 맡기기",
        "관리하는 어른에게 자동차를 맡기고 어떻게 주인을 확인할지 물어요."
      ]
    ],
    "activity": "가족끼리 발견한 사람·주인이라고 말하는 사람·어른 역할을 나눠 해봐요. 자동차를 보았다는 말만으로 주인이라고 단정하지 않아요.",
    "observed": [
      "어른과 확인할 단서를 찾았어",
      "아직 주인을 확인할 단서가 부족했어",
      "어떤 단서가 필요한지 모르겠어"
    ]
  },
  "raincoat_story": {
    "scene": [
      "비 오는 길에서 만난 친구들",
      "토끼 ☂  고슴도치 ☔",
      "우산은 하나뿐이고 지붕이 있는 쉼터가 가까워요."
    ],
    "look": [
      "작은 우산 하나",
      "우산 없는 친구",
      "가까운 지붕 아래 쉼터"
    ],
    "goal": "두 친구가 빗속에 혼자 남지 않고 안전하게 비를 피하기",
    "methods": [
      [
        "작은 우산을 함께 쓰기",
        "우산 하나를 둘이 함께 쓰는 역할놀이를 해요."
      ],
      [
        "가까운 쉼터로 함께 가기",
        "두 친구가 가장 가까운 지붕 아래로 같이 가요."
      ],
      [
        "어른에게 도움을 요청하기",
        "둘이 안전한 곳에서 기다리며 아는 어른에게 도움을 청해요."
      ]
    ],
    "activity": "실내에서 종이 우산과 쉼터를 놓고 두 친구 역할을 바꿔 해봐요. 실제 빗길이나 위험한 곳에 가지 않아요.",
    "observed": [
      "두 친구 모두 비를 피했어",
      "한 친구가 아직 비를 맞았어",
      "결과를 잘 모르겠어"
    ]
  },
  "tidy_room": {
    "scene": [
      "섞여 있는 장난감 상자",
      "● 🚗 ■ 🚗 ● ■",
      "빨간 블록·파란 블록·자동차가 섞였어요"
    ],
    "look": [
      "섞여 있는 물건",
      "자동차 두 대",
      "비어 있는 정리 상자"
    ],
    "goal": "가족이 자동차 한 개를 10초 안에 찾기",
    "methods": [
      [
        "종류별로 정리",
        "자동차와 블록을 다른 상자에 나눠요."
      ],
      [
        "색깔별로 정리",
        "빨간 물건과 파란 물건을 나눠요."
      ],
      [
        "자주 쓰는 물건을 앞에 놓기",
        "자동차를 자주 쓰는 물건으로 정하고 앞에 놓아요."
      ]
    ],
    "activity": "같은 장난감 6개로 정리 전과 정리 후를 비교해요. 가족이 같은 자동차를 찾고, 어른이 시간을 재요. 가구는 옮기지 않아요.",
    "observed": [
      "10초 안에 찾았어",
      "10초 넘게 걸렸거나 못 찾았어",
      "결과를 잘 모르겠어"
    ]
  },
  "family_turns": {
    "scene": [
      "한 장난감을 같이 쓰고 싶어요",
      "친구 A → 장난감 ← 친구 B·C",
      "한 명이 사용하고 두 명이 기다려요."
    ],
    "look": [
      "장난감 하나",
      "기다리는 친구 두 명",
      "지금 사용하는 친구"
    ],
    "goal": "세 사람이 모두 한 번씩 사용하기",
    "methods": [
      [
        "한 번씩 번갈아 쓰기",
        "A, B, C 순서로 한 번씩 사용해요."
      ],
      [
        "1분씩 쓰고 다음 사람에게 주기",
        "어른과 1분씩 시간을 정해 순서대로 넘겨요."
      ],
      [
        "첫 순서만 뽑고 그 뒤 번갈아 쓰기",
        "첫 사람을 뽑고 남은 두 사람도 한 번씩 차례를 받아요."
      ]
    ],
    "activity": "가족 세 명 또는 인형 세 개로 장난감을 나눠 쓰는 역할놀이를 해요. 누가 한 번 이상 사용했는지 세어 봐요.",
    "observed": [
      "세 사람 모두 한 번씩 사용했어",
      "한 사람 이상 아직 못 썼어",
      "결과를 잘 모르겠어"
    ]
  },
  "sorting_cards": {
    "scene": [
      "로봇이 숫자 카드를 정리해요",
      "4  1  3  2",
      "왼쪽부터 작은 수 → 큰 수"
    ],
    "look": [
      "4와 1의 순서",
      "3과 2의 순서",
      "가장 작은 숫자"
    ],
    "goal": "숫자 4, 1, 3, 2를 작은 수부터 순서대로 놓기",
    "methods": [
      [
        "옆 숫자를 비교하며 한 바퀴만 바꾸기",
        "왼쪽에서 오른쪽으로 옆 숫자 두 개를 비교해 큰 수가 앞이면 바꿔요. 한 번만 지나가요."
      ],
      [
        "바뀌는 곳이 없을 때까지 반복하기",
        "같은 비교를 끝까지 반복해요."
      ],
      [
        "가장 작은 수부터 하나씩 꺼내기",
        "남은 카드 중 가장 작은 카드를 왼쪽부터 놓아요."
      ]
    ],
    "activity": "화면의 실행 버튼으로 로봇이 만든 순서를 확인해요.",
    "observed": [
      "1, 2, 3, 4 순서가 되었어",
      "아직 작은 수와 큰 수가 섞였어",
      "결과를 잘 모르겠어"
    ],
    "screen": true
  },
  "route_debug": {
    "scene": [
      "로봇이 별까지 가요",
      "⬆ → ↑   ■",
      "시작: 왼쪽 아래 / 별: 오른쪽 위 / 가운데 벽"
    ],
    "look": [
      "로봇의 시작 칸",
      "가운데 벽",
      "오른쪽 위 별"
    ],
    "goal": "벽에 부딪히지 않고 별이 있는 칸에 도착하기",
    "methods": [
      [
        "오른쪽·오른쪽·위·위",
        "오른쪽 두 칸, 위쪽 두 칸 이동해요."
      ],
      [
        "위·오른쪽·오른쪽·위",
        "위쪽 한 칸, 오른쪽 두 칸, 위쪽 한 칸 이동해요."
      ],
      [
        "위·위·오른쪽",
        "위쪽 두 칸, 오른쪽 한 칸 이동해요."
      ]
    ],
    "activity": "화면의 실행 버튼으로 명령대로 이동한 로봇을 확인해요. 벽에서는 멈춰요.",
    "observed": [
      "별에 도착했어",
      "벽에서 멈췄거나 다른 칸에 도착했어",
      "결과를 잘 모르겠어"
    ],
    "screen": true
  },
  "snack_votes": {
    "scene": [
      "가족 세 명의 간식 투표",
      "🍎 🍌 🍇",
      "한 사람 한 표, 스티커 3개"
    ],
    "look": [
      "과일 세 가지",
      "가족 세 사람",
      "표시할 스티커 세 개"
    ],
    "goal": "가족 세 명의 표를 빠짐없이 한 사람 한 표씩 세기",
    "methods": [
      [
        "과일 아래 스티커 붙이기",
        "과일 그림 3개 아래에 각자 스티커 1개를 붙여요."
      ],
      [
        "종이에 표시하기",
        "과일 이름 옆에 각자 표시 1개를 남겨요."
      ],
      [
        "블록으로 표 쌓기",
        "과일마다 블록을 놓을 자리를 정하고 각자 블록 1개를 놓아요."
      ]
    ],
    "activity": "가족 3명이 모두 한 표씩 고르고 표를 세어요. 합계가 3인지 확인해요. 동점이면 함께 다음 선택 방법을 정해요. 음식 알레르기는 어른이 확인해요.",
    "observed": [
      "표 3개를 모두 셌어",
      "표가 3개가 아니거나 누가 빠졌어",
      "결과를 잘 모르겠어"
    ]
  },
  "fair_share": {
    "scene": [
      "블록 9개를 나눠요",
      "A: 2개 필요 / B: 3개 필요 / C: 4개 필요",
      "● ● ● ● ● ● ● ● ●"
    ],
    "look": [
      "A가 필요한 2개",
      "B가 필요한 3개",
      "C가 필요한 4개"
    ],
    "goal": "세 친구에게 필요한 수만큼 블록 9개를 나눠 주기",
    "methods": [
      [
        "3개·3개·3개",
        "세 친구에게 똑같이 3개씩 나눠요."
      ],
      [
        "2개·3개·4개",
        "각 친구에게 필요한 수만큼 나눠요."
      ],
      [
        "4개·3개·2개",
        "A부터 4개, 3개, 2개로 나눠요."
      ]
    ],
    "activity": "화면에서 블록을 나눠 보고 각 친구가 필요한 수를 받았는지 확인해요.",
    "observed": [
      "세 친구 모두 필요한 수를 받았어",
      "필요한 수가 모자란 친구가 있어",
      "결과를 잘 모르겠어"
    ],
    "screen": true
  },
  "reusable_pack": {
    "scene": [
      "두 가지 소풍 준비물",
      "일회용 컵·봉지·포장 ↔ 물병·도시락통",
      "물과 간식의 양은 같게 준비해요."
    ],
    "look": [
      "한 번 쓰는 컵",
      "한 번 쓰는 봉지",
      "다시 쓸 물병과 도시락통"
    ],
    "goal": "같은 물과 간식을 챙기면서 버릴 포장 수를 줄이기",
    "methods": [
      [
        "일회용 컵만 물병으로 바꾸기",
        "물은 물병에, 간식은 기존 봉지에 넣어요."
      ],
      [
        "간식 봉지를 도시락통으로 바꾸기",
        "물은 기존 컵에, 간식은 도시락통에 넣어요."
      ],
      [
        "물병과 도시락통 모두 쓰기",
        "물병과 도시락통에 같은 물과 간식을 넣어요."
      ]
    ],
    "activity": "깨끗한 빈 준비물로 바꾸기 전과 후를 펼쳐 놓고 버릴 물건 수를 비교해요. 실제 쓰레기는 만지지 않아요.",
    "observed": [
      "버릴 물건 수가 줄었어",
      "같거나 더 늘었어",
      "결과를 잘 모르겠어"
    ]
  },
  "seed_sun": {
    "scene": [
      "같은 종류의 식물 두 개",
      "화분 A ☀     화분 B ▧",
      "같은 흙·같은 물·다른 장소"
    ],
    "look": [
      "햇빛이 드는 곳",
      "빛이 적은 곳",
      "크기가 비슷한 화분"
    ],
    "goal": "빛이 다른 장소에서 같은 종류의 식물이 어떻게 자라는지 비교하기",
    "methods": [
      [
        "밝은 창가와 밝은 그늘",
        "같은 방의 밝은 창가와 빛이 덜 드는 곳에 놓아요."
      ],
      [
        "밝은 곳과 더 어두운 실내",
        "어른과 함께 두 안전한 장소를 정해요."
      ],
      [
        "창에서 가까운 곳과 조금 먼 곳",
        "같은 방에서 창과의 거리만 다르게 놓아요."
      ]
    ],
    "activity": "같은 종류·비슷한 크기의 식물 2개, 같은 크기 화분·같은 물을 준비해요. 7일 동안 같은 시각에 키를 재고 잎 색도 봐요. 장소별 온도 차이도 있을 수 있어요. 어린이가 혼자 식물을 먹거나 만지지 않아요.",
    "observed": [
      "첫 번째 장소의 식물이 더 많이 자랐어",
      "두 번째 장소의 식물이 더 많이 자랐어",
      "비슷하거나 구별하기 어려웠어"
    ],
    "compare": true,
    "conditions": [
      [
        "밝은 창가",
        "밝은 그늘"
      ],
      [
        "밝은 곳",
        "더 어두운 실내"
      ],
      [
        "창 가까이",
        "창에서 먼 곳"
      ]
    ]
  }
}''')
VISUAL_IDS = frozenset(CONTENT)
VERSION = 1
SUFFIX = "__visual_v1"


def visual_key(mid: str) -> str:
    if mid not in VISUAL_IDS:
        raise ValueError("unknown visual mission")
    return mid + SUFFIX


def valid_index(value: Any) -> bool:
    return type(value) is int and 0 <= value < 3


def simulate(mid: str, method: int) -> dict[str, Any]:
    if not valid_index(method):
        raise ValueError("invalid method")
    if mid == "sorting_cards":
        values = [4, 1, 3, 2]
        if method in (0, 1):
            for _ in range(1 if method == 0 else len(values)):
                for i in range(len(values) - 1):
                    if values[i] > values[i+1]:
                        values[i], values[i+1] = values[i+1], values[i]
        else:
            remaining = values[:]
            values = []
            while remaining:
                number = min(remaining)
                remaining.remove(number)
                values.append(number)
        return {"outcome": int(values != [1,2,3,4]), "values": values}
    if mid == "route_debug":
        commands = (((1,0),(1,0),(0,-1),(0,-1)),
                    ((0,-1),(1,0),(1,0),(0,-1)),
                    ((0,-1),(0,-1),(1,0)))[method]
        path = [(0,2)]
        for dx, dy in commands:
            x, y = path[-1]
            target = (x+dx,y+dy)
            if target == (1,1) or not all(0 <= n < 3 for n in target):
                break
            path.append(target)
        return {"outcome": int(path[-1] != (2,0)), "path": path}
    if mid == "fair_share":
        values = ((3,3,3),(2,3,4),(4,3,2))[method]
        return {"outcome": int(any(a < b for a,b in zip(values,(2,3,4)))), "values": values}
    raise ValueError("not an on-screen simulation")


def stage_for(mid: str, step: int, answers: dict[str, Any]) -> dict[str, Any]:
    d = CONTENT[mid]
    if type(step) is not int or not 0 <= step < 5:
        raise ValueError("invalid step")
    if any(not valid_index(answers.get(str(i))) for i in range(step)):
        raise ValueError("missing or invalid previous choice")
    if step and answers.get("_visual_v") != VERSION:
        raise ValueError("incompatible version")
    if step == 0:
        return dict(label="그림 살펴보기", prompt="그림에서 어디를 먼저 살펴볼까?", options=d["look"],
                    context=d["scene"][0], hint="그림에서 실제로 보이는 것과 생각한 것을 구분해 이야기해 주세요.")
    if step == 1:
        return dict(label="방법 고르기", prompt="이 목표를 이루려면 어떤 방법을 해볼까?", options=[m[0] for m in d["methods"]],
                    context="살펴본 곳: " + d["look"][answers["0"]] + " · 우리 목표: " + d["goal"], hint="하나를 골라 실제로 시험하고 다른 방법은 다음에 해보세요.")
    method = d["methods"][answers["1"]]
    comparison = d.get("compare", False)
    conditions = d.get("conditions", [])[answers["1"]] if comparison else None
    if step == 2:
        options = [f"{conditions[0]} 쪽일 것 같아", f"{conditions[1]} 쪽일 것 같아", "비슷하거나 잘 모르겠어"] if comparison else [
            "목표를 이룰 것 같아","아직 어려울 것 같아","해봐야 알겠어"]
        return dict(label="결과 예상하기", prompt=("어느 쪽이 먼저 마를까?" if mid == "leaf_dry" else "어느 쪽이 더 많이 자랄까?" if mid == "seed_sun" else "이 방법으로 해보면 어떻게 될까?"), options=options,
                    context=d["goal"] + " · 방법: " + method[0], hint="어떤 결과가 나올지 이유를 물어보세요. 틀려도 괜찮습니다.")
    predicted = stage_for(mid, 2, answers)["options"][answers["2"]]
    observations = ([f"{conditions[0]} 쪽이 먼저 말랐어",f"{conditions[1]} 쪽이 먼저 말랐어",d["observed"][2]]
                    if mid == "leaf_dry" else
                    [f"{conditions[0]} 쪽이 더 많이 자랐어",f"{conditions[1]} 쪽이 더 많이 자랐어",d["observed"][2]]
                    if mid == "seed_sun" else d["observed"])
    if step == 3:
        return dict(label="직접 확인하기", prompt="해본 뒤 어떤 결과를 보았니?", options=observations,
                    context=d["goal"] + " · 예상: " + predicted,
                    offline=method[1] + " " + d["activity"],
                    hint="실제 관찰한 내용만 고르세요. 결과가 불분명하면 모른다고 해도 괜찮아요.",
                    screen=d.get("screen", False))
    result = observations[answers["3"]]
    if answers["3"] == 2:
        prompt = "잘 모르겠다면 무엇을 다시 살펴볼까?"
    elif answers["2"] == answers["3"]:
        prompt = "예상과 결과가 같았네. 어떻게 다시 확인할까?"
    elif answers["2"] == 2:
        prompt = "새롭게 발견했네. 다음에는 어떻게 해볼까?"
    else:
        prompt = "예상과 결과가 달랐네. 무엇을 바꿔볼까?"
    return dict(label="다시 생각하기", prompt=prompt,
                options=["같은 방법으로 다시 확인할래","다른 방법으로 해볼래","결과를 그림이나 말로 설명할래"],
                context="예상: " + predicted + " · 관찰: " + result,
                hint="아이에게 결과를 보고 알게 된 것과 다음 시도를 말하게 해 주세요.")


def scene_svg(mid: str, result: dict[str, Any] | None = None) -> str:
    """All data is fixed authored content. Escape every text value."""
    d = CONTENT[mid]
    bg = '<rect width="720" height="320" rx="18" fill="#f5faf7"/>'
    def label(x, y, value, size=25, color="#173b3c"):
        return f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" fill="{color}" font-family="sans-serif" font-weight="700">{escape(str(value))}</text>'
    def rect(x,y,w,h,fill="#dcecf3"):
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="#78939d" stroke-width="2"/>'
    def circle(x,y,fill="#f6bf5a",r=13):
        return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="#a46c3a" stroke-width="2"/>'
    if mid == "route_debug":
        out = bg
        for y in range(3):
            for x in range(3):
                out += rect(220+x*90,22+y*90,82,82,"#627485" if (x,y)==(1,1) else "#e0f4ec")
        out += label(441,76,"★",46,"#d99512") + label(261,256,"로봇",22)
        if result:
            pts = [(261+x*90,63+y*90) for x,y in result["path"]]
            coords = " ".join(f"{x},{y}" for x,y in pts)
            out += f'<polyline points="{coords}" stroke="#137d85" stroke-width="8" fill="none" stroke-linecap="round"/>'
            out += circle(*pts[-1],"#fa8664",19)
        return out
    if mid == "sorting_cards":
        nums = result["values"] if result else [4,1,3,2]
        out = bg + label(360,52,"작은 수부터 → 큰 수",29)
        for i,n in enumerate(nums):
            out += rect(102+i*135,91,112,120,"#fff2bc") + label(158+i*135,169,n,48)
        return out + label(360,269,"실행한 순서" if result else "처음 카드 순서",25)
    if mid == "fair_share":
        out = bg + label(360,43,"필요한 수: 2 / 3 / 4",28)
        for i,needed in enumerate((2,3,4)):
            x=72+i*216
            out += rect(x,70,188,126,"#e6effc") + label(x+94,100,f"{'ABC'[i]} : {needed}개 필요",22)
            if result:
                for n in range(result["values"][i]):
                    out += circle(x+35+n*38,151)
        if not result:
            for n in range(9):
                out += circle(120+n*60,251)
        return out
    if mid == "paper_bridge":
        return bg+rect(80,145,125,120,"#aebcf0")+rect(515,145,125,120,"#aebcf0")+ '<path d="M125 140 Q360 205 595 140" fill="none" stroke="#d7ad58" stroke-width="14"/>'+circle(360,167)+label(360,56,"종이 다리",30)+label(360,300,"책 사이 간격은 그대로!",24)
    if mid == "leaf_dry":
        out=bg
        for x in (200,520):
            out+=f'<ellipse cx="{x}" cy="150" rx="95" ry="54" fill="#74ae68" transform="rotate(-25 {x} 150)"/><path d="M{x-70} 185 L{x+70} 115" stroke="#386a3e" stroke-width="5"/>'
            out+=circle(x-15,137,"#82c9ec",11)+circle(x+28,155,"#82c9ec",11)+circle(x-35,169,"#82c9ec",11)
        return out+label(200,258,"잎 A",30)+label(520,258,"잎 B",30)
    if mid == "ball_run":
        return bg+circle(95,85,"#ffcf70",25)+'<path d="M70 112 L550 238" stroke="#ce9d69" stroke-width="18" fill="none"/>'+rect(550,190,112,95,"#9bc5ad")+label(100,52,"출발",24)+label(606,180,"상자",24)
    if mid == "seed_sun":
        out=bg+circle(90,56,"#f6c453",28)+rect(395,22,245,180,"#d0d7e0")
        for x in (200,520):
            out+=rect(x-65,200,130,75,"#ca8b60")+f'<path d="M{x} 200 V90" stroke="#508d55" stroke-width="8"/><ellipse cx="{x-26}" cy="125" rx="35" ry="16" fill="#79b978"/><ellipse cx="{x+26}" cy="155" rx="35" ry="16" fill="#79b978"/>'
        return out+label(200,303,"A",23)+label(520,303,"B",23)
    def person(x,y,color="#78aacc"):
        return circle(x,y,"#efba8c",19)+rect(x-19,y+22,38,47,color)
    def car(x,y,color="#e87d72"):
        return rect(x,y,76,31,color)+circle(x+17,y+33,"#637585",9)+circle(x+59,y+33,"#637585",9)
    if mid == "missing_sign":
        out=bg+rect(44,62,84,154,"#c79c69")+label(86,249,"문",26)
        out+='<path d="M140 145 H285 M285 145 L400 73 M285 145 H400 M285 145 L400 217" stroke="#8eada9" stroke-width="8" fill="none"/>'
        for y in (40,112,184):
            out+=rect(410,y,200,55,"#e5b574")+label(510,y+36,"?",32)
        return out+label(360,302,"어느 상자일까?",26)
    if mid == "lost_toy":
        out=bg+rect(40,120,300,55,"#b67c50")+rect(65,175,18,60,"#855c40")+rect(295,175,18,60,"#855c40")
        out+=car(145,88)+person(505,135,"#a8b5e5")
        out+=rect(453,45,210,52,"#fff9e6")+label(558,79,"내 거야!",26)+label(185,276,"자동차에 이름표가 없어요",22)
        return out
    if mid == "raincoat_story":
        out=bg
        for x in range(30,680,55):
            out+=f'<path d="M{x} 8 l-10 20 M{x+20} 44 l-10 20" stroke="#75b8d4" stroke-width="4"/>'
        out+=person(130,161,"#a6c6e9")+person(318,169,"#d6b99d")
        out+='<path d="M64 126 Q132 32 200 126Z" fill="#79b6db" stroke="#4e849d" stroke-width="4"/><path d="M132 126 V179" stroke="#4e849d" stroke-width="5"/>'
        out+='<path d="M482 116 L578 48 L674 116Z" fill="#bc8965"/><path d="M500 116 V235 M657 116 V235" stroke="#997358" stroke-width="12"/>'
        return out+label(130,268,"토끼",24)+label(318,268,"고슴도치",24)+label(578,268,"쉼터",24)
    if mid == "tidy_room":
        out=bg+rect(30,38,365,210,"#f9ead6")
        out+=car(58,77)+car(260,155,"#6e9ed2")
        for x,y,c in ((180,68,"#e78b77"),(240,65,"#79a7db"),(110,156,"#79a7db"),(185,145,"#e78b77")):
            out+=rect(x,y,42,42,c)
        out+=rect(430,52,240,83,"#d4e9f5")+rect(430,151,240,83,"#e4efda")
        return out+label(210,287,"뒤죽박죽",26)+label(550,280,"빈 상자",26)
    if mid == "family_turns":
        out=bg+person(115,120,"#79a7db")+person(360,120,"#e5a0b2")+person(605,120,"#8cbc8d")
        out+=car(77,204)+label(115,65,"사용 중",25)+label(360,65,"기다려요",25)+label(605,65,"기다려요",25)
        return out+label(360,291,"장난감은 하나",26)
    if mid == "snack_votes":
        out=bg
        for i, name in enumerate(("사과","바나나","포도")):
            x=125+i*235
            out+=person(x,45,("#7ca9db","#e4a0b2","#86b78b")[i])+circle(x,160,"#f5be61",15)
            out+=rect(x-90,201,180,68,"#fff2d8")+label(x,245,name,27)
        return out+label(360,307,"한 사람 한 표",25)
    if mid == "reusable_pack":
        out=bg+rect(30,40,320,220,"#f9ead6")+rect(370,40,320,220,"#e3f1e7")
        out+=rect(70,100,72,92,"#ffffff")+rect(190,106,115,91,"#e9d1a6")+label(190,72,"한 번 쓰기",25)
        out+=rect(420,76,66,126,"#86bed7")+rect(430,63,46,18,"#6d9ab7")+rect(534,111,125,84,"#8dc7a0")
        out+=label(530,72,"다시 쓰기",25)
        return out+label(190,290,"컵 + 봉지",25)+label(530,290,"물병 + 도시락통",25)
    # These scenarios use an original three-part diagram with concrete objects and labels.
    labels = {
        "missing_sign": ("문","?","자동차 상자"),
        "lost_toy": ("벤치","자동차","이름표 없음"),
        "raincoat_story": ("토끼 ☂","고슴도치","쉼터"),
        "tidy_room": ("자동차","블록","정리 상자"),
        "family_turns": ("친구 A","친구 B","친구 C"),
        "snack_votes": ("사과","바나나","포도"),
        "reusable_pack": ("일회용 컵","물병","도시락통"),
    }[mid]
    out=bg
    for i,v in enumerate(labels):
        x=45+i*225
        out+=rect(x,45,190,170,("#fce8c7","#dcecf3","#d8efdb")[i])
        # Simple pictograms reinforce the concrete object rather than decorate the question.
        if mid == "missing_sign":
            out += rect(x+62,65,65,100,"#c79c69") if i==0 else (label(x+95,131,"?",65) if i==1 else rect(x+45,105,100,55,"#efb772"))
        elif mid == "lost_toy":
            out += rect(x+22,118,146,35,"#ba865a") if i==0 else (rect(x+35,98,120,48,"#e87d72")+circle(x+55,151,"#627485")+circle(x+135,151,"#627485") if i==1 else label(x+95,130,"?",62))
        elif mid == "raincoat_story":
            out += '<path d="M'+str(x+38)+' 106 Q'+str(x+95)+' 30 '+str(x+152)+' 106 Z" fill="#79b6db"/>' if i==0 else (circle(x+95,105,"#ac8263",29) if i==1 else rect(x+45,77,100,80,"#8eabb0"))
        elif mid == "tidy_room":
            out += rect(x+35,100,120,45,"#eb8f7d")+circle(x+55,151,"#627485")+circle(x+135,151,"#627485") if i==0 else (rect(x+30,80,50,50,"#df8673")+rect(x+90,105,50,50,"#6b9fce") if i==1 else rect(x+35,90,120,75,"#e1b376"))
        elif mid == "family_turns":
            out += circle(x+95,85,"#efba8c",22)+rect(x+70,111,50,54,("#7ca9db","#e4a0b2","#86b78b")[i])
        elif mid == "snack_votes":
            if i==0: out+=circle(x+95,111,"#e77a76",35)
            elif i==1: out+=f'<path d="M{x+42} 90 Q{x+75} 175 {x+150} 120 Q{x+98} 140 {x+70} 80Z" fill="#f4cf58" stroke="#ab8b38" stroke-width="3"/>'
            else:
                for dx,dy in ((-20,-14),(20,-14),(0,10),(-20,32),(20,32),(0,53)): out+=circle(x+95+dx,95+dy,"#a287c1",17)
        else:
            out += rect(x+68,80,55,90,"#fafafa") if i==0 else (rect(x+66,65,60,110,"#84b9d2") if i==1 else rect(x+32,100,126,65,"#a6caa2"))
        out+=label(x+95,196,v,23)
    return out+label(360,275,d["scene"][2],20)


def render_visual(mid, title, progress, on_save, on_reload, conflict_type, highlight):
    d = CONTENT[mid]
    ui.label(title).classes("text-h5 text-weight-bold")
    ui.label("그림을 보고, 생각하고, 직접 확인해요.").classes("text-body1")
    area = ui.column().classes("w-full gap-3")
    view = {"step": progress["step_index"], "generation": 0}

    def render():
        view["generation"] += 1
        generation = view["generation"]
        revision = progress["revision"]
        area.clear()
        with area:
            step = view["step"]

            def go_to(target):
                if view["generation"] == generation:
                    view["step"] = target
                    render()

            if step == 5:
                ui.label("탐험을 마쳤어요! 🌟").classes("text-h5")
                ui.label("내가 발견한 결과를 가족에게 설명해 보자.")
                ui.button("처음부터 다시 보기", on_click=lambda: go_to(0))
                ui.button("이전 단계", on_click=lambda: go_to(4))
                return
            answers = progress["answers"]
            reviewing = step < progress["step_index"]
            stage = stage_for(mid, step, answers)
            ui.label(f"{step+1}/5 · {stage['label']}").classes("text-subtitle1 text-teal-8")
            ui.linear_progress(value=step/5).classes("w-full")
            already_observed = reviewing and step == 3 and bool(answers.get("_activity_confirmed"))
            picture_result = simulate(mid, answers["1"]) if d.get("screen") and (step == 4 or already_observed) else None
            picture = ui.interactive_image(size=(720,320), content=scene_svg(mid, picture_result), sanitize=False).classes("w-full")
            ui.label(d["scene"][2]).classes("text-body2 text-grey-8")
            ui.label(stage["context"]).classes("text-body1")
            ui.label(stage["prompt"]).classes("text-h6")
            chosen = {"index": None, "ran": already_observed}
            if step == 3:
                ui.label(stage["offline"]).classes("text-body1")
                if stage["screen"]:
                    def run():
                        result=simulate(mid,answers["1"])
                        picture.set_content(scene_svg(mid,result))
                        chosen["ran"]=True
                        ui.notify("그림에 나온 결과를 확인해 보자.")
                    ui.button("화면에서 실행해 보기", on_click=run).classes("w-full min-h-14")
                    confirmation = None
                else:
                    confirmation=ui.checkbox("어른과 직접 해보고 결과를 확인했어요.", value=already_observed)
            else:
                confirmation=None
            buttons=[]
            status=ui.label("한 가지를 골라 보세요.")
            def choose(index):
                chosen["index"]=index
                highlight(buttons,stage["options"],index)
                status.set_text("선택: "+stage["options"][index])
            for i,label in enumerate(stage["options"]):
                buttons.append(ui.button(label,on_click=lambda i=i:choose(i)).props(
                    "outline no-caps color=teal-9 aria-pressed=false").classes("w-full min-h-14 text-left"))
            if reviewing:
                choose(answers[str(step)])
                ui.label("이전 선택을 바꾸고 저장하면 그 뒤의 답을 다시 골라야 해요.").classes("text-caption")
            with ui.expansion("보호자 도움말").classes("w-full"):
                ui.label(stage["hint"])
            def advance():
                if view["generation"] != generation:
                    return
                index=chosen["index"]
                if index is None:
                    ui.notify("한 가지를 골라 보자.")
                    return
                verified=step==3 and (chosen["ran"] if stage.get("screen") else bool(confirmation.value))
                if step==3 and not verified:
                    ui.notify("먼저 직접 해보고 결과를 확인해요.")
                    return
                if step==3 and stage.get("screen") and index != simulate(mid,answers["1"])["outcome"]:
                    ui.notify("그림의 실제 결과를 한 번 더 살펴보자.")
                    return
                try:
                    progress.update(on_save(step,index,revision,verified,reviewing))
                    view["step"] = min(step + 1, progress["step_index"])
                except conflict_type:
                    ui.notify("다른 화면에서 이미 진행했어요. 최신 기록으로 갱신할게요.")
                    progress.update(on_reload())
                    view["step"] = progress["step_index"]
                except (sqlite3.Error,ValueError):
                    ui.notify("저장하지 못했어요. 다시 확인해 주세요.")
                    return
                render()
            if step > 0:
                ui.button("이전 단계", on_click=lambda: go_to(step - 1)).props("outline no-caps").classes("w-full min-h-12")
            ui.button("탐험 완료" if step==4 else "저장하고 다음으로",on_click=advance).classes("w-full min-h-14 bg-teal text-white")
    render()
