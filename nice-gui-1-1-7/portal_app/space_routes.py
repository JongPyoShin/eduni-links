from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, Response
from nicegui import app


SPACE_GAME_URL = "/space"
SPACE_QUESTION_BANK_URL = "/space-question-bank.js"
SPACE_GAME_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space.html"
SPACE_QUESTION_BANK_FILE = Path(__file__).resolve().parent / "static_games" / "eduni_space_question_bank.js"


def _replace_once(html: str, old: str, new: str) -> str:
    if old not in html:
        raise RuntimeError(f"EDUNI space integration marker missing: {old[:80]}")
    return html.replace(old, new, 1)


def _inject_home_button(html: str) -> str:
    html = _replace_once(
        html,
        "    .counter { color:#475467; }",
        "    .space-home-button { min-height:38px; padding:0 12px; border:1px solid #d9def0; border-radius:12px; background:#fff; color:#475467; font-weight:950; cursor:pointer; white-space:nowrap; }\n"
        "    .space-home-button:active { transform:translateY(1px); }\n"
        "    .counter { color:#475467; }",
    )
    html = _replace_once(
        html,
        "          <div class=\"progress-row\">\n            <span id=\"counter\" class=\"counter\">1 / 10</span>",
        "          <div class=\"progress-row\">\n"
        "            <button id=\"spaceHomeBtn\" class=\"space-home-button\" type=\"button\">← 처음으로</button>\n"
        "            <span id=\"counter\" class=\"counter\">1 / 10</span>",
    )
    html = _replace_once(
        html,
        "      $('startBtn').addEventListener('click',startGame);",
        "      function goToSpaceIntro() {\n"
        "        state.index=0;\n"
        "        state.stars=0;\n"
        "        state.attempts=0;\n"
        "        state.resolved=false;\n"
        "        state.types=[];\n"
        "        state.question=null;\n"
        "        $('game').style.display='none';\n"
        "        $('result').style.display='none';\n"
        "        $('intro').style.display='block';\n"
        "        updateBest();\n"
        "        window.scrollTo({top:0,behavior:'smooth'});\n"
        "      }\n\n"
        "      $('spaceHomeBtn').addEventListener('click',goToSpaceIntro);\n"
        "      $('startBtn').addEventListener('click',startGame);",
    )
    return html


def _inject_question_bank(html: str) -> str:
    html = _replace_once(
        html,
        "거울, 회전, 쌓기나무, 위에서 본 모양을 10문제로 가볍게 연습해요. 시간 제한은 없어요.",
        "350문제 풀에서 공간지각과 사고추론 문제 10개를 매번 랜덤으로 골라 연습해요. 시간 제한은 없어요.",
    )
    html = _replace_once(
        html,
        "  <script>\n    (() => {",
        f'  <script src="{SPACE_QUESTION_BANK_URL}"></script>\n  <script>\n    (() => {{',
    )
    html = _replace_once(
        html,
        "      const baseShapes = [",
        "      const extraQuestionBank = window.EDUNI_SPACE_BANK || { shapes: [], countMaps: [], projectionMaps: [], directionScenarios: [], composeScenarios: [], foldScenarios: [] };\n"
        "      const baseShapes = [",
    )
    html = _replace_once(
        html,
        "      ];\n\n      const randInt =",
        "      ];\n"
        "      const allShapes = baseShapes.concat(extraQuestionBank.shapes || []);\n\n"
        "      const randInt =",
    )
    html = _replace_once(
        html,
        "      const matrixKey = (m) => m.map((row) => row.join('')).join('|');",
        "      const matrixKey = (m) => m.map((row) => row.join('')).join('|');\n"
        "      const bankBags = Object.create(null);\n"
        "      const drawBankIndex = (name, length) => {\n"
        "        if (!length) return -1;\n"
        "        if (!bankBags[name] || !bankBags[name].length) {\n"
        "          bankBags[name] = shuffle(Array.from({length},(_,index) => index));\n"
        "        }\n"
        "        return bankBags[name].pop();\n"
        "      };\n"
        "      const drawBankMatrix = (name, pool, fallback) => {\n"
        "        const index = drawBankIndex(name, pool.length);\n"
        "        return index < 0 ? fallback() : cloneMatrix(pool[index]);\n"
        "      };\n"
        "      const drawBankItem = (name, pool, fallback) => {\n"
        "        const index = drawBankIndex(name, pool.length);\n"
        "        return index < 0 ? fallback() : pool[index];\n"
        "      };",
    )
    html = _replace_once(
        html,
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('mirror', allShapes, () => cloneMatrix(pick(baseShapes)));",
    )
    html = _replace_once(
        html,
        "        const source = cloneMatrix(pick(baseShapes));",
        "        const source = drawBankMatrix('rotate', allShapes, () => cloneMatrix(pick(baseShapes)));",
    )
    html = _replace_once(
        html,
        "      function makeCountQuestion() {\n        const map = randomHeightMap();",
        "      function makeCountQuestion() {\n"
        "        const map = drawBankMatrix('count', extraQuestionBank.countMaps || [], randomHeightMap);",
    )
    html = _replace_once(
        html,
        "      function makeProjectionQuestion() {\n        const map=randomHeightMap();",
        "      function makeProjectionQuestion() {\n"
        "        const map=drawBankMatrix('projection', extraQuestionBank.projectionMaps || [], randomHeightMap);",
    )
    return html


