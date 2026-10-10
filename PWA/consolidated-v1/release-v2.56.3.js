/* v2.56.3: clearer Cloud authentication and disconnect action. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.56.3',
    date: '10th Oct 2026',
    summary: 'East Midlands default for new customer profiles',
    changes: [
      'New customer profiles default to East Midlands (electricity region 11), including the first blank profile.',
      'Existing customer regions remain unchanged; nothing is retroactively written into older customer records.',
      'Should I Fix and EV Companion inherit the current saved region through the existing local customer hand-off.',
      'Universal Save behaviour is unchanged: Main includes already-stored specialist state, but Should I Fix iframe adjustments are not yet a full customer-profile save.',
      'Preserves local draft first-save protection and quiet EV background autosaving.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2563 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2563 = '1';
    fresh.textContent = meta.version;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label','About Appointment Companion ' + meta.version);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout');
      if (previous) previous.remove();
      var modal = document.createElement('div');
      modal.id = 'acVersionAbout';
      modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion ' + meta.version + '</h3><div style="font-size:11px;color:#6b6b76">' + meta.date + ' · ' + meta.summary + '</div><ul><li>' + meta.changes.join('</li><li>') + '</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries = 0, timer = setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
