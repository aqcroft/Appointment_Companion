const CACHE_NAME = 'appointment-companion-v2';
const APP_SHELL = [
  './',
  './index.html',
  './cloud/',
  './cloud/index.html',
  './cloud/companion_cloud_pilot.html',
  './cloud/tariff-status.js',
  './cloud-client-v1.js',
  './tariff-status.js',
  './cloud/device-identity-v1.js',
  './cloud/companion-bridge-v1.js',
  './cloud/cloud-pilot-v1.js',
  './cloud/cloud-pilot-enhancements-v1.js',
  './cloud/cloud-pilot-safety-v1.js',
  './cloud/cloud-presence-v1.js',
  './cloud/specialist-launcher-v1.js',
  './cloud/specialists-v1.js',
  './cloud/specialist-cloud-save-v1.js',
  './cloud/specialist-share-v1.js',
  './cloud/ev-bridge-pilot-v1.js',
  './cloud/ev-cloud-share-v1.js',
  './cloud-ev-pilot.html',
  './cashback-card-companion.html',
  './companion/ev/',
  './companion/ev/index.html',
  './companion/ev/share-view-v1.js',
  './v16c-ev.html',
  './v13-ev.js',
  './v16b-hero.js',
  './v14-ev.css',
  './v16c-ev.css',
  './v16c-table.js',
  './v16c-sharing.js',
  './v15-ev.css',
  './v15-freshness.js',
  './manifest.webmanifest',
  './app-icon.svg',
  './app-icon-192.png',
  './app-icon-512.png',
  './pwa-register.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('./cloud/')))
  );
});
