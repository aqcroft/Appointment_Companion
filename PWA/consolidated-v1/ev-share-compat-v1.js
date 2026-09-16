/* Compatibility bridge: linked EV journeys must use the consolidated Cloud share.
   Standalone EV mode may still use the original v16C personalised-link button. */
(function () {
  'use strict';

  function linkedJourney() {
    try {
      return !!(document.body && document.body.dataset && document.body.dataset.companionTool === 'ev') ||
        new URL(location.href).searchParams.has('ac_launch');
    } catch (_) {
      return false;
    }
  }

  function toast(message) {
    var el = document.getElementById('shareToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function routeToCloud(event) {
    if (!linkedJourney()) return;
    var target = event.target && event.target.closest
      ? event.target.closest('#createShareBtn,.ac-toolbtn[aria-label="Share"]')
      : null;
    if (!target) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    var cloud = document.querySelector('.evCloudShare');
    if (!cloud) {
      toast('Share is still loading - please try again in a moment.');
      return;
    }
    cloud.click();
  }

  /* Capture at document level so this also covers toolbar buttons created later. */
  document.addEventListener('click', routeToCloud, true);
})();