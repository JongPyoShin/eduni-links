import json
import random
from pathlib import Path


OUTPUT_DIR = Path(r"C:\Users\jongp\Documents\Codex\2026-06-05\files-mentioned-by-the-user-oracle\outputs")


GRADE_7_ENTRIES = [
    ("家", "집", "가"), ("歌", "노래", "가"), ("間", "사이", "간"), ("江", "강", "강"), ("車", "수레", "거"),
    ("工", "장인", "공"), ("空", "빌", "공"), ("校", "학교", "교"), ("教", "가르칠", "교"), ("九", "아홉", "구"),
    ("口", "입", "구"), ("國", "나라", "국"), ("軍", "군사", "군"), ("金", "쇠", "금"), ("旗", "기", "기"),
    ("氣", "기운", "기"), ("記", "기록할", "기"), ("南", "남녘", "남"), ("男", "사내", "남"), ("內", "안", "내"),
    ("女", "계집", "녀"), ("年", "해", "년"), ("農", "농사", "농"), ("答", "대답", "답"), ("大", "큰", "대"),
    ("道", "길", "도"), ("冬", "겨울", "동"), ("動", "움직일", "동"), ("東", "동녘", "동"), ("同", "한가지", "동"),
    ("洞", "골", "동"), ("登", "오를", "등"), ("來", "올", "래"), ("力", "힘", "력"), ("老", "늙을", "로"),
    ("六", "여섯", "륙"), ("里", "마을", "리"), ("林", "수풀", "림"), ("立", "설", "립"), ("萬", "일만", "만"),
    ("每", "매양", "매"), ("面", "낯", "면"), ("名", "이름", "명"), ("命", "목숨", "명"), ("母", "어미", "모"),
    ("木", "나무", "목"), ("問", "물을", "문"), ("文", "글월", "문"), ("門", "문", "문"), ("物", "물건", "물"),
    ("民", "백성", "민"), ("方", "모", "방"), ("白", "흰", "백"), ("百", "일백", "백"), ("夫", "지아비", "부"),
    ("父", "아비", "부"), ("北", "북녘", "북"), ("不", "아닐", "불"), ("事", "일", "사"), ("四", "넉", "사"),
    ("山", "메", "산"), ("算", "셈", "산"), ("三", "석", "삼"), ("上", "윗", "상"), ("色", "빛", "색"),
    ("生", "날", "생"), ("西", "서녘", "서"), ("夕", "저녁", "석"), ("先", "먼저", "선"), ("姓", "성", "성"),
    ("世", "인간", "세"), ("小", "작을", "소"), ("少", "적을", "소"), ("所", "바", "소"), ("手", "손", "수"),
    ("數", "셈", "수"), ("水", "물", "수"), ("市", "저자", "시"), ("時", "때", "시"), ("植", "심을", "식"),
    ("食", "먹을", "식"), ("室", "집", "실"), ("心", "마음", "심"), ("十", "열", "십"), ("安", "편안", "안"),
    ("語", "말씀", "어"), ("然", "그럴", "연"), ("五", "다섯", "오"), ("午", "낮", "오"), ("王", "임금", "왕"),
    ("外", "바깥", "외"), ("右", "오른", "우"), ("月", "달", "월"), ("有", "있을", "유"), ("育", "기를", "육"),
    ("邑", "고을", "읍"), ("二", "두", "이"), ("人", "사람", "인"), ("一", "한", "일"), ("日", "날", "일"),
    ("入", "들", "입"), ("子", "아들", "자"), ("字", "글자", "자"), ("自", "스스로", "자"), ("場", "마당", "장"),
    ("長", "긴", "장"), ("全", "온전", "전"), ("前", "앞", "전"), ("電", "번개", "전"), ("正", "바를", "정"),
    ("弟", "아우", "제"), ("祖", "할아비", "조"), ("足", "발", "족"), ("左", "왼", "좌"), ("主", "주인", "주"),
    ("住", "살", "주"), ("中", "가운데", "중"), ("重", "무거울", "중"), ("地", "따", "지"), ("紙", "종이", "지"),
    ("直", "곧을", "직"), ("千", "일천", "천"), ("天", "하늘", "천"), ("川", "내", "천"), ("靑", "푸를", "청"),
    ("草", "풀", "초"), ("寸", "마디", "촌"), ("村", "마을", "촌"), ("秋", "가을", "추"), ("春", "봄", "춘"),
    ("出", "날", "출"), ("七", "일곱", "칠"), ("土", "흙", "토"), ("八", "여덟", "팔"), ("便", "편할", "편"),
    ("平", "평평할", "평"), ("下", "아래", "하"), ("夏", "여름", "하"), ("學", "배울", "학"), ("漢", "한수", "한"),
    ("韓", "한국", "한"), ("海", "바다", "해"), ("兄", "형", "형"), ("火", "불", "화"), ("花", "꽃", "화"),
    ("話", "말씀", "화"), ("活", "살", "활"), ("孝", "효도", "효"), ("後", "뒤", "후"), ("休", "쉴", "휴"),
]

