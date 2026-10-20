// Auto Kontor Sfax service worker: makes the site installable and keeps it usable
// on a bad connection. Pages and data always come from the network (prices and
// availability must be fresh); only static files are cached. Offline, a page
// request shows /offline.html. Bump VERSION to drop the old caches.
const VERSION = "aks-v3";
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline.html";
// Launch screens (admin app start, "Voir le site"): shown from the cache at once,
// before the server answers, then refreshed in the background.
const SPLASH_PAGES = ["/lancement.html", "/ouverture.html"];
const PRECACHE = [OFFLINE_URL, ...SPLASH_PAGES, "/icons/icon-192.png", "/images/aks-logo.png"];

/** A cached copy that may have followed a redirect, made usable for a page load. */
const unredirected = (res) =>
  res && res.redirected
    ? res.blob().then((body) => new Response(body, { status: 200, headers: res.headers }))
    : res;

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

  if (request.mode === "navigate" && SPLASH_PAGES.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC).then((cache) =>
        cache.match(url.pathname).then((hit) => {
          const fresh = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(url.pathname, res.clone());
              return res;
            })
            .catch(() => hit ?? caches.match(OFFLINE_URL));
          return hit ? unredirected(hit) : fresh;
        }),
      ),
    );
    return;
  }
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

// Admin notifications (new e-mail, new request), sent by the server with Web Push.
// An open admin window refreshes the matching data at once.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "AKS Admin" };
  }
  const title = data.title || "AKS Admin";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag || data.type || "aks",
        renotify: true,
        dir: data.dir || "auto",
        lang: data.lang || "fr",
        data: { url: data.url || "/admin", type: data.type },
      }),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windows) =>
          windows.forEach((w) => w.postMessage({ kind: "admin-push", type: data.type })),
        ),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // An admin window already open: bring it forward on that page.
      const admin = windows.find((w) => new URL(w.url).pathname.startsWith("/admin"));
      if (admin) {
        admin.postMessage({ kind: "admin-open", url });
        return admin.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
