/* Sabor Criollo — Service Worker (offline/PWA)
   Estrategia:
   - Shell de la app: pre-cacheado en la instalación.
   - Mismo origen (fotos, modelos .glb, json): cache-first.
   - CDNs (fuentes, model-viewer): stale-while-revalidate.
*/

const VERSION = "sc-v2.0.0";
const SHELL_CACHE = VERSION + "-shell";
const RUNTIME_CACHE = VERSION + "-runtime";

const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./dishes.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    // Cache-first para lo servido desde el mismo origen.
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
          return res;
        });
      })
    );
  } else {
    // Stale-while-revalidate para CDNs (Google Fonts, unpkg/jsdelivr).
    event.respondWith(
      caches.match(event.request).then((hit) => {
        const network = fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, copy));
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
