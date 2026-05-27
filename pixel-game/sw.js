const CACHE_NAME = "isekay-tower-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./assets/ui/icon-192.png",
  "./assets/ui/icon-512.png",
  "./js/systems/rarities.js",
  "./js/systems/stats.js",
  "./js/systems/loot.js",
  "./js/systems/drops.js",
  "./js/systems/economy.js",
  "./js/systems/dungeon.js",
  "./js/entities/player_canvas.js",
  "./js/entities/enemy.js",
  "./js/entities/boss.js",
  "./js/entities/Floor10Boss.js",
  "./js/entities/Floor15Boss.js",
  "./js/game.js"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching all static assets");
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Only cache valid requests from the same origin to avoid cors issues
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn("[Service Worker] Fetch failed, resource offline:", err);
      });
    })
  );
});
