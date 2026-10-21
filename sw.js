// Service worker: deja la app disponible sin conexión.
// Al cambiar archivos, sube CACHE_VERSION para que los móviles reciban la nueva versión.
const CACHE_VERSION = 'fsd-0.71.3';
const CACHE_NAME = CACHE_VERSION;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './ganchos.js',
  './ajustes.js',
  './ux.js',
  './avisos.js',
  './panelpro.js',
  './mejoras.js',
  './nutricion.js',
  './entreno.js',
  './escritorio.js',
  './escritorio.css',
  './experiencia.js',
  './experiencia.css',
  './rutinas.js',
  './rutinas.css',
  './recetas.js',
  './recetas.css',
  './terminos.js',
  './cliente.js',
  './cliente.css',
  './constructor.js',
  './constructor.css',
  './rutina.js',
  './grafico.js',
  './area.js',
  './seguimiento.js',
  './sonidos/campanita.mp3',
  './sonidos/mensaje_enviado.mp3',
  './lz-string.min.js',
  './almacen.js',
  './protocolos.js',
  './entrenos.js',
  './cardio.js',
  './musculos.js',
  './datos.js',
  './assets/qr_app.png',
  './manifest.webmanifest',
  './assets/logo_fsd.png',
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
  // Red primero y sin la copia del navegador: siempre se pregunta a GitHub si hay archivos nuevos
  // (cache: 'no-cache' revalida; si no han cambiado, la respuesta es rápida y no se descarga nada).
  // La caché propia solo se usa sin conexión.
  var req = event.request;
  var fresco = req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) { return r.redirected ? fetch(req) : r; })
    : fetch(req, { cache: 'no-cache' });
  event.respondWith(
    fresco.then(function (resp) {
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

// Al tocar un aviso del sistema, se abre (o se trae al frente) la app
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) { if ('focus' in lista[i]) return lista[i].focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
