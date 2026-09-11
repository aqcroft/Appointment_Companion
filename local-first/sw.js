const CACHE_NAME = 'appointment-companion-local-first-v5';
const APP_SHELL = [
  './', './index.html', './companion_local_first.html', './manifest.webmanifest',
  './pwa-register.js', './tariff-fetch-local-first-v1.js',
  './device-identity-v1.js', './companion-bridge-v1.js', './local-customer-store-v1.js',
  './shell-pilot-v1.js', './local-first-controller-v1.js', './specialist-launcher-v1.js', './specialists-v1.js',
  './ev/', './ev/index.html', './ev-bridge-pilot-v1.js', './ev-cloud-share-v1.js', './specialist-share-v1.js',
  '../cloud-client-v1.js', '../tariff-status.js', '../tariff-cache-v1.js',
  '../cloud/status-icons/cloud-ok.svg', '../cloud/status-icons/cloud-warn.svg',
  '../cloud/status-icons/desktop-ok.svg', '../cloud/status-icons/desktop-warn.svg',
  '../cloud/status-icons/mobile-ok.svg', '../cloud/status-icons/mobile-warn.svg',
  '../v16c-ev.html', '../v13-ev.js', '../v16b-hero.js', '../v14-ev.css', '../v15-ev.css',
  '../v15-freshness.js', '../v16c-ev.css', '../v16c-sharing.js', '../v16c-table.js',
  '../app-icon.svg', '../app-icon-192.png', '../app-icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(APP_SHELL);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key.indexOf('appointment-companion-local-first-') === 0 && key !== CACHE_NAME;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  var update = fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); }));
    }
    return response;
  });
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(function (cached) {
    if (cached) { event.waitUntil(update.catch(function () {})); return cached; }
    return update;
  }).catch(function () {
    if (request.mode === 'navigate') {
      return caches.match(url.pathname.indexOf('/local-first/ev/') !== -1 ? './ev/index.html' : './index.html');
    }
    return Response.error();
  }));
});
