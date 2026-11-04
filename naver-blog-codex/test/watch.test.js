const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSnapshotCurrent, draftPath, validateExistingDraft } = require('../src/watch');

const settings = (source_revision) => ({ blog_note: 'Use a warm opening.', blog_tone: 'family', source_revision });
const media = [{ id: 1, kind: 'image', filename: 'photo.jpg', content_type: 'image/jpeg', size: 123,
  caption: '', blog_use: true, position: 0, created_at: '2026-11-04T00:00:00Z', url: '/media/1' }];

test('settings revision changes the local draft filename', () => {
  assert.notEqual(draftPath(12, settings('a'.repeat(64)), media), draftPath(12, settings('b'.repeat(64)), media));
});

test('media changes the local draft filename', () => {
  assert.notEqual(draftPath(12, settings('a'.repeat(64)), media), draftPath(12, settings('a'.repeat(64)), [{ ...media[0], size: 124 }]));
});

test('generation is rejected when settings or media changed in flight', () => {
  assert.throws(() => assertSnapshotCurrent(settings('a'.repeat(64)), media, settings('b'.repeat(64)), media), /changed during draft generation/);
  assert.throws(() => assertSnapshotCurrent(settings('a'.repeat(64)), media, settings('a'.repeat(64)), [{ ...media[0], size: 124 }]), /changed during draft generation/);
});

test('a local draft with an old source revision is rejected', () => {
  const stale = { schemaVersion: 1, source: 'eduni-reading-journal', sourceRevision: 'b'.repeat(64),
    portalOrigin: 'https://portal.example', title: 'Title', body: 'Body', media: [] };
  assert.throws(() => validateExistingDraft(stale, 'https://portal.example', 12, [], settings('a'.repeat(64))), /invalid/);
});
