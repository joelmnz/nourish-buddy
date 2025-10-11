self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Basic fetch passthrough (can be extended for offline caching later)
self.addEventListener('fetch', () => {
  // no-op: let the network handle it
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (_) {}

  const title = data.title || 'Nourish Buddy';
  const body = data.body || 'You have a new reminder';
  const icon = data.icon || '/vite.svg';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const url = '/';
      for (const client of allClients) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })()
  );
});