LOW_LEVEL_TARGET_CHARS = {
    "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "萬",
    "上", "下", "左", "右", "大", "小", "男", "女", "父", "母", "東", "西", "南", "北",
    "日", "月", "火", "水", "木", "金", "土",
}

EXAMPLE_WORDS = {
    "家": ["家族(가족)", "家庭(가정)"], "歌": ["歌手(가수)", "童謠歌(동요가)"], "間": ["時間(시간)", "中間(중간)"],
    "江": ["漢江(한강)", "江물"], "車": ["自動車(자동차)", "車道(차도)"], "工": ["工夫(공부)", "工場(공장)"],
    "空": ["空氣(공기)", "空間(공간)"], "校": ["學校(학교)", "校門(교문)"], "教": ["敎育/教育(교육)", "敎室/教室(교실)"],
    "九": ["九月(구월)", "九十(구십)"], "口": ["入口(입구)", "出口(출구)"], "國": ["韓國(한국)", "國語(국어)"],
    "軍": ["軍人(군인)", "軍隊(군대)"], "金": ["金요일", "金色(금색)"], "旗": ["國旗(국기)", "旗발"],
    "氣": ["空氣(공기)", "氣分(기분)"], "記": ["記錄(기록)", "日記(일기)"], "南": ["南쪽", "南大門(남대문)"],
    "男": ["男子(남자)", "男兒(남아)"], "內": ["內部(내부)", "案內(안내)"], "女": ["女子(여자)", "女兒(여아)"],
    "年": ["今年(금년)", "學年(학년)"], "農": ["農事(농사)", "農夫(농부)"], "答": ["答(답)", "應答(응답)"],
    "大": ["大門(대문)", "大韓(대한)"], "道": ["道路(도로)", "車道(차도)"], "冬": ["冬季(동계)", "겨울 冬"],
    "動": ["運動(운동)", "自動車(자동차)"], "東": ["東쪽", "東海(동해)"], "同": ["同생", "同一(동일)"],
    "洞": ["洞네", "洞口(동구)"], "登": ["登校(등교)", "登山(등산)"], "來": ["來日(내일)", "往來(왕래)"],
    "力": ["力士(역사)", "能力(능력)"], "老": ["老人(노인)", "老年(노년)"], "六": ["六月(유월)", "六十(육십)"],
    "里": ["마을 里", "洞里(동리)"], "林": ["森林(삼림)", "樹林(수림)"], "立": ["立場(입장)", "自立(자립)"],
    "萬": ["萬歲(만세)", "萬一(만일)"], "每": ["每日(매일)", "每年(매년)"], "面": ["顔面(안면)", "方面(방면)"],
    "名": ["名前/名(이름)", "有名(유명)"], "命": ["生命(생명)", "命令(명령)"], "母": ["母親(모친)", "父母(부모)"],
    "木": ["木요일", "나무 木"], "問": ["質問(질문)", "問答(문답)"], "文": ["文章(문장)", "作文(작문)"],
    "門": ["大門(대문)", "校門(교문)"], "物": ["物件(물건)", "動物(동물)"], "民": ["國民(국민)", "民俗(민속)"],
    "方": ["方向(방향)", "方法(방법)"], "白": ["白色(백색)", "白紙(백지)"], "百": ["百점", "百姓(백성)"],
    "夫": ["夫婦(부부)", "農夫(농부)"], "父": ["父母(부모)", "父親(부친)"], "北": ["北쪽", "北韓(북한)"],
    "不": ["不安(불안)", "不便(불편)"], "事": ["事件(사건)", "事物(사물)"], "四": ["四月(사월)", "四方(사방)"],
    "山": ["山길", "登山(등산)"], "算": ["算數(산수)", "計算(계산)"], "三": ["三月(삼월)", "三角(삼각)"],
    "上": ["上下(상하)", "上級(상급)"], "色": ["色깔", "金色(금색)"], "生": ["學生(학생)", "生命(생명)"],
    "西": ["西쪽", "西海(서해)"], "夕": ["夕方(석방)", "저녁 夕"], "先": ["先生(선생)", "先後(선후)"],
    "姓": ["姓名(성명)", "성 姓"], "世": ["世上(세상)", "世代(세대)"], "小": ["小學校(소학교)", "大小(대소)"],
    "少": ["少年(소년)", "多少(다소)"], "所": ["場所(장소)", "住所(주소)"], "手": ["手足(수족)", "選手(선수)"],
    "數": ["數學(수학)", "算數(산수)"], "水": ["水道(수도)", "江水(강수)"], "市": ["市長(시장)", "都市(도시)"],
    "時": ["時間(시간)", "時計(시계)"], "植": ["植物(식물)", "植木(식목)"], "食": ["食事(식사)", "食物(식물)"],
    "室": ["敎室/教室(교실)", "室內(실내)"], "心": ["心情(심정)", "中心(중심)"], "十": ["十月(시월)", "十字(십자)"],
    "安": ["安全(안전)", "不安(불안)"], "語": ["國語(국어)", "言語(언어)"], "然": ["自然(자연)", "當然(당연)"],
    "五": ["五月(오월)", "五十(오십)"], "午": ["午前(오전)", "午後(오후)"], "王": ["王子(왕자)", "王國(왕국)"],
    "外": ["外部(외부)", "外國(외국)"], "右": ["左右(좌우)", "右側(우측)"], "月": ["月요일", "年月(연월)"],
    "有": ["所有(소유)", "有名(유명)"], "育": ["敎育/教育(교육)", "育兒(육아)"], "邑": ["邑內(읍내)", "고을 邑"],
    "二": ["二月(이월)", "二十(이십)"], "人": ["人間(인간)", "軍人(군인)"], "一": ["一日(일일)", "同一(동일)"],
    "日": ["日記(일기)", "每日(매일)"], "入": ["入口(입구)", "入學(입학)"], "子": ["女子(여자)", "王子(왕자)"],
    "字": ["文字(문자)", "漢字(한자)"], "自": ["自動車(자동차)", "自然(자연)"], "場": ["場所(장소)", "市場(시장)"],
    "長": ["長男(장남)", "市長(시장)"], "全": ["安全(안전)", "全部(전부)"], "前": ["午前(오전)", "前後(전후)"],
    "電": ["電氣(전기)", "電話(전화)"], "正": ["正答(정답)", "正門(정문)"], "弟": ["兄弟(형제)", "弟子(제자)"],
    "祖": ["祖父(조부)", "祖國(조국)"], "足": ["手足(수족)", "不足(부족)"], "左": ["左右(좌우)", "左側(좌측)"],
    "主": ["主人(주인)", "主題(주제)"], "住": ["住所(주소)", "居住(거주)"], "中": ["中心(중심)", "中間(중간)"],
    "重": ["重要(중요)", "重心(중심)"], "地": ["地圖(지도)", "天地(천지)"], "紙": ["白紙(백지)", "종이 紙"],
    "直": ["正直(정직)", "直線(직선)"], "千": ["千字文(천자문)", "千年(천년)"], "天": ["天地(천지)", "天氣(천기)"],
    "川": ["川물", "河川(하천)"], "靑": ["靑色(청색)", "靑春(청춘)"], "草": ["草木(초목)", "풀 草"],
    "寸": ["寸數(촌수)", "마디 寸"], "村": ["村落(촌락)", "農村(농촌)"], "秋": ["秋夕(추석)", "가을 秋"],
    "春": ["春夏秋冬(춘하추동)", "靑春(청춘)"], "出": ["出口(출구)", "出入(출입)"], "七": ["七月(칠월)", "七十(칠십)"],
    "土": ["土地(토지)", "土요일"], "八": ["八月(팔월)", "八十(팔십)"], "便": ["方便(방편)", "不便(불편)"],
    "平": ["平安(평안)", "平地(평지)"], "下": ["上下(상하)", "下校(하교)"], "夏": ["夏季(하계)", "여름 夏"],
    "學": ["學校(학교)", "學生(학생)"], "漢": ["漢字(한자)", "漢江(한강)"], "韓": ["韓國(한국)", "韓文(한문)"],
    "海": ["東海(동해)", "海水(해수)"], "兄": ["兄弟(형제)", "兄님"], "火": ["火요일", "火災(화재)"],
    "花": ["花草(화초)", "꽃 花"], "話": ["電話(전화)", "會話(회화)"], "活": ["生活(생활)", "活動(활동)"],
    "孝": ["孝道(효도)", "孝子(효자)"], "後": ["午後(오후)", "前後(전후)"], "休": ["休息(휴식)", "休日(휴일)"],
}

