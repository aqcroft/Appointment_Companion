/* Should I Fix integration shim v1 - isolated cloud-test copy */
(function (global) {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  function ensureButton() {
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

  function ensureRegistered() {
    const registry = global.AppointmentCompanionSpecialists;
    if (!registry || typeof registry.register !== 'function') return false;
    registry.register({
      tool_id: 'fix',
      label: 'Should I Fix?',
      emoji: '📈',
      url: '../cloud-test/should-i-fix-pilot-v2.html',
      description: 'Compare this customer\'s usage against the price cap and UW fixed tariffs.'
    });
    return true;
  }

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    const buttonReady = ensureButton();
    const registryReady = ensureRegistered();
    if ((buttonReady && registryReady) || attempts > 80) clearInterval(timer);
  }, 50);
})(window);
