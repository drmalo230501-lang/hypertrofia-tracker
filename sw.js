const CACHE_NAME = 'hypertrofia-cache-v31-20260731';
const APP_ASSETS = [
  './',
  './index.html',
  './v3.css',
  './v31.css',
  './v3-exercises-upper.js',
  './v3-exercises-lower.js',
  './v3-exercises-core.js',
  './v3-base.js',
  './v3-state.js',
  './v3-dashboard.js',
  './v3-workout-builder.js',
  './v3-workout-active.js',
  './v3-routines.js',
  './v3-analytics.js',
  './v3-profile.js',
  './v3-recovery.js',
  './v3-cloud-timers.js',
  './v3-events.js',
  './v31-dynamic.js',
  './manifest.json',
  './icon.png'
];

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
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        await cache.put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('./index.html')) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const network = fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(() => null);
    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    return (await network) || new Response('Offline', { status: 503 });
  })());
});
