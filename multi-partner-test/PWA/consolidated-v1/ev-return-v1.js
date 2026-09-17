/* Consolidated EV return: one durable local save, then the existing bridge envelope. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('shared-view')) return;
  var bridge = global.AppointmentCompanionBridge;
  var launch = bridge && bridge.receive ? bridge.receive() : null;
  if (!bridge || !launch || launch.target_tool_id !== 'ev') return;

  function transition(button) {
    var el = document.getElementById('evReturnTransition');
    if (!el) {
      el = document.createElement('div');
      el.id = 'evReturnTransition';
      el.innerHTML = '<div>↩ Returning to Appointment Companion…<div style="margin-top:5px;font-size:12px;font-weight:600;color:#6b6b76">Keeping this customer workspace together.</div></div>';
      document.body.appendChild(el);
    }
    el.classList.add('open');
    if (button) button.disabled = true;
  }

  document.addEventListener('click', async function (event) {
    var button = event.target.closest && event.target.closest('[data-ev-action="return"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    transition(button);
    try {
      var workspace = global.AppointmentCompanionEvWorkspace;
      if (workspace && workspace.saveNow) await workspace.saveNow();
      var state = bridge.getToolState('ev');
      bridge.returnToOrigin({
        tool_state: state,
        customer_patch: null,
        appointment_state: launch.appointment_state,
        basket_url: launch.basket_url
      });
    } catch (error) {
      var el = document.getElementById('evReturnTransition');
      if (el) el.classList.remove('open');
      button.disabled = false;
      var notice = document.getElementById('evBridgeNotice');
      if (notice) {
        notice.textContent = '⚠️ Return needs attention. Your EV work is still saved on this device.';
        notice.className = 'show bad';
      }
    }
  }, true);
})(window);
