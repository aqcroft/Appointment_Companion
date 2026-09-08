(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    var script = document.currentScript || Array.from(document.scripts).find(function (s) {
      return /pwa-register\.js(?:$|\?)/.test(s.src || '');
    });
    var rootUrl = new URL('./', script && script.src ? script.src : document.baseURI);
    var swUrl = new URL('sw.js', rootUrl).href;
    var scopeUrl = rootUrl.href;

    navigator.serviceWorker.register(swUrl, { scope: scopeUrl }).catch(function () {
      // Install support is a convenience; the tool must still work without it.
    });
  });
})();
