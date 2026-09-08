/* Public EV Companion Cloud share renderer v1
   Reads an immutable sanitised EV share snapshot using only the share token.
   No Partner authentication is used or exposed here.
*/
(function (global) {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  let startState = null;

  function click(selector) {
    const el = document.querySelector(selector);
    if (el) el.click();
  }

  function trigger(el, type) {
    if (!el) return;
    el.dispatchEvent(new Event(type || 'input', { bubbles: true }));
  }

  function setInput(id, value, type) {
    const el = $(id);
    if (!el || value === undefined || value === null) return;
    el.value = value;
    trigger(el, type || 'input');
  }

  function setHomeUsage(kwh) {
    if (kwh === null || kwh === undefined || !Number.isFinite(Number(kwh))) return;
    document.querySelectorAll('#usagePills button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.use === 'custom');
    });
    const wrap = $('customWrap');
    if (wrap) wrap.classList.add('show');
    const el = $('houseKwh');
    if (el) {
      el.value = Number(kwh);
      if (typeof el.oninput === 'function') el.oninput();
      else trigger(el, 'input');
    }
  }

  function applyState(snapshot) {
    const state = snapshot && snapshot.ev_state ? snapshot.ev_state : {};

    if (state.vehicle_efficiency_mi_kwh != null) {
      const vehicle = document.querySelector('#vehiclePills .vpill[data-eff="' + state.vehicle_efficiency_mi_kwh + '"]');
      if (vehicle) vehicle.click();
    }

    if (state.annual_mileage != null) setInput('miles', state.annual_mileage, 'input');

    if (state.uw_services != null) {
      const tier = Math.max(0, Math.min(2, Number(state.uw_services) - 1));
      click('#serviceButtons button[data-tier="' + tier + '"]');
    }

    if (state.region != null && $('region')) {
      $('region').value = String(state.region);
      trigger($('region'), 'change');
    }

    if (state.away_pct != null) setInput('awayPct', state.away_pct, 'input');
    if (state.away_rate_p_kwh != null) setInput('awayRate', state.away_rate_p_kwh, 'input');
    if (state.efficiency_override_mi_kwh != null) setInput('effOverride', state.efficiency_override_mi_kwh, 'input');
    if (state.known_ev_kwh != null) setInput('knownEvKwh', state.known_ev_kwh, 'input');

    if (state.dual_fuel !== undefined && state.dual_fuel !== null && $('dualFuel')) {
      $('dualFuel').checked = !!state.dual_fuel;
      trigger($('dualFuel'), 'change');
    }

    if (state.ev_offpeak_pct != null) setInput('evTimingSlider', state.ev_offpeak_pct, 'input');
    if (state.e7_offpeak_pct != null) setInput('e7TimingSlider', state.e7_offpeak_pct, 'input');

    if (state.e7_actual) {
      if ($('e7ActualWrap') && $('e7ActualWrap').hidden) click('#e7ActualToggle');
      if (state.e7_day_kwh != null) setInput('e7DayActualInput', state.e7_day_kwh, 'change');
      if (state.e7_night_kwh != null) setInput('e7NightActualInput', state.e7_night_kwh, 'change');
    }

    if (state.stress_pct != null) click('#stressButtons button[data-stress="' + Number(state.stress_pct) + '"]');
    if (state.period) click('#periodToggle button[data-period="' + state.period + '"]');

    setHomeUsage(snapshot.electricity_usage_kwh != null ? snapshot.electricity_usage_kwh : state.home_usage_kwh);

    const name = String(snapshot.customer_name || '').trim();
    if ($('shareSetup')) $('shareSetup').hidden = true;
    if ($('customerWelcome')) $('customerWelcome').hidden = false;
    if ($('welcomeName')) $('welcomeName').textContent = name || 'there';

    if ($('resetSharedBtn')) {
      $('resetSharedBtn').onclick = function () {
        applyState(startState);
        showToast('Starting figures restored');
      };
    }
  }

  function showToast(msg) {
    const el = $('shareToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { el.classList.remove('show'); }, 2300);
  }

  function showFatal(message) {
    const blocker = $('cloudShareBlocker');
    if (blocker) blocker.remove();

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fffbe3;display:grid;place-items:center;padding:24px;font:600 15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#26164f;text-align:center;';
    const wrap = document.createElement('div');
    const icon = document.createElement('div');
    const text = document.createElement('div');
    icon.style.cssText = 'font-size:34px;margin-bottom:10px;';
    icon.textContent = '⚠️';
    text.textContent = String(message || 'This share could not be loaded.');
    wrap.appendChild(icon);
    wrap.appendChild(text);
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
  }

  async function readShare(token) {
    const shareApi = global.AppointmentCompanionSpecialistShare;
    if (!shareApi || typeof shareApi.read !== 'function') throw new Error('Cloud share reader is unavailable.');
    const data = await shareApi.read('ev', token);
    return data.snapshot || {};
  }

  function waitForControls(snapshot) {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      const house = $('houseKwh');
      const ready = house && typeof house.oninput === 'function' && document.querySelector('#serviceButtons button');
      if (ready) {
        clearInterval(timer);
        startState = JSON.parse(JSON.stringify(snapshot || {}));
        applyState(startState);
        const blocker = $('cloudShareBlocker');
        if (blocker) blocker.remove();
      } else if (attempts > 150) {
        clearInterval(timer);
        showFatal('The EV Companion took too long to load. Please refresh and try again.');
      }
    }, 100);
  }

  async function boot() {
    const token = new URL(global.location.href).searchParams.get('s') || '';
    if (!token) return showFatal('This EV Companion share link is missing its share code.');

    try {
      const snapshot = await readShare(token);
      waitForControls(snapshot);
    } catch (err) {
      showFatal((err && err.message) || String(err));
    }
  }

  boot();
})(window);
