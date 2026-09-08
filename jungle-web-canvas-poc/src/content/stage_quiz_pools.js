import { BIRD_QUIZ_BANK } from "./bird_quiz_bank.js";

const STAGE_POOLS = Object.freeze({
  camp: Object.freeze([
    "q001","q003","q004","q005","q006","q007","q035","q036","q037","q038",
    "q041","q043","q044","q061","q062","q063","q064","q071","q072","q073",
    "q074","q075","q076","q077","q078","q079","q080",
  ]),
  waterfall: Object.freeze([
    "q002","q008","q039","q042","q045","q050","q051","q052","q053","q069",
    "q070","q081","q082","q083","q084","q085","q086","q087","q088","q089",
    "q090","q091","q092","q093","q094","q095",
  ]),
  cave: Object.freeze([
    "q009","q010","q011","q012","q013","q014","q015","q016","q017","q018",
    "q019","q020","q096","q097","q098","q099","q100","q101","q102","q103",
    "q104","q105","q106","q107","q108","q109",
  ]),
  giantTree: Object.freeze([
    "q021","q022","q023","q024","q025","q026","q027","q028","q029","q030",
    "q031","q032","q033","q034","q110","q111","q112","q113","q114","q115",
    "q116","q117","q118","q119","q120","q121",
  ]),
  skyRidge: Object.freeze([
    "q040","q046","q047","q048","q049","q054","q055","q056","q057",
    "q058","q059","q060","q065","q066","q067","q068","q122","q123","q124",
    "q125","q126","q127","q128","q129","q130","q131",
  ]),
});

export function getStageQuizPool(stageId, bank = BIRD_QUIZ_BANK) {
  const ids = STAGE_POOLS[stageId];
  if (!ids) return [];
  const bankMap = new Map(bank.map((q) => [q.id, q]));
  return ids.map((id) => bankMap.get(id)).filter(Boolean);
}

export function pickStageQuestions(stageId, bank = BIRD_QUIZ_BANK, usedIds = new Set(), rng = Math.random) {
  const pool = getStageQuizPool(stageId, bank);
  const available = pool.filter((q) => !usedIds.has(q.id));
  const source = available.length >= 3 ? available : pool;
  const shuffled = [...source];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 3);
}

export function getStagePoolIds(stageId) {
  return STAGE_POOLS[stageId] || [];
}

export function getStagePoolCount(stageId) {
  return (STAGE_POOLS[stageId] || []).length;
}
