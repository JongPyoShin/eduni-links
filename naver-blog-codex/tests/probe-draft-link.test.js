'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { editorUrl, compareSnapshots } = require('../src/probe-draft-link');

const root = 'https://blog.naver.com/PostWriteForm.naver?blogId=synthetic';
const snapshot = (url, digest, componentCount = 2) => ({ url, digest, componentCount });

test('observed numeric parameter is only a candidate; no value is returned', () => {
  const result = compareSnapshots(snapshot(root, 'empty'), snapshot(root + '&exampleId=1234', 'draft'), snapshot(root + '&exampleId=1234', 'draft'));
  assert.equal(result.result, 'DIRECT_LINK_CANDIDATE');
  assert.deepEqual(result.candidateNumericParameterNames, ['exampleId']);
  assert.ok(!JSON.stringify(result).includes('1234'));
});

test('same address without draft-specific evidence is inconclusive', () => {
  assert.equal(compareSnapshots(snapshot(root, 'empty'), snapshot(root, 'draft'), snapshot(root, 'draft')).result, 'INCONCLUSIVE');
});

test('different document or account is inconclusive', () => {
  const selected = snapshot(root + '&exampleId=1234', 'draft');
  assert.equal(compareSnapshots(snapshot(root, 'empty'), selected, snapshot(selected.url, 'other')).result, 'INCONCLUSIVE');
  assert.equal(compareSnapshots(snapshot(root, 'empty'), selected, snapshot(selected.url.replace('synthetic', 'other'), 'draft')).result, 'INCONCLUSIVE');
});

test('credential-like and repeated parameters are not ID candidates', () => {
  for (const suffix of ['&authToken=1234', '&exampleId=1234&exampleId=5678']) {
    const selected = snapshot(root + suffix, 'draft');
    const result = compareSnapshots(snapshot(root, 'empty'), selected, selected);
    assert.equal(result.result, 'INCONCLUSIVE');
    assert.deepEqual(result.candidateNumericParameterNames, []);
  }
});

test('unexpected origin, path, credentials or fragment rejected', () => {
  for (const url of ['https://evil.example/PostWriteForm.naver', 'https://blog.naver.com/other', 'https://u:p@blog.naver.com/PostWriteForm.naver', root + '#fragment', 'http://blog.naver.com/PostWriteForm.naver']) assert.equal(editorUrl(url), null);
});
