const CACHE_NAME = 'appointment-companion-consolidated-v2-42-mobile-20260925';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './pwa-register.js', './tariff-fetch-v1.js', './tariff-health-v2.42.js', './notification-preferences-v1.js',
  './canonical-state-v1.js', './canonical-controls-v1.js', './service-ui-polish-v1.js', './spring-clean-v2.js', './release-v2.3.js', './release-v2.4.js', './release-v2.41.js', './release-v2.42.js', './persistence-guard-v2.42.js', './local-customer-store-v2.js',
  './consolidated-controller-v1.js', './share-policy-v1.js', './specialist-share-v1.js',
  './specialist-launcher-v1.js', './specialist-features-v1.js', './specialist-context-nav-v1.js', './fix-share-gate-v1.js',
  './ev/', './ev/index.html', './ev-share-adapter-v1.js', './ev-share-compat-v1.js', './ev-share-view-v1.js', './ev-customer-contact-v1.js', './ev-return-v1.js',
  './should-i-fix/', './should-i-fix/index.html',
  '../cloud/companion_cloud_pilot.html', '../cloud/tariff-status.js', '../cloud/device-identity-v1.js', '../cloud/companion-bridge-v1.js',
  '../cloud-test/should-i-fix-pilot-v2.html',
  '../../cloud-client-v1.js', '../../local-first/shell-pilot-v1.js', '../../local-first/ev-bridge-pilot-v1.js',
  '../v16c-ev.html', '../tariff-cache-v1.js', '../v13-ev.js', '../v16b-hero.js', '../v14-ev.css', '../v15-ev.css',
  '../v15-freshness.js', '../v16c-ev.css', '../v16c-sharing.js', '../v16c-table.js',
  '../app-icon.svg', '../app-icon-192.png', '../app-icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(SHELL);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return (key.indexOf('appointment-companion-consolidated-v1-') === 0 || key.indexOf('appointment-companion-consolidated-v2-') === 0) && key !== CACHE_NAME;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

function cacheResponse(request, response) {
  if (response && response.ok) {
    var copy = response.clone();
    caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
  }
  return response;
}

function navigationFallback(url) {
  if (url.pathname.indexOf('/ev/') !== -1) return caches.match('./ev/index.html');
  if (url.pathname.indexOf('/should-i-fix/') !== -1) return caches.match('./should-i-fix/index.html');
  return caches.match('./index.html');
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  /* Navigations are network-first so a reopened installed PWA picks up a new
     shell immediately when online. */
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(function (response) {
      return cacheResponse(request, response);
    }).catch(function () { return navigationFallback(url); }));
    return;
  }

  /* Honour the full URL, including ?v=. Previous ignoreSearch behaviour could
     serve an older script even after its version token changed. */
  var update = fetch(request).then(function (response) {
    return cacheResponse(request, response);
  });
  event.respondWith(caches.match(request).then(function (cached) {
    if (cached) {
      event.waitUntil(update.catch(function () {}));
      return cached;
    }
    return update;
  }).catch(function () { return Response.error(); }));
});