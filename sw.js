/* Senses Report — makes the web page open without internet.
   The page (index.html) is fetched fresh whenever there is a connection and kept as a copy for when there isn't.
   The Excel/PDF libraries and fonts are saved the first time they are used. Firebase data is NOT handled here:
   the app keeps its own saved copy and save queue (see "v274 — offline layer" in index.html). */
const CACHE = 'senses-shell-v275';
const CDN = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (req.mode === 'navigate' || (sameOrigin && /\/(index\.html)?$/.test(url.pathname))) {
    // The page: newest copy when online, saved copy when not.
    e.respondWith(
      fetch(req).then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); } return res; })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match(req)))
    );
    return;
  }
  if (CDN.includes(url.hostname) || (sameOrigin && /\.(png|jpg|jpeg|svg|webp|css|js|woff2?)$/i.test(url.pathname))) {
    // Libraries, fonts, images: use the saved copy right away, refresh it quietly.
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
