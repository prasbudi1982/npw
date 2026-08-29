
const CACHE_NAME = 'npw-v8.1-pwa-2025';
const ASSETS = [
  './',
  './customer.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // API jangan di-cache, langsung network
  if(url.pathname.startsWith('/api/') || url.href.includes('workers.dev')){
    e.respondWith(fetch(e.request).catch(()=>caches.match('./customer.html')));
    return;
  }
  // Untuk assets lain: cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached) return cached;
      return fetch(e.request).then(res=>{
        // cache new
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(e.request, clone));
        return res;
      }).catch(()=>caches.match('./customer.html'));
    })
  );
});
