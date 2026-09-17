/* Appointment Companion v2.42 - replace redundant Cashback Card toolbar shortcut with Partner Earnings. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var EARNINGS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';

  function firstName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').split(' ')[0].slice(0, 40);
  }

  function currentCustomerName() {
    var input = document.getElementById('customerName');
    if (input && input.value) return firstName(input.value);
    try {
      if (window.AppointmentCompanionCanonical && typeof window.AppointmentCompanionCanonical.capture === 'function') {
        var snap = window.AppointmentCompanionCanonical.capture();
        return firstName(snap && snap.canonical && snap.canonical.customerName);
      }
    } catch (_) {}
    return '';
  }

  function earningsUrl() {
    var url = new URL(EARNINGS_URL);
    var name = currentCustomerName();
    if (name) url.searchParams.set('pn', name);
    return url.href;
  }

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
      window.location.assign(earningsUrl());
    }, true);

    old.parentNode.replaceChild(button, old);
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (install() || ++tries > 160) clearInterval(timer);
  }, 50);
})();
