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
  let connectedWidgetObserver = null;

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
    if (ev) ev.classList.toggle('state-on', companionHasState('ev'));
    if (card) card.classList.toggle('state-on', !!($c('includeCashback') && $c('includeCashback').checked));
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
        #cloudPilotCard .cloudicon{width:36px;height:36px;border:1px solid rgba(122,66,200,.24);border-radius:10px;background:white;display:inline-flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;color:var(--ink);opacity:1;position:relative}
        #cloudPilotCard .cloudicon:disabled{opacity:.38;cursor:default}
        #cloudPilotCard .cloudicon.good{border-color:rgba(29,155,80,.35);background:rgba(29,155,80,.08)}
        #cloudPilotCard .state-on{border-color:rgba(29,155,80,.38);background:rgba(29,155,80,.08);box-shadow:inset 0 -2px 0 rgba(29,155,80,.38)}
        #cloudPilotCard .cloudtool-unbuilt{cursor:default}
        #cloudCustomerModal .sortbar{display:flex;gap:7px;margin:.7rem 0;align-items:center}
        #cloudCustomerModal .sortbar button{flex:0 0 auto;min-height:34px;padding:6px 10px}
        #cloudCustomerModal .cloud-customer-icons{display:flex;align-items:center;gap:7px;font-size:14px;min-width:0}
        #cloudCustomerModal .cloud-customer-icons .basket-icon{width:22px;height:22px}
        #cloudCustomerModal .cloud-companion-mini{opacity:.28;filter:grayscale(1)}
        #cloudCustomerModal .cloud-companion-mini.on{opacity:1;filter:none}
        @media(max-width:430px){#cloudPilotCard .cloudwho{flex:1 1 100%}#cloudPilotCard .cloudicons{width:100%;justify-content:space-between}#cloudPilotCard .cloudicon{width:34px;height:34px;font-size:17px}}
      </style>
      <div class="cloudbar">
        <div class="cloudwho">
          <strong>☁️ Cloud workspace</strong>
          <div id="cloudPilotCurrent" class="sub">No Cloud customer linked to this form yet.</div>
        </div>
        <div class="cloudicons">
          <button class="cloudicon" type="button" id="cloudBasketShortcut" data-cloud-action="basket" title="Basket link" aria-label="Basket link">🛒</button>
          <button class="cloudicon" type="button" id="cloudCompanionEv" title="EV Companion" aria-label="EV Companion">🚙</button>
          <span class="cloudicon cloudtool-unbuilt" id="cloudCompanionCard" title="Cashback Card Companion">💳</span>
          <button class="cloudicon" type="button" id="cloudPilotSave" data-cloud-action="save" title="Save to Cloud and keep a local backup" aria-label="Save to Cloud">💾</button>
          <button class="cloudicon" type="button" id="cloudPilotLoad" data-cloud-action="customers" title="Cloud customers" aria-label="Cloud customers">☁️</button>
          <button class="cloudicon" type="button" id="cloudPartnerMenu" data-cloud-action="partner" title="Partner details" aria-label="Partner details">👤</button>
          <button class="cloudicon" type="button" id="cloudPilotSettings" data-cloud-action="settings" title="Cloud settings" aria-label="Cloud settings">⚙️</button>
        </div>
      </div>

      <div id="cloudPilotConnected" class="hidden">
      </div>

      <div id="cloudPilotStatus" class="sub" style="margin-top:.65rem;min-height:1.2em;">Not connected.</div>
      <div id="cloudPilotList" class="hidden" style="margin-top:.7rem;"></div>
    `;
    const header = document.querySelector('.wrap header');
    if (header && header.parentNode) header.insertAdjacentElement('afterend', card);
    else anchor.parentNode.insertBefore(card, anchor);
    ensureConnectModal();
    ensureCustomerModal();
    ensureSettingsModal();
    enhancePartnerPrompt();
    observeConnectedWidgets();

    $c('cloudPilotPartnerId').value = localStorage.getItem(PARTNER_ID_KEY) || '';

    card.addEventListener('click', e => {
      const action = e.target && e.target.closest ? e.target.closest('[data-cloud-action]') : null;
      if (!action) return;
      e.preventDefault();
      if (action.dataset.cloudAction === 'save') saveToCloud();
      if (action.dataset.cloudAction === 'customers') toggleCloudList();
      if (action.dataset.cloudAction === 'partner') openPartnerProfile();
      if (action.dataset.cloudAction === 'settings') openSettingsModal();
      if (action.dataset.cloudAction === 'basket') focusBasketLink();
    });
    $c('cloudPartnerMenu').onclick = openPartnerProfile;
    document.addEventListener('input', updateCompanionIndicators, true);
    document.addEventListener('change', updateCompanionIndicators, true);
    document.addEventListener('input', syncNotesVisibility, true);
    document.addEventListener('change', syncNotesVisibility, true);
    updateCompanionIndicators();
    syncNotesVisibility();
  }

  function showConnected(on) {
    $c('cloudPilotConnected').classList.toggle('hidden', !on);
    relocateConnectedWidgets();
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
      closeConnectModal();
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

    const icon = (emoji, on, grouped) =>
      '<span class="basket-icon' + (grouped ? ' basket-icon-grouped' : '') + (on ? '' : ' could') + '">' + emoji + '</span>';

    customers.forEach(customer => {
      const appt = appointmentSnapshot(customer);
      const sum = (appt && appt.summary) || {};
      const specialists = (appt && appt.state && appt.state._journey && appt.state._journey.specialists) || {};
      const evUsed = !!(customer.ev_state || customer.ev_state_json || specialists.ev);
      const cardUsed = !!(customer.card_state || customer.card_state_json || specialists.card || specialists.cashback_card);
      const row = document.createElement('div');
      row.className = 'basket-row';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;';

      const usage = customer.electricity_usage_kwh != null
        ? Number(customer.electricity_usage_kwh).toLocaleString('en-GB') + ' kWh'
        : 'no electricity usage saved';

      const iconsHtml =
        '<span class="cloud-customer-icons">' +
          icon('⚡🔥', !!sum.energy, true) +
          icon('🛜', !!sum.broadband, false) +
          icon('📱', (sum.sims || 0) >= 1, false) +
          icon('📱', (sum.sims || 0) >= 2, false) +
          icon('🛡️', !!sum.insurance, false) +
          '<span class="cloud-companion-mini' + (evUsed ? ' on' : '') + '" title="EV Companion">🚙</span>' +
          '<span class="cloud-companion-mini' + (cardUsed ? ' on' : '') + '" title="Cashback Card Companion">💳</span>' +
        '</span>';

      let heroTxt = '', heroColor = 'var(--good)';
      if (sum.year1 !== undefined) {
        if (sum.valid === false) {
          heroTxt = 'draft';
          heroColor = 'var(--muted)';
        } else {
          heroTxt = (sum.year1 < 0 ? '−£' : '£') + Math.abs(sum.year1).toLocaleString('en-GB');
          heroColor = sum.year1 < 0 ? 'var(--bad)' : 'var(--good)';
        }
      }

      row.innerHTML = `
        <div style="min-width:0;flex:1;">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${esc(customer.customer_name || 'Unnamed')}
            ${heroTxt ? '<span style="color:' + heroColor + ';font-weight:800;"> ' + heroTxt + '</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:3px;min-width:0;flex-wrap:wrap;">
            ${iconsHtml}
            <span class="sub" style="font-size:11px;">${customer.updated_at ? esc(fmtDate(customer.updated_at)) : esc(usage)}</span>
          </div>
          ${heroTxt ? '<div class="sub" style="font-size:10.5px;margin-top:2px;">' + esc(usage) + (customer.electricity_usage_revision ? ' · rev ' + Number(customer.electricity_usage_revision) : '') + '</div>' : ''}
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

  function parseMaybeJson(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_) { return null; }
  }

  function appointmentSnapshot(customer) {
    if (!customer) return null;
    return parseMaybeJson(customer.appointment_state) ||
      parseMaybeJson(customer.appointment_state_json) ||
      parseMaybeJson(customer.appointment_snapshot) ||
      null;
  }

  function ensureConnectModal() {
    if ($c('cloudConnectModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudConnectModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:440px;">
        <h3>☁️ Connect Cloud</h3>
        <p class="sub">Connect once for this browser session. The Workspace Key is kept in sessionStorage, not written to GitHub or the customer Sheet.</p>
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
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudConnectClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudPilotConnect').addEventListener('click', connect);
    $c('cloudConnectClose').addEventListener('click', closeConnectModal);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudConnectModal') closeConnectModal(); });
  }

  function openConnectModal() {
    ensureConnectModal();
    $c('cloudPilotPartnerId').value = localStorage.getItem(PARTNER_ID_KEY) || '';
    $c('cloudConnectModal').classList.add('open');
    const id = $c('cloudPilotPartnerId');
    const key = $c('cloudPilotWorkspaceKey');
    setTimeout(() => ((id && !id.value) ? id : key).focus(), 80);
  }

  function closeConnectModal() {
    const modal = $c('cloudConnectModal');
    if (modal) modal.classList.remove('open');
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
    if (!getAuth()) {
      openConnectModal();
      setStatus('Connect Cloud to list customers.');
      return;
    }
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

  function openPartnerProfile() {
    if ($c('partnerSettingsBtn')) $c('partnerSettingsBtn').click();
    enhancePartnerPrompt();
  }

  function openSettingsModal() {
    ensureSettingsModal();
    relocateConnectedWidgets();
    $c('cloudSettingsModal').classList.add('open');
  }

  function closeSettingsModal() {
    const modal = $c('cloudSettingsModal');
    if (modal) modal.classList.remove('open');
  }

  function ensureSettingsModal() {
    if ($c('cloudSettingsModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudSettingsModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:440px;">
        <h3>⚙️ Cloud settings</h3>
        <p class="sub">Cloud session, device, autosave and presence controls.</p>
        <div class="pills" style="margin-top:.75rem;">
          <button class="pill" type="button" id="cloudSettingsConnect">☁️ Connect Cloud</button>
          <button class="pill" type="button" id="cloudSettingsReload">🔄 Reload current from Cloud</button>
          <button class="pill" type="button" id="cloudSettingsDisconnect">Disconnect Cloud for this session</button>
        </div>
        <div id="cloudSettingsDynamic" style="margin-top:.75rem;"></div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudSettingsClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudSettingsClose').addEventListener('click', closeSettingsModal);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudSettingsModal') closeSettingsModal(); });
    $c('cloudSettingsConnect').addEventListener('click', () => {
      closeSettingsModal();
      openConnectModal();
    });
    $c('cloudSettingsReload').addEventListener('click', () => {
      closeSettingsModal();
      reloadCurrent();
    });
    $c('cloudSettingsDisconnect').addEventListener('click', () => {
      closeSettingsModal();
      disconnect();
    });
  }

  function enhancePartnerPrompt() {
    const prompt = $c('partnerPrompt');
    if (!prompt || $c('partnerLocalBackupTools')) return;
    const box = document.createElement('div');
    box.id = 'partnerLocalBackupTools';
    box.style.cssText = 'border-top:1px solid var(--line);margin-top:1rem;padding-top:.8rem;';
    box.innerHTML = `
      <p class="sub" style="margin-bottom:.55rem;font-size:11px;">Local save and backup tools for this device.</p>
      <div class="pills">
        <button class="pill" type="button" id="partnerLocalSaves">💾 Local saves</button>
        <button class="pill" type="button" id="partnerOpenLocalFile">📂 Open local file</button>
      </div>
    `;
    prompt.appendChild(box);
    $c('partnerLocalSaves').addEventListener('click', () => {
      const saves = $c('savesCard');
      if (saves) saves.classList.remove('hidden');
      if ($c('loadProfileBtn')) $c('loadProfileBtn').click();
      if (saves) saves.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $c('partnerOpenLocalFile').addEventListener('click', () => {
      if ($c('loadFileInput')) $c('loadFileInput').click();
    });
  }

  function relocateConnectedWidgets() {
    ensureSettingsModal();
    const target = $c('cloudSettingsDynamic');
    if (!target) return;
    ['cloudPilotDeviceBox', 'cloudPilotAutosaveState', 'cloudPilotPresenceState'].forEach(id => {
      const el = $c(id);
      if (el && el.parentNode !== target) target.appendChild(el);
    });
  }

  function observeConnectedWidgets() {
    const connected = $c('cloudPilotConnected');
    if (!connected || connectedWidgetObserver) return;
    connectedWidgetObserver = new MutationObserver(relocateConnectedWidgets);
    connectedWidgetObserver.observe(connected, { childList: true });
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
    if (!auth) {
      openConnectModal();
      return setStatus('Connect Cloud before saving.');
    }
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
