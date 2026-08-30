const cache = new Map();

const DEFAULT_IMAGE_TIMEOUT_MS = 4000;

export function loadImage(url, { timeoutMs = DEFAULT_IMAGE_TIMEOUT_MS } = {}) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer !== null) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };

    img.onload = () => finish({ img, ok: true });
    img.onerror = () => finish({ img: null, ok: false });
    timer = setTimeout(() => {
      // Asset loading is presentation-only. A stalled request must never keep
      // start() pending forever and prevent gameplay/input/QA bridges from booting.
      finish({ img: null, ok: false, timedOut: true });
    }, Math.max(0, timeoutMs));
    img.src = url;
  });
  cache.set(url, p);
  return p;
}

export async function preload(urls, options) {
  return Promise.all(urls.map((u) => loadImage(u, options)));
}
