/* ═══════════════════════════════════════════════════════
   DOJO OS — Service Worker  v1
   Cache: dojo-os-v1
   
   Strategy:
   · HTML / navigate  → network-first (live updates)
   · Everything else  → cache-first + background refresh
   · Cross-origin     → skip (fonts, etc. handle themselves)
═══════════════════════════════════════════════════════ */

const CACHE   = 'dojo-os-v1';
const PRECACHE = [
  './dojo_os_v1.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ── INSTALL ─────────────────────────────────────────── */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) {
        return Promise.all(
          PRECACHE.map(function(url) {
            return c.add(url).catch(function() {
              /* skip if a file is missing — don't block install */
            });
          })
        );
      })
      .then(function() { return self.skipWaiting(); })
  );
});

/* ── ACTIVATE ────────────────────────────────────────── */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

/* ── FETCH ───────────────────────────────────────────── */
self.addEventListener('fetch', function(e) {
  var req = e.request;

  /* Only handle GET */
  if (req.method !== 'GET') return;

  /* Skip cross-origin (Google Fonts, CDN, etc.) */
  if (!req.url.startsWith(self.location.origin)) return;

  var isNav = req.mode === 'navigate'
    || req.headers.get('accept').indexOf('text/html') > -1;

  if (isNav) {
    /* Network-first for HTML — always get latest version */
    e.respondWith(
      fetch(req)
        .then(function(res) {
          if (res && res.ok) {
            caches.open(CACHE).then(function(c) { c.put(req, res.clone()); });
          }
          return res;
        })
        .catch(function() {
          return caches.match(req)
            .then(function(cached) {
              return cached || caches.match('./dojo_os_v1.html');
            });
        })
    );
  } else {
    /* Cache-first for assets */
    e.respondWith(
      caches.match(req).then(function(cached) {
        /* Kick off a background network fetch to refresh */
        var netFetch = fetch(req).then(function(res) {
          if (res && res.ok && res.type === 'basic') {
            caches.open(CACHE).then(function(c) { c.put(req, res.clone()); });
          }
          return res;
        }).catch(function() { return null; });

        return cached || netFetch;
      })
    );
  }
});
