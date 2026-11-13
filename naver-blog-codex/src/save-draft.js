const fs = require('node:fs/promises');
const dns = require('node:dns/promises');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { createWriteStream } = require('node:fs');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { randomUUID, createHash } = require('node:crypto');
const readline = require('node:readline/promises');
const { chromium } = require('playwright');
const log = require('./log');

const ROOT = path.resolve(__dirname, '..');
const DRAFTS = path.join(ROOT, 'drafts');
const MAX_TITLE = 120;
const MAX_BODY = 100_000;
const MAX_MEDIA = 20;
const MAX_VIDEO_MEDIA = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const BLOG_WRITE_ENTRY = 'https://blog.naver.com/GoBlogWrite.naver';
const BLOG_EDITOR = 'https://blog.naver.com/PostWriteForm.naver';

function fail(message) {
  throw new Error(message);
}

async function validate(draft) {
  if (!draft || draft.schemaVersion !== 1 || draft.source !== 'eduni-reading-journal') fail('Unsupported draft schema/source.');
  if (typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > MAX_TITLE) fail('title must be 1-' + MAX_TITLE + ' characters.');
  if (typeof draft.body !== 'string' || !draft.body.trim() || draft.body.length > MAX_BODY) fail('body must be 1-' + MAX_BODY + ' characters.');
  if (typeof draft.portalOrigin !== 'string') fail('portalOrigin is required.');
  let portal;
  try { portal = new URL(draft.portalOrigin); } catch { fail('portalOrigin must be a valid HTTP(S) origin.'); }
  if (!['https:', 'http:'].includes(portal.protocol) || portal.origin !== draft.portalOrigin.replace(/\/$/, '')
    || portal.username || portal.password || portal.pathname !== '/' || portal.search || portal.hash) {
    fail('portalOrigin must be an HTTP(S) origin without a path, query, fragment, or credentials.');
  }
  if (!Array.isArray(draft.media) || draft.media.length > MAX_MEDIA) fail('media must be an array with at most ' + MAX_MEDIA + ' entries.');
  if (draft.media.filter((item) => item && item.kind === 'video').length > MAX_VIDEO_MEDIA) {
    fail('media may contain at most ' + MAX_VIDEO_MEDIA + ' videos.');
  }
  const positions = new Set();
  for (const [index, item] of draft.media.entries()) {
    if (!item || !['image', 'video'].includes(item.kind)) fail('media[' + index + '].kind must be image or video.');
    if (typeof item.url !== 'string' || typeof item.caption !== 'string' || item.caption.length > 500) fail('media[' + index + '] has invalid url/caption.');
    let url;
    try { url = new URL(item.url); } catch { fail('media[' + index + '].url must be an absolute URL.'); }
    if (url.protocol !== portal.protocol || url.origin !== portal.origin || url.username || url.password) {
      fail('media[' + index + '].url must use the exact portalOrigin.');
    }
    if (!Number.isInteger(item.position) || item.position < 0 || item.position >= MAX_MEDIA) fail('media[' + index + '].position is invalid.');
    if (positions.has(item.position)) fail('media positions must be unique.');
    positions.add(item.position);
  }
  return portal.origin;
}

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || (a === 192 && (b === 168 || b === 0))
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}

function isPrivateIp(address) {
  const normalized = address.replace(/^\[|\]$/g, '').toLowerCase();
  if (net.isIPv4(normalized)) return isPrivateIpv4(normalized);
  if (net.isIPv6(normalized)) {
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIpv4(mapped[1]);
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')
      || normalized.startsWith('fe8') || normalized.startsWith('fe9')
      || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return false;
}

async function resolvePinnedAddresses(hostname, protocol) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  let addresses;
  if (net.isIP(host)) addresses = [{ address: host, family: net.isIP(host) }];
  else {
    try {
      addresses = await dns.lookup(host, { all: true, verbatim: true });
    } catch (_) {
      fail('Could not resolve media host: ' + host);
    }
  }
  if (!addresses.length) fail('Media host returned no addresses: ' + host);
  if (protocol === 'http:' && !addresses.every(({ address }) => isPrivateIp(address))) {
    fail('HTTP media hosts must resolve only to local, private, or Tailscale addresses.');
  }
  return addresses;
}

