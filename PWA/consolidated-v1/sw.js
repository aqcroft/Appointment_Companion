const CACHE_NAME = 'appointment-companion-consolidated-v2-2';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './pwa-register.js', './tariff-fetch-v1.js',
  './canonical-state-v1.js', './canonical-controls-v1.js', './service-ui-polish-v1.js', './spring-clean-v2.js', './release-v2.2.js', './local-customer-store-v2.js',
  './consolidated-controller-v1.js', './share-policy-v1.js', './specialist-share-v1.js',
  './specialist-launcher-v1.js', './specialist-features-v1.js',
  './ev/', './ev/index.html', './ev-share-adapter-v1.js', './ev-share-view-v1.js', './ev-return-v1.js',
  './should-i-fix/', './should-i-fix/index.html',
  '../cloud/companion_cloud_pilot.html', '../cloud/tariff-status.js', '../cloud/device-identity-v1.js', '../cloud/companion-bridge-v1.js',
  '../cloud-test/should-i-fix-pilot-v2.html',
  '../../cloud-client-v1.js', '../../local-first/shell-pilot-v1.js', '../../local-first/ev-bridge-pilot-v1.js',
  '../v16c-ev.html', '../tariff-cache-v1.js', '../v13-ev.js', '../v16b-hero.js', '../v14-ev.css', '../v15-ev.css',
  '../v15-freshness.js', '../v16c-ev.css', '../v16c-sharing.js', '../v16c-table.js',
  '../app-icon.svg', '../app-icon-192.png', '../app-icon-512.png'
];
self.addEventListener('install', function (event) { event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (event) { event.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (key) { return (key.indexOf('appointment-companion-consolidated-v1-') === 0 || key.indexOf('appointment-companion-consolidated-v2-') === 0) && key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (event) {
  var request = event.request, url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  var update = fetch(request).then(function (response) { if (response && response.ok) { var copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); })); } return response; });
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(function (cached) { if (cached) { event.waitUntil(update.catch(function () {})); return cached; } return update; }).catch(function () { if (request.mode !== 'navigate') return Response.error(); if (url.pathname.indexOf('/ev/') !== -1) return caches.match('./ev/index.html'); if (url.pathname.indexOf('/should-i-fix/') !== -1) return caches.match('./should-i-fix/index.html'); return caches.match('./index.html'); }));
});
