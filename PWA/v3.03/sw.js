const CACHE = 'appointment-companion-v303-20260921-11-preview';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './assets/app.css',
  './assets/icons/app-icon.svg', './assets/icons/app-icon-192.png', './assets/icons/app-icon-512.png',
  './js/app.js', './js/config/version.js', './js/config/tools.js',
  './js/state/canonical-state.js', './js/state/migrations.js', './js/state/customer-store.js',
  './js/state/cloud-client.js', './js/state/cloud-sync.js', './js/state/reconciliation.js',
  './js/rules/uw-rules-2026-10-01.js', './js/appointment/calculations.js', './js/appointment/completeness.js', './js/appointment/upgrade-preview.js',
  './js/energy/split-helper.js', './js/energy/indicative-cost.js',
  './js/summary/share-policy.js', './js/summary/share-data.js', './js/summary/history.js',
  './js/shell/unsaved-work-guard.js', './js/specialists/launcher.js', './js/data/tariff-client.js',
  './tools/ev/index.html', './tools/ev/v14-ev.css', './tools/ev/v15-ev.css', './tools/ev/v16c-ev.css',
  './tools/ev/v16c-sharing.js', './tools/ev/tariff-cache-v1.js', './tools/ev/v13-ev.js',
  './tools/ev/v16b-hero.js', './tools/ev/v16c-table.js', './tools/ev/v15-freshness.js', './tools/ev/v3-context.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('appointment-companion-v303-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, response.clone())));
      return response;
    }).catch(() => caches.match(url.pathname.includes('/tools/ev/') ? './tools/ev/index.html' : './index.html')));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, response.clone())));
    return response;
  }).catch(() => caches.match(request, { ignoreSearch: true })));
});
