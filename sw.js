const CACHE_NAME="mapapodiyua-pwa-v1";
const APP_SHELL=["./","./index.html","./manifest.json","./offline.html","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok)caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./offline.html"))));
});
