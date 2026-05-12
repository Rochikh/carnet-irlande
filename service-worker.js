const CACHE_NAME = 'carnet-irlande-v1';
const ASSETS = [
  './',
  './index.html',
  './itineraire.html',
  './lieux.html',
  './journal.html',
  './budget.html',
  './css/style.css',
  './js/app.js',
  './js/lieux.js',
  './js/storage.js',
  './js/pwa.js',
  './data/lieux.json',
  './manifest.json'
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-first for tiles
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tiles OpenStreetMap: network-first, cache for offline
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME + '-tiles').then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Leaflet CDN: network-first
  if (url.hostname === 'unpkg.com') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
