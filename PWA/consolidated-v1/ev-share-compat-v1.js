/* Compatibility bridge: linked EV journeys must use the consolidated Cloud share.
   The donor v16C still owns #createShareBtn for standalone/legacy use, so intercept
   that button only when the Cloud-backed .evCloudShare action is present. */
(function () {
  'use strict';

  function toast(message) {
    var el = document.getElementById('shareToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  function wire() {
    var legacy = document.getElementById('createShareBtn');
    if (!legacy || legacy.dataset.acCloudShareBridge === '1') return !!legacy;
    legacy.dataset.acCloudShareBridge = '1';
    legacy.addEventListener('click', function (event) {
      var cloud = document.querySelector('.evCloudShare');
      if (!cloud) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toast('Share is still loading - please try again.');
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      cloud.click();
    }, true);
    return true;
  }

  if (wire()) return;
  var attempts = 0;
  var timer = setInterval(function () {
    if (wire() || ++attempts > 120) clearInterval(timer);
  }, 50);
})();