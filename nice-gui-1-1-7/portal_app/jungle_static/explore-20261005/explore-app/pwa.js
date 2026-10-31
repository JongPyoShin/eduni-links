const root = document.documentElement;
const button = document.querySelector('#install-app');
const help = document.querySelector('#install-help');
const appScope = new URL('./', import.meta.url);
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
let installPrompt = null;

function showInstallHelp() {
  help.textContent = 'Chrome 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택하세요. 설치에는 HTTPS 연결이 필요합니다.';
  help.hidden = false;
}

function onBeforeInstallPrompt(event) {
  event.preventDefault();
  installPrompt = event;
  button.textContent = '앱 설치';
}

async function onInstallClick() {
  if (!installPrompt) { showInstallHelp(); return; }
  const prompt = installPrompt;
  installPrompt = null;
  try { await prompt.prompt(); await prompt.userChoice; }
  catch { showInstallHelp(); }
  if (!standalone && !button.hidden) { button.textContent = '설치 방법'; showInstallHelp(); }
}

function onInstalled() {
  button.hidden = true;
  help.hidden = true;
  installPrompt = null;
}

if (standalone) { button.hidden = true; help.hidden = true; }
else {
  button.addEventListener('click', onInstallClick);
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onInstalled);
}

root.dataset.pwaWorkerStatus = 'registering';
root.dataset.pwaWorkerScope = appScope.href;
if ('serviceWorker' in navigator && isSecureContext) {
  navigator.serviceWorker.register(new URL('./sw.js?v=progression-20261015', import.meta.url), { scope: appScope.href })
    .then(registration => { root.dataset.pwaWorkerStatus = 'registered'; root.dataset.pwaWorkerScope = registration.scope; })
    .catch(() => { root.dataset.pwaWorkerStatus = 'error'; });
} else root.dataset.pwaWorkerStatus = 'unavailable';

export function disposePwa() {
  button.removeEventListener('click', onInstallClick);
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.removeEventListener('appinstalled', onInstalled);
}
