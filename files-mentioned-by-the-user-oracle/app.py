from __future__ import annotations

import html
import json
import secrets
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import Request
from nicegui import app, ui


BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
ACCESS_CODE_FILE = OUTPUT_DIR / "quiz_access_code.txt"


def quiz_files() -> list[Path]:
    files = sorted(OUTPUT_DIR.glob("oracle_quiz_set_*.json"))
    files = [path for path in files if not path.name.endswith("_answers.json")]
    if not files:
        raise FileNotFoundError(f"No quiz files found in {OUTPUT_DIR}")
    return files


def load_quiz(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", [])
    if not questions:
        raise ValueError(f"No questions found in {path}")

    required = {"number", "question", "choices", "answer", "explanation", "topic"}
    for q in questions:
        if not required <= set(q):
            raise ValueError(f"Invalid question shape: {q}")
        if len(q["choices"]) < 2:
            raise ValueError(f"Question {q['number']} must have at least 2 choices")
        if q["answer"] not in range(1, len(q["choices"]) + 1):
            raise ValueError(f"Question {q['number']} answer is outside the choices")

    return data


def answer_file_for(quiz_data: dict[str, Any], fallback_stem: str) -> Path:
    return OUTPUT_DIR / f"{quiz_data.get('set_id', fallback_stem)}_answers.json"


def load_all_quizzes() -> list[dict[str, Any]]:
    loaded = []
    for path in quiz_files():
        quiz_data = load_quiz(path)
        answer_file = answer_file_for(quiz_data, path.stem)
        loaded.append(
            {
                "setId": quiz_data.get("set_id", path.stem),
                "title": quiz_data.get("title", path.stem),
                "fileName": path.name,
                "answerFile": answer_file.name,
                "storageKey": f"oracle-quiz-{quiz_data.get('set_id', path.stem)}",
                "questions": quiz_data["questions"],
            }
        )
    return loaded


QUIZZES = load_all_quizzes()
QUIZ_BY_SET_ID = {quiz["setId"]: quiz for quiz in QUIZZES}
DEFAULT_SET_ID = QUIZZES[-1]["setId"]

def load_hanja_quiz(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data.get("questions", [])
    if not questions:
        raise ValueError(f"No questions found in {path}")

    required = {"number", "type", "topic", "question", "explanation"}
    for q in questions:
        if not required <= set(q):
            raise ValueError(f"Invalid hanja question shape: {q}")
        if q["type"] == "choice":
            if len(q.get("choices", [])) < 2:
                raise ValueError(f"Question {q['number']} must have at least 2 choices")
            if q.get("answer") not in range(1, len(q["choices"]) + 1):
                raise ValueError(f"Question {q['number']} answer is outside the choices")
        elif q["type"] == "text":
            if not q.get("accepted_answers"):
                raise ValueError(f"Question {q['number']} needs accepted_answers")
        else:
            raise ValueError(f"Unknown hanja question type: {q['type']}")

    return data


def hanja_files() -> list[Path]:
    files = sorted(OUTPUT_DIR.glob("hanja_quiz_set_*.json"))
    files = [path for path in files if not path.name.endswith("_answers.json")]
    if not files:
        raise FileNotFoundError(f"No hanja quiz files found in {OUTPUT_DIR}")
    return files


def load_all_hanja_quizzes() -> list[dict[str, Any]]:
    loaded = []
    for path in hanja_files():
        quiz_data = load_hanja_quiz(path)
        answer_file = OUTPUT_DIR / f"{quiz_data.get('set_id', path.stem)}_answers.json"
        loaded.append(
            {
                "setId": quiz_data.get("set_id", path.stem),
                "title": quiz_data.get("title", path.stem),
                "grade": quiz_data.get("grade", ""),
                "sourceNote": quiz_data.get("source_note", ""),
                "fileName": path.name,
                "answerFile": answer_file.name,
                "storageKey": f"hanja-quiz-{quiz_data.get('set_id', path.stem)}",
                "questions": quiz_data["questions"],
            }
        )
    return loaded


HANJA_QUIZZES = load_all_hanja_quizzes()
HANJA_BY_SET_ID = {quiz["setId"]: quiz for quiz in HANJA_QUIZZES}
DEFAULT_HANJA_SET_ID = HANJA_QUIZZES[-1]["setId"]


def access_code() -> str:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if ACCESS_CODE_FILE.exists():
        return ACCESS_CODE_FILE.read_text(encoding="utf-8-sig").strip().lstrip("\ufeff")
    code = secrets.token_urlsafe(12)
    ACCESS_CODE_FILE.write_text(code, encoding="utf-8")
    return code


ACCESS_CODE = access_code()


def build_answer_payload(quiz_data: dict[str, Any], answers: dict[int, int]) -> dict[str, Any]:
    questions = quiz_data["questions"]
    return {
        "quiz_set_id": quiz_data["setId"],
        "quiz_title": quiz_data["title"],
        "quiz_file": quiz_data["fileName"],
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "total_questions": len(questions),
        "answered_questions": sum(1 for q in questions if q["number"] in answers),
        "unanswered_questions": [q["number"] for q in questions if q["number"] not in answers],
        "answers": [
            {
                "number": q["number"],
                "topic": q["topic"],
                "question": q["question"],
                "choices": q["choices"],
                "selected_answer": answers.get(q["number"]),
                "selected_choice": q["choices"][answers[q["number"]] - 1] if q["number"] in answers else None,
                "correct_answer": q["answer"],
                "correct_choice": q["choices"][q["answer"] - 1],
                "is_correct": answers.get(q["number"]) == q["answer"],
                "explanation": q["explanation"],
            }
            for q in questions
        ],
    }


@app.post("/api/save_answers")
async def save_answers_api(request: Request) -> dict[str, Any]:
    body = await request.json()
    set_id = body.get("setId", DEFAULT_SET_ID)
    if set_id not in QUIZ_BY_SET_ID:
        return {"ok": False, "error": f"Unknown quiz set: {set_id}"}

    quiz_data = QUIZ_BY_SET_ID[set_id]
    raw_answers = body.get("answers", {})
    answers: dict[int, int] = {}
    for key, value in raw_answers.items():
        if value in (None, ""):
            continue
        question_number = int(key)
        choice_number = int(value)
        question = next(q for q in quiz_data["questions"] if q["number"] == question_number)
        if choice_number not in range(1, len(question["choices"]) + 1):
            continue
        answers[question_number] = choice_number

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = build_answer_payload(quiz_data, answers)
    answer_file = OUTPUT_DIR / quiz_data["answerFile"]
    with answer_file.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return {
        "ok": True,
        "answer_file": answer_file.name,
        "answered_questions": payload["answered_questions"],
        "total_questions": payload["total_questions"],
    }


def normalize_text_answer(value: object) -> str:
    return "".join(str(value or "").split()).lower()


def grade_hanja_answer(question: dict[str, Any], answer: object) -> bool:
    if question.get("type") == "choice":
        return int(answer or 0) == int(question["answer"])
    normalized = normalize_text_answer(answer)
    accepted = [normalize_text_answer(item) for item in question.get("accepted_answers", [])]
    return normalized in accepted


def build_hanja_answer_payload(quiz_data: dict[str, Any], raw_answers: dict[str, Any]) -> dict[str, Any]:
    questions = quiz_data["questions"]
    answers: dict[int, Any] = {}
    for q in questions:
        value = raw_answers.get(str(q["number"]))
        if value not in (None, ""):
            answers[q["number"]] = value

    return {
        "quiz_set_id": quiz_data["setId"],
        "quiz_title": quiz_data["title"],
        "quiz_file": quiz_data["fileName"],
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "total_questions": len(questions),
        "answered_questions": sum(1 for q in questions if q["number"] in answers),
        "unanswered_questions": [q["number"] for q in questions if q["number"] not in answers],
        "answers": [
            {
                "number": q["number"],
                "type": q.get("type", "choice"),
                "topic": q["topic"],
                "question": q["question"],
                "choices": q.get("choices"),
                "selected_answer": answers.get(q["number"]),
                "selected_choice": (
                    q["choices"][int(answers[q["number"]]) - 1]
                    if q.get("choices") and q["number"] in answers
                    else answers.get(q["number"])
                ),
                "correct_answer": q.get("answer") if q.get("type") == "choice" else q.get("accepted_answers", [None])[0],
                "correct_choice": (
                    q["choices"][q["answer"] - 1]
                    if q.get("type") == "choice"
                    else q.get("accepted_answers", [None])[0]
                ),
                "is_correct": grade_hanja_answer(q, answers.get(q["number"])),
                "explanation": q["explanation"],
            }
            for q in questions
        ],
    }


@app.post("/api/save_hanja_answers")
async def save_hanja_answers_api(request: Request) -> dict[str, Any]:
    body = await request.json()
    set_id = body.get("setId", DEFAULT_HANJA_SET_ID)
    if set_id not in HANJA_BY_SET_ID:
        return {"ok": False, "error": f"Unknown hanja quiz set: {set_id}"}
    quiz_data = HANJA_BY_SET_ID[set_id]
    payload = build_hanja_answer_payload(quiz_data, body.get("answers", {}))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    answer_file = OUTPUT_DIR / quiz_data["answerFile"]
    with answer_file.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    return {
        "ok": True,
        "answer_file": answer_file.name,
        "answered_questions": payload["answered_questions"],
        "total_questions": payload["total_questions"],
    }


def e(value: object) -> str:
    return html.escape(str(value), quote=True)


def render_quiz_html() -> str:
    app_json = json.dumps(
        {
            "defaultSetId": DEFAULT_SET_ID,
            "quizzes": QUIZZES,
        },
        ensure_ascii=False,
    )

    return f"""
    <section id="lock-screen" class="lock-screen">
      <div class="lock-card">
        <h1>Oracle DB Quiz</h1>
        <p>Enter access code</p>
        <input id="access-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="text" style="-webkit-text-security: disc;">
        <button id="unlock" type="button">Open</button>
        <div id="lock-status" class="lock-status"></div>
      </div>
    </section>

    <main class="quiz-app">
      <header class="topbar">
        <div>
          <div class="brand">Oracle DB Quiz</div>
          <div id="loaded" class="loaded"></div>
        </div>
        <div id="progress" class="progress"></div>
      </header>

      <section class="title-block">
        <label class="set-picker">
          <span>Exam set</span>
          <select id="quiz-select"></select>
        </label>
        <h1 id="quiz-title"></h1>
        <p>Phone URL: http://192.168.75.174:8080</p>
      </section>

      <nav id="number-grid" class="number-grid" aria-label="Question numbers"></nav>

      <section id="cards"></section>
      <section id="results" class="results" aria-live="polite"></section>

      <footer class="actions">
        <button id="prev" type="button" class="secondary">Prev</button>
        <button id="save" type="button" class="save">Save</button>
        <button id="reset-answers" type="button" class="secondary">Reset</button>
        <button id="grade" type="button" class="grade" disabled>Grade</button>
        <button id="next" type="button" class="primary">Next</button>
      </footer>
      <div id="status" class="status"></div>
    </main>

    <script id="app-data" type="application/json">{app_json}</script>
    <script id="access-data" type="application/json">{json.dumps({"accessCode": ACCESS_CODE}, ensure_ascii=False)}</script>
    <script>
      (() => {{
        const appData = JSON.parse(document.getElementById('app-data').textContent);
        const access = JSON.parse(document.getElementById('access-data').textContent);
        const lockScreen = document.getElementById('lock-screen');
        const appRoot = document.querySelector('.quiz-app');
        const accessInput = document.getElementById('access-code');
        const unlock = document.getElementById('unlock');
        const lockStatus = document.getElementById('lock-status');
        const quizSelect = document.getElementById('quiz-select');
        const quizTitle = document.getElementById('quiz-title');
        const loaded = document.getElementById('loaded');
        const cardsSection = document.getElementById('cards');
        const numberGrid = document.getElementById('number-grid');
        const progress = document.getElementById('progress');
        const status = document.getElementById('status');
        const prev = document.getElementById('prev');
        const next = document.getElementById('next');
        const save = document.getElementById('save');
        const resetAnswers = document.getElementById('reset-answers');
        const grade = document.getElementById('grade');
        const results = document.getElementById('results');

        let currentQuiz = appData.quizzes.find(quiz => quiz.setId === appData.defaultSetId) || appData.quizzes[0];
        let current = 0;
        let answers = {{}};

        function escapeHtml(value) {{
          return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
        }}

        function setUnlocked() {{
          localStorage.setItem('oracle-quiz-access', access.accessCode);
          lockScreen.style.display = 'none';
          appRoot.style.display = 'block';
        }}

        function checkAccess() {{
          if (localStorage.getItem('oracle-quiz-access') === access.accessCode) {{
            setUnlocked();
            return;
          }}
          appRoot.style.display = 'none';
          lockScreen.style.display = 'flex';
        }}

        function loadAnswers() {{
          answers = JSON.parse(localStorage.getItem(currentQuiz.storageKey) || '{{}}');
        }}

        function persist() {{
          localStorage.setItem(currentQuiz.storageKey, JSON.stringify(answers));
        }}

        function answeredCount() {{
          return Object.keys(answers).filter(key => answers[key]).length;
        }}

        function allAnswered() {{
          return answeredCount() === currentQuiz.questions.length;
        }}

        function renderQuestionCard(question, index) {{
          const choices = question.choices.map((choice, choiceIndex) => `
            <label class="choice">
              <input type="radio" name="q${{question.number}}" value="${{choiceIndex + 1}}">
              <span>${{choiceIndex + 1}}) ${{escapeHtml(choice)}}</span>
            </label>
          `).join('');
          return `
            <section class="question-card" data-index="${{index}}" data-number="${{question.number}}">
              <div class="topic">${{String(question.number).padStart(2, '0')}}. ${{escapeHtml(question.topic)}}</div>
              <h2>${{escapeHtml(question.question).replaceAll('\\n', '<br>')}}</h2>
              <div class="choices">${{choices}}</div>
            </section>
          `;
        }}

        function renderQuizShell() {{
          quizTitle.textContent = currentQuiz.title;
          loaded.textContent = `Loaded: ${{currentQuiz.fileName}}`;
          cardsSection.innerHTML = currentQuiz.questions.map(renderQuestionCard).join('');
          numberGrid.innerHTML = currentQuiz.questions
            .map((question, index) => `<button class="num-btn" type="button" data-go="${{index}}">${{index + 1}}</button>`)
            .join('');

          document.querySelectorAll('input[type="radio"]').forEach(input => {{
            const number = input.name.slice(1);
            if (String(answers[number]) === input.value) input.checked = true;
            input.addEventListener('change', () => {{
              answers[number] = Number(input.value);
              persist();
              show(current);
            }});
          }});

          Array.from(document.querySelectorAll('.num-btn')).forEach(button => {{
            button.addEventListener('click', () => show(Number(button.dataset.go)));
          }});
        }}

        function show(index) {{
          const cards = Array.from(document.querySelectorAll('.question-card'));
          const numberButtons = Array.from(document.querySelectorAll('.num-btn'));
          results.classList.remove('active');
          numberGrid.style.display = 'flex';
          cardsSection.style.display = 'block';
          current = Math.max(0, Math.min(index, cards.length - 1));
          cards.forEach((card, i) => card.classList.toggle('active', i === current));
          numberButtons.forEach((button, i) => {{
            const number = cards[i].dataset.number;
            button.classList.toggle('active', i === current);
            button.classList.toggle('answered', Boolean(answers[number]));
          }});
          prev.disabled = current === 0;
          next.disabled = current === cards.length - 1;
          grade.disabled = !allAnswered();
          progress.textContent = `${{answeredCount()}}/${{currentQuiz.questions.length}} answered`;
          status.textContent = `Answered ${{answeredCount()}} / Unanswered ${{currentQuiz.questions.length - answeredCount()}} / Saves to ${{currentQuiz.answerFile}}`;
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}

        function renderResults() {{
          const graded = currentQuiz.questions.map(question => {{
            const selected = answers[question.number];
            const correct = selected === question.answer;
            return {{ question, selected, correct }};
          }});
          const correctCount = graded.filter(item => item.correct).length;
          const wrong = graded.filter(item => !item.correct);
          const wrongHtml = wrong.length
            ? wrong.map(item => {{
                const q = item.question;
                const selectedText = item.selected ? q.choices[item.selected - 1] : 'No answer';
                const correctText = q.choices[q.answer - 1];
                return `
                  <article class="result-item">
                    <div class="result-topic">${{q.number}}. ${{escapeHtml(q.topic)}}</div>
                    <h3>${{escapeHtml(q.question).replaceAll('\\n', '<br>')}}</h3>
                    <p><strong>Your answer:</strong> ${{item.selected || '-'}}) ${{escapeHtml(selectedText)}}</p>
                    <p><strong>Correct answer:</strong> ${{q.answer}}) ${{escapeHtml(correctText)}}</p>
                    <p><strong>Explanation:</strong> ${{escapeHtml(q.explanation)}}</p>
                  </article>
                `;
              }}).join('')
            : '<div class="perfect">All correct. No wrong answers.</div>';

          results.innerHTML = `
            <div class="score-card">
              <div class="score-label">Score</div>
              <div class="score-value">${{correctCount}} / ${{currentQuiz.questions.length}}</div>
              <div class="score-rate">${{Math.round((correctCount / currentQuiz.questions.length) * 100)}}%</div>
              <button id="back-to-quiz" type="button" class="secondary result-back">Back to quiz</button>
            </div>
            <h2>Review</h2>
            ${{wrongHtml}}
          `;
          document.getElementById('back-to-quiz').addEventListener('click', () => show(current));
          numberGrid.style.display = 'none';
          cardsSection.style.display = 'none';
          document.querySelectorAll('.question-card').forEach(card => card.classList.remove('active'));
          results.classList.add('active');
          prev.disabled = true;
          next.disabled = true;
          grade.disabled = true;
          status.textContent = `Graded ${{correctCount}}/${{currentQuiz.questions.length}}. Save still writes to ${{currentQuiz.answerFile}}.`;
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}

        function switchQuiz(setId) {{
          currentQuiz = appData.quizzes.find(quiz => quiz.setId === setId) || appData.quizzes[0];
          current = 0;
          loadAnswers();
          renderQuizShell();
          show(0);
        }}

        appData.quizzes.forEach(quiz => {{
          const option = document.createElement('option');
          option.value = quiz.setId;
          option.textContent = `${{quiz.setId}} - ${{quiz.title}}`;
          quizSelect.appendChild(option);
        }});
        quizSelect.value = currentQuiz.setId;
        quizSelect.addEventListener('change', () => switchQuiz(quizSelect.value));

        unlock.addEventListener('click', () => {{
          if (accessInput.value.trim() === access.accessCode) {{
            setUnlocked();
          }} else {{
            lockStatus.textContent = 'Wrong access code';
          }}
        }});
        accessInput.addEventListener('keydown', event => {{
          if (event.key === 'Enter') unlock.click();
        }});

        prev.addEventListener('click', () => show(current - 1));
        next.addEventListener('click', () => show(current + 1));
        resetAnswers.addEventListener('click', resetCurrentQuizAnswers);
        resetAnswers.addEventListener('click', resetCurrentQuizAnswers);
        grade.addEventListener('click', () => {{
          if (!allAnswered()) {{
            status.textContent = `Answer all questions first. Remaining: ${{currentQuiz.questions.length - answeredCount()}}`;
            return;
          }}
          renderResults();
        }});
        save.addEventListener('click', async () => {{
          save.disabled = true;
          status.textContent = 'Saving...';
          try {{
            const response = await fetch('/api/save_answers', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ setId: currentQuiz.setId, answers }}),
            }});
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || 'Save failed');
            status.textContent = `Saved ${{result.answered_questions}}/${{result.total_questions}} to ${{result.answer_file}}`;
          }} catch (error) {{
            status.textContent = 'Save failed. Please try again.';
          }} finally {{
            save.disabled = false;
          }}
        }});

        loadAnswers();
        renderQuizShell();
        show(0);
        checkAccess();
      }})();
    </script>
    """


@ui.page("/")
def quiz_page() -> None:
    ui.add_head_html(
        """
        <style>
          body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
          .lock-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: #f8fafc; }
          .lock-card { width: min(100%, 360px); display: grid; gap: 12px; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
          .lock-card h1 { margin: 0; font-size: 24px; }
          .lock-card p { margin: 0; color: #64748b; }
          .lock-card input { height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; }
          .lock-card button { height: 42px; border: 0; border-radius: 8px; background: #1f6f8b; color: white; font-weight: 700; }
          .lock-status { min-height: 18px; color: #b91c1c; font-size: 13px; }
          .quiz-app { width: min(100%, 980px); margin: 0 auto; padding: 12px; }
          .topbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px; background: #17324d; color: white; border-radius: 0 0 8px 8px; }
          .brand { font-size: 18px; font-weight: 700; }
          .loaded, .progress, .title-block p, .status { font-size: 13px; color: #64748b; }
          .topbar .loaded, .topbar .progress { color: #dbeafe; }
          .title-block { padding: 16px 4px 8px; }
          .title-block h1 { margin: 10px 0 6px; font-size: 24px; line-height: 1.25; }
          .set-picker { display: grid; gap: 6px; max-width: 520px; color: #475569; font-size: 13px; font-weight: 700; }
          .set-picker select { min-height: 42px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 15px; }
          .number-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 14px; }
          .num-btn { min-width: 40px; height: 34px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 700; }
          .num-btn.active { background: #1f6f8b; border-color: #1f6f8b; color: white; }
          .num-btn.answered:not(.active) { background: #dcfce7; border-color: #86efac; color: #166534; }
          .question-card { display: none; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .question-card.active { display: block; }
          .results { display: none; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .results.active { display: block; }
          .score-card { display: grid; gap: 6px; padding: 16px; margin-bottom: 16px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; }
          .score-label { color: #475569; font-size: 14px; }
          .score-value { font-size: 34px; font-weight: 800; color: #17324d; }
          .score-rate { font-size: 18px; color: #1f6f8b; font-weight: 700; }
          .result-back { width: fit-content; min-height: 38px; padding: 0 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; font-weight: 700; }
          .result-item { padding: 14px 0; border-top: 1px solid #e2e8f0; }
          .result-item.correct { background: linear-gradient(90deg, rgba(220,252,231,0.55), transparent 42%); }
          .result-item.wrong { background: linear-gradient(90deg, rgba(254,226,226,0.55), transparent 42%); }
          .result-mark { display: inline-flex; min-height: 26px; align-items: center; padding: 0 10px; border-radius: 999px; font-size: 13px; font-weight: 900; background: #e2e8f0; color: #334155; }
          .result-item.correct .result-mark { background: #dcfce7; color: #166534; }
          .result-item.wrong .result-mark { background: #fee2e2; color: #991b1b; }
          .result-item h3 { margin: 6px 0 10px; font-size: 18px; line-height: 1.45; }
          .result-item p { margin: 6px 0; line-height: 1.45; }
          .result-topic { color: #475569; font-size: 14px; }
          .perfect { padding: 14px; border-radius: 8px; background: #dcfce7; color: #166534; font-weight: 700; }
          .topic { color: #475569; font-size: 14px; margin-bottom: 8px; }
          .question-card h2 { margin: 0 0 16px; font-size: 20px; line-height: 1.45; }
          .choices { display: grid; gap: 10px; }
          .choice { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; line-height: 1.4; }
          .choice input { margin-top: 3px; transform: scale(1.15); }
          .actions { position: sticky; bottom: 0; display: flex; justify-content: space-between; gap: 8px; padding: 12px 0; background: #f8fafc; }
          .actions button { min-height: 42px; padding: 0 18px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; }
          .primary { background: #1f6f8b; color: white; border-color: #1f6f8b !important; }
          .save { background: #f59e0b; color: white; border-color: #f59e0b !important; }
          .grade { background: #15803d; color: white; border-color: #15803d !important; }
          .secondary { background: white; color: #334155; }
          .actions button:disabled { opacity: .45; }
          .status { padding: 2px 0 16px; }
          @media (max-width: 560px) {
            .quiz-app { padding: 8px; }
            .topbar { align-items: flex-start; }
            .title-block h1 { font-size: 20px; }
            .question-card h2 { font-size: 18px; }
            .num-btn { min-width: 36px; height: 34px; }
            .actions { flex-wrap: wrap; }
            .actions button { flex: 1 1 calc(50% - 8px); padding: 0 8px; }
          }
        </style>
        """
    )
    ui.add_body_html(render_quiz_html())


def render_hanja_html() -> str:
    data_json = json.dumps(
        {
            "setId": HANJA_QUIZ.get("set_id"),
            "title": HANJA_QUIZ.get("title"),
            "grade": HANJA_QUIZ.get("grade"),
            "answerFile": HANJA_ANSWER_FILE.name,
            "storageKey": f"hanja-quiz-{HANJA_QUIZ.get('set_id', HANJA_FILE.stem)}",
            "questions": HANJA_QUIZ["questions"],
        },
        ensure_ascii=False,
    )
    return f"""
    <section id="lock-screen" class="lock-screen">
      <div class="lock-card">
        <h1>Hanja Quiz</h1>
        <p>Enter access code</p>
        <input id="access-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="text" style="-webkit-text-security: disc;">
        <button id="unlock" type="button">Open</button>
        <div id="lock-status" class="lock-status"></div>
      </div>
    </section>

    <main class="quiz-app">
      <header class="topbar hanja-topbar">
        <div>
          <div class="brand">한자 7급 대비 시험</div>
          <div class="loaded">Loaded: {e(HANJA_FILE.name)}</div>
        </div>
        <div id="progress" class="progress"></div>
      </header>

      <section class="title-block exam-paper-title">
        <h1>{e(HANJA_QUIZ.get("title", "한자 시험"))}</h1>
        <strong>{e(HANJA_QUIZ.get("grade", "7급 대비"))}</strong>
      </section>

      <nav id="number-grid" class="number-grid" aria-label="Question numbers"></nav>
      <section id="cards"></section>
      <section id="results" class="results" aria-live="polite"></section>

      <footer class="actions">
        <button id="prev" type="button" class="secondary">이전</button>
        <button id="save" type="button" class="save">저장</button>
        <button id="grade" type="button" class="grade" disabled>채점</button>
        <button id="next" type="button" class="primary">다음</button>
      </footer>
      <div id="status" class="status"></div>
    </main>

    <script id="hanja-data" type="application/json">{data_json}</script>
    <script id="access-data" type="application/json">{json.dumps({"accessCode": ACCESS_CODE}, ensure_ascii=False)}</script>
    <script>
      (() => {{
        const data = JSON.parse(document.getElementById('hanja-data').textContent);
        const access = JSON.parse(document.getElementById('access-data').textContent);
        const lockScreen = document.getElementById('lock-screen');
        const appRoot = document.querySelector('.quiz-app');
        const accessInput = document.getElementById('access-code');
        const unlock = document.getElementById('unlock');
        const lockStatus = document.getElementById('lock-status');
        const cardsSection = document.getElementById('cards');
        const numberGrid = document.getElementById('number-grid');
        const progress = document.getElementById('progress');
        const status = document.getElementById('status');
        const prev = document.getElementById('prev');
        const next = document.getElementById('next');
        const save = document.getElementById('save');
        const resetAnswers = document.getElementById('reset-answers');
        const grade = document.getElementById('grade');
        const results = document.getElementById('results');
        let current = 0;
        let answers = JSON.parse(localStorage.getItem(data.storageKey) || '{{}}');

        function escapeHtml(value) {{
          return String(value)
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
        }}
        function normalize(value) {{ return String(value || '').replace(/\\s+/g, '').toLowerCase(); }}
        function answeredCount() {{ return Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '').length; }}
        function allAnswered() {{ return answeredCount() === data.questions.length; }}
        function persist() {{ localStorage.setItem(data.storageKey, JSON.stringify(answers)); }}
        function isCorrect(question, value) {{
          if (question.type === 'choice') return Number(value) === Number(question.answer);
          const selected = question.choices && value ? question.choices[Number(value) - 1] : value;
          return (question.accepted_answers || []).map(normalize).includes(normalize(selected));
        }}
        function correctText(question) {{
          if (question.type === 'choice') return `${{question.answer}}) ${{question.choices[question.answer - 1]}}`;
          return (question.accepted_answers || [''])[0];
        }}
        function selectedText(question, value) {{
          if (!value) return '미응답';
          if (question.choices && question.choices.length) return `${{value}}) ${{question.choices[Number(value) - 1]}}`;
          return value;
        }}

        function setUnlocked() {{
          localStorage.setItem('oracle-quiz-access', access.accessCode);
          lockScreen.style.display = 'none';
          appRoot.style.display = 'block';
        }}
        function checkAccess() {{
          if (localStorage.getItem('oracle-quiz-access') === access.accessCode) {{
            setUnlocked();
            return;
          }}
          appRoot.style.display = 'none';
          lockScreen.style.display = 'flex';
        }}

        function renderCard(question, index) {{
          const answer = answers[question.number] || '';
          let body = '';
          if (question.choices && question.choices.length) {{
            body = question.choices.map((choice, i) => `
              <label class="choice">
                <input type="radio" name="q${{question.number}}" value="${{i + 1}}" ${{String(answer) === String(i + 1) ? 'checked' : ''}}>
                <span>${{i + 1}}) ${{escapeHtml(choice)}}</span>
              </label>
            `).join('');
          }} else {{
            body = `
              <label class="text-answer">
                <span>답안</span>
                <input type="text" name="q${{question.number}}" value="${{escapeHtml(answer)}}" autocomplete="off" placeholder="예: 아버지 부">
              </label>
            `;
          }}
          return `
            <section class="question-card" data-index="${{index}}" data-number="${{question.number}}">
              <div class="topic">${{String(question.number).padStart(2, '0')}}. ${{escapeHtml(question.topic)}}</div>
              <h2>${{escapeHtml(question.question).replaceAll('\\n', '<br>')}}</h2>
              <div class="choices">${{body}}</div>
            </section>
          `;
        }}

        function renderShell() {{
          cardsSection.innerHTML = data.questions.map(renderCard).join('');
          numberGrid.innerHTML = data.questions.map((q, i) => `<button class="num-btn" type="button" data-go="${{i}}">${{i + 1}}</button>`).join('');
          document.querySelectorAll('input[type="radio"]').forEach(input => {{
            input.addEventListener('change', () => {{
              answers[input.name.slice(1)] = Number(input.value);
              persist();
              show(current);
            }});
          }});
          document.querySelectorAll('.text-answer input').forEach(input => {{
            input.addEventListener('input', () => {{
              answers[input.name.slice(1)] = input.value;
              persist();
              updateStatus();
            }});
          }});
          Array.from(document.querySelectorAll('.num-btn')).forEach(button => button.addEventListener('click', () => show(Number(button.dataset.go))));
        }}

        function updateStatus() {{
          const buttons = Array.from(document.querySelectorAll('.num-btn'));
          buttons.forEach((button, i) => {{
            const number = data.questions[i].number;
            button.classList.toggle('active', i === current);
            button.classList.toggle('answered', Boolean(answers[number]));
          }});
          grade.disabled = !allAnswered();
          progress.textContent = `${{answeredCount()}}/${{data.questions.length}} answered`;
          status.textContent = `응답 ${{answeredCount()}} / 미응답 ${{data.questions.length - answeredCount()}} / 저장 파일: ${{data.answerFile}}`;
        }}

        function show(index) {{
          const cards = Array.from(document.querySelectorAll('.question-card'));
          results.classList.remove('active');
          numberGrid.style.display = 'flex';
          cardsSection.style.display = 'block';
          current = Math.max(0, Math.min(index, cards.length - 1));
          cards.forEach((card, i) => card.classList.toggle('active', i === current));
          prev.disabled = current === 0;
          next.disabled = current === cards.length - 1;
          updateStatus();
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}

        function renderResults() {{
          const graded = data.questions.map(q => {{ const selected = answers[q.number]; return {{ q, selected, correct: isCorrect(q, selected) }}; }});
          const correctCount = graded.filter(item => item.correct).length;
          const wrong = graded.filter(item => !item.correct);
          const wrongHtml = wrong.length ? wrong.map(item => `
            <article class="result-item">
              <div class="result-topic">${{item.q.number}}. ${{escapeHtml(item.q.topic)}}</div>
              <h3>${{escapeHtml(item.q.question).replaceAll('\\n', '<br>')}}</h3>
              <p><strong>내 답:</strong> ${{escapeHtml(selectedText(item.q, item.selected))}}</p>
              <p><strong>정답:</strong> ${{escapeHtml(correctText(item.q))}}</p>
              <p><strong>해설:</strong> ${{escapeHtml(item.q.explanation)}}</p>
            </article>
          `).join('') : '<div class="perfect">전부 맞았습니다.</div>';
          results.innerHTML = `
            <div class="score-card">
              <div class="score-label">점수</div>
              <div class="score-value">${{correctCount}} / ${{data.questions.length}}</div>
              <div class="score-rate">${{Math.round((correctCount / data.questions.length) * 100)}}%</div>
              <button id="back-to-quiz" type="button" class="secondary result-back">문제로 돌아가기</button>
            </div>
            <h2>오답 해설</h2>
            ${{wrongHtml}}
          `;
          document.getElementById('back-to-quiz').addEventListener('click', () => show(current));
          numberGrid.style.display = 'none';
          cardsSection.style.display = 'none';
          results.classList.add('active');
          prev.disabled = true;
          next.disabled = true;
          grade.disabled = true;
          status.textContent = `채점 완료: ${{correctCount}}/${{data.questions.length}}`;
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}

        unlock.addEventListener('click', () => {{
          if (accessInput.value.trim() === access.accessCode) setUnlocked();
          else lockStatus.textContent = 'Wrong access code';
        }});
        accessInput.addEventListener('keydown', event => {{ if (event.key === 'Enter') unlock.click(); }});
        prev.addEventListener('click', () => show(current - 1));
        next.addEventListener('click', () => show(current + 1));
        grade.addEventListener('click', () => {{
          if (!allAnswered()) {{
            status.textContent = `모든 문제를 먼저 풀어야 합니다. 남은 문제: ${{data.questions.length - answeredCount()}}`;
            return;
          }}
          renderResults();
        }});
        save.addEventListener('click', async () => {{
          save.disabled = true;
          status.textContent = 'Saving...';
          try {{
            const response = await fetch('/api/save_hanja_answers', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ answers }}),
            }});
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error('Save failed');
            status.textContent = `Saved ${{result.answered_questions}}/${{result.total_questions}} to ${{result.answer_file}}`;
          }} catch (error) {{
            status.textContent = 'Save failed. Please try again.';
          }} finally {{
            save.disabled = false;
          }}
        }});

        renderShell();
        show(0);
        checkAccess();
      }})();
    </script>
    """


def render_hanja_html_v2() -> str:
    data_json = json.dumps(
        {
            "defaultSetId": DEFAULT_HANJA_SET_ID,
            "quizzes": HANJA_QUIZZES,
        },
        ensure_ascii=False,
    )
    return f"""
    <section id="lock-screen" class="lock-screen">
      <div class="lock-card">
        <h1>Hanja Quiz</h1>
        <p>Enter access code</p>
        <input id="access-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="text" style="-webkit-text-security: disc;">
        <button id="unlock" type="button">Open</button>
        <div id="lock-status" class="lock-status"></div>
      </div>
    </section>

    <section id="resume-screen" class="resume-screen">
      <div class="resume-card">
        <h2>기존 풀이 이력</h2>
        <p>이어서 풀거나, 답안을 지우고 새로 시작할 수 있습니다.</p>
        <button id="resume-continue" type="button">이어서 풀기</button>
        <button id="resume-reset" type="button">새로 풀기</button>
      </div>
    </section>

    <main class="quiz-app">
      <header class="topbar hanja-topbar">
        <div>
          <div class="brand">한자 시험</div>
          <div id="hanja-loaded" class="loaded"></div>
        </div>
        <div id="progress" class="progress"></div>
      </header>

      <section class="title-block exam-paper-title">
        <label class="set-picker">
          <span>급수 / 회차</span>
          <select id="hanja-select"></select>
        </label>
        <h1 id="hanja-title"></h1>
        <strong id="hanja-grade"></strong>
        <p id="hanja-source-note" class="source-note"></p>
      </section>

      <nav id="number-grid" class="number-grid" aria-label="Question numbers"></nav>
      <section id="cards"></section>
      <section id="results" class="results" aria-live="polite"></section>

      <footer class="actions">
        <button id="prev" type="button" class="secondary">이전</button>
        <button id="save" type="button" class="save">저장</button>
        <button id="grade" type="button" class="grade" disabled>채점</button>
        <button id="next" type="button" class="primary">다음</button>
      </footer>
      <div id="status" class="status"></div>
    </main>

    <script id="hanja-data" type="application/json">{data_json}</script>
    <script id="access-data" type="application/json">{json.dumps({"accessCode": ACCESS_CODE}, ensure_ascii=False)}</script>
    <script>
      (() => {{
        const appData = JSON.parse(document.getElementById('hanja-data').textContent);
        const access = JSON.parse(document.getElementById('access-data').textContent);
        const lockScreen = document.getElementById('lock-screen');
        const resumeScreen = document.getElementById('resume-screen');
        const appRoot = document.querySelector('.quiz-app');
        const accessInput = document.getElementById('access-code');
        const unlock = document.getElementById('unlock');
        const lockStatus = document.getElementById('lock-status');
        const resumeContinue = document.getElementById('resume-continue');
        const resumeReset = document.getElementById('resume-reset');
        const hanjaSelect = document.getElementById('hanja-select');
        const hanjaTitle = document.getElementById('hanja-title');
        const hanjaGrade = document.getElementById('hanja-grade');
        const hanjaLoaded = document.getElementById('hanja-loaded');
        const hanjaSourceNote = document.getElementById('hanja-source-note');
        const cardsSection = document.getElementById('cards');
        const numberGrid = document.getElementById('number-grid');
        const progress = document.getElementById('progress');
        const status = document.getElementById('status');
        const prev = document.getElementById('prev');
        const next = document.getElementById('next');
        const save = document.getElementById('save');
        const grade = document.getElementById('grade');
        const results = document.getElementById('results');

        const selectedSetKey = 'hanja-selected-set';
        const initialSetId = localStorage.getItem(selectedSetKey) || appData.defaultSetId;
        let currentQuiz = appData.quizzes.find(q => q.setId === initialSetId) || appData.quizzes.find(q => q.setId === appData.defaultSetId) || appData.quizzes[0];
        let current = 0;
        let answers = {{}};
        let pendingResumeAction = null;

        function escapeHtml(value) {{
          return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
        }}
        function normalize(value) {{ return String(value || '').replace(/\\s+/g, '').toLowerCase(); }}
        function storedAnswers() {{ return JSON.parse(localStorage.getItem(currentQuiz.storageKey) || '{{}}'); }}
        function answeredCount() {{ return Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length; }}
        function allAnswered() {{ return answeredCount() === currentQuiz.questions.length; }}
        function persist() {{ localStorage.setItem(currentQuiz.storageKey, JSON.stringify(answers)); }}
        function hasStoredAnswers() {{
          const stored = storedAnswers();
          return Object.keys(stored).some(k => stored[k] !== undefined && stored[k] !== '');
        }}
        function askResumeIfNeeded(afterDecision) {{
          pendingResumeAction = afterDecision;
          if (!hasStoredAnswers()) {{
            answers = {{}};
            pendingResumeAction();
            pendingResumeAction = null;
            return;
          }}
          resumeScreen.style.display = 'flex';
        }}
        function isCorrect(question, value) {{
          if (!value) return false;
          if (question.type === 'choice') return Number(value) === Number(question.answer);
          const selected = question.choices && value ? question.choices[Number(value) - 1] : value;
          return (question.accepted_answers || []).map(normalize).includes(normalize(selected));
        }}
        function correctText(question) {{
          if (question.type === 'choice') return `${{question.answer}}) ${{question.choices[question.answer - 1]}}`;
          return (question.accepted_answers || [''])[0];
        }}
        function selectedText(question, value) {{
          if (!value) return '미응답';
          if (question.choices && question.choices.length) return `${{value}}) ${{question.choices[Number(value) - 1]}}`;
          return value;
        }}
        function setUnlocked() {{
          localStorage.setItem('oracle-quiz-access', access.accessCode);
          lockScreen.style.display = 'none';
          appRoot.style.display = 'block';
        }}
        function checkAccess() {{
          if (localStorage.getItem('oracle-quiz-access') === access.accessCode) {{
            setUnlocked();
            return;
          }}
          appRoot.style.display = 'none';
          lockScreen.style.display = 'flex';
        }}
        function renderCard(question, index) {{
          const answer = answers[question.number] || '';
          const body = question.choices.map((choice, i) => `
            <label class="choice">
              <input type="radio" name="q${{question.number}}" value="${{i + 1}}" ${{String(answer) === String(i + 1) ? 'checked' : ''}}>
              <span>${{i + 1}}) ${{escapeHtml(choice)}}</span>
            </label>
          `).join('');
          return `
            <section class="question-card" data-index="${{index}}" data-number="${{question.number}}">
              <div class="topic">${{String(question.number).padStart(2, '0')}}. ${{escapeHtml(question.topic)}}</div>
              <h2>${{escapeHtml(question.question).replaceAll('\\n', '<br>')}}</h2>
              <div class="choices">${{body}}</div>
            </section>
          `;
        }}
        function renderShell() {{
          hanjaTitle.textContent = currentQuiz.title;
          hanjaGrade.textContent = currentQuiz.grade || '';
          hanjaLoaded.textContent = `Loaded: ${{currentQuiz.fileName}}`;
          hanjaSourceNote.textContent = currentQuiz.sourceNote || '';
          cardsSection.innerHTML = currentQuiz.questions.map(renderCard).join('');
          numberGrid.innerHTML = currentQuiz.questions.map((q, i) => `<button class="num-btn" type="button" data-go="${{i}}">${{i + 1}}</button>`).join('');
          document.querySelectorAll('input[type="radio"]').forEach(input => {{
            input.addEventListener('change', () => {{
              answers[input.name.slice(1)] = Number(input.value);
              persist();
              show(current);
            }});
          }});
          Array.from(document.querySelectorAll('.num-btn')).forEach(button => button.addEventListener('click', () => show(Number(button.dataset.go))));
        }}
        function updateStatus() {{
          const buttons = Array.from(document.querySelectorAll('.num-btn'));
          buttons.forEach((button, i) => {{
            const number = currentQuiz.questions[i].number;
            button.classList.toggle('active', i === current);
            button.classList.toggle('answered', Boolean(answers[number]));
          }});
          grade.disabled = !allAnswered();
          progress.textContent = `${{answeredCount()}}/${{currentQuiz.questions.length}} answered`;
          status.textContent = `응답 ${{answeredCount()}} / 미응답 ${{currentQuiz.questions.length - answeredCount()}} / 저장 파일: ${{currentQuiz.answerFile}}`;
        }}
        function show(index) {{
          const cards = Array.from(document.querySelectorAll('.question-card'));
          results.classList.remove('active');
          numberGrid.style.display = 'flex';
          cardsSection.style.display = 'block';
          current = Math.max(0, Math.min(index, cards.length - 1));
          cards.forEach((card, i) => card.classList.toggle('active', i === current));
          prev.disabled = current === 0;
          next.disabled = current === cards.length - 1;
          updateStatus();
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}
        function renderResults() {{
          const graded = currentQuiz.questions.map(q => {{
            const selected = answers[q.number];
            return {{ q, selected, correct: isCorrect(q, selected) }};
          }});
          const correctCount = graded.filter(item => item.correct).length;
          const wrong = graded.filter(item => !item.correct);
          const wrongHtml = wrong.length ? wrong.map(item => `
            <article class="result-item">
              <div class="result-topic">${{item.q.number}}. ${{escapeHtml(item.q.topic)}}</div>
              <h3>${{escapeHtml(item.q.question).replaceAll('\\n', '<br>')}}</h3>
              <p><strong>내 답:</strong> ${{escapeHtml(selectedText(item.q, item.selected))}}</p>
              <p><strong>정답:</strong> ${{escapeHtml(correctText(item.q))}}</p>
              <p><strong>해설:</strong> ${{escapeHtml(item.q.explanation)}}</p>
            </article>
          `).join('') : '<div class="perfect">전부 맞았습니다.</div>';
          results.innerHTML = `
            <div class="score-card">
              <div class="score-label">점수</div>
              <div class="score-value">${{correctCount}} / ${{currentQuiz.questions.length}}</div>
              <div class="score-rate">${{Math.round((correctCount / currentQuiz.questions.length) * 100)}}%</div>
              <button id="back-to-quiz" type="button" class="secondary result-back">문제로 돌아가기</button>
            </div>
            <h2>오답 해설</h2>
            ${{wrongHtml}}
          `;
          document.getElementById('back-to-quiz').addEventListener('click', () => show(current));
          numberGrid.style.display = 'none';
          cardsSection.style.display = 'none';
          results.classList.add('active');
          prev.disabled = true;
          next.disabled = true;
          grade.disabled = true;
          status.textContent = `채점 완료: ${{correctCount}}/${{currentQuiz.questions.length}}`;
          window.scrollTo({{ top: 0, behavior: 'smooth' }});
        }}
        function switchQuiz(setId) {{
          currentQuiz = appData.quizzes.find(q => q.setId === setId) || appData.quizzes[0];
          localStorage.setItem(selectedSetKey, currentQuiz.setId);
          current = 0;
          askResumeIfNeeded(() => {{
            renderShell();
            show(0);
          }});
        }}

        appData.quizzes.forEach(quiz => {{
          const option = document.createElement('option');
          option.value = quiz.setId;
          option.textContent = `${{quiz.grade || quiz.setId}} - ${{quiz.title}}`;
          hanjaSelect.appendChild(option);
        }});
        hanjaSelect.value = currentQuiz.setId;
        hanjaSelect.addEventListener('change', () => switchQuiz(hanjaSelect.value));

        resumeContinue.addEventListener('click', () => {{
          answers = storedAnswers();
          resumeScreen.style.display = 'none';
          if (pendingResumeAction) pendingResumeAction();
          pendingResumeAction = null;
        }});
        resumeReset.addEventListener('click', () => {{
          localStorage.removeItem(currentQuiz.storageKey);
          answers = {{}};
          resumeScreen.style.display = 'none';
          if (pendingResumeAction) pendingResumeAction();
          pendingResumeAction = null;
        }});
        unlock.addEventListener('click', () => {{
          if (accessInput.value.trim() === access.accessCode) setUnlocked();
          else lockStatus.textContent = 'Wrong access code';
        }});
        accessInput.addEventListener('keydown', event => {{ if (event.key === 'Enter') unlock.click(); }});
        prev.addEventListener('click', () => show(current - 1));
        next.addEventListener('click', () => show(current + 1));
        grade.addEventListener('click', () => {{
          if (!allAnswered()) {{
            status.textContent = `모든 문제를 먼저 풀어야 합니다. 남은 문제: ${{currentQuiz.questions.length - answeredCount()}}`;
            return;
          }}
          renderResults();
        }});
        save.addEventListener('click', async () => {{
          save.disabled = true;
          status.textContent = 'Saving...';
          try {{
            const response = await fetch('/api/save_hanja_answers', {{
              method: 'POST',
              headers: {{ 'Content-Type': 'application/json' }},
              body: JSON.stringify({{ setId: currentQuiz.setId, answers }}),
            }});
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error('Save failed');
            status.textContent = `Saved ${{result.answered_questions}}/${{result.total_questions}} to ${{result.answer_file}}`;
          }} catch (error) {{
            status.textContent = 'Save failed. Please try again.';
          }} finally {{
            save.disabled = false;
          }}
        }});

        askResumeIfNeeded(() => {{
          renderShell();
          show(0);
        }});
        checkAccess();
      }})();
    </script>
    """


def render_hanja_html_v3() -> str:
    data_json = json.dumps(
        {
            "defaultSetId": DEFAULT_HANJA_SET_ID,
            "quizzes": HANJA_QUIZZES,
        },
        ensure_ascii=False,
    )
    access_json = json.dumps({"accessCode": ACCESS_CODE}, ensure_ascii=False)
    html = r"""
    <section id="lock-screen" class="lock-screen">
      <div class="lock-card">
        <h1>한자 시험</h1>
        <p>접속 코드를 입력하세요.</p>
        <input id="access-code" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="text" style="-webkit-text-security: disc;">
        <button id="unlock" type="button">열기</button>
        <div id="lock-status" class="lock-status"></div>
      </div>
    </section>

    <section id="resume-screen" class="resume-screen">
      <div class="resume-card">
        <h2>기존 풀이가 있습니다</h2>
        <p>이어서 풀거나, 기존 답안을 지우고 새로 시작할 수 있습니다.</p>
        <button id="resume-continue" type="button">이어서 풀기</button>
        <button id="resume-reset" type="button">새로 시작</button>
      </div>
    </section>

    <main class="quiz-app">
      <header class="topbar hanja-topbar">
        <div>
          <div class="brand">한자 시험</div>
          <div id="hanja-loaded" class="loaded"></div>
        </div>
        <div id="progress" class="progress"></div>
      </header>

      <section class="title-block exam-paper-title">
        <label class="set-picker">
          <span>급수 / 회차</span>
          <select id="hanja-select"></select>
        </label>
        <h1 id="hanja-title"></h1>
        <strong id="hanja-grade"></strong>
        <p id="hanja-source-note" class="source-note"></p>
      </section>

      <nav id="number-grid" class="number-grid" aria-label="Question numbers"></nav>
      <section id="cards"></section>
      <section id="results" class="results" aria-live="polite"></section>

      <footer class="actions">
        <button id="prev" type="button" class="secondary">이전</button>
        <button id="save" type="button" class="save">저장</button>
        <button id="grade" type="button" class="grade" disabled>채점</button>
        <button id="next" type="button" class="primary">다음</button>
      </footer>
      <div id="status" class="status"></div>
    </main>

    <script id="hanja-data" type="application/json">__HANJA_DATA__</script>
    <script id="access-data" type="application/json">__ACCESS_DATA__</script>
    <script>
      (() => {
        const appData = JSON.parse(document.getElementById('hanja-data').textContent);
        const access = JSON.parse(document.getElementById('access-data').textContent);
        const lockScreen = document.getElementById('lock-screen');
        const resumeScreen = document.getElementById('resume-screen');
        const appRoot = document.querySelector('.quiz-app');
        const accessInput = document.getElementById('access-code');
        const unlock = document.getElementById('unlock');
        const lockStatus = document.getElementById('lock-status');
        const resumeContinue = document.getElementById('resume-continue');
        const resumeReset = document.getElementById('resume-reset');
        const hanjaSelect = document.getElementById('hanja-select');
        const hanjaTitle = document.getElementById('hanja-title');
        const hanjaGrade = document.getElementById('hanja-grade');
        const hanjaLoaded = document.getElementById('hanja-loaded');
        const hanjaSourceNote = document.getElementById('hanja-source-note');
        const cardsSection = document.getElementById('cards');
        const numberGrid = document.getElementById('number-grid');
        const progress = document.getElementById('progress');
        const status = document.getElementById('status');
        const prev = document.getElementById('prev');
        const next = document.getElementById('next');
        const save = document.getElementById('save');
        const grade = document.getElementById('grade');
        const results = document.getElementById('results');

        const selectedSetKey = 'hanja-selected-set';
        const initialSetId = localStorage.getItem(selectedSetKey) || appData.defaultSetId;
        let currentQuiz = appData.quizzes.find(q => q.setId === initialSetId) || appData.quizzes.find(q => q.setId === appData.defaultSetId) || appData.quizzes[0];
        let current = 0;
        let answers = {};
        let pendingResumeAction = null;

        function escapeHtml(value) {
          return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
        }
        function normalize(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); }
        function storedAnswers() { return JSON.parse(localStorage.getItem(currentQuiz.storageKey) || '{}'); }
        function answeredCount() { return Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length; }
        function allAnswered() { return answeredCount() === currentQuiz.questions.length; }
        function persist() { localStorage.setItem(currentQuiz.storageKey, JSON.stringify(answers)); }
        function hasStoredAnswers() {
          const stored = storedAnswers();
          return Object.keys(stored).some(k => stored[k] !== undefined && stored[k] !== '');
        }
        function askResumeIfNeeded(afterDecision) {
          pendingResumeAction = afterDecision;
          if (!hasStoredAnswers()) {
            answers = {};
            pendingResumeAction();
            pendingResumeAction = null;
            return;
          }
          resumeScreen.style.display = 'flex';
        }
        function isCorrect(question, value) {
          if (!value) return false;
          if (question.type === 'choice') return Number(value) === Number(question.answer);
          const selected = question.choices && value ? question.choices[Number(value) - 1] : value;
          return (question.accepted_answers || []).map(normalize).includes(normalize(selected));
        }
        function correctText(question) {
          if (question.type === 'choice') return `${question.answer}) ${question.choices[question.answer - 1]}`;
          return (question.accepted_answers || [''])[0];
        }
        function selectedText(question, value) {
          if (!value) return '미응답';
          if (question.choices && question.choices.length) return `${value}) ${question.choices[Number(value) - 1]}`;
          return value;
        }
        function setUnlocked() {
          localStorage.setItem('oracle-quiz-access', access.accessCode);
          lockScreen.style.display = 'none';
          appRoot.style.display = 'block';
        }
        function checkAccess() {
          if (localStorage.getItem('oracle-quiz-access') === access.accessCode) {
            setUnlocked();
            return;
          }
          appRoot.style.display = 'none';
          lockScreen.style.display = 'flex';
        }
        function renderCard(question, index) {
          const answer = answers[question.number] || '';
          const body = question.choices.map((choice, i) => `
            <label class="choice">
              <input type="radio" name="q${question.number}" value="${i + 1}" ${String(answer) === String(i + 1) ? 'checked' : ''}>
              <span>${i + 1}) ${escapeHtml(choice)}</span>
            </label>
          `).join('');
          return `
            <section class="question-card" data-index="${index}" data-number="${question.number}">
              <div class="topic">${String(question.number).padStart(2, '0')}. ${escapeHtml(question.topic)}</div>
              <h2>${escapeHtml(question.question).replaceAll('\n', '<br>')}</h2>
              <div class="choices">${body}</div>
            </section>
          `;
        }
        function renderShell() {
          hanjaSelect.value = currentQuiz.setId;
          hanjaTitle.textContent = currentQuiz.title;
          hanjaGrade.textContent = currentQuiz.grade || '';
          hanjaLoaded.textContent = `Loaded: ${currentQuiz.fileName}`;
          hanjaSourceNote.textContent = currentQuiz.sourceNote || '';
          cardsSection.innerHTML = currentQuiz.questions.map(renderCard).join('');
          numberGrid.innerHTML = currentQuiz.questions.map((q, i) => `<button class="num-btn" type="button" data-go="${i}">${i + 1}</button>`).join('');
          document.querySelectorAll('input[type="radio"]').forEach(input => {
            input.addEventListener('change', () => {
              answers[input.name.slice(1)] = Number(input.value);
              persist();
              show(current);
            });
          });
          Array.from(document.querySelectorAll('.num-btn')).forEach(button => button.addEventListener('click', () => show(Number(button.dataset.go))));
        }
        function updateStatus() {
          const buttons = Array.from(document.querySelectorAll('.num-btn'));
          buttons.forEach((button, i) => {
            const number = currentQuiz.questions[i].number;
            button.classList.toggle('active', i === current);
            button.classList.toggle('answered', Boolean(answers[number]));
          });
          grade.disabled = !allAnswered();
          progress.textContent = `${answeredCount()}/${currentQuiz.questions.length} 응답`;
          status.textContent = `응답 ${answeredCount()} / 미응답 ${currentQuiz.questions.length - answeredCount()} / 저장 파일: ${currentQuiz.answerFile}`;
        }
        function show(index) {
          const cards = Array.from(document.querySelectorAll('.question-card'));
          results.classList.remove('active');
          numberGrid.style.display = 'flex';
          cardsSection.style.display = 'block';
          current = Math.max(0, Math.min(index, cards.length - 1));
          cards.forEach((card, i) => card.classList.toggle('active', i === current));
          prev.disabled = current === 0;
          next.disabled = current === cards.length - 1;
          updateStatus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        function renderResults() {
          const graded = currentQuiz.questions.map(q => {
            const selected = answers[q.number];
            return { q, selected, correct: isCorrect(q, selected) };
          });
          const correctCount = graded.filter(item => item.correct).length;
          const reviewHtml = graded.map(item => `
            <article class="result-item ${item.correct ? 'correct' : 'wrong'}">
              <div class="result-topic">${item.q.number}. ${escapeHtml(item.q.topic)}</div>
              <div class="result-mark">${item.correct ? '정답' : '오답'}</div>
              <h3>${escapeHtml(item.q.question).replaceAll('\n', '<br>')}</h3>
              <p><strong>내 답:</strong> ${escapeHtml(selectedText(item.q, item.selected))}</p>
              <p><strong>정답:</strong> ${escapeHtml(correctText(item.q))}</p>
              <p><strong>해설:</strong> ${escapeHtml(item.q.explanation)}</p>
            </article>
          `).join('');
          results.innerHTML = `
            <div class="score-card">
              <div class="score-label">점수</div>
              <div class="score-value">${correctCount} / ${currentQuiz.questions.length}</div>
              <div class="score-rate">${Math.round((correctCount / currentQuiz.questions.length) * 100)}%</div>
              <button id="back-to-quiz" type="button" class="secondary result-back">문제로 돌아가기</button>
            </div>
            <h2>채점 해설</h2>
            ${reviewHtml}
          `;
          document.getElementById('back-to-quiz').addEventListener('click', () => show(current));
          numberGrid.style.display = 'none';
          cardsSection.style.display = 'none';
          results.classList.add('active');
          prev.disabled = true;
          next.disabled = true;
          grade.disabled = true;
          status.textContent = `채점 완료: ${correctCount}/${currentQuiz.questions.length}`;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        function switchQuiz(setId) {
          currentQuiz = appData.quizzes.find(q => q.setId === setId) || appData.quizzes[0];
          localStorage.setItem(selectedSetKey, currentQuiz.setId);
          current = 0;
          askResumeIfNeeded(() => {
            renderShell();
            show(0);
          });
        }

        appData.quizzes.forEach(quiz => {
          const option = document.createElement('option');
          option.value = quiz.setId;
          option.textContent = `${quiz.grade || quiz.setId} - ${quiz.title}`;
          hanjaSelect.appendChild(option);
        });
        hanjaSelect.value = currentQuiz.setId;
        hanjaSelect.addEventListener('change', () => switchQuiz(hanjaSelect.value));

        resumeContinue.addEventListener('click', () => {
          answers = storedAnswers();
          resumeScreen.style.display = 'none';
          if (pendingResumeAction) pendingResumeAction();
          pendingResumeAction = null;
        });
        resumeReset.addEventListener('click', () => {
          localStorage.removeItem(currentQuiz.storageKey);
          answers = {};
          resumeScreen.style.display = 'none';
          if (pendingResumeAction) pendingResumeAction();
          pendingResumeAction = null;
        });
        unlock.addEventListener('click', () => {
          if (accessInput.value.trim() === access.accessCode) setUnlocked();
          else lockStatus.textContent = '접속 코드가 맞지 않습니다.';
        });
        accessInput.addEventListener('keydown', event => { if (event.key === 'Enter') unlock.click(); });
        prev.addEventListener('click', () => show(current - 1));
        next.addEventListener('click', () => show(current + 1));
        grade.addEventListener('click', () => {
          if (!allAnswered()) {
            status.textContent = `모든 문제를 먼저 풀어야 합니다. 남은 문제: ${currentQuiz.questions.length - answeredCount()}`;
            return;
          }
          renderResults();
        });
        save.addEventListener('click', async () => {
          save.disabled = true;
          status.textContent = '저장 중...';
          try {
            const response = await fetch('/api/save_hanja_answers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setId: currentQuiz.setId, answers }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error('Save failed');
            status.textContent = `저장 완료: ${result.answered_questions}/${result.total_questions} -> ${result.answer_file}`;
          } catch (error) {
            status.textContent = '저장 실패. 다시 시도하세요.';
          } finally {
            save.disabled = false;
          }
        });

        askResumeIfNeeded(() => {
          renderShell();
          show(0);
        });
        checkAccess();
      })();
    </script>
    """
    return html.replace("__HANJA_DATA__", data_json).replace("__ACCESS_DATA__", access_json)


@ui.page("/hanja")
def hanja_page() -> None:
    ui.add_head_html(
        """
        <style>
          body { margin: 0; background: #f8fafc; color: #0f172a; font-family: Arial, sans-serif; }
          .lock-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: #f8fafc; }
          .lock-card { width: min(100%, 360px); display: grid; gap: 12px; padding: 20px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
          .lock-card h1 { margin: 0; font-size: 24px; }
          .lock-card input { height: 42px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; }
          .lock-card button { height: 42px; border: 0; border-radius: 8px; background: #7c2d12; color: white; font-weight: 700; }
          .lock-status { min-height: 18px; color: #b91c1c; font-size: 13px; }
          .resume-screen { position: fixed; inset: 0; z-index: 100; display: none; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 23, 42, .55); }
          .resume-card { width: min(100%, 380px); display: grid; gap: 12px; padding: 20px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; }
          .resume-card h2 { margin: 0; font-size: 22px; }
          .resume-card p { margin: 0; color: #475569; line-height: 1.45; }
          .resume-card button { min-height: 44px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; }
          #resume-continue { background: #7c2d12; color: white; border-color: #7c2d12; }
          #resume-reset { background: white; color: #334155; }
          .quiz-app { width: min(100%, 900px); margin: 0 auto; padding: 12px; }
          .topbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px; background: #7c2d12; color: white; border-radius: 0 0 8px 8px; }
          .brand { font-size: 18px; font-weight: 700; }
          .loaded, .progress, .status { font-size: 13px; color: #fef3c7; }
          .exam-paper-title { margin: 12px 0; padding: 12px 4px; background: transparent; text-align: left; }
          .exam-paper-title h1 { margin: 0 0 6px; font-size: 30px; line-height: 1.25; }
          .exam-paper-title strong { font-size: 18px; color: #7c2d12; }
          .set-picker { display: grid; gap: 6px; margin-bottom: 12px; color: #475569; font-size: 14px; font-weight: 700; }
          .set-picker select { min-height: 44px; padding: 0 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: #0f172a; font-size: 17px; }
          .source-note { margin: 8px 0 0; color: #64748b; font-size: 13px; line-height: 1.4; }
          .number-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0 14px; }
          .num-btn { min-width: 40px; height: 34px; border: 1px solid #cbd5e1; background: white; color: #334155; border-radius: 6px; font-weight: 700; }
          .num-btn.active { background: #7c2d12; border-color: #7c2d12; color: white; }
          .num-btn.answered:not(.active) { background: #dcfce7; border-color: #86efac; color: #166534; }
          .question-card, .results { display: none; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .question-card.active, .results.active { display: block; }
          .topic { color: #92400e; font-size: 14px; margin-bottom: 8px; font-weight: 700; }
          .question-card h2 { margin: 0 0 18px; font-size: 28px; line-height: 1.5; }
          .choices { display: grid; gap: 10px; }
          .choice { display: flex; gap: 12px; align-items: flex-start; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff7ed; line-height: 1.45; font-size: 24px; }
          .choice input { margin-top: 7px; transform: scale(1.3); }
          .text-answer { display: grid; gap: 8px; font-weight: 700; }
          .text-answer input { min-height: 44px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 20px; }
          .actions { position: sticky; bottom: 0; display: flex; justify-content: space-between; gap: 8px; padding: 12px 0; background: #f8fafc; }
          .actions button { min-height: 44px; padding: 0 18px; border-radius: 8px; border: 1px solid #cbd5e1; font-weight: 700; }
          .primary { background: #7c2d12; color: white; border-color: #7c2d12 !important; }
          .save { background: #f59e0b; color: white; border-color: #f59e0b !important; }
          .grade { background: #15803d; color: white; border-color: #15803d !important; }
          .secondary { background: white; color: #334155; }
          .actions button:disabled { opacity: .45; }
          .status { color: #64748b; padding: 2px 0 16px; }
          .score-card { display: grid; gap: 6px; padding: 16px; margin-bottom: 16px; border-radius: 8px; background: #fff7ed; border: 1px solid #fed7aa; }
          .score-value { font-size: 34px; font-weight: 800; color: #7c2d12; }
          .result-item { padding: 14px 0; border-top: 1px solid #e2e8f0; }
          .result-item.correct { background: linear-gradient(90deg, rgba(220,252,231,0.55), transparent 42%); }
          .result-item.wrong { background: linear-gradient(90deg, rgba(254,226,226,0.55), transparent 42%); }
          .result-mark { display: inline-flex; min-height: 26px; align-items: center; padding: 0 10px; border-radius: 999px; font-size: 13px; font-weight: 900; background: #e2e8f0; color: #334155; }
          .result-item.correct .result-mark { background: #dcfce7; color: #166534; }
          .result-item.wrong .result-mark { background: #fee2e2; color: #991b1b; }
          .result-item h3 { margin: 6px 0 10px; font-size: 18px; line-height: 1.45; }
          .perfect { padding: 14px; border-radius: 8px; background: #dcfce7; color: #166534; font-weight: 700; }
          @media (max-width: 560px) {
            .quiz-app { padding: 8px; }
            .exam-paper-title h1 { font-size: 24px; }
            .question-card h2 { font-size: 25px; }
            .choice { font-size: 23px; padding: 15px; }
            .actions { flex-wrap: wrap; }
            .actions button { flex: 1 1 calc(50% - 8px); padding: 0 8px; }
          }
        </style>
        """
    )
    ui.add_body_html(render_hanja_html_v3())


if __name__ == "__main__":
    ui.run(title="Oracle DB Quiz", host="0.0.0.0", port=8080, reload=False, show=False)


