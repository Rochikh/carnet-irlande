// service-worker.js — Cache du shell statique uniquement (version /voyage/)
// Les CSV Google Sheets ne sont JAMAIS mis en cache : données toujours en direct.
const CACHE = 'carnet-irlande-voyage-v1';
const SHELL = [
  './',
  './index.html',
  './itineraire.html',
  './lieux.html',
  './journal.html',
  './budget.html',
  './css/style.css',
  './js/csv-loader.js',
  './js/app.js',
  './js/lieux.js',
  './js/pwa.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Données dynamiques (Google Sheets, tuiles, CDN) : réseau direct, jamais de cache
  if (url.includes('docs.google.com') ||
      url.includes('tile.openstreetmap.org') ||
      url.includes('unpkg.com') ||
      url.includes('cdnjs') ||
      url.includes('jsdelivr')) {
    return; // laisse le navigateur gérer (réseau)
  }
  // Shell statique : cache d'abord, réseau en repli
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
