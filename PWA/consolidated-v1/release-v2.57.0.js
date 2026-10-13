/* v2.57.0 - non-blocking Cloud status, reliable specialist navigation, EV rate transparency and app sharing. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.57.0',
    date: '13th Oct 2026',
    summary: 'Reliable navigation, clearer EV rates and Share app link',
    changes: [
      'Main Companion EV and Should I Fix buttons now navigate directly through the registered local customer hand-off, even if background UI elements have been refreshed.',
      'Background Cloud health checks no longer open a full-screen warning over an appointment. Cloud problems remain visible in the Status menu and sync still retries normally.',
      'Tapping either EV overnight or daytime card opens one panel containing both live UW EV unit rates and the single daily standing charge.',
      'The Companion menu now has Share app link, with a clean URL and optional device sharing, separate from customer-summary sharing.',
      'Customer profile data, first-save-to-Cloud rules and all tariff calculations are unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2570 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2570 = '1';
    fresh.textContent = meta.version;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + meta.version);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout');
      if (previous) previous.remove();
      var modal = document.createElement('div');
      modal.id = 'acVersionAbout';
      modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion ' + meta.version + '</h3><div style="font-size:11px;color:#6b6b76">' + meta.date + ' · ' + meta.summary + '</div><ul><li>' + meta.changes.join('</li><li>') + '</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (event) { if (event.target === modal || event.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0, timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