function requestPinned(url, addresses) {
  const transport = url.protocol === 'https:' ? https : http;
  const pinnedLookup = (_hostname, options, callback) => {
    if (options && options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  };
  return new Promise((resolve, reject) => {
    const request = transport.get(url, {
      lookup: pinnedLookup,
      headers: { 'Accept-Encoding': 'identity' },
      timeout: 20_000,
    }, resolve);
    request.once('timeout', () => request.destroy(new Error('Media request timed out.')));
    request.once('error', reject);
  });
}

async function confirmOrigin(origin) {
  const configPath = path.join(ROOT, 'eduni-origin.json');
  let savedOrigin = null;
  try {
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    if (typeof config.origin === 'string') savedOrigin = config.origin;
  } catch (_) {
    // Missing or malformed local config requires fresh confirmation.
  }
  if (savedOrigin === origin) return;
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question('EDUNI origin을 확인하세요. 미디어를 내려받으려면 아래 origin을 그대로 입력하세요: ' + origin + '\n확인: ');
    if (answer.trim() !== origin) fail('Origin confirmation did not match. No media was downloaded.');
  } finally {
    prompt.close();
  }
  await fs.writeFile(configPath, JSON.stringify({ origin }, null, 2) + '\n', { flag: 'w' });
}

async function downloadMedia(draft, origin) {
  if (draft.media.length === 0) return [];
  await confirmOrigin(origin);
  const dir = path.join(ROOT, 'input', 'photos', randomUUID());
  await fs.mkdir(dir, { recursive: true });
  const files = [];
  const orderedMedia = [...draft.media].sort((a, b) => a.position - b.position);
  for (const [index, item] of orderedMedia.entries()) {
    const url = new URL(item.url);
    const addresses = await resolvePinnedAddresses(url.hostname, url.protocol);
    const response = await requestPinned(url, addresses);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      response.destroy();
      fail('Media ' + (index + 1) + ' returned HTTP ' + response.statusCode + '; redirects and failed requests are rejected.');
    }
    const declaredLength = Number(response.headers['content-length'] || 0);
    const maxBytes = item.kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (declaredLength > maxBytes) fail('Media ' + (index + 1) + ' exceeds ' + maxBytes + ' bytes.');
    const type = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
    const allowed = item.kind === 'image' ? /^image\/(jpeg|png|webp|gif)$/.test(type) : /^video\/(mp4|webm|quicktime)$/.test(type);
    if (!allowed) fail('Media ' + (index + 1) + ' returned an unsupported content type: ' + (type || 'unknown') + '.');
    const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' })[type];
    const filename = String(index + 1).padStart(2, '0') + '-' + item.kind + ext;
    const localPath = path.join(dir, filename);
    let receivedBytes = 0;
    const sizeGuard = new Transform({
      transform(chunk, encoding, callback) {
        receivedBytes += chunk.length;
        callback(receivedBytes > maxBytes ? new Error('Media ' + (index + 1) + ' exceeds ' + maxBytes + ' bytes.') : null, chunk);
      }
    });
    try {
      await pipeline(response, sizeGuard, createWriteStream(localPath, { flags: 'wx' }));
    } catch (error) {
      await fs.rm(localPath, { force: true });
      throw error;
    }
    if (!receivedBytes) fail('Media ' + (index + 1) + ' is empty.');
    files.push({ ...item, localPath });
  }
  return files;
}

async function uniqueLocator(locator) {
  const count = await locator.count().catch(() => 0);
  return count === 1 && await locator.isVisible().catch(() => false) ? locator : null;
}

