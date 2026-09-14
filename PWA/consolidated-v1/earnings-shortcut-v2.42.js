/* Appointment Companion v2.42 - replace redundant Cashback Card toolbar shortcut with Partner Earnings. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var EARNINGS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';

  function install() {
    var old = document.querySelector('#acSharedToolstrip .ac-toolbtn[aria-label="Cashback Card Companion"]');
    if (!old) return false;
    if (old.dataset.acEarningsShortcut === '1') return true;

    var button = old.cloneNode(false);
    button.dataset.acEarningsShortcut = '1';
    button.className = 'ac-toolbtn';
    button.textContent = '💵';
    button.title = 'Partner Earnings - First 60 Days';
    button.setAttribute('aria-label', 'Partner Earnings - First 60 Days');
    button.removeAttribute('disabled');
    button.removeAttribute('aria-busy');
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(EARNINGS_URL);
    }, true);

    old.parentNode.replaceChild(button, old);
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (install() || ++tries > 160) clearInterval(timer);
  }, 50);
})();
