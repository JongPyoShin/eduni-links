const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const userDataDir = path.resolve(__dirname, '..', 'naver-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: { width: 1360, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded' });
  console.log('브라우저에서 직접 로그인하세요. 비밀번호를 이 도구에 입력하거나 저장하지 않습니다.');
  console.log('로그인 후 브라우저를 닫으면 로그인 세션이 naver-profile에 유지됩니다.');
  await new Promise((resolve) => context.once('close', resolve));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