def _inject_reasoning_modes(html: str) -> str:
    html = _replace_once(
        html,
        "    .mission-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:26px 0; }",
        "    .mission-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(105px,1fr)); gap:10px; margin:26px 0; }",
    )
    html = _replace_once(
        html,
        "          <div class=\"mission\"><b>👀</b><span>위에서 보기</span></div>",
        "          <div class=\"mission\"><b>👀</b><span>위에서 보기</span></div>\n"
        "          <div class=\"mission\"><b>🧭</b><span>방향 이동</span></div>\n"
        "          <div class=\"mission\"><b>🧩</b><span>조각 합치기</span></div>\n"
        "          <div class=\"mission\"><b>📄</b><span>종이 접기</span></div>",
    )
    html = _replace_once(
        html,
        "    .turn-label { margin-top:8px; text-align:center; color:#5b5bd6; font-size:18px; font-weight:950; }",
        "    .turn-label { margin-top:8px; text-align:center; color:#5b5bd6; font-size:18px; font-weight:950; }\n"
        "    .reasoning-stage { width:min(560px,100%); display:grid; place-items:center; gap:12px; }\n"
        "    .command-row { display:flex; flex-wrap:wrap; justify-content:center; gap:7px; }\n"
        "    .command-chip { padding:7px 10px; border-radius:12px; background:#fff; border:1px solid #cfd8e6; color:#344054; font-size:14px; font-weight:950; }\n"
        "    .compose-row { display:flex; align-items:center; justify-content:center; gap:10px; width:100%; }\n"
        "    .compose-plus { font-size:34px; font-weight:1000; color:#667085; }\n"
        "    .fold-label { padding:8px 12px; border-radius:12px; background:#eef2ff; color:#4338ca; font-weight:950; }\n"
        "    svg.reasoning-grid { width:min(210px,100%); height:auto; display:block; margin:auto; }\n"
        "    svg.reasoning-piece { width:min(150px,38vw); height:auto; display:block; }",
    )

    reasoning_javascript = r'''      const DIRECTION_ARROWS = ['↑','→','↓','←'];
      const COMMAND_LABELS = { L:'↺ 90° 반시계 방향으로 돌기', R:'↻ 90° 시계 방향으로 돌기', F:'↑ 앞으로 1칸' };
      const DIRECTION_LABELS = ['위쪽 ↑','오른쪽 →','아래쪽 ↓','왼쪽 ←'];
      const DIRECTION_NAMES = ['위쪽','오른쪽','아래쪽','왼쪽'];
      const DIRECTION_HELP_TEXT = '회전은 항상 90°씩 · 앞으로 1칸 이동';

      function renderDirectionGrid(row, col, direction = null, destinationOnly = false) {
        const cell=34;
        const size=5*cell;
        let body='';
        for (let r=0;r<5;r+=1) {
          for (let c=0;c<5;c+=1) {
            body += `<rect x="${c*cell+2}" y="${r*cell+2}" width="${cell-4}" height="${cell-4}" rx="6" fill="#f8fafc" stroke="#cfd8e6" stroke-width="2"/>`;
          }
        }
        const x=col*cell+cell/2;
        const y=row*cell+cell/2+1;
        if (destinationOnly) {
          body += `<circle cx="${x}" cy="${y}" r="10" fill="#7c3aed"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="900" fill="#fff">★</text>`;
        } else {
          body += `<circle cx="${x}" cy="${y}" r="13" fill="#e0e7ff" stroke="#6366f1" stroke-width="2"/><text x="${x}" y="${y+7}" text-anchor="middle" font-size="24" font-weight="900" fill="#4338ca">${DIRECTION_ARROWS[direction]}</text>`;
        }
        return `<svg class="reasoning-grid" viewBox="0 0 ${size} ${size}" role="img" aria-label="방향 격자">${body}</svg>`;
      }

      function makeDirectionQuestion() {
        const scenario=drawBankItem('direction', extraQuestionBank.directionScenarios || [], () => ({
          startRow:2,startCol:2,startDirection:0,commands:['R','F','L','F'],finalRow:1,finalCol:3,finalDirection:0,
        }));
        const correctKey=`${scenario.finalRow},${scenario.finalCol}`;
        const candidates=[[scenario.finalRow,scenario.finalCol]];
        const seen=new Set([correctKey]);
        const offsets=shuffle([[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]);
        for (const [dr,dc] of offsets) {
          const r=scenario.finalRow+dr;
          const c=scenario.finalCol+dc;
          const key=`${r},${c}`;
          if (r<0 || r>=5 || c<0 || c>=5 || seen.has(key)) continue;
          seen.add(key);
          candidates.push([r,c]);
          if (candidates.length===3) break;
        }
        const options=shuffle(candidates).map(([r,c]) => ({key:`${r},${c}`,html:renderDirectionGrid(r,c,null,true)}));
        const commands=scenario.commands.map((command,index) => `<span class="command-chip">${index+1}. ${COMMAND_LABELS[command]}</span>`).join('');
        return {
          badge:'🧭 방향 이동',
          title:'명령을 모두 따라가면 어디에 도착할까?',
          copy:`시작 방향: ${DIRECTION_LABELS[scenario.startDirection]}<br>회전은 항상 90°씩 해요.<br>화살표가 보는 방향을 기억하면서 움직여보자.`,
          visual:`<div class="reasoning-stage">${renderDirectionGrid(scenario.startRow,scenario.startCol,scenario.startDirection)}<div class="command-row">${commands}</div></div>`,
          options,
          correctKey,
          hint:'먼저 몸의 방향을 돌린 다음, 그 방향으로 앞으로 한 칸 움직여봐. ↺는 반시계 90°, ↻는 시계 90°예요.',
        };
      }

      function renderReasoningPiece(matrix, color) {
        const cell=34;
        const size=matrix.length*cell;
        let body='';
        matrix.forEach((row,r) => row.forEach((value,c) => {
          const x=c*cell+4;
          const y=r*cell+4;
          body += `<rect x="${x}" y="${y}" width="${cell-8}" height="${cell-8}" rx="7" fill="${value ? color : '#f8fafc'}" stroke="${value ? '#ffffff' : '#dbe4f0'}" stroke-width="2"/>`;
        }));
        return `<svg class="reasoning-piece" viewBox="0 0 ${size} ${size}" role="img" aria-label="도형 조각">${body}</svg>`;
      }

      function makeComposeQuestion() {
        const scenario=drawBankItem('compose', extraQuestionBank.composeScenarios || [], () => {
          const combined=cloneMatrix(pick(baseShapes)).map((row) => row.map((value) => value ? 1 : 0));
          const pieceA=combined.map((row,r) => row.map((value,c) => value && (r+c)%2===0 ? 1 : 0));
          const pieceB=combined.map((row,r) => row.map((value,c) => value && !pieceA[r][c] ? 1 : 0));
          return {pieceA,pieceB,combined};
        });
        const correct=cloneMatrix(scenario.combined);
        const candidates=[rotate90(correct),rotateN(correct,2),flipX(correct),flipY(correct)];
        return {
          badge:'🧩 조각 합치기',
          title:'두 조각을 합치면 어떤 모양이 될까?',
          copy:'같은 격자의 자리를 머릿속으로 포개어 완성 모양을 찾아보자.',
          visual:`<div class="reasoning-stage"><div class="compose-row">${renderReasoningPiece(scenario.pieceA,'#60a5fa')}<span class="compose-plus">+</span>${renderReasoningPiece(scenario.pieceB,'#f472b6')}</div></div>`,
          options:uniqueShapeOptions(correct,candidates),
          correctKey:matrixKey(correct),
          hint:'파란 칸과 분홍 칸을 하나의 격자에 모두 표시한다고 생각해봐.',
        };
      }

      function renderHoleGrid(matrix) {
        const cell=34;
        const rows=matrix.length;
        const cols=matrix[0].length;
        let body='';
        for (let r=0;r<rows;r+=1) {
          for (let c=0;c<cols;c+=1) {
            const x=c*cell+2;
            const y=r*cell+2;
            body += `<rect x="${x}" y="${y}" width="${cell-4}" height="${cell-4}" rx="5" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>`;
            if (matrix[r][c]) body += `<circle cx="${x+(cell-4)/2}" cy="${y+(cell-4)/2}" r="7" fill="#ef4444"/>`;
          }
        }
        return `<svg class="reasoning-grid" viewBox="0 0 ${cols*cell} ${rows*cell}" role="img" aria-label="종이 구멍 위치">${body}</svg>`;
      }

      function foldedMatrix(scenario) {
        const matrix=Array.from({length:scenario.foldedRows},() => Array(scenario.foldedCols).fill(0));
        scenario.holes.forEach(([r,c]) => { matrix[r][c]=1; });
        return matrix;
      }

      function mutateHolePattern(matrix) {
        const out=cloneMatrix(matrix);
        const occupied=[];
        const empty=[];
        out.forEach((row,r) => row.forEach((value,c) => (value ? occupied : empty).push([r,c])));
        if (occupied.length && empty.length) {
          const [fromR,fromC]=pick(occupied);
          const [toR,toC]=pick(empty);
          out[fromR][fromC]=0;
          out[toR][toC]=1;
        }
        return out;
      }

      function uniqueHoleOptions(correct) {
        const options=[{key:matrixKey(correct),html:renderHoleGrid(correct)}];
        const seen=new Set([matrixKey(correct)]);
        const candidates=[flipX(correct),flipY(correct),rotate90(correct),rotateN(correct,2)];
        let guard=0;
        while (options.length<3 && guard<20) {
          guard+=1;
          const candidate=candidates.length ? candidates.shift() : mutateHolePattern(correct);
          const key=matrixKey(candidate);
          if (seen.has(key)) continue;
          seen.add(key);
          options.push({key,html:renderHoleGrid(candidate)});
        }
        return shuffle(options);
      }

      function makeFoldQuestion() {
        const scenario=drawBankItem('fold', extraQuestionBank.foldScenarios || [], () => ({
          foldDirection:'L2R',foldedRows:4,foldedCols:2,holes:[[1,0]],unfolded:[[0,0,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
        }));
        const labels={L2R:'왼쪽을 오른쪽으로 접었어요 →',R2L:'오른쪽을 왼쪽으로 접었어요 ←',T2B:'위를 아래로 접었어요 ↓',B2T:'아래를 위로 접었어요 ↑'};
        const correct=cloneMatrix(scenario.unfolded);
        return {
          badge:'📄 종이 접기',
          title:'종이를 펼치면 구멍은 어디에 생길까?',
          copy:'접힌 종이에 찍힌 빨간 점이 펼쳤을 때 대칭으로 어디에 나타날지 생각해보자.',
          visual:`<div class="reasoning-stage"><div class="fold-label">${labels[scenario.foldDirection]}</div>${renderHoleGrid(foldedMatrix(scenario))}</div>`,
          options:uniqueHoleOptions(correct),
          correctKey:matrixKey(correct),
          hint:'접힌 선을 거울이라고 생각하고 빨간 점의 짝을 반대편에 찾아봐.',
        };
      }

'''
    html = _replace_once(
        html,
        "      function makeTypeSequence() {",
        reasoning_javascript + "      function makeTypeSequence() {",
    )
    html = _replace_once(
        html,
        "      function makeTypeSequence() {\n"
        "        const core=['mirror','rotate','count','projection','mirror','rotate','count','projection'];\n"
        "        core.push(pick(['mirror','rotate','count','projection']));\n"
        "        core.push(pick(['mirror','rotate','count','projection']));\n"
        "        return shuffle(core);\n"
        "      }",
        "      function makeTypeSequence() {\n"
        "        const allTypes=['mirror','rotate','count','projection','direction','compose','fold'];\n"
        "        const core=[...allTypes];\n"
        "        while (core.length<TOTAL) core.push(pick(allTypes));\n"
        "        return shuffle(core);\n"
        "      }",
    )
    html = _replace_once(
        html,
        "      function makeQuestion(type) {\n"
        "        if (type==='mirror') return makeMirrorQuestion();\n"
        "        if (type==='rotate') return makeRotationQuestion();\n"
        "        if (type==='count') return makeCountQuestion();\n"
        "        return makeProjectionQuestion();\n"
        "      }",
        "      function makeQuestion(type) {\n"
        "        if (type==='mirror') return makeMirrorQuestion();\n"
        "        if (type==='rotate') return makeRotationQuestion();\n"
        "        if (type==='count') return makeCountQuestion();\n"
        "        if (type==='projection') return makeProjectionQuestion();\n"
        "        if (type==='direction') return makeDirectionQuestion();\n"
        "        if (type==='compose') return makeComposeQuestion();\n"
        "        return makeFoldQuestion();\n"
        "      }",
    )
    return html


