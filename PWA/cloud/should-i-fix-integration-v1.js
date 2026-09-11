/* Live Should I Fix + Partner Earnings shortcuts */
(function (global) {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const EARNINGS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';

  function ensureFixButton() {
    if (document.getElementById('cloudCompanionFix')) return true;
    const ev = document.getElementById('cloudCompanionEv');
    if (!ev || !ev.parentNode) return false;

    const btn = document.createElement('button');
    btn.className = 'cloudicon cloud-top-shortcut';
    btn.type = 'button';
    btn.id = 'cloudCompanionFix';
    btn.dataset.cloudAction = 'fix';
    btn.title = 'Should I Fix?';
    btn.setAttribute('aria-label', 'Should I Fix?');
    btn.textContent = '📈';
    ev.insertAdjacentElement('afterend', btn);
    return true;
  }

  function ensureEarningsButton() {
    if (document.getElementById('cloudCompanionEarnings')) return true;
    const fix = document.getElementById('cloudCompanionFix');
    const ev = document.getElementById('cloudCompanionEv');
    const anchor = fix || ev;
    if (!anchor || !anchor.parentNode) return false;

    const btn = document.createElement('button');
    btn.className = 'cloudicon cloud-top-shortcut';
    btn.type = 'button';
    btn.id = 'cloudCompanionEarnings';
    btn.title = 'Partner Earnings Tool';
    btn.setAttribute('aria-label', 'Partner Earnings Tool');
    btn.textContent = '💷';
    btn.addEventListener('click', function () {
      global.location.assign(EARNINGS_URL);
    });
    anchor.insertAdjacentElement('afterend', btn);
    return true;
  }

  function ensureRegistered() {
    const registry = global.AppointmentCompanionSpecialists;
    if (!registry || typeof registry.register !== 'function') return false;
    registry.register({
      tool_id: 'fix',
      label: 'Should I Fix?',
      emoji: '📈',
      url: './should-i-fix-pilot-v2.html',
      description: 'Compare this customer\'s usage against the price cap and UW fixed tariffs.'
    });
    return true;
  }

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    const fixReady = ensureFixButton();
    const earningsReady = ensureEarningsButton();
    const registryReady = ensureRegistered();
    if ((fixReady && earningsReady && registryReady) || attempts > 80) clearInterval(timer);
  }, 50);
})(window);
