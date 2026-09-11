/* Immediate local hand-off from Main to a specialist. Cloud is never transport. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var bridge = global.AppointmentCompanionBridge;
  var specs = [], wired = new Set(), prefetched = new Set();
  function status(text, bad) { var el = document.getElementById('cloudPilotStatus'); if (el) { el.textContent = text; el.style.color = bad ? '#c43b3b' : 'var(--muted)'; } }
  function overlay(label) {
    var el = document.getElementById('companionViewTransition');
    if (!el) { el = document.createElement('div'); el.id = 'companionViewTransition'; el.style.cssText = 'position:fixed;inset:0;z-index:15000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(38,22,79,.24);backdrop-filter:blur(2px)'; el.innerHTML = '<div style="width:min(330px,calc(100vw - 36px));padding:22px;border-radius:16px;background:#fff;color:#26164f;box-shadow:0 18px 55px rgba(38,22,79,.24);text-align:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif"><div style="font-size:30px;margin-bottom:8px">🚙</div><strong style="display:block;font-size:16px;color:#7a42c8"></strong><p style="margin:.35rem 0 0;font-size:12px;color:#6b6b76">Opening from the working copy on this device.</p></div>'; document.body.appendChild(el); }
    el.querySelector('strong').textContent = 'Opening ' + label + '…'; el.style.display = 'flex';
  }
  function current() { var api = global.AppointmentCompanionLocalFirst; return api && api.currentRecord ? api.currentRecord() : null; }
  async function launch(spec, button) {
    if (!bridge) return status('Companion Bridge is not ready.', true);
    button.disabled = true; button.setAttribute('aria-busy', 'true'); overlay(spec.label || 'Companion');
    try {
      var local = global.AppointmentCompanionLocalFirst;
      var record = local && local.persist ? await local.persist(false) : current();
      var context = global.AppointmentCompanionCustomerContext;
      var customer = context && context.currentDraft ? context.currentDraft() : {};
      if (record) customer = Object.assign({}, record.cloud_customer || {}, customer, { customer_id: record.cloud_id || '', customer_name: record.customer_name || '', local_id: record.local_id });
      var targetUrl = new URL(spec.url, location.href);
      if (global.__AC_LOCAL_ONLY) targetUrl.searchParams.set('local', '1');
      bridge.launch(targetUrl.toString(), spec.tool_id, { customer_id: record && record.cloud_id || '', basket_url: record && record.basket_url || bridge.currentBasketUrl(), extra: { customer: customer, local_id: record && record.local_id || '', draft: !(record && record.cloud_id), specialist_label: spec.label || spec.tool_id } });
    } catch (error) {
      button.disabled = false; button.removeAttribute('aria-busy'); var el = document.getElementById('companionViewTransition'); if (el) el.style.display = 'none'; status((error && error.message) || String(error), true);
    }
  }
  function prefetch(spec) {
    if (prefetched.has(spec.tool_id)) return; prefetched.add(spec.tool_id);
    var assets = [spec.url, '../v16c-ev.html', '../tariff-cache-v1.js', '../v13-ev.js', '../v16b-hero.js', '../v14-ev.css', '../v15-ev.css', '../v15-freshness.js', '../v16c-ev.css', '../v16c-sharing.js', '../v16c-table.js'];
    var run = function () { assets.forEach(function (asset) { try { fetch(new URL(asset, location.href), { cache: 'force-cache' }).catch(function () {}); } catch (_) {} }); };
    if ('requestIdleCallback' in global) requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 350);
  }
  function render() { specs.forEach(function (spec) { var id = 'cloudCompanion' + spec.tool_id.replace(/(^|[-_])([a-z])/g, function (_, __, c) { return c.toUpperCase(); }); var btn = document.getElementById(id); if (!btn || wired.has(id)) return; btn.title = spec.description || spec.label; btn.addEventListener('click', function (event) { event.preventDefault(); event.stopImmediatePropagation(); launch(spec, btn); }, true); wired.add(id); prefetch(spec); }); }
  global.AppointmentCompanionSpecialists = { register: function (spec) { var at = specs.findIndex(function (x) { return x.tool_id === spec.tool_id; }); if (at >= 0) specs[at] = spec; else specs.push(spec); render(); prefetch(spec); }, list: function () { return specs.slice(); } };
  var attempts = 0, timer = setInterval(function () { if (document.getElementById('cloudPilotCard')) { clearInterval(timer); render(); } else if (++attempts > 100) clearInterval(timer); }, 50);
})(window);