async function firstVisibleLocator(locator) {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function waitForEditorFrame(page) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const editor = page.frames().find((frame) => frame.name() === 'mainFrame'
      && /PostWriteForm\.naver/i.test(frame.url()));
    if (editor) return editor;
    if (/PostWriteForm\.naver/i.test(page.mainFrame().url())) return page.mainFrame();
    await page.waitForTimeout(100);
  }
  fail('Naver editor frame did not load; no draft was saved.');
}

async function waitForBrowserClose(context) {
  process.exitCode = 1;
  await new Promise((resolve) => context.once('close', resolve));
}

async function waitForEditorText(page, locator, expected) {
  const target = normalizedText(expected);
  const deadline = Date.now() + 5_000;
  let rendered = '';
  while (Date.now() < deadline) {
    rendered = normalizedText(await locator.innerText().catch(() => ''));
    if (rendered === target) return;
    await page.waitForTimeout(50);
  }
  fail('Naver editor input did not render completely (' + rendered.length + '/' + target.length + ' chars).');
}

async function waitForEditorParagraphs(page, locator, expected) {
  const deadline = Date.now() + 5_000;
  let rendered = 0;
  while (Date.now() < deadline) {
    rendered = await locator.locator('.se-text-paragraph').count().catch(() => 0);
    if (rendered >= expected) return;
    await page.waitForTimeout(50);
  }
  fail('Naver editor paragraph break did not render (' + rendered + '/' + expected + ').');
}

async function typeEditorText(page, locator, value) {
  const editorText = value.replace(/\r\n?/g, '\n').replace(/^#{1,6}\s+/gm, '');
  const lines = editorText.split('\n');
  await locator.click();
  let expected = '';
  let paragraphs = await locator.locator('.se-text-paragraph').count();
  for (const [lineIndex, line] of lines.entries()) {
    const characters = Array.from(line);
    for (let offset = 0; offset < characters.length; offset += 120) {
      const chunk = characters.slice(offset, offset + 120).join('');
      await page.keyboard.insertText(chunk);
      expected += chunk;
      await waitForEditorText(page, locator, expected);
    }
    if (lineIndex < lines.length - 1) {
      await page.keyboard.press('Enter');
      paragraphs += 1;
      await waitForEditorParagraphs(page, locator, paragraphs);
      expected += '\n';
      await waitForEditorText(page, locator, expected);
    }
  }
}

async function attachMediaToEditor(page, editor, media) {
  for (let index = 0; index < media.length;) {
    const item = media[index];
    if (item.kind === 'image') {
      let end = index + 1;
      while (end < media.length && media[end].kind === 'image') end += 1;
      const images = media.slice(index, end);
      const toolbar = await uniqueLocator(editor.locator('button.se-image-toolbar-button'));
      if (!toolbar) fail('Naver의 사진 도구 버튼을 하나로 찾지 못했습니다.');
      const before = await editor.locator('.se-component.se-image').count();
      const chooserPromise = page.waitForEvent('filechooser', { timeout: 15_000 });
      await toolbar.click();
      const chooser = await chooserPromise;
      await chooser.setFiles(images.map(({ localPath }) => localPath));
      const layoutOption = editor.getByText('개별사진', { exact: true });
      if (images.length > 1) await layoutOption.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      const layout = await uniqueLocator(layoutOption);
      if (layout) await layout.click();
      await editor.waitForFunction(
        ({ selector, count, countExpected }) => {
          const nodes = [...document.querySelectorAll(selector)];
          const added = nodes.slice(count);
          return added.length >= countExpected && added.every((node) => {
            const image = node.querySelector('img');
            return image && image.complete && image.naturalWidth > 0 && image.currentSrc;
          });
        },
        { selector: '.se-component.se-image', count: before, countExpected: images.length },
        { timeout: 180_000 },
      );
      index = end;
      continue;
    }
    const toolbarClass = item.kind === 'image' ? 'image' : 'video';
    const componentSelector = '.se-component.se-video';
    const toolbar = await uniqueLocator(editor.locator('button.se-' + toolbarClass + '-toolbar-button'));
    if (!toolbar) fail('Naver의 동영상 도구 버튼을 하나로 찾지 못했습니다.');
    const before = await editor.locator(componentSelector).count();
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 15_000 });
    await toolbar.click();
    const chooser = await chooserPromise;
    await chooser.setFiles(item.localPath);
    await editor.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length > count,
      { selector: componentSelector, count: before },
      { timeout: 180_000 },
    );
    index += 1;
  }
}

