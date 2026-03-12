/* ============================================================
   DOJO OS v3 — Service Worker
   Strategy : Cache-First for app shell, Network-First for nav
   Cache name is versioned — bump CACHE_VER on each deploy
   ============================================================ */

const CACHE_VER  = 'dojo-os-v3.0.0';
const CACHE_CORE = CACHE_VER + '-core';

/* Files that form the full offline app shell */
const PRECACHE = [
  './',
  './dojo_os_v3.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './favicon.ico',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600;700&display=swap'
];

/* ── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', function (e) {
  console.log('[SW] Installing', CACHE_VER);
  e.waitUntil(
    caches.open(CACHE_CORE).then(function (cache) {
      /* Cache what we can; don't fail install on font CDN hiccups */
      return Promise.allSettled(
        PRECACHE.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Pre-cache miss:', url, err.message);
          });
        })
      );
    }).then(function () {
      /* Skip waiting so the new SW activates immediately */
      return self.skipWaiting();
    })
  );
});

/* ── ACTIVATE ────────────────────────────────────────────── */
self.addEventListener('activate', function (e) {
  console.log('[SW] Activating', CACHE_VER);
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_CORE; })
          .map(function (k) {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ── FETCH ───────────────────────────────────────────────── */
self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* Only handle GET; let POST / PUT / DELETE pass through */
  if (req.method !== 'GET') return;

  /* Skip chrome-extension and non-http(s) requests */
  if (!req.url.startsWith('http')) return;

  var url = new URL(req.url);

  /* ── Strategy A: App HTML — Network-first, cache fallback ── */
  if (url.pathname.endsWith('dojo_os_v3.html') || url.pathname === '/') {
    e.respondWith(networkFirstThenCache(req));
    return;
  }

  /* ── Strategy B: Google Fonts — Cache-first (immutable CDN) ── */
  if (url.hostname.includes('fonts.g') || url.hostname.includes('fonts.gstatic')) {
    e.respondWith(cacheFirstThenNetwork(req));
    return;
  }

  /* ── Strategy C: Icons / manifest / static assets — Cache-first ── */
  e.respondWith(cacheFirstThenNetwork(req));
});

/* ── HELPERS ─────────────────────────────────────────────── */

function networkFirstThenCache(req) {
  return fetch(req)
    .then(function (res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE_CORE).then(function (c) { c.put(req, clone); });
      }
      return res;
    })
    .catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || offlineFallback();
      });
    });
}

function cacheFirstThenNetwork(req) {
  return caches.match(req).then(function (cached) {
    if (cached) return cached;
    return fetch(req).then(function (res) {
      if (res && res.status === 200) {
        var clone = res.clone();
        caches.open(CACHE_CORE).then(function (c) { c.put(req, clone); });
      }
      return res;
    }).catch(function () {
      return offlineFallback();
    });
  });
}

function offlineFallback() {
  /* Return the cached app HTML as a universal fallback */
  return caches.match('./dojo_os_v3.html');
}

/* ── MESSAGE: SKIP_WAITING (sent by app on update found) ─── */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
