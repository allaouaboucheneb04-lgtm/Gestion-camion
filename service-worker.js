const CACHE = 'gc-promax2-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/login.js',
  './js/firebase.js',
  './js/i18n.js'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
