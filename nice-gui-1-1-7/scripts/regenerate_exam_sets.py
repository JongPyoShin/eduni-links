import json
import random
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\jongp\Documents\Codex\2026-06-05\files-mentioned-by-the-user-oracle\outputs")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def regenerate_oracle_sets() -> None:
    base_sets = [
        read_json(OUTPUT_DIR / "oracle_quiz_set_01.json"),
        read_json(OUTPUT_DIR / "oracle_quiz_set_02.json"),
        read_json(OUTPUT_DIR / "oracle_quiz_set_03.json"),
    ]
    question_pool = []
    seen = set()
    for data in base_sets:
        for question in data["questions"]:
            key = question["question"]
            if key not in seen:
                seen.add(key)
                question_pool.append({k: v for k, v in question.items() if k != "number"})

    for set_no in range(1, 11):
        rng = random.Random(6100 + set_no)
        start = ((set_no - 1) * 17) % len(question_pool)
        rotated = question_pool[start:] + question_pool[:start]
        selected = rotated[:25]
        if len(selected) < 25:
            selected += question_pool[: 25 - len(selected)]
        if set_no > 3:
            # Shuffle later sets gently so they do not feel like exact repeats.
            selected = selected[:]
            rng.shuffle(selected)

        questions = []
        for index, question in enumerate(selected, 1):
            item = dict(question)
            item["number"] = index
            questions.append(item)

        write_json(
            OUTPUT_DIR / f"oracle_quiz_set_{set_no:02d}.json",
            {
                "set_id": f"oracle_quiz_set_{set_no:02d}",
                "title": f"Oracle DB 사내 접근 인증시험 문제 세트 {set_no:02d}",
                "source_files": [
                    "Oracle_DB_사내인증_실전문제_30.pdf",
                    "Oracle_DB_사내접근_인증시험_학습자료.pdf",
                ],
                "questions": questions,
            },
        )


def load_hanja_entries(filename: str) -> list[tuple[str, str, str]]:
    data = read_json(OUTPUT_DIR / filename)
    return [tuple(item) for item in data["entries"]]


def make_choice_question(
    number: int,
    entry: tuple[str, str, str],
    entries: list[tuple[str, str, str]],
    grade: str,
    rng: random.Random,
) -> dict:
    char, meaning, sound = entry
    correct_meaning_sound = f"{meaning} {sound}"
    mode = (number - 1) % 3
    base_note = (
        f"정답 한자는 {char}입니다. 뜻은 '{meaning}', 음은 '{sound}'입니다. "
        f"따라서 뜻과 음을 함께 읽으면 '{correct_meaning_sound}'입니다. "
        "한자를 외울 때는 먼저 글자 모양을 보고, 그다음 뜻과 음을 한 묶음으로 소리 내어 읽으면 기억하기 쉽습니다."
    )

    if mode == 0:
        candidates = [f"{m} {s}" for c, m, s in entries if c != char]
        rng.shuffle(candidates)
        choices = [correct_meaning_sound] + candidates[:3]
        rng.shuffle(choices)
        wrong_notes = [
            f"'{choice}'는 이 문제의 한자 {char}에 해당하는 뜻과 음이 아닙니다."
            for choice in choices
            if choice != correct_meaning_sound
        ]
        return {
            "number": number,
            "type": "choice",
            "topic": "뜻과 음",
            "question": f"한자 '{char}'의 뜻과 음으로 알맞은 것은?",
            "choices": choices,
            "answer": choices.index(correct_meaning_sound) + 1,
            "explanation": (
                f"{base_note} 이 문제는 한자를 보고 뜻과 음을 고르는 문제입니다. "
                f"보기 중 '{correct_meaning_sound}'만 {char}의 정확한 뜻과 음입니다. "
                + " ".join(wrong_notes[:2])
            ),
        }

    if mode == 1:
        candidates = [c for c, m, s in entries if c != char]
        rng.shuffle(candidates)
        choices = [char] + candidates[:3]
        rng.shuffle(choices)
        return {
            "number": number,
            "type": "choice",
            "topic": "한자 찾기",
            "question": f"뜻과 음이 '{correct_meaning_sound}'인 한자는?",
            "choices": choices,
            "answer": choices.index(char) + 1,
            "explanation": (
                f"{base_note} 이 문제는 뜻과 음을 보고 알맞은 한자 모양을 찾는 문제입니다. "
                f"'{meaning}'이라는 뜻과 '{sound}'이라는 음을 동시에 만족하는 글자는 {char}입니다. "
                "비슷해 보이는 한자가 있어도 음만 맞거나 뜻만 맞으면 정답이 아닙니다."
            ),
        }

    candidates = []
    for _, _, candidate_sound in entries:
        if candidate_sound != sound and candidate_sound not in candidates:
            candidates.append(candidate_sound)
    rng.shuffle(candidates)
    choices = [sound] + candidates[:3]
    rng.shuffle(choices)
    return {
        "number": number,
        "type": "choice",
        "topic": "음 읽기",
        "question": f"한자 '{char}'의 음으로 알맞은 것은?",
        "choices": choices,
        "answer": choices.index(sound) + 1,
        "explanation": (
            f"{base_note} 이 문제는 한자의 음, 즉 읽는 소리를 고르는 문제입니다. "
            f"{char}는 '{sound}'라고 읽습니다. 뜻은 '{meaning}'이므로, "
            f"전체 뜻과 음은 '{correct_meaning_sound}'로 함께 외우면 좋습니다. "
            "오답의 음들은 다른 한자에서 쓰일 수 있지만 이 글자의 읽는 소리는 아닙니다."
        ),
    }


