const fs = require('node:fs/promises');
const dns = require('node:dns/promises');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { createWriteStream } = require('node:fs');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { randomUUID } = require('node:crypto');
const readline = require('node:readline/promises');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
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

async function waitForBrowserClose(context) {
  await new Promise((resolve) => context.once('close', resolve));
}

async function typeEditorText(page, locator, value) {
  await locator.click();
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]) await page.keyboard.insertText(lines[index]);
    if (index < lines.length - 1) await page.keyboard.press('Enter');
  }
}

async function attachMediaToEditor(page, media) {
  for (const item of media) {
    const toolbarClass = item.kind === 'image' ? 'image' : 'video';
    const componentSelector = item.kind === 'image' ? '.se-component.se-image' : '.se-component.se-video';
    const toolbar = await uniqueLocator(page.locator('button.se-' + toolbarClass + '-toolbar-button'));
    if (!toolbar) fail('Naver의 ' + (item.kind === 'image' ? '사진' : '동영상') + ' 도구 버튼을 하나로 찾지 못했습니다.');
    const before = await page.locator(componentSelector).count();
    const chooserPromise = page.waitForEvent('filechooser', { timeout: 15_000 });
    await toolbar.click();
    const chooser = await chooserPromise;
    await chooser.setFiles(item.localPath);
    await page.waitForFunction(
      ({ selector, count }) => document.querySelectorAll(selector).length > count,
      { selector: componentSelector, count: before },
      { timeout: 180_000 },
    );
  }
}

async function publishWithApproval(page) {
  const openButton = await uniqueLocator(page.getByRole('button', { name: '발행', exact: true }));
  if (!openButton) {
    console.log('발행 설정 버튼을 하나로 특정할 수 없어 발행하지 않았습니다.');
    return;
  }
  await openButton.click();
  const panel = page.locator('div[class*="layer_publish__"]');
  try {
    await panel.waitFor({ state: 'visible', timeout: 15_000 });
  } catch (_) {
    console.log('발행 설정 화면을 확인할 수 없어 발행하지 않았습니다.');
    return;
  }
  console.log('네이버 발행 설정을 확인하세요: 공개 범위, 발행 시점, 카테고리, 태그.');
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const approval = await prompt.question('설정을 확인한 뒤 실제 게시하려면 PUBLISH를 입력하세요: ');
  prompt.close();
  if (approval.trim() !== 'PUBLISH') {
    console.log('게시하지 않았습니다. 발행 설정 화면에서 직접 수정하거나 닫을 수 있습니다.');
    return;
  }
  const confirmButton = await uniqueLocator(panel.getByRole('button', { name: '발행', exact: true }));
  if (!confirmButton) {
    console.log('발행 확인 버튼을 하나로 특정할 수 없어 게시하지 않았습니다.');
    return;
  }
  await confirmButton.click();
  await page.waitForTimeout(2_000);
  const result = new URL(page.url());
  if (/PostView\.naver/i.test(result.pathname) || result.searchParams.has('logNo')) {
    console.log('게시 결과 화면: ' + result.href);
  } else {
    console.log('발행 요청을 보냈습니다. 브라우저에서 게시 완료 상태를 확인하세요.');
  }
}

