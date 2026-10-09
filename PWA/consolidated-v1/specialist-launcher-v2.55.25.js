/* Immediate local specialist hand-off; Cloud is never transport. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var bridge = global.AppointmentCompanionBridge, specs = [], wired = new Set(), prefetched = new Set();
  function status(text, bad) { var el = document.getElementById('cloudPilotStatus'); if (el) { el.textContent = text; el.style.color = bad ? '#c43b3b' : 'var(--muted)'; } }
  function overlay(label) { var el = document.getElementById('companionViewTransition'); if (!el) { el = document.createElement('div'); el.id = 'companionViewTransition'; el.style.cssText = 'position:fixed;inset:0;z-index:15000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(38,22,79,.24);backdrop-filter:blur(2px)'; el.innerHTML = '<div style="width:min(330px,calc(100vw - 36px));padding:22px;border-radius:16px;background:#fff;color:#26164f;box-shadow:0 18px 55px rgba(38,22,79,.24);text-align:center;font-family:system-ui"><div style="font-size:30px;margin-bottom:8px">↗</div><strong style="display:block;font-size:16px;color:#7a42c8"></strong><p style="margin:.35rem 0 0;font-size:12px;color:#6b6b76">Opening from the working copy on this device.</p></div>'; document.body.appendChild(el); } el.querySelector('strong').textContent = 'Opening ' + label + '…'; el.style.display = 'flex'; }
  var pendingRegionLaunch = null;
  function validRegion(field) { return !!(field && /^(1[0-9]|2[0-3])$/.test(field.value)); }
  function clearRegionPrompt() {
    var note = document.getElementById('acRegionLaunchPrompt');
    if (note) note.remove();
  }
  function requestRegion(spec, button, field) {
    pendingRegionLaunch = { spec: spec, button: button };
    var editor = document.getElementById('acRegionEditor');
    var chip = document.querySelector('.ac-region-chip');
    if (editor && editor.hidden && chip) chip.click();
    var host = editor || field.parentElement;
    var note = document.getElementById('acRegionLaunchPrompt');
    if (!note) {
      note = document.createElement('p');
      note.id = 'acRegionLaunchPrompt';
      note.setAttribute('role', 'status');
      note.style.cssText = 'margin:9px 0 0;padding:9px 11px;border:1px solid #f1d698;border-radius:9px;background:#fff9ea;color:#835d0b;font:650 12px/1.5 system-ui';
      host.appendChild(note);
    }
    note.textContent = 'Choose this customer\'s electricity region to open ' + (spec.label || 'the calculator') + '.';
    (editor || field).scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus({ preventScroll: true });
  }
  async function launch(spec, button) {
    if (!bridge) return status('Companion Bridge is not ready.', true);
    var regionInput = document.getElementById('customerRegion');
    if (regionInput && !validRegion(regionInput)) {
      requestRegion(spec, button, regionInput);
      return;
    }
    pendingRegionLaunch = null;
    clearRegionPrompt();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    overlay(spec.label || 'Companion');
    try {
      var local = global.AppointmentCompanionConsolidated,
        row = local && local.persist ? await local.persist(false) : null,
        c = row && row.appointment_state && row.appointment_state.canonical || {},
        context = global.AppointmentCompanionCustomerContext,
        customer = context && context.currentDraft ? context.currentDraft() : {};
      customer = Object.assign({}, row && row.cloud_customer || {}, customer, {
        customer_id: row && row.cloud_id || '',
        customer_name: c.customerName || row && row.customer_name || '',
        local_id: row && row.local_id || '',
        electricity_usage_kwh: c.energy && c.energy.electricityUsageTotalKwh,
        electricityUsageTotalKwh: c.energy && c.energy.electricityUsageTotalKwh,
        // Hand off the customer's current canonical day/night electricity split.
        // The EV tool must receive these as values, not placeholder examples.
        electricity_usage_day_kwh: c.energy && c.energy.electricityUsageDayKwh,
        electricity_usage_night_kwh: c.energy && c.energy.electricityUsageNightKwh,
        electricity_profile: c.energy && c.energy.electricityProfile,
        gas_usage_kwh: c.energy && c.energy.gasUsageKwh,
        region: c.region
      });
      var target = new URL(spec.url, location.href);
      if (global.__AC_LOCAL_ONLY) target.searchParams.set('local', '1');
      bridge.launch(target.href, spec.tool_id, {
        customer_id: row && row.cloud_id || '',
        appointment_state: global.AppointmentCompanionCanonical.toLegacySnapshot(row.appointment_state),
        basket_url: c.basketUrl || bridge.currentBasketUrl(),
        extra: {
          customer: customer,
          local_id: row && row.local_id || '',
          draft: !(row && row.cloud_id),
          specialist_label: spec.label || spec.tool_id
        }
      });
    } catch (error) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      var el = document.getElementById('companionViewTransition');
      if (el) el.style.display = 'none';
      status((error && error.message) || String(error), true);
    }
  }
  // A calculator tap with no region now opens the picker. Choosing a region
  // completes that original tap, without forcing a second visit to the toolbar.
  document.addEventListener('change', function (event) {
    var field = document.getElementById('customerRegion');
    if (!pendingRegionLaunch || event.target !== field || !validRegion(field)) return;
    var request = pendingRegionLaunch;
    pendingRegionLaunch = null;
    clearRegionPrompt();
    setTimeout(function () { launch(request.spec, request.button); }, 0);
  });
  global.addEventListener('ac:customer-switched', function () {
    pendingRegionLaunch = null;
    clearRegionPrompt();
  });
  function prefetch(spec) { if (prefetched.has(spec.tool_id)) return; prefetched.add(spec.tool_id); var run = function () { [spec.url].forEach(function (asset) { try { fetch(new URL(asset, location.href), { cache: 'force-cache' }).catch(function () {}); } catch (_) {} }); }; if ('requestIdleCallback' in global) requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 350); }
  function render() { specs.forEach(function (spec) { var id = 'cloudCompanion' + spec.tool_id.replace(/(^|[-_])([a-z])/g, function (_, __, c) { return c.toUpperCase(); }), button = document.getElementById(id); if (!button || wired.has(id)) return; button.title = spec.description || spec.label; button.setAttribute('aria-label', spec.label); button.addEventListener('click', function (event) { event.preventDefault(); event.stopImmediatePropagation(); launch(spec, button); }, true); wired.add(id); prefetch(spec); }); }
  global.AppointmentCompanionSpecialists = { register: function (spec) { var at = specs.findIndex(function (row) { return row.tool_id === spec.tool_id; }); if (at >= 0) specs[at] = spec; else specs.push(spec); render(); prefetch(spec); }, list: function () { return specs.slice(); } };
  var attempts = 0, timer = setInterval(function () { if (document.getElementById('cloudPilotCard')) { clearInterval(timer); render(); } else if (++attempts > 120) clearInterval(timer); }, 50);
})(window);
