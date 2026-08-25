const CACHE = 'dedao-v10';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/engine.js',
  './js/audio.js',
  './js/ui.js',
  './manifest.json',
  './assets/fonts/TsangerYuYangT-W05.woff2',
  './assets/audio/bgm/求道一两风_minimax_free.mp3',
  './assets/audio/bgm/仙魔浩劫_watermark.mp3'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (response) {
        if (response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(e.request, clone); });
        }
        return response;
      });
    }).catch(function () {
      return caches.match('./index.html');
    })
  );
});
