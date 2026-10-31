import { buildMixedQuestionSet } from './bird_learning.js?v=learning-20261015';
import { LEARNING_QUESTIONS } from './bird_learning_content.js?v=learning-20261015';

const keyFor = map => `eduni.explore.encounter.${map.id}.v1`;
export const mapEncounterKey = keyFor;
const GENERAL_FORMAT = 'general-v1';
const generalQuestions = new Map(LEARNING_QUESTIONS.map(question => [question.id, question]));
const generalSubjects = new Set(LEARNING_QUESTIONS.map(question => question.subject));
const empty = map => ({ version: 1, regionId: map.id, captured: false, bestScore: 0, capturedAt: null, activeQuiz: null, recentQuestionIds: [], recentSubjects: [] });
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function validGeneralQuiz(value) {
  if (!record(value) || value.format !== GENERAL_FORMAT || typeof value.sessionId !== 'string' || !value.sessionId || value.sessionId.length > 120 ||
      !['easy', 'challenge'].includes(value.difficulty) || !Array.isArray(value.questionIds) || value.questionIds.length !== 3 ||
      new Set(value.questionIds).size !== 3 || value.questionIds.some(id => !generalQuestions.has(id) || generalQuestions.get(id).difficulty !== value.difficulty) ||
      !record(value.choiceOrders) || !Number.isInteger(value.index) || value.index < 0 || value.index > 2 ||
      !Array.isArray(value.answers) || value.answers.length !== value.index || !Array.isArray(value.firstAnswers) || value.firstAnswers.length !== 3 ||
      value.firstAnswers.some((id, index) => id !== null && !generalQuestions.get(value.questionIds[index]).choices.some(choice => choice.id === id)) ||
      typeof value.hintShown !== 'boolean') return false;
  const questions = value.questionIds.map(id => generalQuestions.get(id));
  if (new Set(questions.map(question => question.subject)).size !== 3 || !questions.some(question => question.subject === '국어' || question.subject === '수학')) return false;
  const orders = Object.keys(value.choiceOrders);
  if (orders.length !== 3 || orders.some(id => !value.questionIds.includes(id))) return false;
  for (let index = 0; index < 3; index += 1) {
    const question = generalQuestions.get(value.questionIds[index]);
    const choices = question.choices.map(choice => choice.id);
    const order = value.choiceOrders[question.id];
    if (!Array.isArray(order) || order.length !== choices.length || new Set(order).size !== choices.length || order.some(id => !choices.includes(id))) return false;
    if (index < value.index && (value.firstAnswers[index] === null || value.answers[index] !== question.answerId)) return false;
    if (index === value.index && value.firstAnswers[index] !== null && (value.firstAnswers[index] === question.answerId || !value.hintShown)) return false;
    if (index > value.index && value.firstAnswers[index] !== null) return false;
  }
  return true;
}

function normalizeQuiz(value, map) {
  if (value.format === GENERAL_FORMAT) return validGeneralQuiz(value) ? {
    format: GENERAL_FORMAT, sessionId: value.sessionId, difficulty: value.difficulty, questionIds: [...value.questionIds],
    choiceOrders: Object.fromEntries(value.questionIds.map(id => [id, [...value.choiceOrders[id]]])), index: value.index,
    answers: [...value.answers], firstAnswers: [...value.firstAnswers], hintShown: value.hintShown,
  } : null;
  if (Object.prototype.hasOwnProperty.call(value, 'format')) return null;
  if (!Number.isInteger(value.index) || value.index < 0 || value.index > 2 || !Array.isArray(value.answers) ||
      value.answers.length !== value.index || value.answers.some((id, index) => !map.animal.questions[index]?.choices.some(choice => choice.id === id))) return null;
  return { index: value.index, answers: [...value.answers] };
}

