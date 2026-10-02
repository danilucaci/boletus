const CACHE_NAME = 'boletus-field-guide-v0.2.2';
const CORE = ['./', './index.html', './styles.css', './app.js', './sw.js', './package.json', './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './data/species.json', './data/photos.json'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE.map((url) => new Request(url, {cache:'reload'})));
    const photos = await (await cache.match('./data/photos.json')).json();
    const expected = CORE.length + Object.values(photos).flat().length;
    await cache.put('./offline-status.json', new Response(JSON.stringify({ready:false, cached:CORE.length, expected}), {headers:{'Content-Type':'application/json'}}));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('./offline-status.json');
    event.ports[0]?.postMessage(response ? await response.json() : {ready:false, cached:0, expected:0});
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, {ignoreSearch:true}) || await caches.match(event.request, {ignoreSearch:true});
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      return Response.error();
    }
  })());
});
