const test = require('node:test');
const assert = require('node:assert/strict');
const { assertSnapshotCurrent, draftPath, nextDailyRunAt, selectDraftMedia, validateExistingDraft, validateSettings } = require('../src/watch');

const settings = (source_revision) => ({ blog_note: 'Use a warm opening.', blog_tone: 'family', status: 'completed', source_revision });
const media = [{ id: 1, kind: 'image', filename: 'photo.jpg', content_type: 'image/jpeg', size: 123,
  caption: '', blog_use: true, position: 0, created_at: '2026-11-04T00:00:00Z', url: '/media/1' }];

test('settings revision changes the local draft filename', () => {
  assert.notEqual(draftPath(12, settings('a'.repeat(64)), media), draftPath(12, settings('b'.repeat(64)), media));
});

test('media changes the local draft filename', () => {
  assert.notEqual(draftPath(12, settings('a'.repeat(64)), media), draftPath(12, settings('a'.repeat(64)), [{ ...media[0], size: 124 }]));
});

test('only the GPT-selected photos within 18 MiB are attached to Naver', () => {
  const source = [
    { ...media[0], id: 1, size: 12 * 1024 * 1024, position: 0 },
    { ...media[0], id: 2, size: 8 * 1024 * 1024, position: 3, url: '/media/2' },
    { ...media[0], id: 3, kind: 'video', size: 1, position: 5, url: '/media/3' },
  ];
  assert.deepEqual(selectDraftMedia(source, [2]), [source[1], source[2]]);
  assert.throws(() => selectDraftMedia(source, [1, 2]), /outside the 18 MiB budget/);
  assert.throws(() => selectDraftMedia(source, [999]), /outside the stable reading record/);
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

test('recovery draft may contain a verified photo subset but all videos', () => {
  const source = [
    { ...media[0], id: 1, size: 12 * 1024 * 1024, position: 0, url: '/media/1' },
    { ...media[0], id: 2, size: 8 * 1024 * 1024, position: 3, url: '/media/2' },
    { ...media[0], id: 3, kind: 'video', size: 1, position: 5, url: '/media/3' },
  ];
  const draft = { schemaVersion: 1, source: 'eduni-reading-journal', sourceRevision: 'a'.repeat(64),
    portalOrigin: 'https://portal.example', title: 'Title', body: 'Body', media: [
      { kind: 'image', url: 'https://portal.example/media/2', caption: '', position: 3 },
      { kind: 'video', url: 'https://portal.example/media/3', caption: '', position: 5 },
    ] };
  assert.equal(validateExistingDraft(draft, 'https://portal.example', 12, source, settings('a'.repeat(64))), undefined);
});

test('watch settings default to a daily 17:00 run and reject invalid times', () => {
  assert.equal(validateSettings({ tone: 'family', parentNotePolicy: 'never' }).dailyAt, '17:00');
  assert.equal(validateSettings({ tone: 'family', parentNotePolicy: 'never', dailyAt: '17:00' }).dailyAt, '17:00');
  assert.throws(() => validateSettings({ tone: 'family', parentNotePolicy: 'never', dailyAt: '25:90' }), /Invalid watch-settings/);
});

test('daily schedule waits until 17:00 local and advances after the scheduled time', () => {
  const before = new Date(2026, 10, 9, 16, 59, 30);
  const runToday = nextDailyRunAt(before, '17:00');
  assert.equal(runToday.getFullYear(), 2026);
  assert.equal(runToday.getMonth(), 10);
  assert.equal(runToday.getDate(), 9);
  assert.equal(runToday.getHours(), 17);
  assert.equal(runToday.getMinutes(), 0);

  const after = new Date(2026, 10, 9, 17, 1, 0);
  const runTomorrow = nextDailyRunAt(after, '17:00');
  assert.equal(runTomorrow.getDate(), 10);
  assert.equal(runTomorrow.getHours(), 17);
});

test('a completed daily run is not scheduled twice on the same date', () => {
  const afterRun = new Date(2026, 10, 9, 17, 0, 30);
  const next = nextDailyRunAt(afterRun, '17:00', '2026-11-09');
  assert.equal(next.getDate(), 10);
  assert.equal(next.getHours(), 17);
});