export function normalizeMapSave(value, map) {
  const fresh = empty(map);
  if (!record(value) || value.version !== 1 || value.regionId !== map.id || typeof value.captured !== 'boolean' ||
      !Number.isInteger(value.bestScore) || value.bestScore < 0 || value.bestScore > 3 ||
      (value.captured && (value.bestScore < 2 || !Number.isFinite(value.capturedAt) || value.capturedAt < 0)) ||
      (!value.captured && (value.bestScore >= 2 || value.capturedAt !== null)) ||
      (value.activeQuiz !== null && (!record(value.activeQuiz) || !normalizeQuiz(value.activeQuiz, map))) ||
      (value.recentQuestionIds !== undefined && (!Array.isArray(value.recentQuestionIds) || value.recentQuestionIds.length > 3 ||
        value.recentQuestionIds.some(id => !generalQuestions.has(id)) || new Set(value.recentQuestionIds).size !== value.recentQuestionIds.length)) ||
      (value.recentSubjects !== undefined && (!Array.isArray(value.recentSubjects) || value.recentSubjects.length > 3 ||
        value.recentSubjects.some(subject => !generalSubjects.has(subject)) || new Set(value.recentSubjects).size !== value.recentSubjects.length))) {
    return { save:fresh, valid:false, warning:'이 장소의 탐험 기록을 읽지 못했어요. 원본은 그대로 두었어요.' };
  }
  return { save:{...fresh,captured:value.captured,bestScore:value.bestScore,capturedAt:value.capturedAt,
    activeQuiz:value.activeQuiz ? normalizeQuiz(value.activeQuiz, map) : null,
    recentQuestionIds:[...(value.recentQuestionIds || [])], recentSubjects:[...(value.recentSubjects || [])]},valid:true,warning:null };
}

export function loadMapSave(storage, map) {
  if (!storage || typeof storage.getItem !== 'function') return {save:empty(map),warning:null};
  let raw;
  try { raw=storage.getItem(keyFor(map)); } catch { return {save:empty(map),warning:'탐험 기록을 읽지 못해 이번 화면에서만 진행해요.'}; }
  if (raw === null || raw === undefined || raw === '') return {save:empty(map),warning:null};
  try { const result=normalizeMapSave(JSON.parse(raw),map); return {save:result.save,warning:result.warning}; }
  catch { return {save:empty(map),warning:'탐험 기록을 확인하지 못했어요. 원본은 그대로 두었어요.'}; }
}

