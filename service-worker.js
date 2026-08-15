const CACHE_NAME = "quan-ly-lop-v1";

const APP_FILES = [
  "/Quan-ly-lop/",
  "/Quan-ly-lop/index.html",
  "/Quan-ly-lop/style.css",
  "/Quan-ly-lop/app.js",
  "/Quan-ly-lop/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clonedResponse = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clonedResponse);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
