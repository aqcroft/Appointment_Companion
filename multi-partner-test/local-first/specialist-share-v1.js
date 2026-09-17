/* Specialist Companion Cloud sharing v1
   Generic authenticated helper for creating sanitised Cloud share snapshots.
   Tool-specific adapters decide what goes in the snapshot and which friendly
   route should be presented to the customer.
*/
(function (global) {
  'use strict';

  const api = global.AppointmentCompanionCloud;
  const AUTH_KEY = 'apptCloudPilotAuthSession';
  const CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';

  function getAuth() {
    try {
      const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) {
      return null;
    }
  }

  function currentCustomerId() {
    return sessionStorage.getItem(CUSTOMER_KEY) || '';
  }

  async function getCurrentCustomer() {
    if (!api) throw new Error('Cloud client is unavailable.');
    const auth = getAuth();
    const customerId = currentCustomerId();
    if (!auth) throw new Error('Cloud is not connected in this browser session.');
    if (!customerId) throw new Error('No Cloud customer is linked to this journey.');
    const res = await api.getCustomer(auth, customerId);
    if (!res || !res.customer) throw new Error('Cloud customer was not returned.');
    return res.customer;
  }

  async function create(viewType, snapshot) {
    if (!api) throw new Error('Cloud client is unavailable.');
    const auth = getAuth();
    const customerId = currentCustomerId();
    if (!auth) throw new Error('Cloud is not connected in this browser session.');
    if (!customerId) throw new Error('No Cloud customer is linked to this journey.');

    const res = await api.createShare(auth, {
      customer_id: customerId,
      view_type: String(viewType || '').trim(),
      snapshot: snapshot || {}
    });

    if (!res || !res.share || !res.share.token) {
      throw new Error('Cloud did not return a share token.');
    }

    return res.share;
  }

  function normaliseSnapshot(share) {
    if (!share || typeof share !== 'object') return {};
    if (share.snapshot && typeof share.snapshot === 'object') return share.snapshot;
    if (share.snapshot_json && typeof share.snapshot_json === 'object') return share.snapshot_json;
    if (typeof share.snapshot_json === 'string' && share.snapshot_json.trim()) {
      return JSON.parse(share.snapshot_json);
    }
    return {};
  }

  async function read(viewType, token) {
    if (!api || typeof api.getShare !== 'function') throw new Error('Cloud share reader is unavailable.');
    const res = await api.getShare(token);
    const share = res && res.share;
    if (!share) throw new Error('Share could not be loaded.');

    const expected = String(viewType || '').trim().toLowerCase();
    const actual = String(share.view_type || '').trim().toLowerCase();
    if (expected && actual && actual !== expected) {
      throw new Error('This link is not a ' + expected.toUpperCase() + ' Companion share.');
    }

    return {
      share: share,
      snapshot: normaliseSnapshot(share)
    };
  }

  global.AppointmentCompanionSpecialistShare = {
    create: create,
    read: read,
    getCurrentCustomer: getCurrentCustomer,
    currentCustomerId: currentCustomerId
  };
})(window);
