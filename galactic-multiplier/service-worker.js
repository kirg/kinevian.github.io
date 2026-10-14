// Galactic Multiplier service worker.
// v10: the old worker precached CDN URLs with cache.addAll() (one failed URL
// killed the whole install) and then served index.html cache-first forever,
// so installed users never received updates. Now: local assets only,
// per-asset install, network-first for the page, cache-first for assets,
// and old caches are deleted on activate.
const CACHE_NAME = 'galactic-multiplier-v10';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './fonts.css',
  './fonts/fredoka-300-latin.woff2',
  './fonts/fredoka-400-latin.woff2',
  './fonts/fredoka-600-latin.woff2',
  './fonts/fredoka-300-latin-ext.woff2',
  './fonts/fredoka-400-latin-ext.woff2',
  './fonts/fredoka-600-latin-ext.woff2',
  './fonts/press-start-2p-400-latin.woff2',
  './fonts/press-start-2p-400-latin-ext.woff2',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-regular-400.woff2',
  './manifest.json',
  './icon.png',
  './icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const isPage = request.mode === 'navigate' ||
    request.url.endsWith('/') || request.url.endsWith('index.html');

  if (isPage) {
    // Network-first so fixes actually reach installed users.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets: cache-first, refreshed in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
