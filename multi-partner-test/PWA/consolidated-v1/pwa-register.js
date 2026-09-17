(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var script = document.currentScript;
  window.addEventListener('load', function () {
    var root = new URL('./', script && script.src ? script.src : location.href);
    var swUrl = new URL('sw.js', root).href;
    navigator.serviceWorker.register(swUrl, { scope: root.href, updateViaCache: 'none' })
      .then(function (registration) { return registration.update(); })
      .catch(function () {});
  });
})();