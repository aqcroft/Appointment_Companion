/* Cold Outreach standalone PWA - release 1.3.0 (14th Oct 2026).
 * Only cache this app's shell. Never cache CRM requests, attachments, credentials or third-party APIs.
 */
const CACHE_NAME = 'cold-outreach-shell-v1.3.0';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './assets/icon.svg', './assets/icon-192.svg', './assets/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('cold-outreach-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)));
      }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (/\.(?:svg|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request, {ignoreSearch:true}).then(cached => cached || fetch(request)));
  }
});
