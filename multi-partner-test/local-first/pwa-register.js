(function () {
  'use strict';
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  var scriptUrl = document.currentScript && document.currentScript.src;
  addEventListener('load', function () {
    var workerUrl = new URL('sw.js', scriptUrl || location.href);
    var scopeUrl = new URL('./', scriptUrl || location.href);
    navigator.serviceWorker.register(workerUrl.href, { scope: scopeUrl.pathname }).catch(function (error) {
      console.warn('Local-first service worker registration failed:', error);
    });
  });
})();
