// ExTimer Service Worker - offline-first PWA
const CACHE = 'extimer-v1.5';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

// cache-first for core, network-first for rest (but still offline capable)
self.addEventListener('fetch', e => {
  const req = e.request;
  // only GET
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // bypass non-same-origin
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        // update cache for GET html/js/json
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(()=> cached);

      return cached || network;
    })
  );
});
