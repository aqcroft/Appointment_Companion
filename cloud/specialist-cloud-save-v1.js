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

  function stashLocalBackup(toolId, state, customer, status) {
    try {
      const key = 'apptCompanionSpecialistBackups_v1';
      const rows = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const id = String(toolId || 'tool') + ':' + String(customer && customer.customer_id ? customer.customer_id : 'unlinked');
      const next = rows.filter(row => row && row.id !== id);
      next.unshift({
        id: id,
        tool_id: String(toolId || ''),
        customer_id: customer && customer.customer_id ? customer.customer_id : '',
        customer_name: customer && customer.customer_name ? customer.customer_name : '',
        status: status || 'saved',
        savedAt: now,
        state: clone(state)
      });
      localStorage.setItem(key, JSON.stringify(next.slice(0, 30)));
      return true;
    } catch (_) {
      return false;
    }
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
    const customerName = String(opts.customer_name || (state && state.customer_name) || customer.customer_name || '').trim();
    if (customerName) {
      appointmentState.customerName = customerName;
      if (appointmentState.inputs && typeof appointmentState.inputs === 'object') appointmentState.inputs.customerName = customerName;
    }

    const payload = {
      customer_id: customer.customer_id,
      customer_name: customerName || customer.customer_name,
      electricity_usage_kwh: customer.electricity_usage_kwh,
      electricity_usage_day_kwh: customer.electricity_usage_day_kwh,
      electricity_usage_night_kwh: customer.electricity_usage_night_kwh,
      electricity_usage_mode: customer.electricity_usage_mode || '',
      electricity_usage_preset: customer.electricity_usage_preset || '',
      electricity_usage_basis: customer.electricity_usage_basis || '',
      electricity_usage_source: customer.electricity_usage_source || '',
      electricity_usage_captured_at: customer.electricity_usage_captured_at || '',
      electricity_usage_revision: customer.electricity_usage_revision || 0,
      gas_usage_kwh: customer.gas_usage_kwh,
      gas_usage_source: customer.gas_usage_source || '',
      gas_usage_captured_at: customer.gas_usage_captured_at || '',
      energy_has_electricity: customer.energy_has_electricity !== false,
      energy_has_gas: customer.energy_has_gas !== false,
      appointment_state_json: appointmentState,
      ev_state_json: opts.legacy_ev_state ? clone(state) : clone(customer.ev_state),
      basket_url: opts.basket_url !== undefined ? String(opts.basket_url || '') : String(customer.basket_url || ''),
      private_notes: customer.private_notes || ''
    };

    stashLocalBackup(toolId, state, customer, 'pending_cloud_save');
    const savedResponse = await api.saveCustomer(auth, payload);
    const saved = savedResponse && savedResponse.customer;
    if (!saved) throw new Error('Cloud did not return the saved customer.');
    stashLocalBackup(toolId, state, saved, 'saved');
    if (bridge && typeof bridge.updateWorkingRecord === 'function') bridge.updateWorkingRecord({
      customer_id: saved.customer_id,
      customer_name: saved.customer_name,
      appointment_state: appointmentState
    });

    emit('saved', { tool_id: toolId, customer_id: id, customer: clone(saved) });
    return saved;
  }

  global.AppointmentCompanionSpecialistCloud = {
    save: save,
    getAuth: getAuth,
    currentCustomerId: customerId
  };
})(window);
