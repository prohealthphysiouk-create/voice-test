// Service worker for the voice test page: lets the page and the downloaded voice engines work offline.
const SHELL = 'vt-shell-v1', RUNTIME = 'vt-runtime-v1', MODELS = 'vt-models-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './index.html'])).catch(() => { }));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Big model files that the page downloaded into the models cache (served under /models/<original filename>)
    if (url.pathname.includes('/models/')) {
      e.respondWith(caches.open(MODELS).then(c => c.match(url.origin + url.pathname)).then(r => r || new Response('Model not downloaded yet', { status: 404 })));
      return;
    }
    // The app itself: try the network, fall back to the saved copy when offline
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // Scripts and WebAssembly runtimes from jsDelivr: save the first time, reuse offline
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const m = await c.match(req);
      if (m) return m;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    }));
  }
});
