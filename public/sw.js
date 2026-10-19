// Auto Kontor Sfax service worker: makes the site installable and keeps it usable
// on a bad connection. Pages and data always come from the network (prices and
// availability must be fresh); only static files are cached. Offline, a page
// request shows /offline.html. Bump VERSION to drop the old caches.
const VERSION = "aks-v1";
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/images/aks-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Hashed build files never change: cache first.
const IMMUTABLE = /^\/assets\//;
// Logos, icons and bundled images: serve from cache, refresh in the background.
const STATIC_FILES = /^\/(brands|bodies|icons|images)\/|^\/favicon\.png$/;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((cache) => cache.put(request, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }
  if (STATIC_FILES.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(request).then((hit) => {
          const fresh = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit ?? fresh;
        }),
      ),
    );
  }
  // Everything else (server functions, admin, API) goes straight to the network.
});
