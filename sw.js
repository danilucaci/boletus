const CACHE_NAME = 'boletus-field-guide-v0.1.2';
const CORE = ['./', './index.html', './styles.css', './app.js', './sw.js', './package.json', './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './data/species.json', './data/photos.json'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch('./data/photos.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Photo manifest unavailable');
    const catalog = await response.json();
    const images = Object.values(catalog).flat().map((image) => `./${image.file}`);
    const urls = [...new Set([...CORE, ...images])];
    try {
      for (let start = 0; start < urls.length; start += 8) {
        await Promise.all(urls.slice(start, start + 8).map((url) => cache.add(new Request(url, {cache:'reload'}))));
      }
      await cache.put('./offline-status.json', new Response(JSON.stringify({ready:true, cached:urls.length, expected:urls.length}), {headers:{'Content-Type':'application/json'}}));
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
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
    const cached = await cache.match(event.request, {ignoreSearch:true});
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) cache.put(event.request, response.clone());
      return response;
    } catch {
      if (event.request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      return Response.error();
    }
  })());
});
