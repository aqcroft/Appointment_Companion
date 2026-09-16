/* Whitelisted Cloud-token sharing for the locally owned EV specialist state. */
(function (global) {
  'use strict';
  if (global.__AC_LOCAL_ONLY) return;
  var bridge = global.AppointmentCompanionBridge, store = global.AppointmentCompanionLocalStore, shareApi = global.AppointmentCompanionSpecialistShare, launch = bridge && bridge.receive ? bridge.receive() : null;
  if (!launch || launch.target_tool_id !== 'ev' || !shareApi) return;
  var localId = String(launch.extra && launch.extra.local_id || ''), $ = function (id) { return document.getElementById(id); }, sharing = false;
  function num(id) { var el = $(id), n = el && el.value !== '' ? Number(el.value) : NaN; return Number.isFinite(n) ? n : null; }
  function active(selector) { return document.querySelector(selector + '.on'); }
  function safeHttps(value) { try { var u = new URL(String(value || '').trim()); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; } }
  function state() { var vehicle = active('#vehiclePills .vpill'), service = active('#serviceButtons button'), period = active('#periodToggle button'), stress = active('#stressButtons button'), actual = $('e7ActualWrap') ? !$('e7ActualWrap').hidden : false; return { schema_version: 1, tool_version: '16C', vehicle_efficiency_mi_kwh: vehicle ? Number(vehicle.dataset.eff) : 3.2, vehicle_icon: vehicle ? String(vehicle.dataset.icon || '') : '🚙', annual_mileage: num('miles'), home_usage_kwh: num('houseKwh'), uw_services: service ? Number(service.dataset.tier) + 1 : 3, region: num('region'), ev_offpeak_pct: num('evTimingSlider'), e7_offpeak_pct: num('e7TimingSlider'), e7_actual: actual, e7_day_kwh: actual ? num('e7DayActualInput') : null, e7_night_kwh: actual ? num('e7NightActualInput') : null, away_pct: num('awayPct'), away_rate_p_kwh: num('awayRate'), efficiency_override_mi_kwh: num('effOverride'), known_ev_kwh: num('knownEvKwh'), dual_fuel: $('dualFuel') ? !!$('dualFuel').checked : true, period: period ? period.dataset.period : 'month', stress_pct: stress ? Number(stress.dataset.stress || 0) : 0 }; }
  function toast(message) { var el = $('shareToast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(function () { el.classList.remove('show'); }, 2400); }
  async function copy(text) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text); global.prompt('Copy this link:', text); }

  function gateStyle() {
    if ($('acEvShareGateStyle')) return;
    var st = document.createElement('style'); st.id = 'acEvShareGateStyle';
    st.textContent = '.ac-ev-share-gate{position:fixed;inset:0;z-index:100005;background:rgba(38,22,79,.48);display:flex;align-items:center;justify-content:center;padding:16px}.ac-ev-share-gate-card{width:min(430px,100%);background:#fff;color:#26164f;border-radius:17px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.ac-ev-share-gate-card h3{margin:0 0 5px;font-size:18px}.ac-ev-share-gate-card p{margin:.3rem 0 .8rem;color:#6b6b76;font-size:12px;line-height:1.45}.ac-ev-share-gate-card label{display:block;font-size:11px;font-weight:800;margin-bottom:5px}.ac-ev-share-gate-card input{width:100%;box-sizing:border-box;border:1.5px solid #e4dfec;border-radius:10px;padding:10px 11px;font:650 12px system-ui;color:#26164f}.ac-ev-share-gate-card .hint{font-size:10px;color:#81788d;margin-top:5px}.ac-ev-share-gate-actions{display:grid;gap:7px;margin-top:13px}.ac-ev-share-gate-actions button{min-height:42px;border:1px solid rgba(122,66,200,.2);border-radius:10px;background:#fff;color:#26164f;font:800 13px system-ui;cursor:pointer}.ac-ev-share-gate-actions button.primary{background:#7a42c8;color:#fff;border-color:#7a42c8}.ac-ev-share-gate-error{min-height:16px;margin-top:5px;color:#a33232;font-size:10px;font-weight:700}';
    document.head.appendChild(st);
  }

  function chooseBasket(existing) {
    gateStyle();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div'); overlay.className = 'ac-ev-share-gate';
      var safeExisting = safeHttps(existing);
      overlay.innerHTML = '<div class="ac-ev-share-gate-card" role="dialog" aria-modal="true"><h3>📤 Share EV comparison</h3><p>If this EV comparison is part of a wider UW quote, including the basket link takes the customer straight back to their quote.</p><label for="acEvBasketGate">UW basket / quote link <span style="font-weight:600">(optional)</span></label><input id="acEvBasketGate" type="url" inputmode="url" value="' + safeExisting.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" placeholder="https://..."><div class="hint">The saved basket is filled in automatically when one is available.</div><div class="ac-ev-share-gate-error" id="acEvGateError"></div><div class="ac-ev-share-gate-actions"><button type="button" class="primary" data-choice="include">Include basket and share</button><button type="button" data-choice="plain">Share without basket</button><button type="button" data-choice="cancel">Cancel</button></div></div>';
      function done(value) { overlay.remove(); resolve(value); }
      overlay.addEventListener('click', function (event) {
        if (event.target === overlay) return done({ cancelled: true, basket: '' });
        var choice = event.target && event.target.dataset && event.target.dataset.choice; if (!choice) return;
        if (choice === 'cancel') return done({ cancelled: true, basket: '' });
        if (choice === 'plain') return done({ cancelled: false, basket: '' });
        var raw = overlay.querySelector('#acEvBasketGate').value.trim(), safe = safeHttps(raw);
        if (!safe) { overlay.querySelector('#acEvGateError').textContent = raw ? 'Please use a valid https:// basket link.' : 'Add a basket link, or choose Share without basket.'; return; }
        done({ cancelled: false, basket: safe });
      });
      document.body.appendChild(overlay);
      setTimeout(function () { var input = overlay.querySelector('#acEvBasketGate'); if (input && !input.value) input.focus(); }, 0);
    });
  }

  function basketCandidate(row, canonical) {
    var customer = launch.extra && launch.extra.customer || {};
    return safeHttps((launch && launch.basket_url) || (canonical && canonical.basketUrl) || customer.basket_url || customer.basketUrl || (row && row.basket_url) || '');
  }

  async function create() {
    if (sharing) return;
    sharing = true;
    var button = document.querySelector('.evCloudShare');
    try {
      if (button) button.disabled = true;
      var workspace = global.AppointmentCompanionEvWorkspace;
      if (workspace && workspace.saveNow) await workspace.saveNow();
      var row = localId && store ? await store.get(localId) : null;
      var c = row && row.appointment_state && row.appointment_state.canonical || {};
      var name = String(c.customerName || row && row.customer_name || launch.extra && launch.extra.customer && launch.extra.customer.customer_name || '').trim();
      if (!name) { name = String(global.prompt('Who is this EV summary for?', '') || '').trim(); if (!name) throw new Error('Add the customer name before sharing.'); }
      var choice = await chooseBasket(basketCandidate(row, c));
      if (!choice || choice.cancelled) return;
      var e = c.energy || {};
      var snapshot = { schema_version: 1, view_type: 'ev', customer_name: name, electricityUsageTotalKwh: e.electricityUsageTotalKwh != null ? e.electricityUsageTotalKwh : num('houseKwh'), electricityProfile: e.electricityProfile || 'standard', electricityUsageDayKwh: e.electricityUsageDayKwh, electricityUsageNightKwh: e.electricityUsageNightKwh, ev_state: state() };
      if (choice.basket) snapshot.basket_url = choice.basket;
      var share = await shareApi.create('ev', snapshot), url = new URL('./', location.href);
      url.searchParams.set('s', share.token);
      var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
      if (slug) url.searchParams.set('for', slug);
      if (navigator.share) {
        try { await navigator.share({ title: 'UW EV Tariff Companion', text: 'Hi ' + name + ' - here is the EV comparison we looked at.', url: url.href }); toast('Share ready'); return; }
        catch (error) { if (error && error.name === 'AbortError') return; }
      }
      await copy(url.href); toast('Short EV link copied');
    } catch (error) { toast('Share failed - ' + ((error && error.message) || String(error))); }
    finally { sharing = false; if (button) button.disabled = false; }
  }

  function mount() {
    var bars = Array.from(document.querySelectorAll('.evBridgeActions')); if (!bars.length) return false;
    bars.forEach(function (actions, index) {
      if (actions.querySelector('.evCloudShare')) return;
      var button = document.createElement('button'); button.type = 'button'; button.className = 'evCloudShare'; if (!index) button.id = 'evCloudShare'; button.textContent = '📤'; button.title = 'Create a short customer EV share link'; button.setAttribute('aria-label', 'Create customer EV share link'); button.addEventListener('click', create); var menu = actions.querySelector('[data-ev-action="menu"]'); actions.insertBefore(button, menu || null);
    });
    return true;
  }
  if (mount()) return; var attempts = 0, timer = setInterval(function () { if (mount() || ++attempts > 140) clearInterval(timer); }, 100);
})(window);
