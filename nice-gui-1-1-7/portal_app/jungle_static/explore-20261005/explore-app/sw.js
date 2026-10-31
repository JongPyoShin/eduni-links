const CACHE_NAME = 'eduni-explore-app-shell-v3';
const CACHE_PREFIX = 'eduni-explore-app-shell-';
const APP_SCOPE = new URL(self.registration.scope);
const OFFLINE_PAGE = new URL('offline.html', APP_SCOPE);
const SHELL_FILES = ['offline.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];
const SHELL_URLS = new Set(SHELL_FILES.map(path => new URL(path, APP_SCOPE).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES.map(path => new URL(path, APP_SCOPE).href))));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map(name => caches.delete(name)))));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_SCOPE.origin) return;
  const appIndex = new URL('index.html', APP_SCOPE);
  const offlineFallback = () => caches.open(CACHE_NAME).then(cache => cache.match(OFFLINE_PAGE.href)).then(response => response || Response.error());
  if (request.mode === 'navigate' && url.pathname === appIndex.pathname) {
    event.respondWith(fetch(request).then(response => response.ok ? response : offlineFallback()).catch(offlineFallback));
    return;
  }
  if (SHELL_URLS.has(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(url.href).then(cached => cached || fetch(request))));
  }
});
