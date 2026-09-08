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
  let changeBurst = 0;
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
    document.querySelectorAll('.evBridgeSaveState').forEach(function (el) {
      el.textContent = text;
      el.style.color = tone === 'bad' ? '#c43b3b' : tone === 'warn' ? '#8a6400' : tone === 'good' ? '#1d7f45' : '#6b6b76';
    });
    showNotice(text, tone);
  }

  function showNotice(text, tone) {
    let notice = $('evBridgeNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'evBridgeNotice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }
    notice.textContent = text;
    notice.className = 'show ' + (tone || '');
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(function () { notice.classList.remove('show'); }, tone === 'bad' ? 5200 : 1800);
  }

  function setSaveButtonsDisabled(disabled) {
    document.querySelectorAll('[data-ev-action="save"]').forEach(function (btn) {
      btn.disabled = !!disabled;
    });
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
    setSaveButtonsDisabled(true);

    try {
      await cloudSave.save('ev', state, {
        appointment_state: launch.appointment_state,
        basket_url: launch.basket_url,
        legacy_ev_state: true
      });
      lastSavedFingerprint = fp;
      dirty = false;
      const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setSaveUi('✓ Saved to Cloud ' + time + ' · local backup kept', 'good');
    } catch (err) {
      dirty = true;
      setSaveUi('⚠️ Cloud save failed - local backup kept on this device. ' + ((err && err.message) || String(err)), 'bad');
    } finally {
      saving = false;
      changeBurst = 0;
      setSaveButtonsDisabled(false);
      if (pendingSave) {
        pendingSave = false;
        setTimeout(function () { saveNow(false); }, 50);
      }
    }
  }

  function scheduleSave(delay) {
    if (hydrating) return;
    changeBurst++;
    dirty = true;
    setSaveUi('● Unsaved change - autosaving…', 'warn');
    clearTimeout(saveTimer);
    const coalescedDelay = delay == null ? (changeBurst >= 3 ? 1000 : 4000) : delay;
    saveTimer = setTimeout(function () { saveNow(false); }, coalescedDelay);
  }

  function relevantTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest('#vehiclePills,#usagePills,#serviceButtons,#periodToggle,#stressButtons,#miles,#houseKwh,#region,#evTimingSlider,#e7TimingSlider,#e7ActualToggle,#e7DayActualInput,#e7NightActualInput,#awayPct,#awayRate,#effOverride,#knownEvKwh,#dualFuel');
  }

  function armAutosave() {
    document.addEventListener('input', function (e) {
      if (relevantTarget(e.target)) scheduleSave();
    }, true);

    document.addEventListener('change', function (e) {
      if (relevantTarget(e.target)) scheduleSave(changeBurst >= 2 ? 900 : 2200);
    }, true);

    document.addEventListener('click', function (e) {
      if (relevantTarget(e.target)) scheduleSave(changeBurst >= 2 ? 900 : 2200);
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
    style.textContent = '.evBridgeBar{position:relative;margin:0 0 .75rem;padding:.62rem .7rem;border:1px solid rgba(122,66,200,.24);border-radius:10px;background:#faf7ff;font:600 12px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;color:#26164f}.evBridgeBar.bottom{margin:1rem 0 .25rem}.evBridgeBar .top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.evBridgeBar .meta{min-width:0;flex:1}.evBridgeBar .name{font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.evBridgeBar .sub{font-size:10.5px;opacity:.72;margin-top:2px}.evBridgeActions{display:flex;gap:5px;flex:0;justify-content:flex-end}.evBridgeBar button{width:36px;height:36px;border:1px solid rgba(122,66,200,.3);border-radius:10px;background:white;color:#7a42c8;font-size:17px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.evBridgeBar button:disabled{opacity:.45;cursor:default}.evBridgeMenu{position:absolute;right:.7rem;top:calc(100% - .2rem);z-index:30;width:min(300px,calc(100vw - 30px));padding:.45rem;border:1px solid rgba(122,66,200,.18);border-radius:12px;background:white;box-shadow:0 16px 40px rgba(38,22,79,.18);display:none;gap:6px}.evBridgeMenu.open{display:grid}.evBridgeMenu button{width:100%;min-height:40px;justify-content:flex-start;text-align:left;gap:9px;font-size:14px}.evBridgeMenu .menu-ico{width:1.6em;text-align:center}.evBridgeSaveState{margin-top:.4rem;font-size:10.8px;font-weight:700}#evBridgeNotice{position:fixed;left:50%;top:16px;transform:translate(-50%,-10px);z-index:100000;min-width:min(340px,calc(100vw - 28px));max-width:420px;padding:11px 14px;border-radius:12px;background:#26164f;color:white;box-shadow:0 10px 30px rgba(38,22,79,.24);font:750 13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;opacity:0;pointer-events:none;transition:opacity .16s ease,transform .16s ease}#evBridgeNotice.show{opacity:1;transform:translate(-50%,0)}#evBridgeNotice.bad{background:#8f2424}#evBridgeNotice.warn{background:#7a5a00}#evBridgeNotice.good{background:#1d7f45}@media(max-width:620px){.evBridgeMenu{left:.7rem;right:.7rem;width:auto}}';
    document.head.appendChild(style);

    const bar = document.createElement('div');
    bar.id = 'evBridgeBar';
    const usage = customer.electricity_usage_kwh != null
      ? Number(customer.electricity_usage_kwh).toLocaleString('en-GB') + ' kWh home usage inherited'
      : 'Appointment and basket context inherited';

    bar.className = 'evBridgeBar';
    bar.innerHTML = '<div class="top"><div class="meta"><div class="name">☁️ ' + escapeHtml(customer.customer_name || 'Cloud customer') + '</div><div class="sub">' + escapeHtml(usage) + '</div></div><div class="evBridgeActions"><button type="button" data-ev-action="return" title="Save and return to Companion" aria-label="Save and return to Companion">↩</button><button type="button" data-ev-action="card" title="Cashback Card Companion" aria-label="Cashback Card Companion">💳</button><button type="button" data-ev-action="menu" title="Show actions" aria-label="Show actions" aria-expanded="false">☰</button></div></div><div class="evBridgeMenu"><button type="button" data-ev-action="save" id="evBridgeSaveNow"><span class="menu-ico">💾</span><span>Save now</span></button><button type="button" data-ev-action="return" id="evBridgeReturn"><span class="menu-ico">↩</span><span>Save and return to Companion</span></button><button type="button" data-ev-action="settings"><span class="menu-ico">⚙️</span><span>EV settings</span></button></div><div class="evBridgeSaveState">✓ Cloud autosave on</div>';

    wrap.insertBefore(bar, wrap.firstChild);

    const bottom = bar.cloneNode(true);
    bottom.id = 'evBridgeFooterBar';
    bottom.classList.add('bottom');
    bottom.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    wrap.appendChild(bottom);

    const share = $('shareSetup');
    if (share) share.hidden = true;

    document.querySelectorAll('[data-ev-action="save"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeEvMenus();
        clearTimeout(saveTimer);
        saveNow(true);
      });
    });

    document.querySelectorAll('[data-ev-action="return"]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
      closeEvMenus();
      btn.disabled = true;
      showNotice('Saving and returning to Companion…', '');
      clearTimeout(saveTimer);
      await saveNow(true);

      if (dirty) {
        btn.disabled = false;
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
    });

    document.querySelectorAll('[data-ev-action="menu"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const bar = btn.closest('.evBridgeBar');
        const menu = bar && bar.querySelector('.evBridgeMenu');
        if (!menu) return;
        const open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.title = open ? 'Hide actions' : 'Show actions';
      });
    });

    document.querySelectorAll('[data-ev-action="settings"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeEvMenus();
        const settings = Array.from(document.querySelectorAll('details')).find(function (details) {
          return /Settings & assumptions/i.test(details.textContent || '');
        });
        if (settings) {
          settings.open = true;
          settings.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    document.querySelectorAll('[data-ev-action="card"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeEvMenus();
        window.location.href = new URL('./cashback-card-companion.html', window.location.href).href;
      });
    });

    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('.evBridgeBar')) return;
      closeEvMenus();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeEvMenus();
    });
  }

  function closeEvMenus() {
    document.querySelectorAll('.evBridgeMenu.open').forEach(function (menu) { menu.classList.remove('open'); });
    document.querySelectorAll('[data-ev-action="menu"]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Show actions';
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
