/* EV Companion Bridge pilot v1
   Implements the generic Companion Bridge contract for the EV specialist tool.
   v16C itself remains untouched.

   Specialist edits now autosave directly to the linked Cloud customer, so state
   survives browser Back, another device/session and a later return to EV.
*/
(function (global) {
  'use strict';

  const bridge = global.AppointmentCompanionBridge;
  const cloudSave = global.AppointmentCompanionSpecialistCloud;
  if (!bridge) return;

  const RETURN_SAVE_KEY = 'apptCompanionSpecialistReturnNeedsSaveV1';
  const launch = bridge.receive();
  if (!launch || launch.target_tool_id !== 'ev') return;

  const $ = function (id) { return document.getElementById(id); };
  const customer = launch.extra && launch.extra.customer ? launch.extra.customer : {};
  const journeyState = bridge.getToolState('ev');
  const cloudEvState = customer.ev_state || null;

  let hydrating = true;
  let dirty = false;
  let saving = false;
  let pendingSave = false;
  let saveTimer = null;
  let lastSavedFingerprint = '';

  function click(selector) {
    const el = document.querySelector(selector);
    if (el) el.click();
  }

  function trigger(el, type) {
    if (!el) return;
    el.dispatchEvent(new Event(type || 'input', { bubbles: true }));
  }

  function num(id) {
    const el = $(id);
    if (!el || el.value === '') return null;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : null;
  }

  function active(selector) {
    return document.querySelector(selector + '.on');
  }

  function setInput(id, value, type) {
    const el = $(id);
    if (!el || value === undefined || value === null) return;
    el.value = value;
    trigger(el, type || 'input');
  }

  function setCanonicalUsage(kwh) {
    if (kwh === null || kwh === undefined || !Number.isFinite(Number(kwh))) return;
    document.querySelectorAll('#usagePills button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.use === 'custom');
    });
    const customWrap = $('customWrap');
    if (customWrap) customWrap.classList.add('show');
    const house = $('houseKwh');
    if (house) {
      house.value = Number(kwh);
      if (typeof house.oninput === 'function') house.oninput();
      else trigger(house, 'input');
    }
  }

  function normaliseState(raw) {
    if (!raw || typeof raw !== 'object') return {};
    return {
      schema_version: raw.schema_version || 1,
      tool_version: raw.tool_version || '16C',
      vehicle_efficiency_mi_kwh: raw.vehicle_efficiency_mi_kwh != null ? raw.vehicle_efficiency_mi_kwh : raw.efficiency_mi_kwh,
      vehicle_icon: raw.vehicle_icon || raw.icon || '',
      annual_mileage: raw.annual_mileage != null ? raw.annual_mileage : raw.mileage,
      home_usage_kwh: raw.home_usage_kwh,
      uw_services: raw.uw_services,
      region: raw.region,
      ev_offpeak_pct: raw.ev_offpeak_pct,
      e7_offpeak_pct: raw.e7_offpeak_pct,
      e7_actual: raw.e7_actual,
      e7_day_kwh: raw.e7_day_kwh,
      e7_night_kwh: raw.e7_night_kwh,
      away_pct: raw.away_pct,
      away_rate_p_kwh: raw.away_rate_p_kwh,
      efficiency_override_mi_kwh: raw.efficiency_override_mi_kwh,
      known_ev_kwh: raw.known_ev_kwh,
      dual_fuel: raw.dual_fuel,
      period: raw.period,
      stress_pct: raw.stress_pct,
      updated_at: raw.updated_at || ''
    };
  }

  function timeOf(raw) {
    const t = Date.parse(raw && raw.updated_at ? raw.updated_at : '');
    return Number.isFinite(t) ? t : 0;
  }

  function newestStartingState() {
    const a = normaliseState(journeyState || {});
    const b = normaliseState(cloudEvState || {});
    if (!journeyState) return b;
    if (!cloudEvState) return a;
    return timeOf(b) > timeOf(a) ? b : a;
  }

  function applyState() {
    const state = newestStartingState();

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

    // Canonical Cloud home usage always wins over specialist experimentation.
    setCanonicalUsage(customer.electricity_usage_kwh);
  }

  function captureState() {
    const vehicle = active('#vehiclePills .vpill');
    const service = active('#serviceButtons button');
    const period = active('#periodToggle button');
    const stress = active('#stressButtons button');
    const e7Actual = $('e7ActualWrap') ? !$('e7ActualWrap').hidden : false;

    return {
      schema_version: 1,
      tool_version: '16C',
      vehicle_efficiency_mi_kwh: vehicle ? Number(vehicle.dataset.eff) : 3.2,
      vehicle_icon: vehicle ? String(vehicle.dataset.icon || '') : '🚙',
      annual_mileage: num('miles'),
      home_usage_kwh: num('houseKwh'),
      uw_services: service ? Number(service.dataset.tier) + 1 : 3,
      region: num('region'),
      ev_offpeak_pct: num('evTimingSlider'),
      e7_offpeak_pct: num('e7TimingSlider'),
      e7_actual: e7Actual,
      e7_day_kwh: e7Actual ? num('e7DayActualInput') : null,
      e7_night_kwh: e7Actual ? num('e7NightActualInput') : null,
      away_pct: num('awayPct'),
      away_rate_p_kwh: num('awayRate'),
      efficiency_override_mi_kwh: num('effOverride'),
      known_ev_kwh: num('knownEvKwh'),
      dual_fuel: $('dualFuel') ? !!$('dualFuel').checked : true,
      period: period ? period.dataset.period : 'month',
      stress_pct: stress ? Number(stress.dataset.stress || 0) : 0,
      updated_at: new Date().toISOString()
    };
  }

  function fingerprint(state) {
    const copy = Object.assign({}, state || {});
    delete copy.updated_at;
    return JSON.stringify(copy);
  }

  function setSaveUi(text, tone) {
    const el = $('evBridgeSaveState');
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'bad' ? '#c43b3b' : tone === 'warn' ? '#8a6400' : tone === 'good' ? '#1d7f45' : '#6b6b76';
  }

  async function saveNow(force) {
    if (hydrating) return;
    if (!cloudSave || typeof cloudSave.save !== 'function') {
      setSaveUi('⚠️ Cloud autosave unavailable', 'bad');
      return;
    }

    const state = captureState();
    const fp = fingerprint(state);
    if (!force && fp === lastSavedFingerprint) {
      dirty = false;
      setSaveUi('✓ Saved to Cloud', 'good');
      return;
    }

    if (saving) {
      pendingSave = true;
      return;
    }

    saving = true;
    dirty = true;
    setSaveUi('☁️ Saving…', '');
    const saveButton = $('evBridgeSaveNow');
    if (saveButton) saveButton.disabled = true;

    try {
      await cloudSave.save('ev', state, {
        appointment_state: launch.appointment_state,
        basket_url: launch.basket_url,
        legacy_ev_state: true
      });
      lastSavedFingerprint = fp;
      dirty = false;
      const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setSaveUi('✓ Saved to Cloud ' + time, 'good');
    } catch (err) {
      dirty = true;
      setSaveUi('⚠️ Not saved - ' + ((err && err.message) || String(err)), 'bad');
    } finally {
      saving = false;
      if (saveButton) saveButton.disabled = false;
      if (pendingSave) {
        pendingSave = false;
        setTimeout(function () { saveNow(false); }, 50);
      }
    }
  }

  function scheduleSave(delay) {
    if (hydrating) return;
    dirty = true;
    setSaveUi('● Unsaved change - autosaving…', 'warn');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveNow(false); }, delay == null ? 700 : delay);
  }

  function relevantTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('#vehiclePills,#usagePills,#serviceButtons,#periodToggle,#stressButtons,#miles,#houseKwh,#region,#evTimingSlider,#e7TimingSlider,#e7ActualToggle,#e7DayActualInput,#e7NightActualInput,#awayPct,#awayRate,#effOverride,#knownEvKwh,#dualFuel');
  }

  function armAutosave() {
    document.addEventListener('input', function (e) {
      if (relevantTarget(e.target)) scheduleSave(700);
    }, true);

    document.addEventListener('change', function (e) {
      if (relevantTarget(e.target)) scheduleSave(120);
    }, true);

    document.addEventListener('click', function (e) {
      if (relevantTarget(e.target)) scheduleSave(350);
    }, true);

    global.addEventListener('beforeunload', function (e) {
      if (!dirty && !saving) return;
      e.preventDefault();
      e.returnValue = '';
    });
  }

  function addBridgeBar() {
    if ($('evBridgeBar')) return;
    const wrap = document.querySelector('.wrap');
    if (!wrap) return;

    const style = document.createElement('style');
    style.textContent = '#evBridgeBar{margin:0 0 .75rem;padding:.7rem .75rem;border:1px solid rgba(122,66,200,.28);border-radius:12px;background:#faf7ff;font:600 12px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#26164f}#evBridgeBar .top{display:flex;align-items:center;justify-content:space-between;gap:10px}#evBridgeBar .meta{min-width:0}#evBridgeBar .name{font-weight:800;font-size:13px}#evBridgeBar .sub{font-size:10.5px;opacity:.72;margin-top:2px}#evBridgeBar .actions{display:flex;gap:6px;flex:0}#evBridgeBar button{border:0;border-radius:999px;padding:8px 11px;background:#7a42c8;color:white;font-weight:800;cursor:pointer}#evBridgeBar button.secondary{background:white;color:#7a42c8;border:1px solid rgba(122,66,200,.35)}#evBridgeBar button:disabled{opacity:.55;cursor:default}#evBridgeSaveState{margin-top:.45rem;font-size:10.8px;font-weight:700}';
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'evBridgeBar';
    const usage = customer.electricity_usage_kwh != null
      ? Number(customer.electricity_usage_kwh).toLocaleString('en-GB') + ' kWh home usage inherited'
      : 'Appointment and basket context inherited';

    bar.innerHTML = '<div class="top"><div class="meta"><div class="name">☁️ ' + escapeHtml(customer.customer_name || 'Cloud customer') + '</div><div class="sub">' + escapeHtml(usage) + '</div></div><div class="actions"><button type="button" class="secondary" id="evBridgeSaveNow">Save now</button><button type="button" id="evBridgeReturn">← Save & return</button></div></div><div id="evBridgeSaveState">✓ Cloud autosave on</div>';

    wrap.insertBefore(bar, wrap.firstChild);

    const share = $('shareSetup');
    if (share) share.hidden = true;

    $('evBridgeSaveNow').addEventListener('click', function () {
      clearTimeout(saveTimer);
      saveNow(true);
    });

    $('evBridgeReturn').addEventListener('click', async function () {
      const btn = this;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      clearTimeout(saveTimer);
      await saveNow(true);

      if (dirty) {
        btn.disabled = false;
        btn.textContent = '← Save & return';
        return;
      }

      const state = captureState();
      bridge.setToolState('ev', state);
      sessionStorage.setItem(RETURN_SAVE_KEY, '1');
      bridge.returnToOrigin({
        tool_state: state,
        appointment_state: launch.appointment_state,
        basket_url: launch.basket_url
      });
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function finishHydration() {
    lastSavedFingerprint = fingerprint(captureState());
    dirty = false;
    hydrating = false;
    setSaveUi('✓ Cloud autosave on', 'good');
    armAutosave();
  }

  function waitUntilReady() {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      const house = $('houseKwh');
      const controlsReady = house && typeof house.oninput === 'function' && document.querySelector('#serviceButtons button');
      if (controlsReady) {
        clearInterval(timer);
        addBridgeBar();
        applyState();
        setTimeout(finishHydration, 180);
      } else if (attempts > 120) {
        clearInterval(timer);
        addBridgeBar();
        hydrating = false;
        setSaveUi('⚠️ EV controls did not fully initialise', 'bad');
      }
    }, 100);
  }

  waitUntilReady();
})(window);
