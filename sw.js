/* ============================================================
   DOJO OS v4 — Service Worker  v3.2
   Strategy : Cache-first for shell assets, network-only for
              Supabase API calls, stale-while-revalidate for
              everything else.
   Bump SW_VERSION on every deploy to trigger the update banner.
   ============================================================ */

const SW_VERSION  = '4.0';
const CACHE_NAME  = 'dojo-os-4' + SW_VERSION;

/* Assets to pre-cache on install — the entire app shell.
   index.html is cached as both './' and './index.html' so either
   URL works when served from GitHub Pages.                      */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png',
  './icons/apple-touch-icon.png',
];

/* Supabase origin — always go network-only, never cache auth/API */
const SUPABASE_ORIGIN = 'supabase.co';

/* ── INSTALL ─────────────────────────────────────────────────── */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
    /* Do NOT call skipWaiting() here — let the update banner
       give the user the choice to reload.                        */
  );
});

/* ── ACTIVATE ────────────────────────────────────────────────── */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      /* Take control of all open tabs immediately on first activate.
         Safe on first install (no waiting SW to displace).          */
      return self.clients.claim();
    })
  );
});

/* ── FETCH ───────────────────────────────────────────────────── */
self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  /* 1. Network-only: Supabase REST / Auth / Realtime */
  if (url.indexOf(SUPABASE_ORIGIN) !== -1) {
    e.respondWith(fetch(e.request));
    return;
  }

  /* 2. Network-only: non-GET requests (POST, PUT, DELETE…) */
  if (e.request.method !== 'GET') {
    e.respondWith(fetch(e.request));
    return;
  }

  /* 3. Cache-first for same-origin GET (app shell, icons, manifest) */
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      if (cached) return cached;

      /* Not in cache — fetch, clone into cache, return response */
      return fetch(e.request).then(function (response) {
        /* Only cache valid same-origin responses */
        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic'
        ) {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, toCache);
        });
        return response;
      }).catch(function () {
        /* Offline fallback — serve index.html for navigation requests */
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

/* ── MESSAGE ─────────────────────────────────────────────────── */
self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    /* Reply with the version BEFORE skipping so the page can
       display it in the update banner (#ubVersion span).        */
    if (e.source) {
      e.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
    self.skipWaiting();
  }

  /* Optional: page can ask for the current version at any time */
  if (e.data && e.data.type === 'GET_VERSION') {
    if (e.source) {
      e.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
  }
});
