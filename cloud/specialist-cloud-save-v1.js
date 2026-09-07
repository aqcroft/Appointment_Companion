/* Specialist Cloud persistence v1
   Generic helper for specialist Companions to save namespaced tool state back
   into the same Cloud customer without bespoke pair-by-pair integration.
*/
(function (global) {
  'use strict';

  const api = global.AppointmentCompanionCloud;
  const bridge = global.AppointmentCompanionBridge;
  const AUTH_KEY = 'apptCloudPilotAuthSession';
  const CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';

  function clone(v) {
    if (v == null) return v;
    return JSON.parse(JSON.stringify(v));
  }

  function getAuth() {
    try {
      const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) {
      return null;
    }
  }

  function customerId() {
    return sessionStorage.getItem(CUSTOMER_KEY) || (bridge && bridge.currentCustomerId ? bridge.currentCustomerId() : '');
  }

  function emit(name, detail) {
    global.dispatchEvent(new CustomEvent('ac:specialist-cloud:' + name, { detail: detail || {} }));
  }

  async function save(toolId, state, options) {
    const opts = options || {};
    const auth = getAuth();
    const id = customerId();

    if (!api || !bridge) throw new Error('Cloud/Companion Bridge is not ready.');
    if (!auth) throw new Error('Cloud is not connected in this browser session.');
    if (!id) throw new Error('No Cloud customer is linked to this specialist journey.');

    bridge.setToolState(toolId, state);
    emit('saving', { tool_id: toolId, customer_id: id });

    const got = await api.getCustomer(auth, id);
    const customer = got && got.customer;
    if (!customer) throw new Error('Cloud customer was not returned.');

    let appointmentState = clone(customer.appointment_state || opts.appointment_state || {});
    if (!appointmentState || typeof appointmentState !== 'object') appointmentState = {};
    appointmentState._journey = bridge.getJourney();

    const payload = {
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      electricity_usage_kwh: customer.electricity_usage_kwh,
      electricity_usage_mode: customer.electricity_usage_mode || '',
      electricity_usage_preset: customer.electricity_usage_preset || '',
      electricity_usage_basis: customer.electricity_usage_basis || '',
      electricity_usage_source: customer.electricity_usage_source || '',
      electricity_usage_captured_at: customer.electricity_usage_captured_at || '',
      gas_usage_kwh: customer.gas_usage_kwh,
      appointment_state_json: appointmentState,
      ev_state_json: opts.legacy_ev_state ? clone(state) : clone(customer.ev_state),
      basket_url: opts.basket_url !== undefined ? String(opts.basket_url || '') : String(customer.basket_url || ''),
      private_notes: customer.private_notes || ''
    };

    const savedResponse = await api.saveCustomer(auth, payload);
    const saved = savedResponse && savedResponse.customer;
    if (!saved) throw new Error('Cloud did not return the saved customer.');

    emit('saved', { tool_id: toolId, customer_id: id, customer: clone(saved) });
    return saved;
  }

  global.AppointmentCompanionSpecialistCloud = {
    save: save,
    getAuth: getAuth,
    currentCustomerId: customerId
  };
})(window);
