const test = require('node:test');
const assert = require('node:assert/strict');
const { isEmptySmartEditorDocument, isVisuallyEmptyEditor, resolveEditorRecoveryPrompt, saveDraftOnly } = require('../src/save-draft');

const blankDocument = {
  document: { components: [
    { '@ctype': 'documentTitle', title: [{ '@ctype': 'paragraph', nodes: [{ '@ctype': 'textNode', value: '' }] }] },
    { '@ctype': 'text', value: [{ '@ctype': 'paragraph', nodes: [{ '@ctype': 'textNode', value: '' }] }] },
  ] },
};

test('blank SmartEditor document ignores visible placeholder content', () => {
  assert.equal(isEmptySmartEditorDocument(blankDocument), true);
});

test('SmartEditor content blocks an existing draft from being overwritten', () => {
  const existing = structuredClone(blankDocument);
  existing.document.components[1].value[0].nodes[0].value = 'Existing draft';
  assert.equal(isEmptySmartEditorDocument(existing), false);
});

test('unknown SmartEditor document data fails closed', () => {
  assert.equal(isEmptySmartEditorDocument({ document: { components: [{ '@ctype': 'image' }] } }), false);
  assert.equal(isEmptySmartEditorDocument(null), false);
});

test('editor placeholders count as empty, but visible draft content does not', () => {
  assert.equal(isVisuallyEmptyEditor('제목', '글감과 함께 나의 일상을 기록해보세요!', 0, 0), true);
  assert.equal(isVisuallyEmptyEditor('Existing title', '', 0, 0), false);
  assert.equal(isVisuallyEmptyEditor('제목', '글감과 함께 나의 일상을 기록해보세요!', 1, 0), false);
});

test('Naver recovery prompt resumes existing editor state before writing', async () => {
  const calls = [];
  const button = {
    count: async () => 1,
    isVisible: async () => true,
    click: async () => calls.push('recover-clicked'),
  };
  const popup = {
    waitFor: async () => {},
    count: async () => 1,
    isVisible: async () => true,
    innerText: async () => '작성 중인 글이 있습니다. 이어서 작성하시겠습니까?',
    getByRole: (role, options) => {
      calls.push([role, options.name, options.exact]);
      return button;
    },
  };
  assert.equal(await resolveEditorRecoveryPrompt({ locator: (selector) => {
    assert.equal(selector, '.se-popup-alert-confirm');
    return popup;
  } }), true);
  assert.deepEqual(calls, [['button', '확인', true], 'recover-clicked']);
});

test('unknown Naver confirmation is left untouched', async () => {
  const popup = {
    waitFor: async () => {},
    count: async () => 1,
    isVisible: async () => true,
    innerText: async () => '이 글을 삭제하시겠습니까?',
  };
  await assert.rejects(resolveEditorRecoveryPrompt({ locator: () => popup }), /unexpected Naver dialog/i);
});

test('temporary save succeeds when the saved-post count increases', async () => {
  const calls = [];
  const page = {
    getByRole(role, options) {
      calls.push([role, options.name]);
      return { count: async () => 1, isVisible: async () => true, click: async () => calls.push('clicked') };
    },
    getByText(pattern) {
      calls.push(String(pattern));
      return { waitFor: async () => { throw new Error('no toast'); } };
    },
    locator(selector) {
      calls.push(selector);
      return { count: async () => 1, getAttribute: async () => '임시저장된 글 보기, 0개', innerText: async () => '0' };
    },
    waitForFunction: async (fn, args, options) => {
      calls.push([args.previous, options.timeout]);
      assert.equal(args.selector, 'button[class*="save_count_btn"]');
    },
  };
  await saveDraftOnly(page);
  assert.deepEqual(calls[0], ['button', '저장']);
  assert.ok(calls.includes('clicked'));
  assert.deepEqual(calls.find((value) => Array.isArray(value) && value[0] === 0), [0, 20_000]);
});

test('temporary save fails closed if neither count nor saved toast confirms it', async () => {
  let clicked = false;
  const page = {
    getByRole: () => ({ count: async () => 1, isVisible: async () => true, click: async () => { clicked = true; } }),
    getByText: () => ({ waitFor: async () => { throw new Error('not saved'); } }),
    locator: () => ({ count: async () => 1, getAttribute: async () => '0', innerText: async () => '0' }),
    waitForFunction: async () => { throw new Error('count unchanged'); },
  };
  await assert.rejects(saveDraftOnly(page), /could not confirm|확인하지 못했습니다/);
  assert.equal(clicked, true);
});
