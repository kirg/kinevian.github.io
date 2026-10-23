/* CoHabit reminders: shows the notifications the server sends (data-only web push via FCM).
 * Loaded into the main service worker with importScripts (vite.config.ts → workbox.importScripts). */

const ALARM_VIBRATE = [600, 250, 600, 250, 600, 250, 1200];

function payloadOf(event) {
  try {
    const json = event.data ? event.data.json() : {};
    return json.data || json; // FCM wraps data messages as { data: {...}, from, ... }
  } catch {
    return {};
  }
}

self.addEventListener('push', (event) => {
  const d = payloadOf(event);
  if (d.kind !== 'reminder') return;
  const strong = d.level === 'strong';
  const scope = self.registration.scope;
  const url = new URL((d.path || '/').replace(/^\//, ''), scope).href;
  const alarmUrl = strong
    ? new URL(`alarm?${new URLSearchParams({ h: d.householdId, a: d.alarmId, k: d.alarmKey, t: d.title, b: d.body, go: d.path || '/', s: d.stopUrl })}`, scope).href
    : null;

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(d.title || 'CoHabit', {
        body: d.body || '',
        icon: new URL('pwa-192x192.png', scope).href,
        badge: new URL('pwa-64x64.png', scope).href,
        tag: d.tag || undefined,
        renotify: Boolean(d.tag),
        requireInteraction: strong,
        vibrate: strong ? ALARM_VIBRATE : [200],
        silent: false,
        timestamp: Date.now(),
        actions: strong ? [{ action: 'stop', title: '⏹ Stop' }, { action: 'open', title: 'Open' }] : [],
        data: { url, alarmUrl, strong, stopUrl: d.stopUrl, householdId: d.householdId, alarmId: d.alarmId, alarmKey: d.alarmKey },
      });
      // If the app is open, let it ring/show the reminder too.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: 'cohabit-reminder', data: d });
    })(),
  );
});

async function stop(data) {
  if (!data.stopUrl || !data.alarmId) return;
  try {
    await fetch(data.stopUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: data.householdId, alarmId: data.alarmId, key: data.alarmKey }),
    });
  } catch {
    // Offline: it stops by itself after a few rings.
  }
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) c.postMessage({ type: 'cohabit-alarm-stopped', alarmId: data.alarmId });
}

async function openOrFocus(url) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const c of clients) {
    if (c.url.startsWith(self.registration.scope) && 'focus' in c) {
      await c.focus();
      if ('navigate' in c) return c.navigate(url).catch(() => undefined);
      return undefined;
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();
  if (event.action === 'stop') {
    event.waitUntil(stop(data));
    return;
  }
  event.waitUntil(openOrFocus(data.strong && data.alarmUrl ? data.alarmUrl : data.url));
});

// Swiping a strong reminder away counts as Stop.
self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  if (data.strong) event.waitUntil(stop(data));
});
