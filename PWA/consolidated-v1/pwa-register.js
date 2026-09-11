(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var script = document.currentScript;
  window.addEventListener('load', function () {
    var root = new URL('./', script && script.src ? script.src : location.href);
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.href }).catch(function () {});
  });
})();
