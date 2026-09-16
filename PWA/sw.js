const CACHE_NAME = 'appointment-companion-v17';
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
  './consolidated-v1/release-v2.3.js',
  './consolidated-v1/release-v2.4.js',
  './consolidated-v1/release-v2.41.js',
  './consolidated-v1/release-v2.42.js',
  './consolidated-v1/persistence-guard-v2.42.js',
  './consolidated-v1/local-customer-store-v2.js',
  './consolidated-v1/consolidated-controller-v1.js',
  './consolidated-v1/share-policy-v1.js',
  './consolidated-v1/specialist-share-v1.js',
  './consolidated-v1/specialist-launcher-v1.js',
  './consolidated-v1/specialist-features-v1.js',
  './consolidated-v1/fix-share-gate-v1.js',
  './consolidated-v1/ev/',
  './consolidated-v1/ev/index.html',
  './consolidated-v1/ev-share-adapter-v1.js',
  './consolidated-v1/ev-share-compat-v1.js',
  './consolidated-v1/ev-share-view-v1.js',
  './consolidated-v1/ev-customer-contact-v1.js',
  './consolidated-v1/ev-return-v1.js',
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

function cacheResponse(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Always prefer the current network document when online. This prevents an
     installed PWA from reopening an older consolidated shell indefinitely. */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => cacheResponse(request, response))
        .catch(() => caches.match('./consolidated-v1/index.html'))
    );
    return;
  }

  const update = fetch(request).then(response => cacheResponse(request, response));
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) {
          event.waitUntil(update.catch(() => undefined));
          return cached;
        }
        return update;
      })
      .catch(() => Response.error())
  );
});