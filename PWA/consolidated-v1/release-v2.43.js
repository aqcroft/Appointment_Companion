/* Appointment Companion v2.43 - trusted-device login persistence. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v2.43';

  function installVersion() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV243 === '1') return true;

    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV243 = '1';
    fresh.textContent = VERSION;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);

    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout');
      if (previous) previous.remove();

      var modal = document.createElement('div');
      modal.id = 'acVersionAbout';
      modal.className = 'ac-about open';
      modal.innerHTML =
        '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle">' +
          '<h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3>' +
          '<div style="font-size:11px;color:#6b6b76">Recent changes</div>' +
          '<ul>' +
            '<li>Verified Companion logins are now remembered on the trusted device across normal browser, phone and installed-PWA restarts.</li>' +
            '<li>Temporary Cloud or network failures no longer discard a previously verified device login.</li>' +
            '<li>Local-first customer work continues safely while Cloud reconnects.</li>' +
          '</ul>' +
          '<button class="ac-about-close" type="button">Close</button>' +
        '</div>';

      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove();
      });
      document.body.appendChild(modal);
    });

    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (installVersion() || ++tries > 220) clearInterval(timer);
  }, 50);
})(window);
