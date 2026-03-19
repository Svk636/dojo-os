/* ═══════════════════════════════════════════════════════════════
   DOJO OS — Service Worker  v3.2
   Strategy : Cache-First for shell assets, Network-First for data
   ─────────────────────────────────────────────────────────────
   To trigger an update banner in the app:
     1. Bump SW_VERSION below
     2. Redeploy — browser will detect the changed SW file,
        install the new one, and surface the update banner.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

var SW_VERSION   = '3.2';
var CACHE_SHELL  = 'dojo-shell-v3.2';   /* versioned — bump with SW_VERSION */
var CACHE_DYNAMIC= 'dojo-dynamic-v1';   /* long-lived runtime cache          */

/* ── Shell assets — cached on install ────────────────────────── */
var SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
  /* icons are fetched on demand and cached in CACHE_DYNAMIC */
];

/* ── Assets that should NEVER be cached ──────────────────────── */
var NEVER_CACHE = [
  'config.js',        /* runtime secrets — must stay fresh          */
  'chrome-extension', /* browser extensions                         */
  'supabase'          /* all Supabase API traffic — always network  */
];

/* ─────────────────────────────────────────────────────────────
   INSTALL — precache shell
─────────────────────────────────────────────────────────────── */
self.addEventListener('install', function(e) {
  console.log('[SW ' + SW_VERSION + '] install');
  e.waitUntil(
    caches.open(CACHE_SHELL).then(function(cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function() {
      /* Don't skip waiting automatically — let the app control
         the update flow via SKIP_WAITING message so data is safe */
      console.log('[SW ' + SW_VERSION + '] shell cached');
    }).catch(function(err) {
      console.warn('[SW] install cache failed:', err);
    })
  );
});

/* ─────────────────────────────────────────────────────────────
   ACTIVATE — delete old caches
─────────────────────────────────────────────────────────────── */
self.addEventListener('activate', function(e) {
  console.log('[SW ' + SW_VERSION + '] activate');
  var keepCaches = [CACHE_SHELL, CACHE_DYNAMIC];
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (keepCaches.indexOf(key) === -1) {
            console.log('[SW] deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      /* Take control of all clients immediately after activation */
      return self.clients.claim();
    })
  );
});

/* ─────────────────────────────────────────────────────────────
   FETCH — Cache-First for shell, Network-First for everything else
─────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = req.url;

  /* Only handle GET — pass through POST/PUT/DELETE to network */
  if (req.method !== 'GET') return;

  /* Never-cache list — pass straight to network */
  for (var i = 0; i < NEVER_CACHE.length; i++) {
    if (url.indexOf(NEVER_CACHE[i]) !== -1) return;
  }

  /* Cross-origin requests not in our domain — skip */
  var isSameOrigin = url.startsWith(self.location.origin);
  if (!isSameOrigin) return;

  e.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) {
        /* Cache hit — return immediately, refresh in background (stale-while-revalidate) */
        var fetchUpdate = fetch(req).then(function(networkRes) {
          if (networkRes && networkRes.status === 200) {
            var cacheName = isShellAsset(url) ? CACHE_SHELL : CACHE_DYNAMIC;
            caches.open(cacheName).then(function(cache) {
              cache.put(req, networkRes.clone());
            });
          }
          return networkRes;
        }).catch(function() { /* offline — cached version is fine */ });
        /* Don't await the background refresh — return cached immediately */
        void fetchUpdate;
        return cached;
      }

      /* Cache miss — fetch from network, cache the response */
      return fetch(req).then(function(networkRes) {
        if (!networkRes || networkRes.status !== 200 || networkRes.type === 'error') {
          return networkRes;
        }
        var cacheName = isShellAsset(url) ? CACHE_SHELL : CACHE_DYNAMIC;
        var toCache = networkRes.clone();
        caches.open(cacheName).then(function(cache) { cache.put(req, toCache); });
        return networkRes;
      }).catch(function() {
        /* Offline + no cache — return offline fallback for navigation requests */
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        /* For other assets, return a minimal error response */
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

/* ── Helper: is this URL a shell asset? ──────────────────────── */
function isShellAsset(url) {
  return SHELL_ASSETS.some(function(asset) {
    return url.endsWith(asset.replace('./', '')) || url === self.registration.scope;
  });
}

/* ─────────────────────────────────────────────────────────────
   MESSAGE — handle app → SW commands
─────────────────────────────────────────────────────────────── */
self.addEventListener('message', function(e) {
  if (!e.data || !e.data.type) return;

  switch (e.data.type) {

    /* App asks "what version are you?" — reply to that specific client */
    case 'GET_VERSION':
      var client = e.source || e.ports && e.ports[0];
      if (client && client.postMessage) {
        client.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
      } else {
        /* Broadcast to all clients if no source available */
        self.clients.matchAll().then(function(clients) {
          clients.forEach(function(c) {
            c.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
          });
        });
      }
      break;

    /* App update banner "UPDATE NOW" clicked — skip waiting, take control */
    case 'SKIP_WAITING':
      console.log('[SW ' + SW_VERSION + '] SKIP_WAITING received — activating');
      self.skipWaiting();
      break;

    /* Cache a specific URL on demand (future use) */
    case 'CACHE_URLS':
      if (Array.isArray(e.data.urls)) {
        e.waitUntil(
          caches.open(CACHE_DYNAMIC).then(function(cache) {
            return cache.addAll(e.data.urls);
          })
        );
      }
      break;

    default:
      console.log('[SW] unknown message type:', e.data.type);
  }
});
