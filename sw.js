// CalmFlight service worker
// Obiettivo: rendere l'app installabile e permettere l'apertura anche con
// connessione instabile, MA senza mai mettere in cache i dati meteo, che
// devono sempre essere richiesti freschi dalla rete.

const CACHE_NAME = 'calmflight-shell-v11';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Non toccare mai le chiamate alle API esterne (meteo, geocoding):
  // devono sempre passare dalla rete, dati sempre live.
  const isExternalApi =
    url.origin !== self.location.origin;

  if (isExternalApi || event.request.method !== 'GET') {
    return; // lascia che il browser gestisca la richiesta normalmente
  }

  // Per le risorse dell'app: network-first, con fallback alla cache
  // (utile se la connessione cade per un istante durante il caricamento).
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
