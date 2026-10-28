const CACHE_NAME = 'galactic-multiplier-v16';
const CACHE_PREFIX = 'galactic-multiplier-';
const ASSETS = [
  "./index.html",
  "./style.css",
  "./fixes.css",
  "./numbers.js",
  "./fonts.css",
  "./manifest.json",
  "./icon.png",
  "./favicon.ico",
  "./apple-touch-icon-180.png",
  "./icon-192.png",
  "./icon-maskable.png",
  "./fonts/fredoka-300-latin.woff2",
  "./fonts/fredoka-400-latin.woff2",
  "./fonts/fredoka-600-latin.woff2",
  "./fonts/fredoka-300-latin-ext.woff2",
  "./fonts/fredoka-400-latin-ext.woff2",
  "./fonts/fredoka-600-latin-ext.woff2",
  "./fonts/press-start-2p-400-latin.woff2",
  "./fonts/press-start-2p-400-latin-ext.woff2",
  "./vendor/fontawesome/css/all.min.css",
  "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./vendor/fontawesome/webfonts/fa-regular-400.woff2"
];
const SHELL_URL = new URL('./index.html', self.registration.scope).href;
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Install only a complete shell. Third-party outages cannot block this.
    await cache.addAll(ASSETS.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // Other games share this origin; never delete their caches.
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, navigation) {
  let cache;
  try { cache = await caches.open(CACHE_NAME); }
  catch { return fetch(request); } // Disabled storage must not break the online game.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(request, { signal: controller.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('Asset unavailable');
    // Store canonical shell navigation so /, /index.html, and query strings work offline.
    try { await cache.put(navigation ? SHELL_URL : request.url, response.clone()); }
    catch { /* Quota or private-browsing restrictions must not discard a good response. */ }
    return response;
  } catch {
    const cached = await cache.match(navigation ? SHELL_URL : request.url).catch(() => undefined);
    return cached || new Response('Galactic Multiplier is unavailable offline. Connect once to install it.', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } finally { clearTimeout(timeout); }
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = event.request.mode === 'navigate' &&
    (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(SHELL_URL).pathname);
  if (!navigation && !ASSET_URLS.has(url.href)) return;
  event.respondWith(networkFirst(event.request, navigation));
});