async function saveDraftOnly(page, editor) {
  const saveButton = await uniqueLocator(editor.getByRole('button', { name: '저장', exact: true }));
  if (!saveButton) fail('저장 버튼을 하나로 특정할 수 없어 임시저장하지 않았습니다.');
  const counterSelector = 'button[class*="save_count_btn"]';
  const counter = editor.locator(counterSelector);
  let beforeCount = null;
  if (await counter.count() === 1) {
    const label = await counter.getAttribute('aria-label').catch(() => '');
    const text = await counter.innerText().catch(() => '');
    const matches = (label + ' ' + text).match(/\d+/g);
    if (matches) beforeCount = Math.max(...matches.map(Number));
  }
  await saveButton.click();
  const confirmations = [];
  if (beforeCount !== null) {
    confirmations.push(editor.waitForFunction(({ selector, previous }) => {
      const button = document.querySelector(selector);
      if (!button) return false;
      const values = ((button.getAttribute('aria-label') || '') + ' ' + (button.textContent || '')).match(/\d+/g);
      return values && Math.max(...values.map(Number)) > previous;
    }, { selector: counterSelector, previous: beforeCount }, { timeout: 20_000 }));
  }
  confirmations.push(editor.getByText(/임시저장 완료|임시저장\s*되었습니|저장 완료|저장\s*되었습니/)
    .waitFor({ state: 'visible', timeout: 20_000 }));
  try { await Promise.any(confirmations); }
  catch (_) { fail('네이버 임시저장 완료를 확인하지 못했습니다.'); }
}

function isEmptySmartEditorDocument(data) {
  const components = data && data.document && data.document.components;
  if (!Array.isArray(components) || !components.length) return false;
  const types = new Set();
  let hasText = false;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return true;
    if (Array.isArray(value)) return value.every(visit);
    if (value['@ctype'] === 'textNode') {
      if (typeof value.value !== 'string') return false;
      hasText = true;
      return !value.value.replace(/[\u200b\uFEFF]/g, '').trim();
    }
    return Object.values(value).every(visit);
  };
  for (const component of components) {
    const type = component && component['@ctype'];
    if (!['documentTitle', 'text'].includes(type)) return false;
    types.add(type);
    if (!visit(component)) return false;
  }
  return types.has('documentTitle') && types.has('text') && hasText;
}

function normalizedText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isVisuallyEmptyEditor(title, body, imageCount, videoCount) {
  const normalizedTitle = normalizedText(title);
  const normalizedBody = normalizedText(body);
  return (!normalizedTitle || normalizedTitle === '제목')
    && (!normalizedBody || normalizedBody === '글감과 함께 나의 일상을 기록해보세요!')
    && imageCount === 0 && videoCount === 0;
}

async function resolveEditorRecoveryPrompt(editor) {
  const popup = editor.locator('.se-popup-alert-confirm');
  await popup.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  if (await popup.count().catch(() => 0) !== 1 || !await popup.isVisible().catch(() => false)) return false;

  const message = normalizedText(await popup.innerText().catch(() => ''));
  if (!/(작성 중인 글|작성하던 글)/.test(message) || !/(이어|불러|복구)/.test(message)) {
    fail('An unexpected Naver dialog is blocking the editor; no editor content was changed.');
  }

  const recover = await uniqueLocator(popup.getByRole('button', { name: '확인', exact: true }));
  if (!recover) fail('Naver recovery dialog has no unique 확인 action; the existing draft was left untouched.');
  await recover.click();
  await popup.waitFor({ state: 'hidden', timeout: 15_000 });
  return true;
}

