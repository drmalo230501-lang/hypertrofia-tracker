const CACHE_NAME = 'hypertrofia-cache-v1';
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

let latestTimerState = {
  gymSeconds: 0,
  restSeconds: 0,
  seriesCount: 0,
  gymRunning: false,
  restRunning: false,
  notificationsEnabled: false
};

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const networkResponse = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      if (event.request.url.startsWith(self.location.origin)) {
        cache.put(event.request, networkResponse.clone());
      }
      return networkResponse;
    } catch (_) {
      const fallback = await caches.match('./index.html');
      return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

function formatHMS(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatMS(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

async function publishTimerNotification() {
  if (!latestTimerState.notificationsEnabled) return;

  const body = [
    `Tiempo: ${formatHMS(latestTimerState.gymSeconds)} ${latestTimerState.gymRunning ? '▶️' : '⏸️'}`,
    `Descanso: ${formatMS(latestTimerState.restSeconds)} ${latestTimerState.restRunning ? '▶️' : '⏸️'}`,
    `Series: ${latestTimerState.seriesCount}`
  ].join(' · ');

  await self.registration.showNotification('Hypertrofia Tracker', {
    body,
    tag: 'hypertrofia-timer',
    renotify: true,
    requireInteraction: true,
    icon: './icon.png',
    badge: './icon.png',
    actions: [
      { action: 'add-series', title: '+1 Serie' },
      { action: 'reset-series', title: 'Reset Series' },
      { action: 'open-app', title: 'Abrir app' }
    ],
    data: { ...latestTimerState }
  });
}

async function broadcastToClients(payload) {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage(payload);
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'TIMER_STATE_UPDATE') {
    latestTimerState = {
      ...latestTimerState,
      ...data.payload
    };
    event.waitUntil(publishTimerNotification());
  }
});

self.addEventListener('notificationclick', (event) => {
  const action = event.action || 'open-app';
  event.notification.close();

  event.waitUntil((async () => {
    if (action === 'add-series') {
      await broadcastToClients({ type: 'SW_ADD_SERIES' });
      return;
    }

    if (action === 'reset-series') {
      await broadcastToClients({ type: 'SW_RESET_SERIES' });
      return;
    }

    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (allClients.length > 0) {
      await allClients[0].focus();
      allClients[0].postMessage({ type: 'SW_OPEN_TIMER' });
      return;
    }
    await self.clients.openWindow('./index.html#cronometro');
  })());
});
