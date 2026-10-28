/* Appointment Companion v2.66.7: Partner-only Should I Fix mode selector.
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
  // Keep one document per customer mode: hidden iframes preserve manual inputs.
  var renewalFrame = global.document.createElement('iframe');
  renewalFrame.id='acRenewalFrame';
  renewalFrame.title='Should I Fix - existing customer renewal comparison';
  renewalFrame.style.display='none';
  renewalFrame.setAttribute('aria-hidden','true');
  frame.insertAdjacentElement('afterend',renewalFrame);
  var originalTitle = global.document.title;
  var renewalBase = 'https://aqcroft.github.io/ShouldIFix/renewal-builder-v1.html';
  var ui = global.document.createElement('nav');
  ui.id = 'acFixCustomerMode';
  ui.setAttribute('aria-label', 'Should I Fix comparison type');
  ui.innerHTML = '<button type="button" data-fix-mode="current" aria-pressed="true">Prospective customers</button>' +
    '<button type="button" data-fix-mode="existing" aria-pressed="false">Existing customers</button>';
  var style = global.document.createElement('style');
  style.id = 'acFixCustomerModeStyles';
  style.textContent = [
    /* Align with the renewal builder's 760px wrapper minus 16px on each side.
       It must not stretch across the entire desktop viewport. */
    '#acFixCustomerMode{box-sizing:border-box;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));',
    'gap:5px;width:calc(100% - 32px);max-width:728px;margin:10px auto 6px;padding:5px;',
    'border:1px solid #e1d7ed;border-radius:14px;background:#fff;',
    'box-shadow:0 2px 8px rgba(49,28,87,.05);flex:0 0 auto}',
    '#acFixCustomerMode button{box-sizing:border-box;min-width:0;min-height:40px;',
    'padding:9px 11px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.25;border:1px solid transparent;border-radius:10px;',
    'background:#faf8fd;color:#4b3578;font:800 13px system-ui;cursor:pointer;',
    'transition:background .14s ease,border-color .14s ease}',
    '#acFixCustomerMode button[aria-pressed="true"]{border-color:#553694;',
    'background:#553694;color:#fff;box-shadow:0 1px 5px rgba(49,28,87,.12)}',
    '#acFixCustomerMode button:focus-visible{outline:3px solid #ad86dc;outline-offset:2px}',
    '@media(max-width:480px){#acFixCustomerMode{width:calc(100% - 32px);margin:7px auto 3px;',
    'padding:4px;gap:4px}#acFixCustomerMode button{font-size:12px;',
    'min-height:43px;padding:7px 5px}}'
  ].join('');
  global.document.head.appendChild(style);
  bar.insertAdjacentElement('afterend', ui);

  function existingUrl() {
    var url = new URL(renewalBase);
    url.searchParams.set('existing', '1');
    url.searchParams.set('ui', '2.66.7'); // presentation cache token, no quote changes
    // Carry the original appointment's region and usage, not manual energy
    // rates, tariff guesses or potentially sensitive partner/customer data.
    var original = new URL(legacySrc, global.location.href).searchParams;
    ['r', 'e', 'g'].forEach(function (key) {
      var value = original.get(key);
      if (value !== null && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0) url.searchParams.set(key, value);
    });
    return url.href;
  }

  var note = global.document.getElementById('usageNote');
  var current = 'current';
  function setMode(next, updateLocation) {
    if (next !== 'current' && next !== 'existing') return;
    if (next === current && frame.src) return;
    current = next;
    // The prospective-only Standalone calculator note is misleading during renewal.
    if (note && note.style) note.style.display = next === 'existing' ? 'none' : '';
    ui.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.fixMode === next));
    });
    if (next === 'existing') {
      frame.style.display='none';
      frame.setAttribute('aria-hidden','true');
      renewalFrame.style.display='block';
      renewalFrame.removeAttribute('aria-hidden');
      if(!renewalFrame.src)renewalFrame.src=existingUrl();
      global.document.title = 'Should I Fix - Existing Customers | Companion v2.66.7';
    } else {
      renewalFrame.style.display='none';
      renewalFrame.setAttribute('aria-hidden','true');
      frame.style.display='block';
      frame.removeAttribute('aria-hidden');
      global.document.title = originalTitle;
    }
    var heading = bar.querySelector('.title');
    if (heading) heading.textContent = next === 'existing' ?
      '📈 Should I Fix - Existing Customers' : '📈 Should I Fix - Prospective Customers';
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
  global.AppointmentCompanionFixModes = { setMode: setMode, version: 'v2.66.7', renewalFrame: renewalFrame };
  if (params.get('mode') === 'existing') setMode('existing', false);
})(window);