async function dismissEditorHelp(page, editor) {
  const title = editor.locator('.se-help-title');
  if (!await title.isVisible().catch(() => false)) return;
  const close = await uniqueLocator(editor.locator('button.se-help-panel-close-button'));
  if (!close) fail('Naver help overlay has no unique close button; no draft was changed.');
  await close.click();
  await title.waitFor({ state: 'hidden', timeout: 3_000 });
}

async function savedDraftTitleExists(page, title) {
  const editor = await waitForEditorFrame(page);
  await dismissEditorHelp(page, editor);
  const counter = await uniqueLocator(editor.locator('button[class*="save_count_btn"]'));
  if (!counter) return false;
  await counter.click();
  const pageText = await editor.locator('body').innerText().catch(() => '');
  const marker = pageText.indexOf('임시저장 글');
  const listText = marker >= 0 ? pageText.slice(marker) : '';
  const found = listText.split(/\r?\n/).map(normalizedText).includes(normalizedText(title));
  const close = await uniqueLocator(editor.getByRole('button', { name: '팝업닫기', exact: true }));
  if (!close) fail('Naver saved-draft list opened but could not be closed safely.');
  await close.click();
  return found;
}

async function openIsolatedEditorPreservingRecovery(sourceContext, blogId, recordId) {
  const browser = sourceContext.browser();
  if (!browser) fail('Naver recovery browser is unavailable; the recovered draft was preserved.');
  const context = await browser.newContext({
    viewport: { width: 1360, height: 900 },
    storageState: { cookies: await sourceContext.cookies(), origins: [] },
  });
  try {
    const page = await context.newPage();
    await page.goto(BLOG_EDITOR + '?blogId=' + encodeURIComponent(blogId), { waitUntil: 'domcontentloaded' });
    if (/nidlogin\.login/.test(page.url())) fail('Naver login could not be reused in the isolated editor; the recovered draft was preserved.');
    let editor = await waitForEditorFrame(page);
    await editor.locator('.se-section-documentTitle .se-module-text').first().waitFor({ state: 'visible', timeout: 20_000 });
    const recovered = await resolveEditorRecoveryPrompt(editor);
    let title = await firstVisibleLocator(editor.locator('.se-section-documentTitle .se-module-text'));
    let body = await firstVisibleLocator(editor.locator('.se-section-text .se-module-text'));
    if (!title || !body) fail('Naver isolated editor fields were not found; the original recovery was preserved.');
    let documentData = await editor.evaluate(() => {
      const smartEditor = window.SmartEditor?._editors?.blogpc001;
      return typeof smartEditor?.getDocumentData === 'function' ? smartEditor.getDocumentData() : null;
    });
    let images = await editor.locator('.se-component.se-image').count();
    let videos = await editor.locator('.se-component.se-video').count();
    const currentTitle = await title.innerText().catch(() => '');
    const currentBody = await body.innerText().catch(() => '');
    if (recovered && !isVisuallyEmptyEditor(currentTitle, currentBody, images, videos)) {
      editor = await discardAlreadySavedRecoveryAndStartFresh(page, blogId, currentTitle, currentBody,
        recordId, documentData);
      title = await firstVisibleLocator(editor.locator('.se-section-documentTitle .se-module-text'));
      body = await firstVisibleLocator(editor.locator('.se-section-text .se-module-text'));
      if (!title || !body) fail('Naver blank editor fields were not found after preserving the recovered draft.');
      documentData = await editor.evaluate(() => {
        const smartEditor = window.SmartEditor?._editors?.blogpc001;
        return typeof smartEditor?.getDocumentData === 'function' ? smartEditor.getDocumentData() : null;
      });
      images = await editor.locator('.se-component.se-image').count();
      videos = await editor.locator('.se-component.se-video').count();
    }
    if (!isEmptySmartEditorDocument(documentData)
      || !isVisuallyEmptyEditor(await title.innerText().catch(() => ''), await body.innerText().catch(() => ''), images, videos)) {
      fail('Naver isolated editor was not blank; the original recovery was preserved.');
    }
    return { context, page, editor, title, body };
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}

async function backupRecoveredText(title, body, recordId, documentData) {
  const documentJson = JSON.stringify(documentData ?? null);
  const digest = createHash('sha256').update(title + '\0' + body + '\0' + documentJson).digest('hex').slice(0, 20);
  const backupPath = path.join(DRAFTS, 'naver-recovery-' + digest + '.json');
  const payload = JSON.stringify({ schemaVersion: 1, source: 'naver-local-recovery-backup', recordId, title, body, documentData }, null, 2) + '\n';
  try {
    const handle = await fs.open(backupPath, 'wx', 0o600);
    try { await handle.writeFile(payload); } finally { await handle.close(); }
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await fs.readFile(backupPath, 'utf8');
    if (existing !== payload) fail('Naver recovery backup path already contains different content; nothing was discarded.');
  }
  return backupPath;
}

async function discardAlreadySavedRecoveryAndStartFresh(page, blogId, title, body, recordId, documentData) {
  const backupPath = await backupRecoveredText(title, body, recordId, documentData);
  if (!await savedDraftTitleExists(page, title)) {
    fail('Recovered Naver draft is not listed among saved drafts; it was backed up and preserved.');
  }
  await log(path.basename(backupPath) + ': recovered Naver document backed up; matching saved title confirmed.');

  await page.goto(BLOG_EDITOR + '?blogId=' + encodeURIComponent(blogId), { waitUntil: 'domcontentloaded' });
  let editor = await waitForEditorFrame(page);
  await editor.locator('.se-section-documentTitle .se-module-text').first().waitFor({ state: 'visible', timeout: 20_000 });
  const popup = editor.locator('.se-popup-alert-confirm');
  await dismissEditorHelp(page, editor);
  await popup.waitFor({ state: 'visible', timeout: 2_000 }).catch(() => {});
  if (await popup.count().catch(() => 0) === 1 && await popup.isVisible().catch(() => false)) {
    const message = normalizedText(await popup.innerText().catch(() => ''));
    if (!/(작성 중인 글|작성하던 글)/.test(message) || !/(이어|불러|복구)/.test(message)) {
      fail('An unexpected Naver dialog blocked the fresh editor; the recovery backup was preserved.');
    }
    const discard = await uniqueLocator(popup.getByRole('button', { name: '취소', exact: true }));
    if (!discard) fail('Naver recovery dialog has no unique 취소 action; the recovery backup was preserved.');
    await discard.click();
    await popup.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  const titleField = editor.locator('.se-section-documentTitle .se-module-text');
  const bodyField = editor.locator('.se-section-text .se-module-text').first();
  const currentTitle = await titleField.innerText().catch(() => '');
  const currentBody = await bodyField.innerText().catch(() => '');
  const images = await editor.locator('.se-component.se-image').count();
  const videos = await editor.locator('.se-component.se-video').count();
  const data = await editor.evaluate(() => {
    const editor = window.SmartEditor?._editors?.blogpc001;
    return typeof editor?.getDocumentData === 'function' ? editor.getDocumentData() : null;
  });
  if (!isEmptySmartEditorDocument(data) || !isVisuallyEmptyEditor(currentTitle, currentBody, images, videos)) {
    fail('Naver did not open a blank editor after preserving the saved recovery draft.');
  }
  await log('Naver recovery was backed up and dismissed only after its matching saved title was confirmed.');
  return editor;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filename = args.find((arg) => !arg.startsWith('--'));
  if (!filename) fail('Usage: npm run save-draft -- [--dry-run] <draft.json>');
  const draftPath = path.resolve(process.cwd(), filename);
  const draft = JSON.parse(await fs.readFile(draftPath, 'utf8'));
  const origin = await validate(draft);
  if (dryRun) {
    await log(path.basename(draftPath) + ': local recovery draft valid; ' + draft.media.length + ' attachment(s).');
    await log(path.basename(draftPath) + ': dry run only; no browser or Naver access.');
    return;
  }
  await log(path.basename(draftPath) + ': downloading ' + draft.media.length + ' attachment(s) from EDUNI.');
  const media = await downloadMedia(draft, origin);
  await log(path.basename(draftPath) + ': opening the dedicated Naver browser profile.');
  const context = await chromium.launchPersistentContext(path.join(ROOT, 'naver-profile'), {
    headless: false,
    viewport: { width: 1360, height: 900 },
  });
  let activeContext = context;
  try {
    let page = context.pages()[0] || await context.newPage();
    await page.goto(BLOG_WRITE_ENTRY, { waitUntil: 'domcontentloaded' });
    await log(path.basename(draftPath) + ': Naver editor entry opened; checking login and page structure.');
    if (/nidlogin\.login/.test(page.url())) {
      await log(path.basename(draftPath) + ': login required; no Naver draft saved.', 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
    const blogUrl = new URL(page.url());
    const blogPath = blogUrl.pathname.split('/').filter(Boolean);
    const blogId = blogUrl.hostname === 'blog.naver.com' && blogPath.length === 1
      && !['goblogwrite.naver', 'postwriteform.naver'].includes(blogPath[0].toLowerCase())
      ? blogPath[0]
      : null;
    if (!blogId) {
      await log(path.basename(draftPath) + ': could not identify logged-in blog; no Naver draft saved.', 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
    await page.goto(BLOG_EDITOR + '?blogId=' + encodeURIComponent(blogId), { waitUntil: 'domcontentloaded' });
    if (/nidlogin\.login/.test(page.url())) {
      await log(path.basename(draftPath) + ': editor login check failed; no Naver draft saved.', 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
    let editor = await waitForEditorFrame(page);
    await editor.locator('.se-section-documentTitle .se-module-text').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    const recoveredNaverDraft = await resolveEditorRecoveryPrompt(editor);
    if (recoveredNaverDraft) {
      await log(path.basename(draftPath) + ': recovered Naver editor content for inspection before typing.');
    }
    let title = await uniqueLocator(editor.locator('.se-section-documentTitle .se-module-text'));
    let body = await firstVisibleLocator(editor.locator('.se-section-text .se-module-text'));
    if (!title || !body) {
      await log(path.basename(draftPath) + ': could not locate title/body editor fields; no Naver draft saved.', 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
    const documentData = await editor.evaluate(() => {
      const editor = window.SmartEditor?._editors?.blogpc001;
      return typeof editor?.getDocumentData === 'function' ? editor.getDocumentData() : null;
    });
    let recoveredDraftMatches = false;
    if (!isEmptySmartEditorDocument(documentData)) {
      const currentTitle = normalizedText(await title.innerText().catch(() => ''));
      const currentBody = normalizedText(await body.innerText().catch(() => ''));
      const expectedImages = media.filter((item) => item.kind === 'image').length;
      const expectedVideos = media.filter((item) => item.kind === 'video').length;
      const currentImages = await editor.locator('.se-component.se-image').count();
      const currentVideos = await editor.locator('.se-component.se-video').count();
      const visiblyEmpty = isVisuallyEmptyEditor(currentTitle, currentBody, currentImages, currentVideos);
      if (recoveredNaverDraft) {
        const types = (documentData?.document?.components || []).map((component) => component && component['@ctype']).filter(Boolean).join(',');
        await log(path.basename(draftPath) + ': recovered editor summary: title=' + JSON.stringify(currentTitle)
          + ', body=' + currentBody.length + ' chars, images=' + currentImages + ', videos=' + currentVideos
          + ', components=' + (types || 'unknown') + '.');
      }
      recoveredDraftMatches = recoveredNaverDraft && !visiblyEmpty
        && currentTitle === normalizedText(draft.title)
        && currentBody === normalizedText(draft.body)
        && currentImages === expectedImages && currentVideos === expectedVideos;
      if (recoveredNaverDraft && visiblyEmpty) {
        await log(path.basename(draftPath) + ': recovered editor has only empty placeholders; starting the EDUNI draft.');
      } else if (!recoveredDraftMatches) {
        if (!recoveredNaverDraft) fail('Naver editor contains a different draft; it was preserved and no new content was entered.');
        const isolated = await openIsolatedEditorPreservingRecovery(context, blogId, path.basename(draftPath));
        activeContext = isolated.context;
        page = isolated.page;
        editor = isolated.editor;
        title = isolated.title;
        body = isolated.body;
        await log(path.basename(draftPath) + ': existing recovered draft with ' + currentImages
          + ' image(s) and ' + currentVideos + ' video(s) left untouched; using a blank isolated editor.');
      } else {
        await log(path.basename(draftPath) + ': recovered Naver content matches the EDUNI draft; resuming save.');
      }
    }
    if (!recoveredDraftMatches) {
      await typeEditorText(page, title, draft.title);
      await typeEditorText(page, body, draft.body);
    }
    const editorBody = draft.body.replace(/\r\n?/g, '\n').replace(/^#{1,6}\s+/gm, '');
    const renderedTitle = await title.innerText().catch(() => '');
    const renderedBody = await body.innerText().catch(() => '');
    const titleMatches = normalizedText(renderedTitle).includes(normalizedText(draft.title));
    const bodyMatches = normalizedText(renderedBody).includes(normalizedText(editorBody));
    if (!titleMatches || !bodyMatches) {
      await log(path.basename(draftPath) + ': editor text verification failed (title ' + renderedTitle.length + '/' + draft.title.length
        + ', match=' + titleMatches + '; body ' + renderedBody.length + '/' + editorBody.length + ', match=' + bodyMatches
        + '); no Naver draft saved.', 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
    if (media.length && !recoveredDraftMatches) {
      await log(path.basename(draftPath) + ': attaching ' + media.length + ' item(s) in record order.');
      try {
        await attachMediaToEditor(page, editor, media);
        await log(path.basename(draftPath) + ': all attachments are visible and loaded.');
      } catch (error) {
        await log(path.basename(draftPath) + ': attachment upload failed; save not attempted: ' + error.message, 'ERROR');
        await waitForBrowserClose(context);
        process.exitCode = 1;
        return;
      }
    }
    await log(path.basename(draftPath) + ': title and body' + (media.length ? ' plus attachments' : '') + ' entered; saving as temporary draft.');
    try {
      await saveDraftOnly(page, editor);
      await log(path.basename(draftPath) + ': Naver temporary-save confirmation observed; no publish action used.');
    } catch (error) {
      await log(path.basename(draftPath) + ': temporary save was not confirmed: ' + error.message, 'ERROR');
      await waitForBrowserClose(context);
      process.exitCode = 1;
      return;
    }
  } finally {
    if (activeContext !== context) await activeContext.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

module.exports = { attachMediaToEditor, isEmptySmartEditorDocument, isVisuallyEmptyEditor, resolveEditorRecoveryPrompt, savedDraftTitleExists, saveDraftOnly, typeEditorText };

if (require.main === module) main().catch(async (error) => {
  await log(error.message, 'ERROR').catch(() => {});
  process.exitCode = 1;
});
