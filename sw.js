/* ═══════════════════════════════════════════
   DOJO OS v3 — Service Worker
   Cache-first for app shell, network-first
   for dynamic content. Corrected asset paths.
═══════════════════════════════════════════ */
var CACHE_NAME = 'dojo-os-v3.1';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-384.png'
];

/* ── INSTALL: pre-cache app shell ── */
self.addEventListener('install', function(e) {
  self.skipWaiting(); // activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS.map(function(url) {
        return new Request(url, { cache: 'reload' });
      }));
    })
  );
});

/* ── ACTIVATE: clear old caches ── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ── FETCH: stale-while-revalidate ── */
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET and cross-origin chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (url.startsWith('chrome-extension://')) return;

  // Network-first for Google Fonts (fast CDN, want fresh)
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return fetch(e.request)
          .then(function(res) {
            cache.put(e.request, res.clone());
            return res;
          })
          .catch(function() {
            return caches.match(e.request);
          });
      })
    );
    return;
  }

  // Cache-first with background revalidation for everything else
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(fresh) {
        caches.open(CACHE_NAME).then(function(c) {
          c.put(e.request, fresh.clone());
        });
        return fresh;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});

/* ── MESSAGE: force update from UI ── */
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