def make_hanja_set(set_no: int, grade: str, round_no: int, entries: list[tuple[str, str, str]]) -> dict:
    rng = random.Random(7200 + set_no)
    block_size = 30
    start = ((round_no - 1) * block_size) % len(entries)
    selected = entries[start : start + block_size]
    if len(selected) < block_size:
        selected += entries[: block_size - len(selected)]

    questions = [
        make_choice_question(index, entry, entries, grade, rng)
        for index, entry in enumerate(selected, 1)
    ]
    return {
        "set_id": f"hanja_quiz_set_{set_no:02d}",
        "title": f"한자 {grade} 대비 {round_no}회 모의시험",
        "grade": f"{grade} 대비",
        "source_note": f"사용자 첨부 {grade} 한자표를 기준으로 출제",
        "questions": questions,
    }


def regenerate_hanja_sets() -> None:
    grade_7 = load_hanja_entries("hanja_grade_7_chars.json")
    grade_6 = load_hanja_entries("hanja_grade_6_chars.json")

    # Base set layout:
    # - 01-04: 7급
    # - 05-10: 6급
    # - 11-20: additional 7급 practice sets
    for set_no in range(1, 5):
        write_json(
            OUTPUT_DIR / f"hanja_quiz_set_{set_no:02d}.json",
            make_hanja_set(set_no, "7급", set_no, grade_7),
        )

    for set_no in range(5, 11):
        write_json(
            OUTPUT_DIR / f"hanja_quiz_set_{set_no:02d}.json",
            make_hanja_set(set_no, "6급", set_no - 4, grade_6),
        )

    for set_no in range(11, 21):
        write_json(
            OUTPUT_DIR / f"hanja_quiz_set_{set_no:02d}.json",
            make_hanja_set(set_no, "7급", set_no - 6, grade_7),
        )


def validate() -> None:
    for pattern in ("oracle_quiz_set_*.json", "hanja_quiz_set_*.json"):
        for path in sorted(OUTPUT_DIR.glob(pattern)):
            if path.name.endswith("_answers.json"):
                continue
            data = read_json(path)
            text = json.dumps(data, ensure_ascii=False)
            if "??" in text:
                raise RuntimeError(f"Possible mojibake remains in {path.name}")
            for question in data["questions"]:
                if question.get("type", "choice") == "choice":
                    answer = question["answer"]
                    choices = question["choices"]
                    if not 1 <= answer <= len(choices):
                        raise RuntimeError(f"Invalid answer in {path.name} question {question['number']}")


def main() -> None:
    regenerate_oracle_sets()
    regenerate_hanja_sets()
    validate()
    print("Regenerated 10 Oracle DB sets and 20 Hanja sets without mojibake.")


if __name__ == "__main__":
    main()
