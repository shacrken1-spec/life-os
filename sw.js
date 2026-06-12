const CACHE = 'lifeos-v2';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './auth.js',
  './manifest.json',
  './modules/dashboard.js',
  './modules/trading.js',
  './modules/workout.js',
  './modules/habits.js',
  './modules/supplements.js',
  './modules/watchlist.js',
  './modules/goals.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // never cache API calls — network only
  if (url.origin !== location.origin) {
    if (url.hostname.includes('fonts.g')) {
      e.respondWith(
        caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        }))
      );
    }
    return;
  }
  // app shell: cache-first, refresh in background
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