export function saveMapSave(save, storage, map, expectedActiveQuiz = null) {
  const normalized=normalizeMapSave(save,map);
  if (!normalized.valid || !storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') return false;
  try {
    const raw=storage.getItem(keyFor(map));
    let current=empty(map);
    if (raw !== null && raw !== undefined && raw !== '') {
      try { const previous=normalizeMapSave(JSON.parse(raw),map); if (!previous.valid) return false; current=previous.save; }
      catch { return false; }
    }
    const expectedQuiz = expectedActiveQuiz === null ? null : normalizeQuiz(expectedActiveQuiz,map);
    if (expectedActiveQuiz !== null && !expectedQuiz) return false;
    if (JSON.stringify(current.activeQuiz) !== JSON.stringify(expectedQuiz)) return false;
    const next={...normalized.save,captured:current.captured||normalized.save.captured,bestScore:Math.max(current.bestScore,normalized.save.bestScore),capturedAt:current.capturedAt??normalized.save.capturedAt,
      recentQuestionIds:[...new Set([...current.recentQuestionIds,...normalized.save.recentQuestionIds])].slice(-3),
      recentSubjects:[...new Set([...current.recentSubjects,...normalized.save.recentSubjects])].slice(-3)};
    storage.setItem(keyFor(map),JSON.stringify(next)); return true;
  } catch { return false; }
}

export function createMapEncounterState(save, map) {
  const normalized=normalizeMapSave(save,map).save;
  return {mode:'exploring',save:normalized,feedback:null,result:null,sessionSequence:0};
}

function createGeneralQuiz(save, map, difficulty, now, sequence) {
  const questionSet = buildMixedQuestionSet(difficulty, { previousIds: save.recentQuestionIds, previousSubjects: save.recentSubjects });
  if (!questionSet) return null;
  const timestamp = Number.isFinite(now) ? Math.max(0, Math.trunc(now)) : 0;
  return { format:GENERAL_FORMAT, sessionId:`${map.id}:${timestamp}:${sequence}:${Math.random().toString(36).slice(2, 8)}`, difficulty,
    questionIds:questionSet.questionIds, choiceOrders:Object.fromEntries(questionSet.questionIds.map((id,index)=>[id,questionSet.choiceOrder[index]])),
    index:0, answers:[], firstAnswers:[null,null,null], hintShown:false };
}

function scoreGeneralQuiz(quiz) {
  return quiz.questionIds.reduce((score,id,index)=>score+(generalQuestions.get(id).answerId===quiz.firstAnswers[index]?1:0),0);
}

function completeGeneralQuiz(save, quiz, map, now) {
  const firstTryScore=scoreGeneralQuiz(quiz), score=3, captured=true;
  const questions=quiz.questionIds.map(id=>generalQuestions.get(id));
  const timestamp=Number.isFinite(now)?Math.max(0,now):0;
  const nextSave={...save,captured,bestScore:Math.max(save.bestScore,score),capturedAt:save.capturedAt??(captured?timestamp:null),activeQuiz:null,
    recentQuestionIds:quiz.questionIds, recentSubjects:questions.map(question=>question.subject)};
  return {mode:'result',save:nextSave,feedback:null,result:{format:GENERAL_FORMAT,score,firstTryScore,total:3,success:true,newlyCaptured:captured&&!save.captured,sessionId:quiz.sessionId}};
}

export function reduceMapEncounter(state, action, now, map) {
  if (!state || !action) return state;
  const quiz=state.save.activeQuiz;
  if (action.type==='SYNC_CAPTURE') {
    const checked=normalizeMapSave(action.save,map), other=checked.valid?checked.save:null;
    if (!other?.captured || state.save.captured) return state;
    return {...state,save:{...state.save,captured:true,bestScore:other.bestScore,capturedAt:other.capturedAt}};
  }
  if (action.type==='INTERACT' && state.mode==='exploring') return {...state,mode:'observing'};
  if (action.type==='OBSERVE_CONFIRM' && state.mode==='observing' && !quiz) {
    const sequence=(state.sessionSequence||0)+1;
    const activeQuiz=createGeneralQuiz(state.save,map,action.difficulty||'easy',now,sequence);
    if (!activeQuiz) return state;
    return {...state,mode:'quiz',feedback:null,result:null,save:{...state.save,activeQuiz},sessionSequence:sequence};
  }
  if (action.type==='ANSWER' && state.mode==='quiz' && !state.feedback && quiz && action.questionIndex===quiz.index && quiz.index<3) {
    const general=quiz.format===GENERAL_FORMAT;
    const question=general ? generalQuestions.get(quiz.questionIds[quiz.index]) : map.animal.questions[quiz.index];
    const expectedQuestionId=general ? question.id : null;
    if (general && (action.sessionId!==quiz.sessionId || action.questionId!==expectedQuestionId)) return state;
    if (!question.choices.some(choice=>choice.id===action.choiceId)) return state;
    if (general) {
      const firstAnswers=[...quiz.firstAnswers];
      if (firstAnswers[quiz.index]===null) firstAnswers[quiz.index]=action.choiceId;
      if (action.choiceId!==question.answerId) return {...state,save:{...state.save,activeQuiz:{...quiz,firstAnswers,hintShown:true}},feedback:{sessionId:quiz.sessionId,questionIndex:quiz.index,questionId:question.id,correct:false,explanation:question.explanation,hint:question.hint}};
      const answers=[...quiz.answers,action.choiceId], index=quiz.index+1;
      const activeQuiz={...quiz,index,answers,firstAnswers,hintShown:false};
      if (index===3) return completeGeneralQuiz(state.save,activeQuiz,map,now);
      return {...state,save:{...state.save,activeQuiz},feedback:{sessionId:quiz.sessionId,questionIndex:quiz.index,questionId:question.id,correct:true,explanation:question.explanation}};
    }
    const answers=[...quiz.answers,action.choiceId], index=quiz.index+1;
    const activeQuiz={index,answers};
    if (index===3) {
      const score=answers.reduce((total,id,i)=>total+(map.animal.questions[i].answerId===id?1:0),0);
      const captured=state.save.captured||score>=2;
      const save={...state.save,captured,bestScore:Math.max(state.save.bestScore,score),capturedAt:state.save.capturedAt??(captured?Math.max(0,now):null),activeQuiz:null};
      return {mode:'result',save,feedback:null,result:{score,total:3,success:score>=2,newlyCaptured:captured&&!state.save.captured}};
    }
    return {...state,save:{...state.save,activeQuiz},feedback:{questionIndex:quiz.index,questionId:question.id,correct:question.answerId===action.choiceId,explanation:question.explanation}};
  }
  if (action.type==='HINT' && state.mode==='quiz' && quiz?.format===GENERAL_FORMAT && !state.feedback && action.sessionId===quiz.sessionId && action.questionIndex===quiz.index && action.questionId===quiz.questionIds[quiz.index] && !quiz.hintShown) return {...state,save:{...state.save,activeQuiz:{...quiz,hintShown:true}}};
  if (action.type==='NEXT' && state.mode==='quiz' && state.feedback && (state.feedback.correct || quiz?.format!==GENERAL_FORMAT) && action.questionIndex===state.feedback.questionIndex && (quiz?.format===GENERAL_FORMAT ? action.sessionId===state.feedback.sessionId && action.questionId===state.feedback.questionId : (!action.sessionId || action.sessionId===state.feedback.sessionId) && (!action.questionId || action.questionId===state.feedback.questionId))) return {...state,feedback:null};
  if (action.type==='RETRY' && state.mode==='quiz' && state.feedback && !state.feedback.correct && action.sessionId===state.feedback.sessionId && action.questionIndex===state.feedback.questionIndex && action.questionId===state.feedback.questionId) return {...state,feedback:null};
  if (action.type==='RESUME_QUIZ' && state.mode==='codex' && quiz) return {...state,mode:'quiz',feedback:null,result:null};
  if (action.type==='RETRY' && state.mode==='result') return {...state,mode:'observing',result:null,save:{...state.save,activeQuiz:null}};
  if (action.type==='CLOSE' && state.mode!=='exploring') return {...state,mode:'exploring',feedback:null,result:null,save:state.mode==='result'?{...state.save,activeQuiz:null}:state.save};
  if (action.type==='CODEX' && state.mode==='exploring') return {...state,mode:'codex'};
  return state;
}

export function mapEncounterView(state,map) {
  if (!state || state.mode==='exploring') return null;
  if (state.mode==='observing') return {title:`${map.animal.name}를 만났어요`,body:state.save.activeQuiz?`${map.animal.description}\n\n진행 중인 문제가 있어요. 동물 도감에서 이어할 수 있어요.`:map.animal.description,icon:map.animal.icon,kicker:'함께 배우기',actions:[...(!state.save.activeQuiz?[{label:'함께 배울 문제 시작',action:{type:'OBSERVE_CONFIRM'},primary:true}]:[]),{label:'탐험으로 돌아가기',action:{type:'CLOSE'}}]};
  if (state.mode==='codex') return {title:'나의 동물 도감',body:state.save.captured?`${map.animal.name} · 기록 완료\n최고 점수 ${state.save.bestScore} / 3`:`아직 ${map.animal.name} 기록이 없어요.`,icon:'📖',kicker:`${state.save.captured?1:0} / 1 기록`,actions:[...(state.save.activeQuiz?[{label:'진행 중인 문제 이어하기',action:{type:'RESUME_QUIZ'},primary:true}]:[]),{label:'닫기',action:{type:'CLOSE'},primary:!state.save.activeQuiz}]};
  if (state.mode==='quiz') {
    const quiz=state.save.activeQuiz;
    const index=state.feedback?.questionIndex ?? quiz?.index, question=quiz?.format===GENERAL_FORMAT?generalQuestions.get(quiz.questionIds[index]):map.animal.questions[index];
    if (!question) return null;
    const general=quiz.format===GENERAL_FORMAT;
    if (state.feedback&&!general) return {title:state.feedback.correct?'잘 관찰했어요!':'다시 살펴봐요',body:state.feedback.explanation,icon:state.feedback.correct?'✨':'🌱',kicker:'동물 관찰',actions:[{label:'다음 문제',action:{type:'NEXT',questionIndex:state.feedback.questionIndex,questionId:state.feedback.questionId},primary:true}]};
    const selected=general&&state.feedback?.questionId===question.id?quiz.firstAnswers[index]:'';
    if (state.feedback) return {title:state.feedback.correct?'잘 풀었어요!':'괜찮아요, 다시 해봐요',body:`${state.feedback.explanation}${state.feedback.correct?'':`\n\n힌트: ${state.feedback.hint}`}`,icon:state.feedback.correct?'✨':'🌱',kicker:`${quiz.difficulty==='easy'?'7세 준비':'초1 도전'} · ${question.subject} · ${index+1} / 3`,companionContext:{activity:'jungle',question:question.prompt,choices:question.choices.map(choice=>choice.text),selected:question.choices.find(choice=>choice.id===selected)?.text||''},actions:[{label:state.feedback.correct?'다음 문제':'다시 풀기',action:{type:state.feedback.correct?'NEXT':'RETRY',sessionId:state.feedback.sessionId,questionId:question.id,questionIndex:index},primary:true}]};
    return {question:true,title:general?`${map.animal.name}와 함께 배우기`:`${map.animal.name} 관찰 퀴즈`,body:`${question.prompt}${general&&quiz.hintShown?`\n\n힌트: ${question.hint}`:''}`,icon:map.animal.icon,kicker:general?`${quiz.difficulty==='easy'?'7세 준비':'초1 도전'} · ${question.subject} · 문제 ${index+1} / 3`:`문제 ${index+1} / 3`,companionContext:{activity:'jungle',question:question.prompt,choices:question.choices.map(choice=>choice.text),selected:''},actions:[...(general?quiz.choiceOrders[question.id]:question.choices.map(choice=>choice.id)).map(id=>{const choice=question.choices.find(item=>item.id===id);return {label:choice.text,action:{type:'ANSWER',sessionId:quiz.sessionId,questionId:question.id,questionIndex:index,choiceId:id}}}),...(general&&!quiz.hintShown?[{label:'힌트 보기',action:{type:'HINT',sessionId:quiz.sessionId,questionId:question.id,questionIndex:index}}]:[])]};
  }
  if (state.mode==='result' && state.result) {
    const general=state.result.sessionId!==undefined;
    return {title:state.result.success?(general?'배운 내용을 기록했어요!':'관찰 기록을 남겼어요!'):'조금 더 알아볼까요?',body:`${general?`세 문제를 모두 풀었어요. 처음에 맞힌 문제 ${state.result.firstTryScore} / 3개예요.`:`${state.result.score} / 3개 정답이에요.`}${state.result.newlyCaptured?` ${map.animal.name}를 도감에 등록했어요!`:''}`,icon:state.result.success?'📗':'🌱',kicker:general?'함께 배운 결과':'관찰 결과',actions:[...(!state.result.success?[{label:general?'새 문제로 다시 시작':'다시 관찰',action:{type:'RETRY'},primary:true}]:[]),{label:'탐험으로 돌아가기',action:{type:'CLOSE'},primary:state.result.success}]};
  }
  return null;
}
