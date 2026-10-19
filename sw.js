// Service worker: deja la app disponible sin conexión.
// Al cambiar archivos, sube CACHE_VERSION para que los móviles reciban la nueva versión.
const CACHE_VERSION = 'fsd-0.46';
const CACHE_NAME = CACHE_VERSION;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './ajustes.js',
  './ux.js',
  './manifest.webmanifest',
  './assets/logo_oscuro.png',
  './assets/logo_claro.png',
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png',
  './icons/apple-touch-icon-v2.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // fuentes de Google: red normal
  // Red primero: así cada apertura muestra la versión publicada; la caché solo se usa sin conexión.
  event.respondWith(
    fetch(event.request).then(function (resp) {
      if (resp && resp.status === 200) {
        var copy = resp.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(event.request, copy); });
      }
      return resp;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