OPPOSITES = {
    "南": "北(북녘 북)", "北": "南(남녘 남)", "男": "女(계집 녀)", "女": "男(사내 남)",
    "內": "外(바깥 외)", "外": "內(안 내)", "大": "小(작을 소)", "小": "大(큰 대)",
    "老": "少(적을 소)", "少": "老(늙을 로)", "東": "西(서녘 서)", "西": "東(동녘 동)",
    "上": "下(아래 하)", "下": "上(윗 상)", "左": "右(오른 우)", "右": "左(왼 좌)",
    "前": "後(뒤 후)", "後": "前(앞 전)", "出": "入(들 입)", "入": "出(날 출)",
    "有": "不(아닐 불)", "不": "有(있을 유)", "父": "母(어미 모)", "母": "父(아비 부)",
    "兄": "弟(아우 제)", "弟": "兄(형 형)", "天": "地(따 지)", "地": "天(하늘 천)",
    "春": "秋(가을 추)", "秋": "春(봄 춘)", "冬": "夏(여름 하)", "夏": "冬(겨울 동)",
    "白": "靑(푸를 청)", "靑": "白(흰 백)", "生": "休(쉴 휴)", "休": "活(살 활)",
}


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def meaning_sound(entry: tuple[str, str, str]) -> str:
    _, meaning, sound = entry
    return f"{meaning} {sound}"


