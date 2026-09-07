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
  const LOCAL_BACKUP_KEY = 'apptCompanionSaves_v2';

  let cloudCustomers = [];
  let currentCloudCustomerId = sessionStorage.getItem(CURRENT_CUSTOMER_KEY) || '';
  let customerSort = localStorage.getItem('apptCloudPilotCustomerSort') || 'date';

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

  function localBackupId(customerId, name) {
    return 'cloud:' + (customerId || String(name || '').trim().toLowerCase() || 'draft');
  }

  function stashCloudLocalBackup(data, savedCustomer, status) {
    if (!data || !data.customerName) return false;
    try {
      const id = localBackupId(savedCustomer && savedCustomer.customer_id, data.customerName);
      const saves = JSON.parse(localStorage.getItem(LOCAL_BACKUP_KEY) || '[]').filter(rec => rec && rec.id !== id);
      const copy = JSON.parse(JSON.stringify(data));
      copy.savedAt = new Date().toISOString();
      copy.cloud_backup = {
        status: status || 'saved',
        customer_id: savedCustomer && savedCustomer.customer_id ? savedCustomer.customer_id : currentCloudCustomerId || '',
        backed_up_at: copy.savedAt
      };
      saves.unshift({
        id: id,
        label: copy.customerName || 'Unnamed',
        savedAt: copy.savedAt,
        data: copy
      });
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(saves.slice(0, 30)));
      if (typeof window.renderSavesList === 'function') window.renderSavesList();
      return true;
    } catch (_) {
      return false;
    }
  }

  function companionHasState(toolId) {
    try {
      const bridge = window.AppointmentCompanionBridge;
      return !!(bridge && typeof bridge.getToolState === 'function' && bridge.getToolState(toolId));
    } catch (_) {
      return false;
    }
  }

  function updateCompanionIndicators() {
    const ev = $c('cloudCompanionEv');
    const card = $c('cloudCompanionCard');
    if (ev) ev.classList.toggle('on', companionHasState('ev'));
    if (card) card.classList.toggle('on', !!($c('includeCashback') && $c('includeCashback').checked));
  }

  function syncNotesVisibility() {
    const card = $c('notesCard');
    const notes = $c('apptNotes');
    const name = $c('customerName');
    if (!card || !notes) return;
    const hasCustomerContext = currentCloudCustomerId || (name && String(name.value || '').trim());
    const hasNotes = String(notes.value || '').trim();
    card.classList.toggle('hidden', !(hasCustomerContext || hasNotes));
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
    card.style.cssText = 'border-color:rgba(122,66,200,0.22);background:rgba(122,66,200,0.035);padding:.7rem .75rem;';
    card.innerHTML = `
      <style>
        #cloudPilotCard .cloudbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;flex-wrap:wrap}
        #cloudPilotCard .cloudwho{min-width:0;flex:1}
        #cloudPilotCard .cloudwho strong{display:block;font-size:13px;color:var(--purple);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #cloudPilotCard .cloudicons{display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
        #cloudPilotCard .cloudicon{width:36px;height:36px;border:1px solid rgba(122,66,200,.24);border-radius:10px;background:white;display:inline-flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;color:var(--ink);opacity:.95}
        #cloudPilotCard .cloudicon:disabled{opacity:.38;cursor:default}
        #cloudPilotCard .cloudicon.good{border-color:rgba(29,155,80,.35);background:rgba(29,155,80,.08)}
        #cloudPilotCard .companion-dot{opacity:.28;filter:grayscale(1)}
        #cloudPilotCard .companion-dot.on{opacity:1;filter:none;border-color:rgba(29,155,80,.34);background:rgba(29,155,80,.08)}
        #cloudCustomerModal .sortbar{display:flex;gap:7px;margin:.7rem 0;align-items:center}
        #cloudCustomerModal .sortbar button{flex:0 0 auto;min-height:34px;padding:6px 10px}
        @media(max-width:430px){#cloudPilotCard .cloudwho{flex:1 1 100%}#cloudPilotCard .cloudicons{width:100%;justify-content:space-between}#cloudPilotCard .cloudicon{width:34px;height:34px;font-size:17px}}
      </style>
      <div class="cloudbar">
        <div class="cloudwho">
          <strong>☁️ Cloud workspace</strong>
          <div id="cloudPilotCurrent" class="sub">No Cloud customer linked to this form yet.</div>
        </div>
        <div class="cloudicons">
          <button class="cloudicon" type="button" id="cloudBasketShortcut" data-cloud-action="basket" title="Basket link" aria-label="Basket link">🛒</button>
          <span class="cloudicon companion-dot" id="cloudCompanionEv" title="EV Companion state">🚙</span>
          <span class="cloudicon companion-dot" id="cloudCompanionCard" title="Cashback Card Companion state">💳</span>
          <button class="cloudicon" type="button" id="cloudPilotSave" data-cloud-action="save" title="Save to Cloud and keep a local backup" aria-label="Save to Cloud">☁️</button>
          <button class="cloudicon" type="button" id="cloudPilotLoad" data-cloud-action="customers" title="Cloud customers" aria-label="Cloud customers">☁️</button>
          <button class="cloudicon" type="button" id="cloudPilotReloadCurrent" data-cloud-action="reload" title="Reload current from Cloud" aria-label="Reload current from Cloud">🔄</button>
          <button class="cloudicon" type="button" id="cloudPartnerMenu" data-cloud-action="tools" title="Profile and local saves" aria-label="Profile and local saves">👤</button>
        </div>
      </div>

      <div id="cloudPilotLogin">
        <div class="field">
          <label for="cloudPilotPartnerId">Cloud Partner ID</label>
          <input type="text" id="cloudPilotPartnerId" autocomplete="off" spellcheck="false" placeholder="p_...">
        </div>
        <div class="field">
          <label for="cloudPilotWorkspaceKey">Workspace Key</label>
          <input type="password" id="cloudPilotWorkspaceKey" autocomplete="off" spellcheck="false" placeholder="Private Workspace Key">
        </div>
        <button class="pill" type="button" id="cloudPilotConnect" data-cloud-action="connect" style="width:100%;">Connect Cloud</button>
        <p class="sub" style="font-size:10.5px;margin-top:.45rem;">Pilot only: the Workspace Key is kept in sessionStorage for this browser tab/session, not written to GitHub or the customer Sheet.</p>
      </div>

      <div id="cloudPilotConnected" class="hidden">
        <button type="button" id="cloudPilotDisconnect" data-cloud-action="disconnect" style="margin-top:.55rem;background:none;border:none;padding:0;color:var(--muted);font:inherit;font-size:11px;cursor:pointer;">Disconnect Cloud for this session</button>
      </div>

      <div id="cloudPilotStatus" class="sub" style="margin-top:.65rem;min-height:1.2em;">Not connected.</div>
      <div id="cloudPilotList" class="hidden" style="margin-top:.7rem;"></div>
    `;
    const header = document.querySelector('.wrap header');
    if (header && header.parentNode) header.insertAdjacentElement('afterend', card);
    else anchor.parentNode.insertBefore(card, anchor);
    ensureCustomerModal();
    ensureToolsModal();

    $c('cloudPilotPartnerId').value = localStorage.getItem(PARTNER_ID_KEY) || '';

    card.addEventListener('click', e => {
      const action = e.target && e.target.closest ? e.target.closest('[data-cloud-action]') : null;
      if (!action) return;
      e.preventDefault();
      if (action.dataset.cloudAction === 'connect') connect();
      if (action.dataset.cloudAction === 'disconnect') disconnect();
      if (action.dataset.cloudAction === 'save') saveToCloud();
      if (action.dataset.cloudAction === 'customers') toggleCloudList();
      if (action.dataset.cloudAction === 'reload') reloadCurrent();
      if (action.dataset.cloudAction === 'tools') openPartnerTools();
      if (action.dataset.cloudAction === 'basket') focusBasketLink();
    });
    $c('cloudPartnerMenu').onclick = openPartnerTools;
    document.addEventListener('input', updateCompanionIndicators, true);
    document.addEventListener('change', updateCompanionIndicators, true);
    document.addEventListener('input', syncNotesVisibility, true);
    document.addEventListener('change', syncNotesVisibility, true);
    updateCompanionIndicators();
    syncNotesVisibility();
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
    const wrap = $c('cloudPilotListBody') || $c('cloudPilotList');
    if (!wrap) return;
    wrap.innerHTML = '';

    if (!cloudCustomers.length) {
      wrap.innerHTML = '<p class="sub">No Cloud customers yet.</p>';
      return;
    }

    const customers = cloudCustomers.slice().sort((a, b) => {
      if (customerSort === 'name') return String(a.customer_name || '').localeCompare(String(b.customer_name || ''), 'en-GB', { sensitivity: 'base' });
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });

    customers.forEach(customer => {
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

  function ensureCustomerModal() {
    if ($c('cloudCustomerModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudCustomerModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:520px;">
        <h3>☁️ Cloud customers</h3>
        <p class="sub">Load a Cloud customer into this Companion.</p>
        <div class="sortbar">
          <button class="pill" type="button" id="cloudSortDate">Recent</button>
          <button class="pill" type="button" id="cloudSortName">Name</button>
        </div>
        <div id="cloudPilotListBody"></div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudCustomerClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudCustomerClose').addEventListener('click', closeCloudList);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudCustomerModal') closeCloudList(); });
    $c('cloudSortDate').addEventListener('click', () => setCustomerSort('date'));
    $c('cloudSortName').addEventListener('click', () => setCustomerSort('name'));
  }

  function setCustomerSort(sort) {
    customerSort = sort === 'name' ? 'name' : 'date';
    localStorage.setItem('apptCloudPilotCustomerSort', customerSort);
    $c('cloudSortDate').classList.toggle('on', customerSort === 'date');
    $c('cloudSortName').classList.toggle('on', customerSort === 'name');
    renderCloudList();
  }

  async function toggleCloudList() {
    setStatus('Loading Cloud customers...');
    try {
      await refreshCustomers();
      openCloudList();
      setStatus('Cloud customers refreshed ✓', 'good');
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    }
  }

  function openCloudList() {
    ensureCustomerModal();
    setCustomerSort(customerSort);
    $c('cloudCustomerModal').classList.add('open');
  }

  function closeCloudList() {
    const modal = $c('cloudCustomerModal');
    if (modal) modal.classList.remove('open');
  }

  function focusBasketLink() {
    const cashback = $c('cashbackCard');
    if (cashback) cashback.classList.remove('hidden');
    const details = $c('basketLinkDetails');
    if (details) details.open = true;
    const input = $c('basketLink');
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => input.focus(), 250);
    }
  }

  function openPartnerTools() {
    ensureToolsModal();
    $c('cloudToolsModal').classList.add('open');
  }

  function closeToolsModal() {
    const modal = $c('cloudToolsModal');
    if (modal) modal.classList.remove('open');
  }

  function ensureToolsModal() {
    if ($c('cloudToolsModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudToolsModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:440px;">
        <h3>👤 Workspace menu</h3>
        <p class="sub">Profile, local saves and recovery options for this device.</p>
        <div class="pills" style="margin-top:.75rem;">
          <button class="pill" type="button" id="cloudMenuProfile">👤 Partner profile</button>
          <button class="pill" type="button" id="cloudMenuLocalSaves">💾 Local saves</button>
          <button class="pill" type="button" id="cloudMenuOpenFile">📂 Open file</button>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudToolsClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudToolsClose').addEventListener('click', closeToolsModal);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudToolsModal') closeToolsModal(); });
    $c('cloudMenuProfile').addEventListener('click', () => {
      closeToolsModal();
      if ($c('partnerSettingsBtn')) $c('partnerSettingsBtn').click();
    });
    $c('cloudMenuLocalSaves').addEventListener('click', () => {
      closeToolsModal();
      const saves = $c('savesCard');
      if (saves) saves.classList.remove('hidden');
      if ($c('loadProfileBtn')) $c('loadProfileBtn').click();
      if (saves) saves.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $c('cloudMenuOpenFile').addEventListener('click', () => {
      closeToolsModal();
      if ($c('loadFileInput')) $c('loadFileInput').click();
    });
  }

  async function reloadCurrent() {
    if (!currentCloudCustomerId) return setStatus('No linked Cloud customer to reload yet.', 'bad');
    await loadCustomer(currentCloudCustomerId);
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
      syncNotesVisibility();
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
      stashCloudLocalBackup(data, saved, 'saved');

      setCurrent(saved);
      syncNotesVisibility();
      await refreshCustomers();
      setStatus(saved.customer_name + ' saved to Cloud ✓ Local backup kept.', 'good');
      btn.classList.add('good');
      setTimeout(() => { btn.classList.remove('good'); }, 1600);
    } catch (err) {
      const backedUp = stashCloudLocalBackup(data, null, 'cloud_failed');
      setStatus('Cloud save failed. ' + (backedUp ? 'Local backup kept on this device. ' : '') + ((err && err.message) || String(err)), 'bad');
    } finally {
      btn.disabled = false;
      updateCompanionIndicators();
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
      syncNotesVisibility();
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
