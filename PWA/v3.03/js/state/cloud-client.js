const CLOUD_URL = 'https://script.google.com/macros/s/AKfycbyEEvE7ALdjbRZ540PSYsiX-tkA83ZiEryFQBqA_zSa8W-Xpd_DWL3FG_YFMU6XmE3D/exec';

function authPayload(auth) {
  if (!auth?.partner_id || !auth?.workspace_key) throw new Error('Partner authentication missing.');
  return { partner_id: String(auth.partner_id).trim(), workspace_key: String(auth.workspace_key) };
}

async function post(body) {
  const response = await fetch(CLOUD_URL, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body), redirect: 'follow', cache: 'no-store'
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Cloud returned a non-JSON response. HTTP ${response.status}.`); }
  if (!data?.ok) throw new Error(data?.error || 'Cloud request failed.');
  return data;
}

export const cloudClient = {
  url: CLOUD_URL,
  async health() {
    const response = await fetch(`${CLOUD_URL}?action=health`, { cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Cloud health check failed.');
    return data;
  },
  listCustomers: auth => post({ action: 'listCustomers', ...authPayload(auth) }),
  getCustomer: (auth, customerId) => post({ action: 'getCustomer', customer_id: String(customerId || '').trim(), ...authPayload(auth) }),
  saveCustomer: (auth, customer) => post({ action: 'saveCustomer', customer: customer || {}, ...authPayload(auth) }),
  deleteCustomer: (auth, customerId) => post({ action: 'deleteCustomer', customer_id: String(customerId || '').trim(), ...authPayload(auth) }),
  createShare: (auth, payload) => post({ action: 'createShare', ...(payload || {}), ...authPayload(auth) }),
  getNotificationPreferences: auth => post({ action: 'getNotificationPreferences', ...authPayload(auth) }),
  setNotificationPreferences: (auth, preferences) => post({ action: 'setNotificationPreferences', preferences: preferences || {}, ...authPayload(auth) }),
  async getShare(token) {
    const response = await fetch(`${CLOUD_URL}?action=share&token=${encodeURIComponent(String(token || '').trim())}`, { cache: 'no-store', redirect: 'follow' });
    const data = await response.json();
    if (!data?.ok) throw new Error(data?.error || 'Share could not be loaded.');
    return data;
  }
};