def explanation_for(entry: tuple[str, str, str], mode_label: str) -> str:
    char, meaning, sound = entry
    term = f"{meaning} {sound}"
    particle = "과" if (ord(sound[-1]) - 0xAC00) % 28 else "와"
    examples = EXAMPLE_WORDS.get(char, [f"{char}({meaning} {sound})"])
    example_text = ", ".join(examples[:2])
    opposite_text = OPPOSITES.get(char)
    same_sound = [
        f"{other_char}({other_meaning} {other_sound})"
        for other_char, other_meaning, other_sound in GRADE_7_ENTRIES
        if other_char != char and other_sound == sound
    ][:3]
    similar_text = (", ".join(same_sound) + ".") if same_sound else "같은 음의 글자가 많지 않습니다."
    relation = f"반대 또는 짝이 되는 한자는 {opposite_text}입니다." if opposite_text else "뚜렷한 반대 한자보다는 함께 쓰이는 단어를 중심으로 익히면 좋습니다."
    return (
        f"정답은 {char}입니다. {char}의 뜻은 '{meaning}', 음은 '{sound}'입니다. "
        f"뜻과 음을 함께 쓰면 '{term}'입니다. "
        f"예시 단어는 {example_text}입니다. {relation} "
        f"헷갈릴 만한 같은 음의 7급 한자는 {similar_text} "
        f"{mode_label} 문제에서는 글자 모양만 외우지 말고, '{term}'{particle} 예시 단어를 함께 말해보면 기억에 더 잘 남습니다."
    )


