/* Appointment Companion Cloud pilot v1
   Adds Cloud connect, save and load to the isolated cloud pilot.
   Partner ID is remembered locally; the Workspace Key is session-only.
*/
(function () {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const api = window.AppointmentCompanionCloud;
  if (!api) {
    console.error('Appointment Companion Cloud client not loaded.');
    return;
  }

  const $c = id => document.getElementById(id);
  const PARTNER_ID_KEY = 'apptCloudPilotPartnerId';
  const SESSION_AUTH_KEY = 'apptCloudPilotAuthSession';
  const CURRENT_CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';

  let cloudCustomers = [];
  let currentCloudCustomerId = sessionStorage.getItem(CURRENT_CUSTOMER_KEY) || '';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getAuth() {
    try {
      const auth = JSON.parse(sessionStorage.getItem(SESSION_AUTH_KEY) || 'null');
      if (auth && auth.partner_id && auth.workspace_key) return auth;
    } catch (_) {}
    return null;
  }

  function setAuth(partnerId, workspaceKey) {
    const auth = {
      partner_id: String(partnerId || '').trim(),
      workspace_key: String(workspaceKey || '')
    };
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(auth));
    localStorage.setItem(PARTNER_ID_KEY, auth.partner_id);
    return auth;
  }

  function clearAuth() {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    sessionStorage.removeItem(CURRENT_CUSTOMER_KEY);
    currentCloudCustomerId = '';
  }

  function fmtDate(iso) {
    const d = new Date(iso || '');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function setStatus(text, kind) {
    const el = $c('cloudPilotStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'bad' ? '#c43b3b' : kind === 'good' ? '#1d7f45' : 'var(--muted)';
  }

  function setCurrent(customer) {
    currentCloudCustomerId = customer && customer.customer_id ? customer.customer_id : '';
    if (currentCloudCustomerId) sessionStorage.setItem(CURRENT_CUSTOMER_KEY, currentCloudCustomerId);
    else sessionStorage.removeItem(CURRENT_CUSTOMER_KEY);
    const el = $c('cloudPilotCurrent');
    if (!el) return;
    el.textContent = customer && customer.customer_name
      ? 'Linked Cloud customer: ' + customer.customer_name
      : 'No Cloud customer linked to this form yet.';
  }

  function buildPanel() {
    const anchor = $c('savesCard');
    if (!anchor || $c('cloudPilotCard')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'cloudPilotCard';
    card.style.borderColor = 'rgba(122,66,200,0.35)';
    card.style.background = 'rgba(122,66,200,0.035)';
    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:.55rem;">
        <h2 style="margin:0;">☁️ Cloud pilot</h2>
        <span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;color:var(--purple);">Test</span>
      </div>
      <p class="sub" style="margin-bottom:.7rem;">Connect this browser session, then save or load customers from Appointment Companion Cloud.</p>

      <div id="cloudPilotLogin">
        <div class="field">
          <label for="cloudPilotPartnerId">Cloud Partner ID</label>
          <input type="text" id="cloudPilotPartnerId" autocomplete="off" spellcheck="false" placeholder="p_...">
        </div>
        <div class="field">
          <label for="cloudPilotWorkspaceKey">Workspace Key</label>
          <input type="password" id="cloudPilotWorkspaceKey" autocomplete="off" spellcheck="false" placeholder="Private Workspace Key">
        </div>
        <button class="pill" type="button" id="cloudPilotConnect" style="width:100%;">Connect Cloud</button>
        <p class="sub" style="font-size:10.5px;margin-top:.45rem;">Pilot only: the Workspace Key is kept in sessionStorage for this browser tab/session, not written to GitHub or the customer Sheet.</p>
      </div>

      <div id="cloudPilotConnected" class="hidden">
        <div id="cloudPilotCurrent" class="sub" style="margin-bottom:.55rem;">No Cloud customer linked to this form yet.</div>
        <div class="pills">
          <button class="pill" type="button" id="cloudPilotSave">☁️ Save to Cloud</button>
          <button class="pill" type="button" id="cloudPilotLoad">☁️ Cloud customers</button>
        </div>
        <button type="button" id="cloudPilotDisconnect" style="margin-top:.55rem;background:none;border:none;padding:0;color:var(--muted);font:inherit;font-size:11px;cursor:pointer;">Disconnect Cloud for this session</button>
      </div>

      <div id="cloudPilotStatus" class="sub" style="margin-top:.65rem;min-height:1.2em;">Not connected.</div>
      <div id="cloudPilotList" class="hidden" style="margin-top:.7rem;"></div>
    `;
    anchor.parentNode.insertBefore(card, anchor);

    $c('cloudPilotPartnerId').value = localStorage.getItem(PARTNER_ID_KEY) || '';

    $c('cloudPilotConnect').addEventListener('click', connect);
    $c('cloudPilotDisconnect').addEventListener('click', disconnect);
    $c('cloudPilotSave').addEventListener('click', saveToCloud);
    $c('cloudPilotLoad').addEventListener('click', toggleCloudList);
  }

  function showConnected(on) {
    $c('cloudPilotLogin').classList.toggle('hidden', !!on);
    $c('cloudPilotConnected').classList.toggle('hidden', !on);
  }

  async function connect() {
    const partnerId = $c('cloudPilotPartnerId').value.trim();
    const workspaceKey = $c('cloudPilotWorkspaceKey').value;
    if (!partnerId || !workspaceKey) {
      setStatus('Enter both the Cloud Partner ID and Workspace Key.', 'bad');
      return;
    }

    const btn = $c('cloudPilotConnect');
    btn.disabled = true;
    setStatus('Connecting...');
    try {
      const auth = setAuth(partnerId, workspaceKey);
      const res = await api.listCustomers(auth);
      cloudCustomers = Array.isArray(res.customers) ? res.customers : [];
      $c('cloudPilotWorkspaceKey').value = '';
      showConnected(true);
      setStatus('Cloud connected ✓ ' + cloudCustomers.length + ' customer' + (cloudCustomers.length === 1 ? '' : 's') + '.', 'good');
      const current = cloudCustomers.find(c => c.customer_id === currentCloudCustomerId);
      setCurrent(current || null);
      renderCloudList();
    } catch (err) {
      clearAuth();
      showConnected(false);
      setStatus((err && err.message) || String(err), 'bad');
    } finally {
      btn.disabled = false;
    }
  }

  function disconnect() {
    clearAuth();
    cloudCustomers = [];
    showConnected(false);
    $c('cloudPilotList').classList.add('hidden');
    setCurrent(null);
    setStatus('Disconnected.');
  }

  async function refreshCustomers() {
    const auth = getAuth();
    if (!auth) throw new Error('Cloud is not connected.');
    const res = await api.listCustomers(auth);
    cloudCustomers = Array.isArray(res.customers) ? res.customers : [];
    renderCloudList();
    return cloudCustomers;
  }

  function renderCloudList() {
    const wrap = $c('cloudPilotList');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (!cloudCustomers.length) {
      wrap.innerHTML = '<p class="sub">No Cloud customers yet.</p>';
      return;
    }

    cloudCustomers.forEach(customer => {
      const row = document.createElement('div');
      row.className = 'basket-row';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

      const usage = customer.electricity_usage_kwh != null
        ? Number(customer.electricity_usage_kwh).toLocaleString('en-GB') + ' kWh'
        : 'no electricity usage saved';

      row.innerHTML = `
        <div style="min-width:0;flex:1;">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(customer.customer_name || 'Unnamed')}</div>
          <div class="sub" style="font-size:10.5px;">${esc(usage)}${customer.electricity_usage_revision ? ' · rev ' + Number(customer.electricity_usage_revision) : ''}${customer.updated_at ? ' · ' + esc(fmtDate(customer.updated_at)) : ''}</div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill';
      btn.style.cssText = 'min-height:36px;padding:6px 12px;flex:0;';
      btn.textContent = customer.customer_id === currentCloudCustomerId ? 'Linked' : 'Load';
      btn.disabled = customer.customer_id === currentCloudCustomerId;
      btn.addEventListener('click', () => loadCustomer(customer.customer_id));
      row.appendChild(btn);
      wrap.appendChild(row);
    });
  }

  async function toggleCloudList() {
    const wrap = $c('cloudPilotList');
    if (!wrap.classList.contains('hidden')) {
      wrap.classList.add('hidden');
      return;
    }
    setStatus('Loading Cloud customers...');
    try {
      await refreshCustomers();
      wrap.classList.remove('hidden');
      setStatus('Cloud customers refreshed ✓', 'good');
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    }
  }

  async function loadCustomer(customerId) {
    const auth = getAuth();
    if (!auth) return setStatus('Cloud is not connected.', 'bad');
    setStatus('Loading customer...');
    try {
      const res = await api.getCustomer(auth, customerId);
      const customer = res.customer;
      if (!customer) throw new Error('Customer was not returned by Cloud.');

      const appt = customer.appointment_state;
      if (appt && appt.inputs && appt.state && typeof window.restoreForm === 'function') {
        window.restoreForm(appt);
        setStatus(customer.customer_name + ' loaded from Cloud ✓', 'good');
      } else {
        if (typeof window.resetForm === 'function') window.resetForm();
        const nameEl = $c('customerName');
        if (nameEl) nameEl.value = customer.customer_name || '';
        const notesEl = $c('apptNotes');
        if (notesEl) notesEl.value = customer.private_notes || '';
        const basketEl = $c('basketLink');
        if (basketEl) basketEl.value = customer.basket_url || '';
        if (typeof window.calc === 'function') window.calc();
        setStatus(customer.customer_name + ' is linked. No full Appointment Companion state existed yet, so a fresh form has been started for this Cloud customer.', 'good');
      }

      setCurrent(customer);
      renderCloudList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    }
  }

  function preservedCustomerFields(existing) {
    if (!existing) return {};
    return {
      electricity_usage_kwh: existing.electricity_usage_kwh,
      electricity_usage_mode: existing.electricity_usage_mode || '',
      electricity_usage_preset: existing.electricity_usage_preset || '',
      electricity_usage_basis: existing.electricity_usage_basis || '',
      electricity_usage_source: existing.electricity_usage_source || '',
      electricity_usage_captured_at: existing.electricity_usage_captured_at || '',
      gas_usage_kwh: existing.gas_usage_kwh,
      ev_state_json: existing.ev_state == null ? null : existing.ev_state
    };
  }

  async function saveToCloud() {
    const auth = getAuth();
    if (!auth) return setStatus('Cloud is not connected.', 'bad');
    if (typeof window.serializeForm !== 'function') return setStatus('Appointment Companion save function not available.', 'bad');

    const data = window.serializeForm();
    const name = String(data.customerName || '').trim();
    if (!name) {
      setStatus('Add the customer name before saving to Cloud.', 'bad');
      const el = $c('customerName');
      if (el) el.focus();
      return;
    }

    const btn = $c('cloudPilotSave');
    btn.disabled = true;
    setStatus('Saving ' + name + ' to Cloud...');

    try {
      let existing = null;

      if (currentCloudCustomerId) {
        const got = await api.getCustomer(auth, currentCloudCustomerId);
        existing = got.customer || null;
      } else {
        await refreshCustomers();
        const matches = cloudCustomers.filter(c => String(c.customer_name || '').trim().toLowerCase() === name.toLowerCase());
        if (matches.length === 1) {
          const useExisting = confirm('A Cloud customer named "' + name + '" already exists.\n\nOK = update that Cloud customer\nCancel = create a separate customer record');
          if (useExisting) {
            const got = await api.getCustomer(auth, matches[0].customer_id);
            existing = got.customer || null;
          }
        }
      }

      const payload = Object.assign({}, preservedCustomerFields(existing), {
        customer_id: existing ? existing.customer_id : '',
        customer_name: name,
        appointment_state_json: data,
        basket_url: (data.inputs && data.inputs.basketLink) ? String(data.inputs.basketLink).trim() : '',
        private_notes: data.notes || ''
      });

      const res = await api.saveCustomer(auth, payload);
      const saved = res.customer;
      if (!saved) throw new Error('Cloud did not return the saved customer.');

      setCurrent(saved);
      await refreshCustomers();
      $c('cloudPilotList').classList.remove('hidden');
      setStatus(saved.customer_name + ' saved to Cloud ✓', 'good');
      btn.textContent = '✓ Saved to Cloud';
      setTimeout(() => { btn.textContent = '☁️ Save to Cloud'; }, 1600);
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    } finally {
      btn.disabled = false;
    }
  }

  async function boot() {
    buildPanel();
    const auth = getAuth();
    if (!auth) {
      showConnected(false);
      setCurrent(null);
      return;
    }

    showConnected(true);
    setStatus('Reconnecting to Cloud...');
    try {
      await refreshCustomers();
      const current = cloudCustomers.find(c => c.customer_id === currentCloudCustomerId);
      setCurrent(current || null);
      setStatus('Cloud connected ✓ ' + cloudCustomers.length + ' customer' + (cloudCustomers.length === 1 ? '' : 's') + '.', 'good');
    } catch (err) {
      clearAuth();
      showConnected(false);
      setCurrent(null);
      setStatus('Cloud session needs reconnecting: ' + ((err && err.message) || String(err)), 'bad');
    }
  }

  boot();
})();
