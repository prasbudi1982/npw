// Nasgor Pak W PWA - SW v8.2 GitHub Pages Fix
const CACHE = 'npw-pwa-v8-2';
const CORE = [
  './',
  './index.html',
  './customer.html',
  './manifest.json'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=> c.addAll(CORE).catch(err=>console.log('cache add fail', err)))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(
      keys.filter(k=> k!==CACHE).map(k=> caches.delete(k))
    )).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  const url = new URL(req.url);
  
  // Jangan cache API Worker Cloudflare
  if(url.hostname.includes('workers.dev') || url.pathname.startsWith('/api/')){
    e.respondWith(fetch(req).catch(()=> caches.match('./index.html')));
    return;
  }

  // HTML navigation - network first, fallback cache
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(r=>{
        const clone = r.clone();
        caches.open(CACHE).then(c=> c.put(req, clone));
        return r;
      }).catch(()=> caches.match('./index.html') || caches.match('./'))
    );
    return;
  }

  // Assets - cache first
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit) return hit;
      return fetch(req).then(res=>{
        if(res.ok && req.method==='GET' && url.origin===location.origin){
          const clone = res.clone();
          caches.open(CACHE).then(c=> c.put(req, clone));
        }
        return res;
      }).catch(()=> hit);
    })
  );
});
