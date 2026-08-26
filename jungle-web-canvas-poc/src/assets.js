const cache = new Map();

export function loadImage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ img, ok: true });
    img.onerror = () => resolve({ img: null, ok: false });
    img.src = url;
  });
  cache.set(url, p);
  return p;
}

export async function preload(urls) {
  return Promise.all(urls.map((u) => loadImage(u)));
}
