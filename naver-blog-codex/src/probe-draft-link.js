'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const readline = require('node:readline/promises');

const EDITOR_ORIGIN = 'https://blog.naver.com';
const EDITOR_PATH = '/PostWriteForm.naver';
const ENTRY = EDITOR_ORIGIN + '/GoBlogWrite.naver';

function editorUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.origin !== EDITOR_ORIGIN || url.pathname !== EDITOR_PATH
        || url.username || url.password || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function compareSnapshots(blank, selected, reopened) {
  const a = editorUrl(blank.url);
  const b = editorUrl(selected.url);
  const c = editorUrl(reopened.url);
  if (!a || !b || !c) return { result: 'INCONCLUSIVE_EDITOR_URL' };
  // Never report query values (they may contain identifiers or secrets).
  const keys = [...new Set(b.searchParams.keys())];
  const changedKeys = keys.filter(key =>
    /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(key)
    && !/token|secret|auth|session|cookie|key|signature|password/i.test(key)
    && key !== 'blogId'
    && b.searchParams.getAll(key).length === 1
    && c.searchParams.getAll(key).length === 1
    && b.searchParams.get(key) !== a.searchParams.get(key)
    && b.searchParams.get(key) === c.searchParams.get(key)
    && /^[0-9]{1,32}$/.test(b.searchParams.get(key)));
  const sameUrl = b.href === c.href;
  const changedUrl = a.href !== b.href;
  const sameDocument = Boolean(selected.digest && selected.digest === reopened.digest);
  const differentDocument = Boolean(blank.digest && selected.digest && blank.digest !== selected.digest);
  const sameBlog = Boolean(a.searchParams.get('blogId')
    && a.searchParams.getAll('blogId').length === 1
    && b.searchParams.getAll('blogId').length === 1
    && c.searchParams.getAll('blogId').length === 1
    && a.searchParams.get('blogId') === b.searchParams.get('blogId')
    && b.searchParams.get('blogId') === c.searchParams.get('blogId'));
  const candidate = sameUrl && changedUrl && sameDocument && differentDocument && sameBlog && changedKeys.length === 1;
  return {
    result: candidate ? 'DIRECT_LINK_CANDIDATE' : 'INCONCLUSIVE',
    sameUrl, changedUrl, sameDocument, differentDocument, sameBlog,
    candidateNumericParameterNames: changedKeys,
    // A candidate is not a verified draft ID or production link contract.
    selectedComponentCount: selected.componentCount,
    reopenedComponentCount: reopened.componentCount,
  };
}

async function snapshot(context) {
  const editors = context.pages().filter(page => editorUrl(page.url()));
  if (editors.length !== 1) throw new Error('Exactly one supported editor tab required.');
  const page = editors[0];
  const url = page.url();
  if (await page.locator('.se-popup-alert-confirm').isVisible()) throw new Error('Editor dialog open.');
  const data = await page.evaluate(() => {
    const editor = window.SmartEditor?._editors?.blogpc001;
    return typeof editor?.getDocumentData === 'function' ? editor.getDocumentData() : null;
  });
  if (page.url() !== url || !Array.isArray(data?.document?.components)) {
    throw new Error('Editor document unavailable or changed.');
  }
  // Keep document content and URL in memory only. Output no title, text, or media URLs.
  const components = data.document.components;
  return {
    url,
    digest: createHash('sha256').update(JSON.stringify(components)).digest('hex'),
    componentCount: components.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--profile' || !path.isAbsolute(args[1])) {
    throw new Error('Explicit absolute profile path required.');
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Interactive terminal required.');
  const profile = args[1];
  if (!(await fs.stat(profile)).isDirectory()) throw new Error('Profile directory required.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let context;
  try {
    const answer = await rl.question('Ensure the watcher is idle and no other browser uses this dedicated profile. Use only an approved test draft. Do not edit or save. Type YES to continue: ');
    if (answer !== 'YES') return;
    const { chromium } = require('playwright');
    context = await chromium.launchPersistentContext(profile, { headless: false });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(ENTRY, { waitUntil: 'domcontentloaded' });
    await rl.question('In the browser open the empty writing editor (do not discard or modify any recovered work). Keep exactly one editor tab. Press Enter when ready, or Ctrl+C to stop: ');
    const blank = await snapshot(context);
    await rl.question('Open the approved existing draft from the temporary-save list. Do not edit or save. Press Enter after it loads: ');
    const selected = await snapshot(context);
    await rl.question('Copy the current address, close that editor tab without changes, then open that exact address in a fresh tab. Confirm the SAME draft actually opens without recovery or selecting from the list. Press Enter: ');
    const reopened = await snapshot(context);
    const confirmed = await rl.question('Did the same saved draft open directly without recovery or selecting from the list? Type YES if confirmed: ');
    const result = compareSnapshots(blank, selected, reopened);
    console.log(JSON.stringify({ ...result, operatorConfirmed: confirmed === 'YES' }, null, 2));
  } finally {
    rl.close();
    if (context) await context.close();
  }
}

module.exports = { editorUrl, compareSnapshots };

if (require.main === module) main().catch(() => {
  // Raw browser exceptions may include private URLs or page text.
  console.error('Draft-link probe stopped. Check login, profile availability, and editor state. No save/publish action was issued by the probe.');
  process.exitCode = 1;
});
