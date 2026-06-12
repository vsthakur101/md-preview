/*
 * Offline reading, conservatively.
 *
 * Strategy: NETWORK-FIRST for everything we handle. Online behavior is
 * unchanged (every request goes to the network); the cache is only consulted
 * when the fetch fails. We runtime-cache successful same-origin GET responses
 * for page navigations and immutable build assets, so any article you've
 * opened stays readable offline.
 *
 * Never cached: API routes (auth'd, mutable), cross-origin requests,
 * non-GET requests.
 *
 * Bump CACHE_VERSION on changes to this file's logic.
 */

const CACHE_VERSION = 'mdp-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  const isNavigation = req.mode === 'navigate';
  const isBuildAsset = url.pathname.startsWith('/_next/static/');
  if (!isNavigation && !isBuildAsset) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (isNavigation) {
          // Last resort for unvisited pages: the library shell, if we have it.
          const fallback = await cache.match('/library');
          if (fallback) return fallback;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;background:#faf8f2;color:#2a2620"><div style="text-align:center"><h1 style="font-size:1.2rem">You’re offline</h1><p>Articles you’ve opened before are still readable.</p></div>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
        return Response.error();
      }
    })()
  );
});
