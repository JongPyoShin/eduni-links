import json, os, secrets, shutil
from pathlib import Path
from nicegui import app, ui

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = Path(os.getenv('EDUNI_HANJA_DIR', str(ROOT / 'files-mentioned-by-the-user-oracle' / 'outputs')))
SOURCE_DIR = Path(os.getenv('EDUNI_HANJA_SOURCE_DIR', str(ROOT / 'files-mentioned-by-the-user-oracle' / 'outputs')))
if not list(OUTPUT_DIR.glob('hanja_quiz_set_*.json')) and SOURCE_DIR != OUTPUT_DIR and SOURCE_DIR.exists():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source in SOURCE_DIR.glob('hanja_quiz_set_*.json'):
        target = OUTPUT_DIR / source.name
        if not target.exists(): shutil.copy2(source, target)
ACCESS_FILE = OUTPUT_DIR / 'quiz_access_code.txt'

def _code():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if ACCESS_FILE.exists(): return ACCESS_FILE.read_text(encoding='utf-8-sig').strip()
    code = secrets.token_urlsafe(12); ACCESS_FILE.write_text(code, encoding='utf-8'); return code

def quizzes():
    out=[]
    for path in sorted(OUTPUT_DIR.glob('hanja_quiz_set_*.json')):
        if path.name.endswith('_answers.json'): continue
        data=json.loads(path.read_text(encoding='utf-8'))
        out.append({'setId':data.get('set_id',path.stem),'title':data.get('title',path.stem),'grade':data.get('grade',''),'fileName':path.name,'questions':data.get('questions',[])})
    return out

def norm(v): return ''.join(str(v or '').strip().split()).lower()
def grade(q, value):
    if q.get('type') == 'choice': return str(value or '') == str(q.get('answer'))
    return norm(value) in {norm(x) for x in q.get('accepted_answers', [])}

QUIZZES=quizzes(); BY_ID={q['setId']:q for q in QUIZZES}

@app.get('/healthz')
async def healthz(): return {'ok': True}

@app.post('/hanja/api/save-answers')
async def save_answers(body: dict):
    q=BY_ID.get(body.get('setId') or (QUIZZES[0]['setId'] if QUIZZES else ''))
    if not q: return {'ok':False,'error':'unknown set'}
    answers=body.get('answers') or {}; result={'set_id':q['setId'],'answers':answers,'answered_questions':len(answers),'total_questions':len(q['questions'])}
    path=OUTPUT_DIR / f"{q['setId']}_answers.json"; path.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return {'ok':True,'answer_file':path.name,**{k:result[k] for k in ('answered_questions','total_questions')}}

@app.post('/api/save_hanja_answers')
async def save_answers_compat(body: dict): return await save_answers(body)

@ui.page('/hanja')
def hanja_page():
    data=json.dumps({'quizzes':QUIZZES,'accessCode':_code()},ensure_ascii=False)
    ui.add_body_html(f'''<main><h1>한자 시험</h1><div id="lock"><input id="code" placeholder="접속 코드"><button onclick="unlock()">열기</button><p id="msg"></p></div><section id="quiz" hidden><select id="sets"></select><div id="card"></div><button onclick="save()">저장</button><button onclick="gradeNow()">채점</button><p id="status"></p></section></main><script>const D={data},A={{}};function unlock(){{if(document.getElementById('code').value!==D.accessCode)return msg.textContent='코드를 확인하세요';lock.hidden=true;quiz.hidden=false;D.quizzes.forEach(q=>sets.add(new Option(q.grade+' '+q.title,q.setId)));sets.onchange=render;sets.value=D.quizzes[0].setId;render()}}function render(){{let q=D.quizzes.find(x=>x.setId===sets.value)||D.quizzes[0],x=q.questions[0];card.innerHTML='<h2>'+x.question+'</h2>'+(x.type==='choice'?x.choices.map((v,i)=>'<label><input type=radio name=a value="'+(i+1)+'">'+v+'</label>').join('<br>'):'<input id=ans>')}}async function save(){{let v=document.querySelector('input[name=a]:checked')?.value||document.getElementById('ans')?.value||'';A[sets.value]={{1:v}};let r=await fetch('/hanja/api/save-answers',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{setId:sets.value,answers:A[sets.value]}})}});status.textContent=(await r.json()).ok?'저장 완료':'저장 실패'}}function gradeNow(){{let q=(D.quizzes.find(x=>x.setId===sets.value)||D.quizzes[0]).questions[0],v=document.querySelector('input[name=a]:checked')?.value||document.getElementById('ans')?.value||'';status.textContent=((String(v)==String(q.answer)||q.accepted_answers?.map(String).includes(String(v)))?'정답이에요!':'다시 풀어보세요')}}render=()=>{{}};</script>''')