function normalizedText(value) {
  return value.replace(/\s+/g, ' ').trim();
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
    console.log('초안 구조 확인 완료: ' + draft.title + ' / 사진·영상 ' + draft.media.length + '개');
    console.log('Naver에 접속하거나 파일을 업로드하지 않았습니다.');
    return;
  }
  const media = await downloadMedia(draft, origin);
  const context = await chromium.launchPersistentContext(path.join(ROOT, 'naver-profile'), {
    headless: false,
    viewport: { width: 1360, height: 900 },
  });
  try {
    const page = context.pages()[0] || await context.newPage();
    await page.goto(BLOG_WRITE_ENTRY, { waitUntil: 'domcontentloaded' });
    console.log('에디터를 열었습니다. 페이지 구조와 로그인 상태를 확인합니다.');
    if (/nidlogin\.login/.test(page.url())) {
      console.log('Naver 로그인 화면입니다. 직접 로그인한 뒤 브라우저를 닫고 저장 파일 명령을 다시 실행하세요.');
      await waitForBrowserClose(context);
      return;
    }
    const blogUrl = new URL(page.url());
    const blogPath = blogUrl.pathname.split('/').filter(Boolean);
    const blogId = blogUrl.hostname === 'blog.naver.com' && blogPath.length === 1
      && !['goblogwrite.naver', 'postwriteform.naver'].includes(blogPath[0].toLowerCase())
      ? blogPath[0]
      : null;
    if (!blogId) {
      console.log('로그인된 블로그 주소를 확인할 수 없습니다. 글 입력을 중단합니다.');
      await waitForBrowserClose(context);
      return;
    }
    await page.goto(BLOG_EDITOR + '?blogId=' + encodeURIComponent(blogId), { waitUntil: 'domcontentloaded' });
    if (/nidlogin\.login/.test(page.url())) {
      console.log('로그인 상태를 편집기에서 확인할 수 없습니다. 직접 로그인한 뒤 저장 파일 명령을 다시 실행하세요.');
      await waitForBrowserClose(context);
      return;
    }
    await page.locator('.se-section-documentTitle .se-module-text').first().waitFor({ state: 'visible', timeout: 20_000 }).catch(() => {});
    const title = await uniqueLocator(page.locator('.se-section-documentTitle .se-module-text'));
    const body = await uniqueLocator(page.locator('.se-section-text .se-module-text'));
    if (!title || !body) {
      console.log('제목/본문 입력 영역을 각각 하나로 특정할 수 없어 자동 입력을 중단했습니다. 직접 붙여넣고 검토할 수 있습니다.');
      await waitForBrowserClose(context);
      return;
    }
    await typeEditorText(page, title, draft.title);
    await typeEditorText(page, body, draft.body);
    const renderedTitle = await title.innerText().catch(() => '');
    const renderedBody = await body.innerText().catch(() => '');
    if (!normalizedText(renderedTitle).includes(normalizedText(draft.title))
      || !normalizedText(renderedBody).includes(normalizedText(draft.body))) {
      console.log('에디터에 입력된 내용을 확인하지 못해 저장을 중단했습니다. 브라우저에서 내용을 직접 확인하세요.');
      await waitForBrowserClose(context);
      return;
    }
    if (media.length) {
      console.log('선택된 사진·동영상 ' + media.length + '개를 기록 순서대로 준비했습니다. Naver에 첨부하려면 UPLOAD를 입력하세요.');
      console.log('UPLOAD를 건너뛰면 파일은 로컬에 남고 Naver 글에는 첨부되지 않습니다.');
      const uploadPrompt = readline.createInterface({ input: process.stdin, output: process.stdout });
      const uploadApproval = await uploadPrompt.question('선택한 사진·동영상을 Naver 글에 첨부하려면 UPLOAD를 입력하세요: ');
      uploadPrompt.close();
      if (uploadApproval.trim() === 'UPLOAD') {
        try {
          await attachMediaToEditor(page, media);
          console.log('미디어 첨부가 끝났습니다. 브라우저에서 순서와 표시를 검토하세요.');
        } catch (error) {
          console.log('미디어 첨부를 완료하지 못했습니다: ' + error.message);
          console.log('임시저장 동작은 실행하지 않았습니다. 브라우저에서 직접 확인하세요.');
          await waitForBrowserClose(context);
          return;
        }
      } else {
        console.log('미디어를 Naver에 첨부하지 않았습니다. 필요하면 브라우저에서 직접 첨부하세요.');
      }
    }
    console.log('제목·본문' + (media.length ? '·미디어' : '') + '를 준비했습니다. 브라우저에서 내용을 검토하세요.');
    const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
    const approval = await prompt.question('검토 후 임시저장은 SAVE, 발행 설정 열기는 PUBLISH를 입력하세요: ');
    prompt.close();
    if (approval.trim() === 'SAVE') {
      const saveButton = await uniqueLocator(page.getByRole('button', { name: '저장', exact: true }));
      if (!saveButton) {
        console.log('저장 버튼을 하나로 특정할 수 없습니다. 브라우저에서 직접 임시저장하세요.');
      } else {
        await saveButton.click();
        console.log('저장 버튼을 눌렀습니다. 브라우저에서 임시저장 완료 표시를 확인하세요.');
      }
    } else if (approval.trim() === 'PUBLISH') {
      await publishWithApproval(page);
    } else {
      console.log('임시저장과 발행을 모두 건너뛰었습니다.');
    }
    await waitForBrowserClose(context);
  } finally {
    await context.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
