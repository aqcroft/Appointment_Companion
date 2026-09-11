const CACHE_NAME = 'appointment-companion-v9';
const APP_SHELL = [
  './',
  './index.html',
  './cloud/',
  './cloud/index.html',
  './consolidated-v1/',
  './consolidated-v1/index.html',
  './consolidated-v1/manifest.webmanifest',
  './consolidated-v1/pwa-register.js',
  './consolidated-v1/sw.js',
  './consolidated-v1/tariff-fetch-v1.js',
  './consolidated-v1/canonical-state-v1.js',
  './consolidated-v1/canonical-controls-v1.js',
  './consolidated-v1/service-ui-polish-v1.js',
  './consolidated-v1/spring-clean-v2.js',
  './consolidated-v1/local-customer-store-v2.js',
  './consolidated-v1/consolidated-controller-v1.js',
  './consolidated-v1/share-policy-v1.js',
  './consolidated-v1/specialist-share-v1.js',
  './consolidated-v1/specialist-launcher-v1.js',
  './consolidated-v1/specialist-features-v1.js',
  './consolidated-v1/ev/',
  './consolidated-v1/ev/index.html',
  './consolidated-v1/should-i-fix/',
  './consolidated-v1/should-i-fix/index.html',
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
      .then(keys => Promise.all(keys.filter(key => key.indexOf('appointment-companion-v') === 0 && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const update = fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  });

  event.waitUntil(update.catch(() => undefined));
  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then(cached => cached || update)
      .catch(() => request.mode === 'navigate' ? caches.match('./consolidated-v1/index.html') : Response.error())
  );
});
