import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'portal_app', 'static_games', 'facto_prep.html'), 'utf8');
const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).split('const KEY=')[0] + ';globalThis.__FACTO_Q=Q;';
const context = { console };
Object.assign(globalThis, context);
eval(script);
const questions = globalThis.__FACTO_Q;

assert.equal(questions.length, 200);
assert.equal(new Set(questions.map((q) => q.id)).size, 200);
assert.equal(questions.filter((q) => q.mode === 'base').length, 150);
assert.equal(questions.filter((q) => q.mode === 'variant').length, 50);
for (let exam = 1; exam <= 10; exam += 1) assert.equal(questions.filter((q) => q.exam === exam).length, 20);
for (const q of questions) {
  assert.ok(q.answer, `empty answer ${q.id}`);
  if (q.kind === 'choice') assert.ok(q.options.includes(q.answer), `choice options ${q.id}`);
  if (q.kind === 'multi') for (const answer of q.answer.split(',')) assert.ok(q.options.includes(answer), `multi options ${q.id}`);
}

const ones = { 하나: 1, 둘: 2, 셋: 3, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9 };
const tens = { 열: 10, 스물: 20, 서른: 30, 마흔: 40, 쉰: 50 };
function number(value) {
  const token = value.trim();
  if (/^\d+$/.test(token)) return Number(token);
  for (const [prefix, base] of Object.entries(tens)) if (token === prefix) return base;
  for (const [prefix, base] of Object.entries(tens)) if (token.startsWith(prefix)) return base + ones[token.slice(prefix.length)];
  throw new Error(`cannot parse number: ${token}`);
}
const csv = (values) => values.map(String).sort((a, b) => Number(a) - Number(b)).join(',');
function expected(q) {
  const visual = q.visual;
  switch (q.family) {
    case '한글수정렬': return csv(visual.split(' · ').map(number));
    case '혼합내림차순': return visual.split(' · ').map(number).sort((a, b) => b - a).join(',');
    case '범위조건': case '범위짝홀': {
      const [, lo, hi] = visual.match(/(\d+)보다 크고 (\d+)보다 작은/);
      const parity = visual.includes('홀수') ? 1 : visual.includes('짝수') ? 0 : null;
      return csv(Array.from({ length: Number(hi) - Number(lo) - 1 }, (_, i) => Number(lo) + i + 1).filter((n) => parity === null || n % 2 === parity));
    }
    case '동전세기': {
      const nums = [...visual.matchAll(/(\d+)개/g)].map((m) => Number(m[1]));
      return String(nums[0] * 10 + nums[1]);
    }
    case '묶어세기': case '묶음역추론': {
      const [, tensCount, onesCount] = visual.match(/묶음 (\d+)개.*낱개 (\d+)개/);
      return String(Number(tensCount) * 10 + Number(onesCount));
    }
    case '혼합동전': {
      const values = [...visual.matchAll(/(\d+)원 (\d+)개/g)].map((m) => Number(m[1]) * Number(m[2]));
      return String(values.reduce((sum, value) => sum + value, 0));
    }
    case '빠진수': return String(visual.split(' · ').findIndex((token) => token === '□') + 1);
    case '수규칙': {
      const values = [...visual.matchAll(/\d+/g)].map((m) => Number(m[0]));
      const step = values[1] - values[0];
      return `${values[values.length - 1] + step},${values[values.length - 1] + step * 2}`;
    }
    case '규칙빈칸2': {
      const tokens = visual.split(' → ');
      const step = (Number(tokens[2]) - Number(tokens[0])) / 2;
      return `${Number(tokens[0]) + step},${Number(tokens[5]) - step}`;
    }
    case '짝홀': case '개수짝홀': {
      const n = Number(q.title.match(/(\d+)개?/)[1]);
      return n % 2 ? '홀수' : '짝수';
    }
    case '큰수작은수': return (() => { const values = visual.split(' · ').map(number); return `${Math.max(...values)},${Math.min(...values)}`; })();
    case '자리수카드': return (() => { const [, tensText, onesText] = visual.match(/십의 자리: ([\d, ]+) \/ 일의 자리: ([\d, ]+)/); const t = tensText.split(',').map(Number); const o = onesText.split(',').map(Number); return `${Math.max(...t) * 10 + Math.max(...o)},${Math.min(...t) * 10 + Math.min(...o)}`; })();
    case '자리수응용': return (() => { const [, tensText, onesText] = visual.match(/십의 자리: ([\d, ]+) \/ 일의 자리: ([\d, ]+)/); const t = tensText.split(',').map(Number); const o = onesText.split(',').map(Number).filter((n) => n % 2); return String(Math.max(...t) * 10 + Math.max(...o)); })();
    case '부등식빈칸': { const [, tensDigit, limit] = visual.match(/(\d)□ < (\d+)/); return csv(Array.from({ length: 10 }, (_, n) => n).filter((n) => Number(`${tensDigit}${n}`) < Number(limit))); }
    case '조건추론': case '조건하나찾기': {
      const [, lo, hi] = visual.match(/(\d+)보다 크고 (\d+)보다 작/); const parity = visual.includes('홀수') ? 1 : 0;
      return csv(q.options.map(Number).filter((n) => n > Number(lo) && n < Number(hi) && n % 2 === parity && /^([0-9])\1$/.test(String(n))));
    }
    case '100수표': { const [, c, up, left, right, down] = q.title.match(/(\d+)에서 위 (\d+)칸, 왼쪽 (\d+)칸, 오른쪽 (\d+)칸, 아래 (\d+)칸/); return `${Number(c) - Number(up) * 10},${Number(c) - Number(left)},${Number(c) + Number(right)},${Number(c) + Number(down) * 10}`; }
    case '복합100수표': { const [, c, up, right] = q.title.match(/(\d+)에서 위 (\d+)칸, 오른쪽 (\d+)칸/); return String(Number(c) - Number(up) * 10 + Number(right)); }
    case '뺄셈수직선': { const [, a, b] = visual.match(/(\d+) − (\d+)/); return String(Number(a) - Number(b)); }
    case '문장제': case '빼기문장제': { const [, a, opA, da, b, opB, db] = visual.match(/지아 (\d+)([+−])(\d+) \/ 민아 (\d+)([+−])(\d+)/); const calc = (n, op, d) => op === '+' ? Number(n) + Number(d) : Number(n) - Number(d); const left = calc(a, opA, da), right = calc(b, opB, db); return left === right ? '같다' : left > right ? '지아' : '민아'; }
    case '식비교': { const [, a, b, c, d] = visual.match(/왼쪽: (\d+)\+(\d+) \/ 오른쪽: (\d+)\+(\d+)/); const left = Number(a) + Number(b), right = Number(c) + Number(d); return left === right ? '같다' : left > right ? '왼쪽' : '오른쪽'; }
    case '혼합연산': { const [, a, b, c] = visual.match(/(\d+) \+ (\d+) − (\d+)/); return String(Number(a) + Number(b) - Number(c)); }
    case '문장제변형': { const [, da, db] = visual.match(/지아 \+(\d+), 민아 \+(\d+)/); return Number(da) === Number(db) ? '같다' : Number(da) > Number(db) ? '지아' : '민아'; }
    case '반대부등식': { const [, t, lim] = visual.match(/(\d+)□ > (\d+)/); return csv(Array.from({length:10},(_,n)=>n).filter(n=>Number(`${t}${n}`)>Number(lim))); }
    case '가운데수': { const v=visual.split(' · ').map(Number).sort((a,b)=>a-b); return `${v[1]},${v[2]}`; }
    default: throw new Error(`unhandled family ${q.family}`);
  }
}

const errors = questions.filter((q) => expected(q) !== q.answer).map((q) => ({ id: q.id, family: q.family, expected: expected(q), actual: q.answer }));
assert.deepEqual(errors, []);
console.log(`facto-question-bank: PASS (${questions.length} questions; 200/200 answers verified)`);
