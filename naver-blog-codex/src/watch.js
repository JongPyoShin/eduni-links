const fs = require('node:fs/promises');
const dns = require('node:dns/promises');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline/promises');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const STATE = path.join(ROOT, 'watch-state.json');
const SETTINGS = path.join(ROOT, 'watch-settings.json');
const ORIGIN_FILE = path.join(ROOT, 'eduni-origin.json');
const DRAFTS = path.join(ROOT, 'drafts');
const API = '/reading/api/blog-watch/records';
const TONES = ['family', 'plain', 'child', 'book'];
const TONE_NAMES = ['따뜻한 가족 독서기록', '담백한 독서 일지', '아이의 말과 장면 중심', '책 정보 중심 기록'];
const POLL_MS = 15_000;
const RETRY_MS = 60_000;
const GRACE_MS = 3 * 60_000;
const settingsApi = (id) => '/reading/api/records/' + id + '/blog-settings';

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return rl.question(prompt).finally(() => rl.close());
}

function fail(message) { throw new Error(message); }

function privateIp(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127);
  }
  if (!net.isIPv6(address)) return false;
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? privateIp(mapped[1]) : ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || /^fe[89ab]/.test(ip);
}

async function validateOrigin(value) {
  let url;
  try { url = new URL(value); } catch { fail('Origin must be a valid HTTP(S) origin.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.origin !== value || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) fail('Enter only the exact origin, without a path, query, or credentials.');
  if (url.protocol === 'http:') {
    const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (!net.isIP(host) && host !== 'localhost') fail('HTTP hostnames are not allowed; use HTTPS or a local/private IP address.');
    const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
    if (!addresses.length || addresses.some(({ address }) => !privateIp(address))) {
      fail('Public origins must use HTTPS.');
    }
  }
  return url.origin;
}

async function confirmedOrigin(option) {
  let saved;
  try { saved = JSON.parse(await fs.readFile(ORIGIN_FILE, 'utf8')).origin; } catch (_) {}
  const origin = await validateOrigin(option || saved || await ask('EDUNI origin (for example https://portal.example): '));
  if (saved !== origin) {
    if ((await ask('Type this exact origin to allow the watcher and media helper to use it: ' + origin + '\nConfirm: ')).trim() !== origin) fail('Origin confirmation did not match.');
    await fs.writeFile(ORIGIN_FILE, JSON.stringify({ origin }, null, 2) + '\n', { mode: 0o600 });
  }
  return origin;
}

async function api(origin, pathname, init = {}) {
  const response = await fetch(origin + pathname, {
    ...init,
    redirect: 'manual',
    signal: AbortSignal.timeout(pathname.endsWith('/blog-draft') ? 115_000 : 30_000),
    headers: { Origin: origin, 'X-Requested-With': 'XMLHttpRequest', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  });
  if (response.status >= 300 && response.status < 400) fail('EDUNI returned a redirect; request stopped.');
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok === false) fail('EDUNI request failed (' + response.status + ').');
  return data;
}

async function records(origin) {
  const data = await api(origin, API + '?limit=1');
  if (!Array.isArray(data.records) || data.records.length > 1) fail('Unexpected blog-watch records response.');
  return data.records[0] || null;
}

async function recordsAfter(origin, afterId) {
  const data = await api(origin, API + '?limit=500&after_id=' + afterId);
  const page = data.records;
  if (!Array.isArray(page) || page.some((r, i) => !Number.isSafeInteger(r.id) || r.id <= afterId
    || typeof r.created_at !== 'string' || (i > 0 && r.id <= page[i - 1].id))) fail('Unexpected blog-watch records response.');
  return page.map(({ id, created_at }) => ({ id, created_at }));
}

function mediaKey(attachments) {
  if (!Array.isArray(attachments)) fail('Unexpected blog-media response.');
  return JSON.stringify(attachments.map(({ id, kind, filename, content_type, size, caption, blog_use, position, created_at, url }) =>
    ({ id, kind, filename, content_type, size, caption, blog_use, position, created_at, url })));
}

function validateBlogSettings(settings) {
  if (!settings || typeof settings.blog_note !== 'string' || Array.from(settings.blog_note).length > 4_000
    || !TONES.includes(settings.blog_tone) || !/^[a-f0-9]{64}$/.test(settings.source_revision || '')) {
    fail('EDUNI returned invalid blog settings.');
  }
  return settings;
}

function draftPath(recordId, settings, attachments) {
  const fingerprint = createHash('sha256')
    .update(settings.source_revision + '\n' + mediaKey(attachments))
    .digest('hex');
  return path.join(DRAFTS, 'reading-blog-' + recordId + '-' + fingerprint + '.json');
}

function assertSnapshotCurrent(settings, attachments, currentSettings, currentAttachments) {
  if (currentSettings.source_revision !== settings.source_revision
    || mediaKey(currentAttachments) !== mediaKey(attachments)) {
    fail('Blog settings or media changed during draft generation; it will be retried after stabilizing.');
  }
}

async function waitReady(origin, record) {
  const created = Date.parse(record.created_at);
  if (!Number.isFinite(created)) fail('Record has an invalid created_at value.');
  while (Date.now() < created + GRACE_MS) await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_MS, created + GRACE_MS - Date.now())));
  let previous = null;
  for (;;) {
    const data = await api(origin, '/reading/api/records/' + record.id + '/blog-media');
    const settings = validateBlogSettings(await api(origin, settingsApi(record.id)));
    const current = mediaKey(data.attachments);
    const snapshot = JSON.stringify([settings.source_revision, current]);
    if (previous !== null && snapshot === previous) return { attachments: data.attachments, settings };
    previous = snapshot;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

async function readState() {
  try {
    const value = JSON.parse(await fs.readFile(STATE, 'utf8'));
    if (!Number.isSafeInteger(value.baselineId) || value.baselineId < 0
      || !Number.isSafeInteger(value.lastGeneratedId) || value.lastGeneratedId < 0) fail('Invalid watcher state; preserve and inspect watch-state.json.');
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeState(state) {
  const temp = STATE + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fs.writeFile(temp, JSON.stringify(state) + '\n', { flag: 'wx', mode: 0o600 });
  try { await fs.rename(temp, STATE); } catch (error) { await fs.rm(temp, { force: true }); throw error; }
}

function validateSettings(settings) {
  if (!settings || !TONES.includes(settings.tone)
    || !['never', 'ask', 'always'].includes(settings.parentNotePolicy)) {
    fail('Invalid watch-settings.json; run npm run watch:configure.');
  }
  return settings;
}

async function writeSettings(settings) {
  validateSettings(settings);
  const temp = SETTINGS + '.' + process.pid + '.' + Date.now() + '.tmp';
  await fs.writeFile(temp, JSON.stringify(settings, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  try { await fs.rename(temp, SETTINGS); } catch (error) { await fs.rm(temp, { force: true }); throw error; }
}

async function readSettings() {
  try {
    return validateSettings(JSON.parse(await fs.readFile(SETTINGS, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const defaults = { tone: 'family', parentNotePolicy: 'never' };
    await writeSettings(defaults);
    console.log('Created watch-settings.json with the family tone; parent notes are excluded by default.');
    return defaults;
  }
}

async function chooseTone() {
  for (;;) {
    const answer = (await ask(TONE_NAMES.map((name, index) => (index + 1) + ') ' + name).join('\n') + '\nTone [1-4]: ')).trim();
    if (/^[1-4]$/.test(answer)) return TONES[Number(answer) - 1];
  }
}

async function parentNoteChoice() {
  for (;;) {
    const answer = (await ask('Include parent note for this record? [y/N]: ')).trim().toLowerCase();
    if (answer === '' || answer === 'n' || answer === 'no') return false;
    if (answer === 'y' || answer === 'yes') return true;
  }
}

async function chooseParentNotePolicy() {
  for (;;) {
    const answer = (await ask('Parent note policy: 1) never include  2) ask for each record  3) always include [1]: ')).trim();
    if (!answer || answer === '1') return 'never';
    if (answer === '2') return 'ask';
    if (answer === '3') return 'always';
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openDraft(filename) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'src', 'save-draft.js'), path.relative(process.cwd(), filename)], { stdio: 'inherit', cwd: process.cwd() });
    child.once('error', reject);
    child.once('close', resolve);
  });
}

function validateExistingDraft(draft, origin, recordId, stableMedia, settings) {
  if (!draft || draft.schemaVersion !== 1 || draft.source !== 'eduni-reading-journal'
    || draft.sourceRevision !== settings.source_revision
    || draft.portalOrigin !== origin || typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > 120
    || typeof draft.body !== 'string' || !draft.body.trim() || draft.body.length > 100_000
    || !Array.isArray(draft.media) || draft.media.length > 20
    || draft.media.filter((item) => item && item.kind === 'video').length > 10) fail('Existing draft for record ' + recordId + ' is invalid; it was preserved unchanged.');
  const positions = new Set();
  const media = draft.media.map((item) => {
    if (!item || !['image', 'video'].includes(item.kind) || typeof item.caption !== 'string' || item.caption.length > 500
      || !Number.isInteger(item.position) || item.position < 0 || item.position >= 20 || positions.has(item.position)) {
      fail('Existing draft for record ' + recordId + ' is invalid; it was preserved unchanged.');
    }
    positions.add(item.position);
    let url;
    try { url = new URL(item.url); } catch (_) { fail('Existing draft for record ' + recordId + ' is invalid; it was preserved unchanged.'); }
    if (url.origin !== origin || url.username || url.password) fail('Existing draft for record ' + recordId + ' is invalid; it was preserved unchanged.');
    return { kind: item.kind, url: url.href, caption: item.caption, position: item.position };
  }).sort((a, b) => a.position - b.position);
  const expected = stableMedia.map((item, position) => ({
    kind: item.kind, url: new URL(item.url, origin).href, caption: item.caption || '', position,
  }));
  if (JSON.stringify(media) !== JSON.stringify(expected)) fail('Existing draft for record ' + recordId + ' has different media; it was preserved unchanged.');
}

async function processRecord(origin, record, settings, state) {
  const { attachments: stableMedia, settings: blogSettings } = await waitReady(origin, record);
  const filename = draftPath(record.id, blogSettings, stableMedia);
  let existingText;
  try {
    existingText = await fs.readFile(filename, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existingText !== undefined) {
    let existing;
    try { existing = JSON.parse(existingText); }
    catch (_) { fail('Existing draft for record ' + record.id + ' is invalid; it was preserved unchanged.'); }
    validateExistingDraft(existing, origin, record.id, stableMedia, blogSettings);
    state.lastGeneratedId = record.id;
    await writeState(state);
    console.log('Resuming the existing local draft for record ' + record.id + '.');
    await openDraft(filename);
    return;
  }
  const include_parent_note = settings.parentNotePolicy === 'always'
    ? true
    : settings.parentNotePolicy === 'ask' ? await parentNoteChoice() : false;
  const data = await api(origin, '/reading/api/records/' + record.id + '/blog-draft', {
    method: 'POST', body: JSON.stringify({ tone: blogSettings.blog_tone, include_parent_note }),
  });
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 80
    || typeof data.body !== 'string' || !data.body.trim() || data.body.length > 5_000
    || data.photo_count !== stableMedia.filter((item) => item.kind === 'image').length
    || data.video_count !== stableMedia.filter((item) => item.kind === 'video').length
    || data.source_revision !== blogSettings.source_revision) fail('EDUNI returned an invalid or stale draft.');
  const afterMedia = (await api(origin, '/reading/api/records/' + record.id + '/blog-media')).attachments;
  const afterSettings = validateBlogSettings(await api(origin, settingsApi(record.id)));
  assertSnapshotCurrent(blogSettings, stableMedia, afterSettings, afterMedia);
  const draft = {
    schemaVersion: 1,
    source: 'eduni-reading-journal',
    sourceRevision: blogSettings.source_revision,
    title: data.title,
    body: data.body,
    portalOrigin: origin,
    media: stableMedia.map((item, position) => ({
      kind: item.kind, url: new URL(item.url, origin).href, caption: item.caption || '', position,
    })),
  };
  await fs.mkdir(DRAFTS, { recursive: true, mode: 0o700 });
  const handle = await fs.open(filename, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(draft, null, 2) + '\n'); } finally { await handle.close(); }
  state.lastGeneratedId = record.id;
  await writeState(state);
  console.log('Generated a local draft for record ' + record.id + '.');
  await openDraft(filename);
}

async function main() {
  const args = process.argv.slice(2);
  const latestOnly = args.includes('--latest');
  const configure = args.includes('--configure');
  let originArg = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--origin') originArg = args[++i];
    else if (args[i] !== '--latest' && args[i] !== '--configure') fail('Usage: npm run watch -- [--origin https://portal.example] [--latest] [--configure]');
  }
  if (configure && latestOnly) fail('--configure and --latest cannot be used together.');
  if (originArg && !originArg.trim()) fail('Origin is required after --origin.');
  const origin = await confirmedOrigin(originArg);
  if (configure) {
    const settings = { tone: await chooseTone(), parentNotePolicy: await chooseParentNotePolicy() };
    await writeSettings(settings);
    console.log('Saved watch-settings.json.');
    return;
  }
  const settings = await readSettings();
  let latest;
  for (;;) {
    try { latest = await records(origin); break; }
    catch (_) {
      console.error('EDUNI record endpoint is unavailable; retrying in 60 seconds.');
      await sleep(RETRY_MS);
    }
  }
  let state = await readState();
  if (!state) {
    state = { baselineId: latest ? (latestOnly ? Math.max(0, latest.id - 1) : latest.id) : 0, lastGeneratedId: 0 };
    await writeState(state);
  }
  if (latestOnly) {
    if (!latest) fail('No reading records found.');
    if (state.lastGeneratedId !== latest.id) await processRecord(origin, latest, settings, state);
    return;
  }
  console.log('Watching for new reading records; only record IDs newer than the saved baseline are eligible.');
  for (;;) {
    const afterId = Math.max(state.baselineId, state.lastGeneratedId);
    let page;
    try { page = await recordsAfter(origin, afterId); }
    catch (_) {
      console.error('EDUNI record endpoint is unavailable; retrying in 60 seconds.');
      await sleep(RETRY_MS);
      continue;
    }
    if (page.length) {
      const record = page[0];
      try { await processRecord(origin, record, settings, state); }
      catch (error) { console.error('Record ' + record.id + ' was not completed: ' + error.message); await sleep(RETRY_MS); }
    } else await sleep(POLL_MS);
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { assertSnapshotCurrent, draftPath, mediaKey, validateBlogSettings, validateExistingDraft };
