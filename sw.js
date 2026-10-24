// Service Worker — кэшируем всё на устройстве, чтобы приложение работало офенно
const CACHE='kiosk-cache-v1';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.json','./icon.svg'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    caches.match(e.request).then(r=> r || fetch(e.request).then(resp=>{
      if(resp && resp.ok) caches.open(CACHE).then(c=>c.put(e.request, resp.clone()));
      return resp;
    }).catch(()=> caches.match('./index.html')))
  );
});