// Service worker for the Lift PWA.
// Strategy: network-first with cache fallback.
// Why: iOS standalone PWAs cache aggressively. Without this, updates can sit
// behind the cached page for a long time. Network-first means each launch
// pulls the latest from GitHub Pages and only falls back to cache when offline.

const CACHE = 'lift-v1';

self.addEventListener('install', (event) => {
  // Activate the new SW immediately on install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of any already-open pages right away, and clean old caches
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GETs from the same origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      // Cache a copy for offline fallback
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      // Offline — serve from cache if we have it
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
