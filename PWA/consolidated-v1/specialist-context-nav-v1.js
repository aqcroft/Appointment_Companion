/* Preserve the active Main Companion customer when switching between specialist tools. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var bridge = global.AppointmentCompanionBridge;
  if (!bridge || typeof bridge.receive !== 'function' || typeof bridge.launch !== 'function') return;

  function activeEnvelope() {
    try { return bridge.receive(); } catch (_) { return null; }
  }

  function specialistRoot() {
    return new URL('../', location.href);
  }

  function launchSpecialist(toolId) {
    var envelope = activeEnvelope();
    var path = toolId === 'ev' ? 'ev/' : 'should-i-fix/';
    var target = new URL(path, specialistRoot());

    /* No customer launch means this really is standalone use. Leave the
       existing toolbar behaviour alone in that uncommon case. */
    if (!envelope) return false;

    var origin = envelope.origin || {};
    bridge.launch(target.href, toolId, {
      customer_id: envelope.customer_id || '',
      appointment_state: envelope.appointment_state || null,
      basket_url: envelope.basket_url || '',
      extra: envelope.extra || null,
      origin_tool_id: origin.tool_id || 'appointment',
      origin_url: origin.url || new URL('../', specialistRoot()).href
    });
    return true;
  }

  document.addEventListener('click', function (event) {
    var button = event.target && event.target.closest ? event.target.closest('#acSharedToolstrip .ac-toolbtn') : null;
    if (!button) return;
    var label = String(button.getAttribute('aria-label') || button.title || '');
    var toolId = label === 'EV Companion' ? 'ev' : label === 'Should I Fix?' ? 'fix' : '';
    if (!toolId) return;

    var alreadyHere = (toolId === 'ev' && /\/ev\//.test(location.pathname)) || (toolId === 'fix' && /\/should-i-fix\//.test(location.pathname));
    if (alreadyHere) return;

    if (activeEnvelope()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      launchSpecialist(toolId);
    }
  }, true);
})(window);
