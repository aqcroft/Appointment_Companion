(function () {
  'use strict';
  var params = new URL(location.href).searchParams;
  var encoded = params.get('ac_context');
  var returnUrl = params.get('ac_return');
  var context = null;
  if (encoded) {
    try { context = JSON.parse(decodeURIComponent(escape(atob(encoded)))); } catch (_) {}
  }

  function emit(id, type) {
    var element = document.getElementById(id);
    if (element) element.dispatchEvent(new Event(type || 'input', { bubbles: true }));
  }

  function apply() {
    if (!context) return;
    var region = document.getElementById('region');
    if (region && context.region) { region.value = String(context.region); emit('region', 'change'); }
    if (context.annualElectricityKwh) {
      var custom = document.querySelector('#usagePills button[data-use="custom"]');
      if (custom) custom.click();
      var house = document.getElementById('houseKwh');
      if (house) { house.value = Math.round(context.annualElectricityKwh); emit('houseKwh', 'input'); }
    }
    if (context.personName) {
      var shareName = document.getElementById('shareCustomerName');
      if (shareName) shareName.value = context.personName;
    }
    if (context.dayKwh || context.nightKwh) {
      var toggle = document.getElementById('e7ActualToggle');
      var wrap = document.getElementById('e7ActualWrap');
      if (toggle && wrap && wrap.hidden) toggle.click();
      var day = document.getElementById('e7DayActualInput'), night = document.getElementById('e7NightActualInput');
      if (day) { day.value = Math.round(context.dayKwh || 0); emit('e7DayActualInput', 'change'); }
      if (night) { night.value = Math.round(context.nightKwh || 0); emit('e7NightActualInput', 'change'); }
    }
  }

  function captureReturn() {
    if (!context || !context.localId) return;
    function numeric(id) { var el = document.getElementById(id), n = Number(el && el.value); return Number.isFinite(n) ? n : 0; }
    var region = document.getElementById('region');
    var payload = {
      tool: 'ev', localId: context.localId, savedAt: new Date().toISOString(),
      state: {
        region: region ? region.value : context.region,
        annualElectricityKwh: numeric('houseKwh'),
        dayKwh: numeric('e7DayActualInput'),
        nightKwh: numeric('e7NightActualInput'),
        annualMileage: numeric('miles'),
        awayPct: numeric('awayPct'),
        awayRate: numeric('awayRate')
      }
    };
    try { localStorage.setItem('apptCompanionV3SpecialistReturn', JSON.stringify(payload)); } catch (_) {}
  }

  if (returnUrl) {
    var back = document.createElement('a');
    back.href = returnUrl;
    back.textContent = '← Return to Appointment Companion';
    back.style.cssText = 'position:sticky;top:0;z-index:100;display:block;padding:10px 14px;text-align:center;background:#26164f;color:#fff;font:700 13px system-ui;text-decoration:none';
    document.body.insertBefore(back, document.body.firstChild);
    back.addEventListener('click', captureReturn);
  }

  window.addEventListener('pagehide', captureReturn);

  var observer = new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.tagName === 'SCRIPT' && /v13-ev\.js/.test(node.src || '')) {
          node.addEventListener('load', function () { setTimeout(apply, 0); }, { once: true });
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true });
  setTimeout(apply, 1200);
})();
