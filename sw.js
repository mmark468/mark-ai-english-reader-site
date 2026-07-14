const scope = self.registration.scope;
const cachePrefix = `mark-shell:${new URL(scope).pathname}`;
const cacheName = `${cachePrefix}:v1`;
const shell = [scope, new URL("offline.html", scope).href, new URL("manifest.webmanifest", scope).href];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shell)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(`${cachePrefix}:`) && key !== cacheName)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname.includes("supabase") || url.pathname.includes("/functions/v1/")) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(cacheName).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || caches.match(new URL("offline.html", scope).href)),
    );
    return;
  }
  if (url.origin === self.location.origin && /\.(?:js|css|svg|png|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
  }
});
