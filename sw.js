// Mi Turno Seguro — Service Worker v1.0
const CACHE_NAME = 'mts-v1';
const OFFLINE_URL = '/miturnoseguro/offline.html';

const PRECACHE = [
  '/miturnoseguro/',
  '/miturnoseguro/index.html',
  '/miturnoseguro/offline.html',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap',
  'https://accounts.google.com/gsi/client'
];

// ── INSTALL: precachear assets clave ──────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cachear lo esencial; ignorar errores en recursos externos
      return Promise.allSettled(
        PRECACHE.map(function(url) {
          return cache.add(url).catch(function(e) {
            console.warn('[SW] No se pudo cachear:', url, e);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: limpiar caches viejos ──────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH: estrategia según tipo de recurso ───────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Ignorar requests que no son GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests al backend de Apps Script (siempre online)
  if (url.hostname === 'script.google.com') return;

  // Ignorar OAuth y APIs externas
  if (url.hostname === 'api.mercadopago.com') return;
  if (url.hostname === 'auth.mercadopago.com') return;
  if (url.hostname === 'accounts.google.com') return;
  if (url.hostname === 'www.googleapis.com') return;

  // Fuentes de Google → Cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // HTML del propio sitio → Network first, fallback a cache, fallback a offline
  if (url.pathname.startsWith('/miturnoseguro') &&
      (event.request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(event.request));
    return;
  }

  // Resto de assets propios (JS inline en HTML, etc.) → Network first
  if (url.hostname === 'miturnoseguro.github.io') {
    event.respondWith(networkFirst(event.request));
    return;
  }
});

// ── ESTRATEGIAS ───────────────────────────────────────────────────────────────

function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) return cached;
    return fetch(request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
      }
      return response;
    });
  });
}

function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

function networkFirstWithOfflineFallback(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) { cache.put(request, clone); });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      return cached || caches.match(OFFLINE_URL);
    });
  });
}
