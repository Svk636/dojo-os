/*
 * DOJO OS — Service Worker v3.2
 * ─────────────────────────────────────────────────────────────────────────────
 * Keep SW_VERSION in sync with the comment in index.html.
 * Bump it (e.g. '3.3') whenever you deploy a new version of index.html —
 * this invalidates the old cache and triggers the in-app update banner.
 *
 * Strategy: Cache-First for the app shell (index.html + icons + manifest).
 * All data lives in localStorage — the SW never touches it.
 * Network requests that fail while offline are handled gracefully.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SW_VERSION  = '3.2';
const CACHE_NAME  = 'dojo-os-v' + SW_VERSION;

/*
 * Files to pre-cache on install.
 * The app is a single HTML file so the shell is tiny.
 * Icons are cached so the home-screen icon works offline.
 */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png'
];

/* ─── INSTALL ──────────────────────────────────────────────────────────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /*
       * addAll() fails atomically — if any file 404s the SW won't install.
       * We catch individual failures so a missing icon won't block install.
       */
      return Promise.all(
        PRECACHE_URLS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[DOJO SW] Pre-cache failed for', url, err);
          });
        })
      );
    })
  );
  /* Don't wait for old SW to finish — activates immediately on first install */
  self.skipWaiting();
});

/* ─── ACTIVATE ─────────────────────────────────────────────────────────────── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) {
            console.log('[DOJO SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      /*
       * Take control of all open tabs immediately.
       * Without this, tabs opened before the SW upgrade keep using the old SW
       * until they're refreshed manually.
       */
      return self.clients.claim();
    })
  );
});

/* ─── FETCH ────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', function (event) {
  var req = event.request;

  /* Only handle GET requests */
  if (req.method !== 'GET') return;

  /* Let Supabase API calls go straight to network — never cache them */
  if (req.url.indexOf('supabase.co') !== -1) return;

  /*
   * Cache-First strategy for the app shell.
   * 1. Try cache → serve instantly (works offline).
   * 2. On cache miss → fetch from network → cache response → serve.
   * 3. If network also fails → return a minimal offline fallback.
   */
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;

      /* Not in cache — go to network */
      return fetch(req).then(function (networkRes) {
        /*
         * Only cache same-origin successful responses.
         * Don't cache opaque responses (cross-origin without CORS) —
         * they can consume large amounts of cache quota for unknown content.
         */
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic' &&
          req.url.indexOf(self.location.origin) === 0
        ) {
          var resClone = networkRes.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      }).catch(function () {
        /*
         * Network failed and nothing in cache.
         * Return the cached index.html as the offline fallback —
         * the app will still load from its own cache and work fully offline
         * since all data is in localStorage.
         */
        return caches.match('./index.html');
      });
    })
  );
});

/* ─── MESSAGES ─────────────────────────────────────────────────────────────── */
self.addEventListener('message', function (event) {
  if (!event.data) return;

  /*
   * SKIP_WAITING — sent by the update banner "UPDATE NOW" button.
   * Activates the waiting SW, which triggers controllerchange in index.html,
   * which reloads the page to apply the update.
   * We reply with our version so the banner can display it.
   */
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    /* Reply with version for the update banner display */
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
  }

  /*
   * GET_VERSION — sent by index.html on registration to populate #ubVersion.
   */
  if (event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
  }
});
