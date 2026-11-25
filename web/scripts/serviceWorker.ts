// The installed app's service worker, written by the build with the files to keep (web/README.md#Installing).

/** The worker's source: it keeps `files` on install, serves them first from the phone, and answers a page load
 * from the network when it can, so a new release reaches the player, and from the phone when it can't. The UI kit and
 * the simulation are never kept: their requests go to the network untouched. */
export function serviceWorkerSource(files: readonly string[], version: string): string {
  return `// Written by the build (web/scripts/serviceWorker.ts)
const CACHE = ${JSON.stringify(`eldenroll-${version}`)};
const FILES = ${JSON.stringify(files)};
const PAGES = ["/kit/", "/sim/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (PAGES.some((page) => url.pathname.startsWith(page))) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/", { ignoreVary: true })));
    return;
  }
  // A script or stylesheet asks with an Origin header the kept copy lacks; a host that varies on it would miss
  event.respondWith(caches.match(request, { ignoreVary: true }).then((kept) => kept ?? fetch(request)));
});
`;
}
