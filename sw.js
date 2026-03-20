/* ═══════════════════════════════════════════════════════════════════
   DOJO OS — Service Worker
   Version  : 4.0
   Strategy : Cache-First (shell) + Stale-While-Revalidate (assets)
              Network-only bypass for Supabase / config.js
   ───────────────────────────────────────────────────────────────────
   To trigger the in-app update banner:
     1. Bump SW_VERSION below  (e.g. 4.0 → 4.1)
     2. Update CACHE_SHELL name to match  (dojo-shell-v4.1)
     3. Redeploy sw.js — browser detects the byte change, installs
     4. App shows "UPDATE NOW" banner — user taps to reload safely
   ═══════════════════════════════════════════════════════════════════ */

'use strict';

var SW_VERSION    = '4.0';
var CACHE_SHELL   = 'dojo-shell-v4.0';
var CACHE_RUNTIME = 'dojo-runtime-v1';

/* Pre-cached on install */
var SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

/* Never cache — always network */
var BYPASS = [
  'supabase.co',
  'config.js',
  'chrome-extension'
];

/* ── INSTALL ─────────────────────────────────────────────────────── */
self.addEventListener('install', function(e) {
  console.log('[SW ' + SW_VERSION + '] install');
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(function(cache) { return cache.addAll(SHELL_ASSETS); })
      .then(function() { console.log('[SW ' + SW_VERSION + '] shell ready'); })
      .catch(function(err) { console.warn('[SW] install failed:', err); })
  );
  /* Do NOT self.skipWaiting() — app controls update flow via SKIP_WAITING message */
});

/* ── ACTIVATE ────────────────────────────────────────────────────── */
self.addEventListener('activate', function(e) {
  console.log('[SW ' + SW_VERSION + '] activate');
  var keep = [CACHE_SHELL, CACHE_RUNTIME];
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (keep.indexOf(k) === -1) {
          console.log('[SW] deleting old cache:', k);
          return caches.delete(k);
        }
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

/* ── FETCH ───────────────────────────────────────────────────────── */
self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = req.url;

  /* Non-GET → network only */
  if (req.method !== 'GET') return;

  /* Bypass list */
  for (var i = 0; i < BYPASS.length; i++) {
    if (url.indexOf(BYPASS[i]) !== -1) return;
  }

  /* Cross-origin → network only */
  if (!url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then(function(cached) {

      /* CACHE HIT — return immediately, refresh in background */
      if (cached) {
        var cacheName = getCache(url);
        fetch(req).then(function(res) {
          if (res && res.ok) {
            caches.open(cacheName).then(function(c) { c.put(req, res.clone()); });
          }
        }).catch(function() {});
        return cached;
      }

      /* CACHE MISS — fetch, cache, return */
      return fetch(req).then(function(res) {
        if (!res || !res.ok) return res;
        var cacheName = getCache(url);
        caches.open(cacheName).then(function(c) { c.put(req, res.clone()); });
        return res;
      }).catch(function() {
        /* Offline with no cache — SPA fallback for navigation */
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

function getCache(url) {
  var isShell = SHELL_ASSETS.some(function(a) {
    var clean = a.replace('./', '');
    return !clean || url.endsWith(clean) || url === self.registration.scope;
  });
  return isShell ? CACHE_SHELL : CACHE_RUNTIME;
}

/* ── MESSAGE ─────────────────────────────────────────────────────── */
self.addEventListener('message', function(e) {
  if (!e.data || !e.data.type) return;

  switch (e.data.type) {

    case 'GET_VERSION':
      var msg = { type: 'SW_VERSION', version: SW_VERSION };
      if (e.source && e.source.postMessage) {
        e.source.postMessage(msg);
      } else {
        self.clients.matchAll().then(function(clients) {
          clients.forEach(function(c) { c.postMessage(msg); });
        });
      }
      break;

    case 'SKIP_WAITING':
      console.log('[SW ' + SW_VERSION + '] SKIP_WAITING → activating');
      self.skipWaiting();
      /* Broadcast version to all clients after activation */
      self.clients.matchAll({ includeUncontrolled: true }).then(function(clients) {
        clients.forEach(function(c) {
          c.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
        });
      });
      break;

    case 'CACHE_URLS':
      if (Array.isArray(e.data.urls)) {
        e.waitUntil(
          caches.open(CACHE_RUNTIME).then(function(cache) {
            return cache.addAll(e.data.urls.filter(function(u) {
              return typeof u === 'string';
            }));
          }).catch(function(err) { console.warn('[SW] CACHE_URLS error:', err); })
        );
      }
      break;

    default:
      console.log('[SW] unknown message type:', e.data.type);
  }
});