def _space_game_html() -> HTMLResponse:
    if not SPACE_GAME_FILE.exists() or not SPACE_QUESTION_BANK_FILE.exists():
        return HTMLResponse(
            """
            <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>공간탐험 파일 없음</title></head><body style="font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px">
            <h1>공간탐험 게임 파일을 찾을 수 없습니다.</h1>
            </body></html>
            """,
            status_code=404,
        )
    html = SPACE_GAME_FILE.read_text(encoding="utf-8")
    html = _inject_question_bank(html)
    html = _inject_reasoning_modes(html)
    html = _inject_home_button(html)
    return HTMLResponse(html)


@app.get(SPACE_QUESTION_BANK_URL)
def eduni_space_question_bank() -> Response:
    if not SPACE_QUESTION_BANK_FILE.exists():
        return Response("// question bank missing", status_code=404, media_type="application/javascript")
    return Response(SPACE_QUESTION_BANK_FILE.read_text(encoding="utf-8"), media_type="application/javascript")


@app.get("/space", response_class=HTMLResponse)
@app.get("/space/", response_class=HTMLResponse)
def eduni_space_game() -> HTMLResponse:
    return _space_game_html()


@app.get("/games/eduni-space", response_class=HTMLResponse)
@app.get("/games/eduni-space/", response_class=HTMLResponse)
def eduni_space_redirect() -> HTMLResponse:
    return HTMLResponse(
        f"""
        <!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <meta http-equiv="refresh" content="0; url={SPACE_GAME_URL}"><title>EDUNI 공간탐험으로 이동</title></head>
        <body style="font-family:system-ui,'Malgun Gothic',sans-serif;padding:24px">
        <h1>EDUNI 공간탐험</h1><p>잠시 후 이동합니다.</p><a href="{SPACE_GAME_URL}">바로 열기</a>
        <script>window.location.replace('{SPACE_GAME_URL}');</script></body></html>
        """
    )
