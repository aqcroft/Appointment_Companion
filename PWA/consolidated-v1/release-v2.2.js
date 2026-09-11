/* Appointment Companion v2.2 release metadata. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION = 'v2.2';
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old || old.dataset.acReleaseV22 === '1') return !!old;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV22 = '1';
    fresh.textContent = VERSION;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout'); if (previous) previous.remove();
      var modal = document.createElement('div'); modal.id = 'acVersionAbout'; modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>Moved tariff, Cloud and device health out of the appointment screen into a stacked Status section in the Companion menu.</li><li>Added separate 📌 Fixed, 📈 Variable and 🚙 EV tariff status rows, with stale tariff data still interrupting prominently.</li><li>Cloud now uses traffic-light status and automatically retries pending local changes, with a session-only option to continue working locally when attention is needed.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }
  if (install()) return;
  var tries = 0, timer = setInterval(function () { if (install() || ++tries > 160) clearInterval(timer); }, 50);
})();
