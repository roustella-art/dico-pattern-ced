const ASSETS = ['./index.html', './manifest.json', './state.js', './data.js', './audio.js', './render.js', './shaker.js', './onboarding.js', './version.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    (async () => {
      // Charger la version depuis version.json
      try {
        const resp = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
        const data = await resp.json();
        const CACHE = 'dico-pattern-' + data.cacheVersion;

        // Ouvrir le cache avec la version correcte
        const c = await caches.open(CACHE);
        await c.addAll(ASSETS);
      } catch (e) {
        console.error('Erreur Service Worker install:', e);
      }
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    (async () => {
      try {
        // Charger la version actuelle
        const resp = await fetch('./version.json?t=' + Date.now(), { cache: 'no-store' });
        const data = await resp.json();
        const CACHE = 'dico-pattern-' + data.cacheVersion;

        // Supprimer les anciens caches
        const keys = await caches.keys();
        await Promise.all(
          keys.filter(k => k !== CACHE).map(k => caches.delete(k))
        );
      } catch (e) {
        console.error('Erreur Service Worker activate:', e);
      }
    })()
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
