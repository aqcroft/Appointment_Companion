/* Appointment Companion v2.66.0: Partner-only Should I Fix mode selector.
   The original calculator and existing shared links remain unchanged.
   Historical renewal runs inside the existing PWA specialist panel using
   the independently deployed, genuine UW historical tariff feed.
*/
(function (global) {
  'use strict';
  var params = new URL(global.location.href).searchParams;
  if (params.get('public') === '1' ||
      global.document.documentElement.classList.contains('shared-view') ||
      global.document.documentElement.classList.contains('view-mode')) return;

  var frame = global.document.getElementById('fixFrame');
  var bar = global.document.querySelector('.bar');
  if (!frame || !bar || global.document.getElementById('acFixCustomerMode')) return;

  var legacySrc = frame.src;
  var originalTitle = global.document.title;
  var renewalBase = 'https://aqcroft.github.io/ShouldIFix/renewal-builder-v1.html';
  var ui = global.document.createElement('nav');
  ui.id = 'acFixCustomerMode';
  ui.setAttribute('aria-label', 'Should I Fix comparison type');
  ui.innerHTML = '<button type="button" data-fix-mode="current" aria-pressed="true">Current tariffs</button>' +
    '<button type="button" data-fix-mode="existing" aria-pressed="false">Existing customer</button>';
  var style = global.document.createElement('style');
  style.id = 'acFixCustomerModeStyles';
  style.textContent = [
    '#acFixCustomerMode{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:8px 10px;',
    'background:#fff;border-bottom:1px solid #e6e2ef;flex:0 0 auto}',
    '#acFixCustomerMode button{min-width:0;min-height:42px;padding:8px 10px;border-radius:11px;',
    'border:1px solid #ddd1ef;background:#fff;color:#4b3578;font:750 13px system-ui;cursor:pointer}',
    '#acFixCustomerMode button[aria-pressed="true"]{border-color:#7a42c8;',
    'background:#f1e7ff;color:#46247c;box-shadow:inset 0 -2px 0 #7a42c8}',
    '#acFixCustomerMode button:focus-visible{outline:3px solid #ad86dc;outline-offset:2px}',
    '@media(max-width:400px){#acFixCustomerMode{gap:5px;padding:6px}',
    '#acFixCustomerMode button{font-size:12px;padding:8px 5px}}'
  ].join('');
  global.document.head.appendChild(style);
  bar.insertAdjacentElement('afterend', ui);

  function existingUrl() {
    var url = new URL(renewalBase);
    url.searchParams.set('renew', '1');
    // Carry the original appointment's region and usage, not manual energy
    // rates, tariff guesses or potentially sensitive partner/customer data.
    var original = new URL(legacySrc, global.location.href).searchParams;
    ['r', 'e', 'g'].forEach(function (key) {
      var value = original.get(key);
      if (value !== null && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) url.searchParams.set(key, value);
    });
    return url.href;
  }

  var current = 'current';
  function setMode(next, updateLocation) {
    if (next !== 'current' && next !== 'existing') return;
    if (next === current && frame.src) return;
    current = next;
    ui.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.fixMode === next));
    });
    if (next === 'existing') {
      frame.src = existingUrl();
      frame.title = 'Should I Fix - existing customer renewal comparison';
      global.document.title = 'Should I Fix - Existing Customers | Companion v2.66.0';
    } else {
      frame.src = legacySrc;
      frame.title = 'Should I Fix current tariff calculator';
      global.document.title = originalTitle;
    }
    var heading = bar.querySelector('.title');
    if (heading) heading.textContent = next === 'existing' ?
      '📈 Should I Fix - Existing Customers' : '📈 Should I Fix?';
    if (updateLocation && global.history.replaceState) {
      var url = new URL(global.location.href);
      if (next === 'existing') url.searchParams.set('mode', 'existing');
      else url.searchParams.delete('mode');
      global.history.replaceState(global.history.state, '', url.href);
    }
  }
  ui.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-fix-mode]');
    if (button) setMode(button.dataset.fixMode, true);
  });
  global.addEventListener('popstate', function () {
    setMode(new URL(global.location.href).searchParams.get('mode') === 'existing' ?
      'existing' : 'current', false);
  });
  global.AppointmentCompanionFixModes = { setMode: setMode, version: 'v2.66.0' };
  if (params.get('mode') === 'existing') setMode('existing', false);
})(window);
