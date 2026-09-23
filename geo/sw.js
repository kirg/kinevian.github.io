// The app moved to /geobingo/. This replaces the old service worker at /geo/: it deletes the old
// offline cache, unregisters itself, and sends open pages to the new address.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.includes('/geo/')).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) c.navigate(new URL('../geobingo/', self.registration.scope).href + new URL(c.url).hash);
    })(),
  );
});
