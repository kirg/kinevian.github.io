// CoHabit moved to https://cohabit.kinevian.com. This replaces the old app's service
// worker: it clears the old offline copy, removes itself and sends open windows on.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    for (const w of windows) {
      const url = new URL(w.url);
      const rest = url.pathname.replace(/^\/cohabit/, '') + url.search + url.hash;
      w.navigate('https://cohabit.kinevian.com' + (rest || '/')).catch(() => {});
    }
  })());
});
