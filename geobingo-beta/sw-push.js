// Reminders by web push (2.121; src/lib/push.ts, server/push.mjs) — loaded into the generated service worker
// (vite.config.ts workbox.importScripts). Shows the reminder; a tap opens (or focuses) the app.
self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : '' };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(d.title || 'geobingo', {
      body: d.body || '',
      icon: scope + 'pwa-192x192.png',
      badge: scope + 'pwa-64x64.png',
      tag: d.tag || 'geobingo-reminder',
      data: { url: d.url && d.url.startsWith(self.location.origin) ? d.url : scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus().catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    }),
  );
});
