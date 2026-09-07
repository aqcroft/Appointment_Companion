/* Appointment Companion Cloud client v1
   Reusable browser-side API wrapper.
   No Partner secrets are stored by this file.
*/
(function (global) {
  'use strict';

  const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbyEEvE7ALdjbRZ540PSYsiX-tkA83ZiEryFQBqA_zSa8W-Xpd_DWL3FG_YFMU6XmE3D/exec';

  async function post(body) {
    const response = await fetch(CLOUD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      cache: 'no-store'
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error('Cloud returned a non-JSON response. HTTP ' + response.status + '.');
    }

    if (!data || data.ok !== true) {
      throw new Error((data && data.error) || 'Cloud request failed.');
    }

    return data;
  }

  function authPayload(auth) {
    if (!auth || !auth.partner_id || !auth.workspace_key) {
      throw new Error('Partner authentication missing.');
    }
    return {
      partner_id: String(auth.partner_id).trim(),
      workspace_key: String(auth.workspace_key)
    };
  }

  const api = {
    url: CLOUD_URL,

    async health() {
      const response = await fetch(CLOUD_URL + '?action=health', {
        cache: 'no-store',
        redirect: 'follow'
      });
      const data = await response.json();
      if (!data || data.ok !== true) throw new Error((data && data.error) || 'Cloud health check failed.');
      return data;
    },

    async listCustomers(auth) {
      return post(Object.assign({ action: 'listCustomers' }, authPayload(auth)));
    },

    async getCustomer(auth, customerId) {
      return post(Object.assign({
        action: 'getCustomer',
        customer_id: String(customerId || '').trim()
      }, authPayload(auth)));
    },

    async saveCustomer(auth, customer) {
      return post(Object.assign({
        action: 'saveCustomer',
        customer: customer || {}
      }, authPayload(auth)));
    },

    async createShare(auth, payload) {
      return post(Object.assign({ action: 'createShare' }, payload || {}, authPayload(auth)));
    }
  };

  global.AppointmentCompanionCloud = api;
})(window);
