const CACHE_NAME = 'gestion-camion-kmpro2-c-final';
const ASSETS = ["./","./index.html","./css/style.css","./js/firebase-config.js","./js/firebase.js","./js/common.js","./js/login.js","./js/admin.js","./js/chauffeur.js","./js/i18n.js","./pages/admin.html","./pages/chauffeur.html"];
self.addEventListener("install", event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => null))); });
self.addEventListener("activate", event => { event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  event.respondWith((async()=>{ try { const fresh=await fetch(event.request,{cache:"no-store"}); const cache=await caches.open(CACHE_NAME); cache.put(event.request,fresh.clone()).catch(()=>null); return fresh; } catch(e){ return (await caches.match(event.request)) || Response.error(); } })());
});
