/* ═══════════════════════════════════════════════════════
   DOJO OS — Service Worker v1
   GitHub Pages production SW
   Strategy:
     - HTML (index / dojo_os_v1.html) → network-first, cache fallback
     - All other GET → cache-first, network update in background
   ═══════════════════════════════════════════════════════ */

const CACHE     = 'dojo-os-v1';
const APP_SHELL = [
  './',
  './index.html',
  './dojo_os_v1.html',
];

/* ── INSTALL: pre-cache app shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: purge old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  /* Skip cross-origin (CDN fonts, etc.) — browser handles those */
  if (url.origin !== self.location.origin) return;

  /* HTML pages → network-first so updates land immediately */
  const isNav = e.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/');

  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached || caches.match('./dojo_os_v1.html'))
        )
    );
    return;
  }

  /* Everything else → cache-first, refresh in background */
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(r => {
        if (r && r.ok && r.type === 'basic') {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => null);

      return cached || net || new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});