def make_choice_question(
    number: int,
    entry: tuple[str, str, str],
    entries: list[tuple[str, str, str]],
    rng: random.Random,
) -> dict:
    char, meaning, sound = entry
    mode = (number - 1) % 3

    if mode == 0:
        correct = meaning_sound(entry)
        distractors = [meaning_sound(item) for item in entries if item[0] != char]
        rng.shuffle(distractors)
        choices = [correct] + distractors[:3]
        rng.shuffle(choices)
        return {
            "number": number,
            "type": "choice",
            "target_char": char,
            "topic": "뜻과 음",
            "question": f"한자 '{char}'의 뜻과 음으로 알맞은 것은?",
            "choices": choices,
            "answer": choices.index(correct) + 1,
            "explanation": explanation_for(entry, "뜻과 음 고르기"),
        }

    if mode == 1:
        choices = [char] + [item[0] for item in entries if item[0] != char]
        rng.shuffle(choices)
        choices = choices[:4] if char in choices[:4] else [char] + choices[:3]
        rng.shuffle(choices)
        return {
            "number": number,
            "type": "choice",
            "target_char": char,
            "topic": "한자 찾기",
            "question": f"뜻과 음이 '{meaning} {sound}'인 한자는?",
            "choices": choices,
            "answer": choices.index(char) + 1,
            "explanation": explanation_for(entry, "한자 찾기"),
        }

    sounds = []
    for _, _, candidate_sound in entries:
        if candidate_sound != sound and candidate_sound not in sounds:
            sounds.append(candidate_sound)
    rng.shuffle(sounds)
    choices = [sound] + sounds[:3]
    rng.shuffle(choices)
    return {
        "number": number,
        "type": "choice",
        "target_char": char,
        "topic": "음 읽기",
        "question": f"한자 '{char}'의 음으로 알맞은 것은?",
        "choices": choices,
        "answer": choices.index(sound) + 1,
        "explanation": explanation_for(entry, "음 읽기"),
    }


def pick_entries_for_set(set_no: int) -> list[tuple[str, str, str]]:
    rng = random.Random(7700 + set_no)
    candidates = [entry for entry in GRADE_7_ENTRIES if entry[0] not in LOW_LEVEL_TARGET_CHARS]
    rng.shuffle(candidates)
    start = ((set_no - 1) * 23) % len(candidates)
    selected = candidates[start:] + candidates[:start]
    selected = selected[:30]
    rng.shuffle(selected)
    return selected


def make_hanja_set(set_no: int, round_no: int) -> dict:
    rng = random.Random(8700 + set_no)
    selected = pick_entries_for_set(set_no)
    return {
        "set_id": f"hanja_quiz_set_{set_no:02d}",
        "title": f"한자 7급 대비 {round_no}회 모의시험",
        "grade": "7급 대비",
        "source_note": "첨부된 7급 한자 시험범위 150자 표 기준",
        "questions": [
            make_choice_question(index, entry, GRADE_7_ENTRIES, rng)
            for index, entry in enumerate(selected, 1)
        ],
    }


def regenerate_grade7_sets() -> None:
    write_json(
        OUTPUT_DIR / "hanja_grade_7_chars.json",
        {
            "grade": "7급",
            "source": "첨부된 7급 한자 시험범위 150자 표",
            "format": ["hanja", "meaning", "sound"],
            "entries": [list(entry) for entry in GRADE_7_ENTRIES],
        },
    )

    for set_no in range(1, 5):
        write_json(OUTPUT_DIR / f"hanja_quiz_set_{set_no:02d}.json", make_hanja_set(set_no, set_no))

    for set_no in range(11, 21):
        write_json(OUTPUT_DIR / f"hanja_quiz_set_{set_no:02d}.json", make_hanja_set(set_no, set_no - 6))


def validate() -> None:
    if len(GRADE_7_ENTRIES) != 150:
        raise RuntimeError(f"Expected 150 grade-7 entries, found {len(GRADE_7_ENTRIES)}")

    for path in [OUTPUT_DIR / f"hanja_quiz_set_{n:02d}.json" for n in list(range(1, 5)) + list(range(11, 21))]:
        data = load_json(path)
        if len(data["questions"]) != 30:
            raise RuntimeError(f"{path.name} does not have 30 questions")
        text = json.dumps(data, ensure_ascii=False)
        if "�" in text or "?쒖" in text or "湲" in text:
            raise RuntimeError(f"Possible mojibake remains in {path.name}")
        for question in data["questions"]:
            target_char = question.get("target_char")
            if target_char in LOW_LEVEL_TARGET_CHARS:
                raise RuntimeError(f"Low-level target {target_char} remains in {path.name} question {question['number']}")
            answer = question["answer"]
            choices = question["choices"]
            if not 1 <= answer <= len(choices):
                raise RuntimeError(f"Invalid answer in {path.name} question {question['number']}")


def main() -> None:
    regenerate_grade7_sets()
    validate()
    print("Regenerated 14 grade-7 Hanja quiz sets from the attached 150-character table.")


if __name__ == "__main__":
    main()
