// Everything the app needs is same-origin, so it works fully offline once installed.
// Bump CACHE_NAME when shipping changes so old caches are purged.
const CACHE_NAME = 'galactic-multiplier-v10';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './speech-numbers.js',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './apple-touch-icon.png',
  './vendor/fonts.css',
  './vendor/fontawesome.css',
  './vendor/fonts/fredoka-latin.woff2',
  './vendor/fonts/pressstart2p-latin.woff2',
  './vendor/webfonts/fa-solid-900.woff2',
  './vendor/webfonts/fa-regular-400.woff2'
];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('galactic-multiplier-') && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first (so updates show up as soon as the user is online) with a short timeout,
// falling back to the cache for offline use or a flaky connection.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = () => cache.match(req, { ignoreSearch: true });
    try {
      const response = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
      ]);
      if (response && response.ok) cache.put(req, response.clone());
      return response;
    } catch (err) {
      const hit = await cached();
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
