const CACHE_NAME = 'mamma-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/store.js',
  './js/ai.js',
  './js/ui.js',
  './js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});
