/* Appointment Companion Cloud pilot v1
   Adds Cloud connect, save and load to the isolated cloud pilot.
   Companion Login ID is remembered locally; the Password is session-only.
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
  const RECENT_CUSTOMERS_KEY = 'apptCompanionRecentCustomersV1';
  const ONBOARDING_STATE_KEY = 'apptCompanionOnboardingStateV2';
  const LEGACY_ONBOARDING_KEY = 'apptCompanionOnboardingCompleteV1';
  const LEGACY_ONBOARDING_STEP_KEY = 'apptCompanionOnboardingStepV1';
  const ADRIAN_WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=447787400800';
  const ADRIAN_TEL_URL = 'tel:+447787400800';

  let cloudCustomers = [];
  let currentCloudCustomerId = sessionStorage.getItem(CURRENT_CUSTOMER_KEY) || '';
  let currentCloudCustomer = null;
  let customerSort = localStorage.getItem('apptCloudPilotCustomerSort') || 'date';
  let customerSortDir = localStorage.getItem('apptCloudPilotCustomerSortDir') || 'asc';
  let connectedWidgetObserver = null;
  let loadingDepth = 0;
  let activeSettingsSection = 'hub';
  let onboardingPartnerSuspended = false;
  let onboardingExplicit = false;
  let workingRecordTimer = null;

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
    const basket = $c('cloudBasketShortcut');
    const basketInput = $c('basketLink');
    if (ev) ev.classList.toggle('state-on', companionHasState('ev'));
    if (card) card.classList.toggle('state-on', !!($c('includeCashback') && $c('includeCashback').checked));
    if (basket) basket.classList.toggle('state-on', !!(basketInput && String(basketInput.value || '').trim()));
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
    currentCloudCustomer = customer || null;
    currentCloudCustomerId = customer && customer.customer_id ? customer.customer_id : '';
    if (currentCloudCustomerId) sessionStorage.setItem(CURRENT_CUSTOMER_KEY, currentCloudCustomerId);
    else sessionStorage.removeItem(CURRENT_CUSTOMER_KEY);
    const bridge = window.AppointmentCompanionBridge;
    if (customer && bridge && typeof bridge.updateWorkingRecord === 'function') {
      bridge.updateWorkingRecord({
        customer_id: currentCloudCustomerId,
        customer_name: String(customer.customer_name || '').trim()
      });
      rememberRecentCustomer(customer);
    }
    renderCloudCurrent();
    renderRecentCustomers();
  }

  function summaryIconHtml(sum, tiny) {
    sum = sum || {};
    const cls = tiny ? ' cloud-mini-icon' : '';
    const icon = (emoji, on, grouped) =>
      '<span class="basket-icon' + cls + (grouped ? ' basket-icon-grouped' : '') + (on ? '' : ' could') + '">' + emoji + '</span>';
    return icon('⚡', !!sum.energy, false) +
      icon('🔥', !!sum.energy, false) +
      icon('🛜', !!sum.broadband, false) +
      icon('📱', (sum.sims || 0) >= 1, false) +
      icon('📱', (sum.sims || 0) >= 2, false) +
      icon('🛡️', !!sum.insurance, false) +
      icon('🛒', !!sum.basketLink, false) +
      icon('✉️', !!sum.quoteShared, false);
  }

  function currentAppointmentSnapshot() {
    if (typeof window.serializeForm === 'function') {
      try { return window.serializeForm(); } catch (_) {}
    }
    return appointmentSnapshot(currentCloudCustomer) || null;
  }

  function renderCloudCurrent() {
    const el = $c('cloudPilotCurrent');
    if (!el) return;
    const data = currentAppointmentSnapshot() || {};
    const sum = Object.assign({}, data.summary || {});
    const basketInput = $c('basketLink');
    sum.basketLink = !!(sum.basketLink || (basketInput && String(basketInput.value || '').trim()));
    sum.quoteShared = !!(sum.quoteShared || data.quoteSharedAt);
    const specialists = (data.state && data.state._journey && data.state._journey.specialists) || {};
    const evUsed = !!((currentCloudCustomer && (currentCloudCustomer.ev_state || currentCloudCustomer.ev_state_json)) || specialists.ev || companionHasState('ev'));
    const cardUsed = !!((currentCloudCustomer && (currentCloudCustomer.card_state || currentCloudCustomer.card_state_json)) || specialists.card || specialists.cashback_card || ($c('includeCashback') && $c('includeCashback').checked));
    const nameEl = $c('customerName');
    const name = String((nameEl && nameEl.value) || data.customerName || (currentCloudCustomer && currentCloudCustomer.customer_name) || '').trim() || 'New customer';
    el.innerHTML = '<button class="cloud-current-name" type="button" data-cloud-action="customer-name" title="Edit customer name">' + esc(name) + '</button>' +
      '<span class="cloud-current-icons">' + summaryIconHtml(sum, true) +
        '<span class="cloud-companion-mini' + (evUsed ? ' on' : '') + '" title="EV Companion">🚙</span>' +
        '<span class="cloud-companion-mini' + (cardUsed ? ' on' : '') + '" title="Cashback Card Companion">💳</span>' +
      '</span>';
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
        #cloudPilotCard{position:relative}
        #cloudPilotCard .cloudbar{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;min-width:0}
        #cloudPilotCard .cloudwho{min-width:0;flex:1}
        #cloudPilotCard .cloudwho strong{display:block;font-size:13px;color:var(--purple);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #cloudPilotCard .cloud-current-line{display:flex;align-items:center;gap:9px;min-width:0;flex-wrap:wrap;margin-top:2px}
        #cloudPilotCard .cloud-current-name{border:0;background:transparent;padding:0;font:inherit;font-size:12px;font-weight:750;color:var(--ink);cursor:pointer}
        #cloudPilotCard .cloud-current-icons{display:inline-flex;align-items:center;gap:6px}
        #cloudPilotCard .cloud-mini-icon{font-size:13px}
        #cloudPilotCard .cloud-companion-mini{opacity:.28;filter:grayscale(1);font-size:13px}
        #cloudPilotCard .cloud-companion-mini.on{opacity:1;filter:none}
        #cloudPilotCard .cloud-tariff-slot{margin-top:.48rem}
        #cloudPilotCard .cloud-tariff-slot #tariffStatus{margin:0!important}
        #cloudPilotCard .cloudicons{display:flex;align-items:center;gap:5px;flex-shrink:0;justify-content:flex-end;margin-left:auto}
        #cloudPilotCard .cloudicon{width:36px;height:36px;border:1px solid rgba(122,66,200,.24);border-radius:10px;background:white;display:inline-flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;color:var(--ink);opacity:1;position:relative}
        #cloudPilotCard .cloudicon:disabled{opacity:.38;cursor:default}
        #cloudPilotCard .cloudicon.good{border-color:rgba(29,155,80,.35);background:rgba(29,155,80,.08)}
        #cloudPilotCard .state-on{border-color:rgba(29,155,80,.38);background:rgba(29,155,80,.08);box-shadow:inset 0 -2px 0 rgba(29,155,80,.38)}
        #cloudPilotCard .cloudtool-unbuilt{cursor:default}
        #cloudPilotCard .cloudActionToggle{display:inline-flex}
        #cloudPilotCard .cloud-top-shortcut{display:inline-flex}
        #cloudPilotCard .cloud-menu-popover{position:absolute;right:.75rem;top:calc(100% - .25rem);z-index:50;width:min(310px,calc(100vw - 32px));padding:.45rem;border:1px solid rgba(122,66,200,.18);border-radius:12px;background:white;box-shadow:0 16px 40px rgba(38,22,79,.18);display:none}
        #cloudPilotCard .cloud-menu-popover.open{display:grid;gap:6px}
        #cloudPilotCard .cloud-menu-popover .cloud-menu-item{width:100%;min-height:40px;justify-content:flex-start;text-align:left;gap:9px}
        #cloudPilotCard .cloud-menu-popover .menu-ico{width:1.6em;text-align:center}
        #cloudPilotCard .cloud-recent{margin-top:.55rem;border-top:1px solid rgba(122,66,200,.12);padding-top:.45rem}
        #cloudPilotCard .cloud-recent summary{cursor:pointer;color:var(--purple);font-size:12px;font-weight:800;list-style-position:inside}
        #cloudPilotCard .cloud-recent-list{display:grid;gap:5px;margin-top:.45rem}
        #cloudPilotCard .cloud-recent-item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;min-height:40px;padding:7px 9px;border:1px solid rgba(122,66,200,.14);border-radius:9px;background:#fff;color:var(--ink);text-align:left;cursor:pointer}
        #cloudPilotCard .cloud-recent-name{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:800}
        #cloudPilotCard .cloud-recent-meta{display:block;margin-top:2px;font-size:10px;color:var(--muted)}
        #cloudPilotCard .cloud-local-state{margin-top:.38rem;font-size:10.5px;color:#1d7f45;font-weight:700}
        .cloud-menu-item .menu-ico{width:1.6em;text-align:center}
        .whatsapp-ico{width:18px;height:18px;border-radius:50%;background:#25D366;color:white;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;line-height:1}
        #cloudSettingsModal .cloud-settings-list{display:grid;gap:8px;margin-top:.75rem}
        #cloudSettingsModal .cloud-menu-item{width:100%;min-height:42px;justify-content:flex-start;text-align:left;gap:9px}
        #cloudSettingsModal .cloud-menu-item:disabled{opacity:.48;cursor:default}
        #cloudSettingsModal .cloud-menu-item .menu-ico{width:1.6em;text-align:center}
        #cloudSettingsModal .cloud-settings-pane{display:none}
        #cloudSettingsModal .cloud-settings-pane.open{display:block}
        #cloudSettingsModal .cloud-settings-back{margin-bottom:.65rem}
        #cloudSettingsModal .cloud-contact-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
        #cloudSettingsModal .cloud-about{margin-top:.8rem;padding:.75rem;border:1px solid var(--line);border-radius:10px;background:#fbfaff}
        #cloudSettingsModal .cloud-about h4{margin:0 0 .35rem;color:var(--purple);font-size:13px}
        #cloudSettingsModal .cloud-about p{margin:0;font-size:12px;line-height:1.45;color:var(--muted)}
        #cloudCustomerModal .cloud-table-head{display:grid;grid-template-columns:minmax(118px,.9fr) 74px minmax(260px,1.5fr) 112px 74px;gap:8px;align-items:center;margin:.7rem 0 .3rem;padding:0 .75rem;color:var(--muted);font-size:10px;font-weight:850;text-transform:uppercase}
        #cloudCustomerModal .cloud-sort{border:0;background:transparent;color:var(--purple);font:inherit;font-weight:850;text-transform:uppercase;padding:0;cursor:pointer;text-align:left}
        #cloudCustomerModal .cloud-customer-icons{display:flex;align-items:center;gap:7px;font-size:14px;min-width:0}
        #cloudCustomerModal .cloud-customer-icons .basket-icon{width:22px;height:22px}
        #cloudCustomerModal .cloud-companion-mini{opacity:.28;filter:grayscale(1)}
        #cloudCustomerModal .cloud-companion-mini.on{opacity:1;filter:none}
        #cloudCustomerModal .cloud-service-head{display:inline-flex;align-items:center;gap:5px}
        #cloudCustomerModal .cloud-service-head span{cursor:help}
        #cloudCustomerModal .cloud-row{display:grid;grid-template-columns:minmax(118px,.9fr) 74px minmax(260px,1.5fr) 112px 74px;gap:8px;align-items:center}
        #cloudLoadingOverlay{position:fixed;inset:0;z-index:14000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(38,22,79,.22);backdrop-filter:blur(2px)}
        #cloudLoadingOverlay.open{display:flex}
        #cloudLoadingOverlay .loading-card{width:min(320px,calc(100vw - 36px));padding:22px;border-radius:16px;background:#fff;color:var(--ink);box-shadow:0 18px 55px rgba(38,22,79,.24);text-align:center}
        #cloudLoadingOverlay .spinner{width:34px;height:34px;margin:0 auto 12px;border-radius:50%;border:4px solid rgba(122,66,200,.16);border-top-color:var(--purple);animation:cloudSpin .8s linear infinite}
        #cloudLoadingOverlay strong{display:block;font-size:16px;color:var(--purple)}
        #cloudLoadingOverlay p{margin:.35rem 0 0;font-size:12px;color:var(--muted)}
        @keyframes cloudSpin{to{transform:rotate(360deg)}}
        @media(max-width:720px){
          #cloudCustomerModal{padding:12px}
          #cloudCustomerModal .basket-prompt-card{width:100%!important;max-width:100%!important;max-height:calc(100dvh - 24px);overflow:auto;padding:14px}
          #cloudCustomerModal .cloud-table-head{display:none}
          #cloudCustomerModal .cloud-row{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"identity saving" "meta meta" "icons icons" "date action";gap:7px 12px;align-items:center;min-width:0;overflow:hidden;padding:.75rem;margin-bottom:.65rem}
          #cloudCustomerModal .cloud-row-identity{grid-area:identity;min-width:0}
          #cloudCustomerModal .cloud-row-saving{grid-area:saving;text-align:right;font-size:17px}
          #cloudCustomerModal .cloud-row-meta{grid-area:meta;display:block!important;font-size:11px!important}
          #cloudCustomerModal .cloud-row-icons{grid-area:icons;min-width:0}
          #cloudCustomerModal .cloud-customer-icons{display:flex;flex-wrap:wrap;gap:5px 7px;max-width:100%}
          #cloudCustomerModal .cloud-row-date{grid-area:date;font-size:11px!important;min-width:0}
          #cloudCustomerModal .cloud-row-action{grid-area:action;min-height:44px!important;min-width:86px;padding:8px 14px!important;justify-self:end}
        }
        @media(max-width:620px){#cloudPilotCard .cloudbar{align-items:flex-start;flex-wrap:wrap}#cloudPilotCard .cloudicons{width:100%;justify-content:space-between;margin-left:0}#cloudPilotCard .cloudicon{width:40px;height:40px;font-size:18px}#cloudPilotCard .cloud-menu-popover{left:.75rem;right:.75rem;width:auto}}
      </style>
      <div class="cloudbar">
        <div class="cloudwho">
          <strong>☁️ Cloud workspace</strong>
          <div id="cloudPilotCurrent" class="cloud-current-line"></div>
        </div>
        <div class="cloudicons">
          <button class="cloudicon cloud-top-shortcut" type="button" id="cloudCustomerShortcut" data-cloud-action="customers" title="Open customers" aria-label="Open customers">👥</button>
          <button class="cloudicon cloud-top-shortcut" type="button" id="cloudSaveShortcut" data-cloud-action="save" title="Save current customer" aria-label="Save current customer">💾</button>
          <button class="cloudicon cloud-top-shortcut" type="button" id="cloudCompanionEv" data-cloud-action="ev" title="EV Companion" aria-label="EV Companion">🚙</button>
          <button class="cloudicon cloud-top-shortcut" type="button" id="cloudCompanionCard" data-cloud-action="card" title="Cashback Card Companion" aria-label="Cashback Card Companion">💳</button>
          <button class="cloudicon cloud-top-shortcut" type="button" id="cloudShareShortcut" data-cloud-action="share" title="Share summary" aria-label="Share summary">📤</button>
          <button class="cloudicon cloudActionToggle" type="button" id="cloudActionMenu" data-cloud-action="toggle-actions" title="Show actions" aria-label="Show actions">☰</button>
        </div>
      </div>
      <div id="cloudTariffSlot" class="cloud-tariff-slot"></div>
      <div id="cloudLocalState" class="cloud-local-state" aria-live="polite">✓ Working copy saved locally</div>
      <details id="cloudRecent" class="cloud-recent">
        <summary>Recent customers / scenarios</summary>
        <div id="cloudRecentList" class="cloud-recent-list"></div>
      </details>
      <div id="cloudMenuPopover" class="cloud-menu-popover" role="menu" aria-label="Companion menu">
        <button class="pill cloud-menu-item" type="button" id="cloudPilotLoad" data-cloud-action="customers"><span class="menu-ico">👥</span><span>Customers / load customer</span></button>
        <button class="pill cloud-menu-item" type="button" id="cloudPilotSave" data-cloud-action="save"><span class="menu-ico">💾</span><span>Save now</span></button>
        <button class="pill cloud-menu-item" type="button" id="cloudPilotSaveAs" data-cloud-action="save-as"><span class="menu-ico">💾+</span><span>Save as new scenario</span></button>
        <button class="pill cloud-menu-item" type="button" id="cloudBasketShortcut" data-cloud-action="basket"><span class="menu-ico">🛒</span><span>Basket link</span></button>
        <button class="pill cloud-menu-item" type="button" data-cloud-action="settings"><span class="menu-ico">⚙️</span><span>Settings</span></button>
      </div>

      <div id="cloudPilotConnected" class="hidden">
      </div>

      <div id="cloudPilotStatus" class="sub" style="margin-top:.65rem;min-height:1.2em;">Not connected.</div>
      <div id="cloudPilotList" class="hidden" style="margin-top:.7rem;"></div>
    `;
    const header = document.querySelector('.wrap header');
    if (header && header.parentNode) header.insertAdjacentElement('beforebegin', card);
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
      if (action.dataset.cloudAction !== 'toggle-actions') closeActionMenu();
      if (action.dataset.cloudAction === 'save') saveToCloud();
      if (action.dataset.cloudAction === 'save-as') saveToCloud({ saveAs: true });
      if (action.dataset.cloudAction === 'customers') toggleCloudList();
      if (action.dataset.cloudAction === 'partner') openPartnerProfile();
      if (action.dataset.cloudAction === 'settings') openSettingsModal();
      if (action.dataset.cloudAction === 'customer-name') editCustomerName();
      if (action.dataset.cloudAction === 'basket') focusBasketLink();
      if (action.dataset.cloudAction === 'share') openShareSummary();
      if (action.dataset.cloudAction === 'card') openCardPlaceholder();
      if (action.dataset.cloudAction === 'toggle-actions') toggleActionTray();
      if (action.dataset.cloudAction === 'local-save') localSaveNow();
      if (action.dataset.cloudAction === 'local-open') openLocalBackups();
    });
    document.addEventListener('input', updateCompanionIndicators, true);
    document.addEventListener('change', updateCompanionIndicators, true);
    document.addEventListener('input', syncNotesVisibility, true);
    document.addEventListener('change', syncNotesVisibility, true);
    document.addEventListener('input', renderCloudCurrent, true);
    document.addEventListener('change', renderCloudCurrent, true);
    document.addEventListener('input', scheduleWorkingRecordSave, true);
    document.addEventListener('change', scheduleWorkingRecordSave, true);
    document.addEventListener('click', closeActionMenuOnOutside, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActionMenu(); });
    ['electricityUsageKwh', 'electricityUsageDayKwh', 'electricityUsageNightKwh'].forEach(id => {
      const el = $c(id);
      if (el) el.addEventListener('input', noteUsageEdit);
    });
    ['electricityUsageSource', 'gasUsageSource'].forEach(id => {
      const el = $c(id);
      if (el) el.addEventListener('change', noteUsageEdit);
    });
    const gasUsage = $c('gasUsageKwh');
    if (gasUsage) gasUsage.addEventListener('input', noteUsageEdit);
    ['energyHasElectricity', 'energyHasGas'].forEach(id => {
      const el = $c(id);
      if (el) el.addEventListener('change', syncEnergyUsageSections);
    });
    window.AppointmentCompanionCustomerContext = { currentDraft: draftCustomerContext };
    applyPendingCustomerPatch();
    updateUsageHint();
    updateCompanionIndicators();
    syncNotesVisibility();
    renderCloudCurrent();
    renderRecentCustomers();
    moveTariffStatusIntoBar();
    tuckLocalSaveCard();
    ensureLoadingOverlay();
    document.addEventListener('ac:main-reset', () => setTimeout(() => {
      const bridge = window.AppointmentCompanionBridge;
      if (bridge && typeof bridge.clearWorkingRecord === 'function') bridge.clearWorkingRecord();
      setCurrent(null);
      scheduleWorkingRecordSave(0);
      syncEnergyUsageSections();
    }, 0));
    syncEnergyUsageSections();
    maybeStartOnboarding();
  }

  function usageSourceLabel(source) {
    return ({
      customer_bill: 'Customer bill',
      uw_quote: 'UW quote / national database',
      manual: 'Manual / customer supplied',
      other: 'Other',
      estimate: 'Estimate / modelling',
      'legacy/unknown': 'Unknown / legacy'
    })[String(source || '')] || '';
  }

  function formUsage() {
    const input = $c('electricityUsageKwh');
    const value = input && input.value !== '' ? Number(input.value) : null;
    const kwh = Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    const sourceEl = $c('electricityUsageSource');
    const capturedEl = $c('electricityUsageCapturedAt');
    const basisEl = $c('electricityUsageBasis');
    const dayEl = $c('electricityUsageDayKwh');
    const nightEl = $c('electricityUsageNightKwh');
    const day = dayEl && dayEl.value !== '' && Number.isFinite(Number(dayEl.value)) ? Math.round(Number(dayEl.value)) : null;
    const night = nightEl && nightEl.value !== '' && Number.isFinite(Number(nightEl.value)) ? Math.round(Number(nightEl.value)) : null;
    const gasEl = $c('gasUsageKwh');
    const gasValue = gasEl && gasEl.value !== '' ? Number(gasEl.value) : null;
    const gas = Number.isFinite(gasValue) && gasValue > 0 ? Math.round(gasValue) : null;
    const gasSourceEl = $c('gasUsageSource');
    const gasCapturedEl = $c('gasUsageCapturedAt');
    return {
      electricity_usage_kwh: kwh,
      electricity_usage_source: kwh ? String((sourceEl && sourceEl.value) || 'legacy/unknown') : '',
      electricity_usage_captured_at: kwh ? String((capturedEl && capturedEl.value) || new Date().toISOString()) : '',
      electricity_usage_basis: kwh ? String((basisEl && basisEl.value) || '') : '',
      electricity_usage_day_kwh: day,
      electricity_usage_night_kwh: night,
      gas_usage_kwh: gas,
      gas_usage_source: gas ? String((gasSourceEl && gasSourceEl.value) || 'legacy/unknown') : '',
      gas_usage_captured_at: gas ? String((gasCapturedEl && gasCapturedEl.value) || new Date().toISOString()) : '',
      energy_has_electricity: !!($c('energyHasElectricity') && $c('energyHasElectricity').checked),
      energy_has_gas: !!($c('energyHasGas') && $c('energyHasGas').checked)
    };
  }

  function applyCanonicalUsage(customer) {
    if (!customer) return;
    const input = $c('electricityUsageKwh');
    const source = $c('electricityUsageSource');
    const captured = $c('electricityUsageCapturedAt');
    const basis = $c('electricityUsageBasis');
    if (customer.electricity_usage_kwh != null && Number.isFinite(Number(customer.electricity_usage_kwh))) {
      if (input) input.value = Math.round(Number(customer.electricity_usage_kwh));
      if (source) source.value = customer.electricity_usage_source || 'legacy/unknown';
      if (captured) captured.value = customer.electricity_usage_captured_at || '';
      if (basis) basis.value = customer.electricity_usage_basis || '';
    }
    if ($c('electricityUsageDayKwh') && customer.electricity_usage_day_kwh != null) $c('electricityUsageDayKwh').value = Math.round(Number(customer.electricity_usage_day_kwh));
    if ($c('electricityUsageNightKwh') && customer.electricity_usage_night_kwh != null) $c('electricityUsageNightKwh').value = Math.round(Number(customer.electricity_usage_night_kwh));
    if ($c('gasUsageKwh') && customer.gas_usage_kwh != null) $c('gasUsageKwh').value = Math.round(Number(customer.gas_usage_kwh));
    if ($c('gasUsageSource') && customer.gas_usage_kwh != null) $c('gasUsageSource').value = customer.gas_usage_source || 'legacy/unknown';
    if ($c('gasUsageCapturedAt') && customer.gas_usage_kwh != null) $c('gasUsageCapturedAt').value = customer.gas_usage_captured_at || '';
    if ($c('energyHasElectricity') && customer.energy_has_electricity !== undefined) $c('energyHasElectricity').checked = !!customer.energy_has_electricity;
    if ($c('energyHasGas') && customer.energy_has_gas !== undefined) $c('energyHasGas').checked = !!customer.energy_has_gas;
    syncEnergyUsageSections();
    updateUsageHint();
  }

  function updateUsageHint() {
    const hint = $c('electricityUsageHint');
    if (!hint) return;
    const usage = formUsage();
    const label = usageSourceLabel(usage.electricity_usage_source);
    hint.textContent = usage.electricity_usage_kwh
      ? usage.electricity_usage_kwh.toLocaleString('en-GB') + ' kWh/year' + (label ? ' · ' + label : '')
      : 'Useful when the figure is already available; it is not required for the appointment.';
  }

  function noteUsageEdit() {
    const day = $c('electricityUsageDayKwh');
    const night = $c('electricityUsageNightKwh');
    if (day && night && day.value !== '' && night.value !== '') {
      const total = Math.max(0, Number(day.value) || 0) + Math.max(0, Number(night.value) || 0);
      if ($c('electricityUsageKwh')) $c('electricityUsageKwh').value = Math.round(total);
    }
    const captured = $c('electricityUsageCapturedAt');
    const basis = $c('electricityUsageBasis');
    if (captured) captured.value = $c('electricityUsageKwh') && $c('electricityUsageKwh').value ? new Date().toISOString() : '';
    if (basis) basis.value = '';
    const gasCaptured = $c('gasUsageCapturedAt');
    if (gasCaptured) gasCaptured.value = $c('gasUsageKwh') && $c('gasUsageKwh').value ? new Date().toISOString() : '';
    updateUsageHint();
  }

  function syncEnergyUsageSections(event) {
    const electricity = $c('energyHasElectricity');
    const gas = $c('energyHasGas');
    if (electricity && gas && !electricity.checked && !gas.checked) {
      if (event && event.target === electricity) gas.checked = true;
      else electricity.checked = true;
    }
    if ($c('electricityUsageSection')) $c('electricityUsageSection').classList.toggle('hidden', electricity && !electricity.checked);
    if ($c('gasUsageSection')) $c('gasUsageSection').classList.toggle('hidden', gas && !gas.checked);
    updateUsageHint();
  }

  function draftCustomerContext() {
    const usage = formUsage();
    const working = currentCloudCustomer ? JSON.parse(JSON.stringify(currentCloudCustomer)) : {};
    return Object.assign(working, {
      customer_id: currentCloudCustomerId || '',
      customer_name: String(($c('customerName') && $c('customerName').value) || '').trim()
    }, usage);
  }

  function scheduleWorkingRecordSave(eventOrDelay) {
    const target = eventOrDelay && eventOrDelay.target;
    if (target && target.closest && target.closest('#cloudPilotCard,#cloudConnectModal,#cloudCustomerModal,#cloudSettingsModal,#cloudOnboardingModal,#cashbackPlaceholderModal')) return;
    const delay = typeof eventOrDelay === 'number' ? eventOrDelay : 180;
    const state = $c('cloudLocalState');
    if (state) {
      state.textContent = 'Saving working copy locally…';
      state.style.color = 'var(--muted)';
    }
    clearTimeout(workingRecordTimer);
    workingRecordTimer = setTimeout(() => {
      const bridge = window.AppointmentCompanionBridge;
      let saved = false;
      if (bridge && typeof bridge.saveAppointmentState === 'function') {
        try {
          saved = !!bridge.saveAppointmentState();
        } catch (err) {
          console.warn('Local working copy could not be saved.', err);
        }
      }
      if (state) {
        state.textContent = saved ? '✓ Working copy saved locally' : '⚠ Local working copy could not be saved';
        state.style.color = saved ? '#1d7f45' : '#a85b00';
      }
    }, Math.max(0, delay));
  }

  function readRecentCustomers() {
    try {
      const rows = JSON.parse(localStorage.getItem(RECENT_CUSTOMERS_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && row.customer_id).slice(0, 12) : [];
    } catch (_) { return []; }
  }

  function rememberRecentCustomer(customer) {
    if (!customer || !customer.customer_id) return;
    const appt = appointmentSnapshot(customer) || {};
    const row = {
      customer_id: String(customer.customer_id),
      customer_name: String(customer.customer_name || 'Unnamed'),
      updated_at: customer.updated_at || new Date().toISOString(),
      summary: Object.assign({}, appt.summary || {}),
      has_ev: !!(customer.ev_state || customer.ev_state_json || (appt.state && appt.state._journey && appt.state._journey.specialists && appt.state._journey.specialists.ev))
    };
    const rows = readRecentCustomers().filter(item => item.customer_id !== row.customer_id);
    rows.unshift(row);
    try { localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(rows.slice(0, 12))); } catch (_) {}
  }

  function rememberCustomerList(customers) {
    (customers || []).slice().sort((a, b) => new Date(a.updated_at || 0) - new Date(b.updated_at || 0)).forEach(rememberRecentCustomer);
    renderRecentCustomers();
  }

  function renderRecentCustomers() {
    const wrap = $c('cloudRecentList');
    const details = $c('cloudRecent');
    if (!wrap || !details) return;
    const rows = readRecentCustomers().slice(0, 5);
    details.classList.toggle('hidden', !rows.length);
    wrap.innerHTML = '';
    rows.forEach(row => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cloud-recent-item';
      const icons = summaryIconHtml(row.summary || {}, true) + (row.has_ev ? '<span title="EV Companion">🚙</span>' : '');
      button.innerHTML = '<span><span class="cloud-recent-name">' + esc(row.customer_name || 'Unnamed') + '</span><span class="cloud-recent-meta">Updated ' + esc(fmtDate(row.updated_at)) + '</span></span><span class="cloud-current-icons">' + icons + '</span>';
      button.addEventListener('click', () => {
        if (!getAuth()) {
          openConnectModal();
          setStatus('Connect Cloud to load this recent customer.');
          return;
        }
        loadCustomer(row.customer_id);
      });
      wrap.appendChild(button);
    });
  }

  function applyPendingCustomerPatch() {
    const bridge = window.AppointmentCompanionBridge;
    if (!bridge || typeof bridge.consumePendingCustomerPatch !== 'function') return;
    const patch = bridge.consumePendingCustomerPatch();
    if (!patch) return;
    let changed = false;
    if (patch.customer_name !== undefined) {
      const name = $c('customerName');
      if (name && String(patch.customer_name || '').trim() && name.value !== String(patch.customer_name || '').trim()) {
        name.value = String(patch.customer_name || '').trim();
        changed = true;
      }
    }
    const existing = formUsage();
    if (patch.electricity_usage_kwh != null && existing.electricity_usage_kwh == null) {
      applyCanonicalUsage(patch);
      changed = true;
    }
    if (changed) {
      if (typeof window.calc === 'function') window.calc();
      scheduleWorkingRecordSave(0);
      setStatus('Customer details brought back from EV Companion ✓', 'good');
    }
  }

  function showConnected(on) {
    $c('cloudPilotConnected').classList.toggle('hidden', !on);
    relocateConnectedWidgets();
  }

  function setInlineConnectError(id, message) {
    const el = id && $c(id);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  async function connect(options) {
    const opts = options || {};
    const partnerId = String(opts.partnerId !== undefined ? opts.partnerId : ($c('cloudPilotPartnerId') && $c('cloudPilotPartnerId').value) || '').trim();
    const enteredKey = String(opts.workspaceKey !== undefined ? opts.workspaceKey : ($c('cloudPilotWorkspaceKey') && $c('cloudPilotWorkspaceKey').value) || '');
    const sessionAuth = getAuth();
    const canReuseSession = !enteredKey && sessionAuth && sessionAuth.partner_id === partnerId;
    const workspaceKey = canReuseSession ? sessionAuth.workspace_key : enteredKey;
    const errorId = opts.errorId || 'cloudConnectError';
    setInlineConnectError(errorId, '');
    if (!partnerId || !workspaceKey) {
      const message = 'Enter both the Companion Login ID and Password.';
      setInlineConnectError(errorId, message);
      setStatus(message, 'bad');
      return false;
    }

    const btn = opts.button || $c('cloudPilotConnect');
    btn.disabled = true;
    setStatus('Connecting...');
    showLoading('Connecting to Companion...', 'Checking your Companion Login ID and Password.');
    try {
      const candidateAuth = { partner_id: partnerId, workspace_key: workspaceKey };
      const res = await api.listCustomers(candidateAuth);
      setAuth(partnerId, workspaceKey);
      cloudCustomers = Array.isArray(res.customers) ? res.customers : [];
      $c('cloudPilotWorkspaceKey').value = '';
      if (!opts.keepModal) closeConnectModal();
      showConnected(true);
      setStatus('Cloud connected ✓ ' + cloudCustomers.length + ' customer' + (cloudCustomers.length === 1 ? '' : 's') + '.', 'good');
      const current = cloudCustomers.find(c => c.customer_id === currentCloudCustomerId);
      setCurrent(current || null);
      renderCloudList();
      return true;
    } catch (err) {
      if (canReuseSession) clearAuth();
      if (!getAuth()) showConnected(false);
      const message = 'Login failed - please check your Companion Login ID and Password and try again.';
      setInlineConnectError(errorId, message);
      setStatus(message, 'bad');
      return false;
    } finally {
      hideLoading();
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
    rememberCustomerList(cloudCustomers);
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
      if (customerSort === 'name') {
        const byName = String(a.customer_name || '').localeCompare(String(b.customer_name || ''), 'en-GB', { sensitivity: 'base' });
        return customerSortDir === 'desc' ? -byName : byName;
      }
      return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
    });

    const icon = (emoji, on, grouped) =>
      '<span class="basket-icon' + (grouped ? ' basket-icon-grouped' : '') + (on ? '' : ' could') + '">' + emoji + '</span>';

    customers.forEach(customer => {
      const appt = appointmentSnapshot(customer);
      const sum = Object.assign({}, (appt && appt.summary) || {});
      sum.basketLink = !!(sum.basketLink || customer.basket_url || (appt && appt.inputs && appt.inputs.basketLink));
      sum.quoteShared = !!(sum.quoteShared || (appt && appt.quoteSharedAt));
      const specialists = (appt && appt.state && appt.state._journey && appt.state._journey.specialists) || {};
      const evUsed = !!(customer.ev_state || customer.ev_state_json || specialists.ev);
      const cardUsed = !!(customer.card_state || customer.card_state_json || specialists.card || specialists.cashback_card);
      const row = document.createElement('div');
      row.className = 'basket-row cloud-row';

      const usage = customer.electricity_usage_kwh != null
        ? Number(customer.electricity_usage_kwh).toLocaleString('en-GB') + ' kWh'
        : 'no electricity usage saved';

      const iconsHtml =
        '<span class="cloud-customer-icons">' +
          icon('⚡', !!sum.energy, false) +
          icon('🔥', !!sum.energy, false) +
          icon('🛜', !!sum.broadband, false) +
          icon('📱', (sum.sims || 0) >= 1, false) +
          icon('📱', (sum.sims || 0) >= 2, false) +
          icon('🛡️', !!sum.insurance, false) +
          icon('🛒', !!sum.basketLink, false) +
          icon('✉️', !!sum.quoteShared, false) +
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
      const heroCell = heroTxt ? '<span style="color:' + heroColor + ';font-weight:850;">' + heroTxt + '</span>' : '<span class="sub">—</span>';
      const dateCell = customer.updated_at ? esc(fmtDate(customer.updated_at)) : '<span class="sub">—</span>';
      const sourceLabel = usageSourceLabel(customer.electricity_usage_source) || (customer.electricity_usage_kwh != null ? 'Unknown / legacy' : '');
      const fallbackMeta = esc(usage) + (sourceLabel ? ' · ' + esc(sourceLabel) : '') + (customer.electricity_usage_revision ? ' · rev ' + Number(customer.electricity_usage_revision) : '');

      row.innerHTML = `
        <div class="cloud-row-identity" style="min-width:0;">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${esc(customer.customer_name || 'Unnamed')}
          </div>
        </div>
        <div class="cloud-row-saving">${heroCell}</div>
        <span class="sub cloud-row-meta" style="display:none;font-size:10.5px;">${fallbackMeta}</span>
        <div class="cloud-row-icons">${iconsHtml}</div>
        <div class="sub cloud-row-date" style="font-size:11px;">Updated ${dateCell}</div>
      `;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill cloud-row-action';
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
        <p class="sub">Your Companion Login ID and Password are issued by Adrian Croft. Need your login details? Contact Adrian on WhatsApp.</p>
        <div id="cloudPilotLogin">
          <div class="field">
            <label for="cloudPilotPartnerId">Companion Login ID</label>
            <input type="text" id="cloudPilotPartnerId" autocomplete="off" spellcheck="false" placeholder="p_...">
          </div>
          <div class="field">
            <label for="cloudPilotWorkspaceKey">Password</label>
            <input type="password" id="cloudPilotWorkspaceKey" autocomplete="off" spellcheck="false" placeholder="Password">
            <p class="sub hidden" id="cloudSessionPasswordNote" style="margin:.35rem 0 0;color:#1d7f45;font-weight:700;">Password already available for this session. Leave this blank to reuse it, or type a replacement.</p>
          </div>
          <p class="sub hidden" id="cloudConnectError" role="alert" style="margin:0 0 .65rem;color:#c43b3b;font-weight:750;"></p>
          <button class="pill" type="button" id="cloudPilotConnect" style="width:100%;">Connect Cloud</button>
          <a class="pill cloud-menu-item" href="${ADRIAN_WHATSAPP_URL}" target="_blank" rel="noopener" style="margin-top:.55rem;"><span class="menu-ico"><span class="whatsapp-ico">☎</span></span><span>Need login details? WhatsApp Adrian</span></a>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudConnectClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudPilotConnect').addEventListener('click', () => connect());
    $c('cloudConnectClose').addEventListener('click', closeConnectModal);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudConnectModal') closeConnectModal(); });
  }

  function openConnectModal() {
    ensureConnectModal();
    $c('cloudPilotPartnerId').value = localStorage.getItem(PARTNER_ID_KEY) || '';
    const auth = getAuth();
    const note = $c('cloudSessionPasswordNote');
    if (note) note.classList.toggle('hidden', !auth);
    const key = $c('cloudPilotWorkspaceKey');
    if (key) {
      key.value = '';
      key.placeholder = auth ? '•••••••• (available this session)' : 'Password';
    }
    setInlineConnectError('cloudConnectError', '');
    $c('cloudConnectModal').classList.add('open');
    const id = $c('cloudPilotPartnerId');
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
      <div class="basket-prompt-card" style="width:min(100%,900px);max-width:900px;">
        <h3>☁️ Cloud customers</h3>
        <p class="sub">Load a Cloud customer into this Companion.</p>
        <div class="cloud-table-head">
          <button class="cloud-sort" type="button" id="cloudSortName">Name</button>
          <span>Saving</span>
          <span class="cloud-service-head" aria-label="Services"><span title="Energy">⚡🔥</span><span title="Broadband">🛜</span><span title="Mobile">📱</span><span title="Insurance">🛡️</span><span title="Basket link">🛒</span><span title="Summary generated">✉️</span><span title="EV Companion">🚙</span></span>
          <button class="cloud-sort" type="button" id="cloudSortDate">Recent</button>
          <span></span>
        </div>
        <div id="cloudPilotListBody"></div>
        <div class="modal-actions">
          <button class="btn-share" type="button" id="cloudCustomerNew">New customer</button>
          <button class="btn-ghost" type="button" id="cloudCustomerClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudCustomerNew').addEventListener('click', startNewCustomer);
    $c('cloudCustomerClose').addEventListener('click', closeCloudList);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudCustomerModal') closeCloudList(); });
    $c('cloudSortDate').addEventListener('click', () => setCustomerSort('date'));
    $c('cloudSortName').addEventListener('click', () => setCustomerSort('name'));
  }

  function setCustomerSort(sort) {
    if (sort === 'name' && customerSort === 'name') customerSortDir = customerSortDir === 'asc' ? 'desc' : 'asc';
    else customerSortDir = sort === 'name' ? 'asc' : 'desc';
    customerSort = sort === 'name' ? 'name' : 'date';
    localStorage.setItem('apptCloudPilotCustomerSort', customerSort);
    localStorage.setItem('apptCloudPilotCustomerSortDir', customerSortDir);
    renderCustomerSortControls();
    renderCloudList();
  }

  function renderCustomerSortControls() {
    if (!$c('cloudSortDate') || !$c('cloudSortName')) return;
    $c('cloudSortDate').textContent = customerSort === 'date' ? 'Recent ↓' : 'Recent';
    $c('cloudSortName').textContent = customerSort === 'name' ? 'Name ' + (customerSortDir === 'asc' ? '↑' : '↓') : 'Name';
  }

  async function toggleCloudList() {
    if (!getAuth()) {
      openConnectModal();
      setStatus('Connect Cloud to list customers.');
      return;
    }
    setStatus('Loading Cloud customers...');
    showLoading('Loading customer data...', 'Fetching your Cloud customer list.');
    try {
      await refreshCustomers();
      openCloudList();
      setStatus('Cloud customers refreshed ✓', 'good');
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    } finally {
      hideLoading();
    }
  }

  function openCloudList() {
    ensureCustomerModal();
    renderCustomerSortControls();
    renderCloudList();
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

  function editCustomerName() {
    const el = $c('customerName');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus(), 250);
  }

  function openShareSummary() {
    const btn = $c('openCardBtn');
    if (btn) btn.click();
  }

  function canReplaceWorkingCustomer() {
    const dirtyApi = window.AppointmentCompanionCloudDirtyState;
    if (!dirtyApi || typeof dirtyApi.isDirty !== 'function' || !dirtyApi.isDirty()) return true;
    return confirm('This customer has Cloud changes that have not finished syncing. A local working copy is safe on this device. Continue without syncing first?');
  }

  function startNewCustomer() {
    if (!canReplaceWorkingCustomer()) return;
    if (typeof window.resetForm === 'function') window.resetForm();
    const bridge = window.AppointmentCompanionBridge;
    if (bridge && typeof bridge.clearWorkingRecord === 'function') bridge.clearWorkingRecord();
    setCurrent(null);
    closeCloudList();
    scheduleWorkingRecordSave(0);
    setStatus('New local customer draft ready. Cloud is only used when you choose Save.', 'good');
    const name = $c('customerName');
    if (name) setTimeout(() => name.focus(), 80);
  }

  function openCardPlaceholder() {
    ensureCardPlaceholderModal();
    closeActionMenu();
    $c('cashbackPlaceholderModal').classList.add('open');
    setTimeout(() => $c('cashbackPlaceholderClose').focus(), 40);
  }

  function ensureCardPlaceholderModal() {
    if ($c('cashbackPlaceholderModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cashbackPlaceholderModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" role="dialog" aria-modal="true" aria-labelledby="cashbackPlaceholderTitle" style="max-width:390px;">
        <h3 id="cashbackPlaceholderTitle">Cashback Card Companion</h3>
        <p class="sub">Coming soon</p>
        <div class="modal-actions"><button class="btn-ghost" type="button" id="cashbackPlaceholderClose">Close</button></div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => modal.classList.remove('open');
    $c('cashbackPlaceholderClose').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  function localSaveNow() {
    const saves = $c('savesCard');
    if (saves) saves.classList.remove('hidden');
    const btn = $c('saveProfileBtn');
    if (btn) btn.click();
    if (saves) setTimeout(() => saves.classList.add('hidden'), 300);
  }

  function openLocalBackups() {
    const saves = $c('savesCard');
    if (saves) saves.classList.remove('hidden');
    const btn = $c('loadProfileBtn');
    if (btn) btn.click();
    if (saves) saves.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function tuckLocalSaveCard() {
    const saves = $c('savesCard');
    if (saves) saves.classList.add('hidden');
  }

  function toggleActionTray() {
    const menu = $c('cloudMenuPopover');
    if (!menu) return;
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    const btn = $c('cloudActionMenu');
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.title = open ? 'Hide actions' : 'Show actions';
    }
  }

  function closeActionMenu() {
    const menu = $c('cloudMenuPopover');
    if (menu) menu.classList.remove('open');
    const btn = $c('cloudActionMenu');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.title = 'Show actions';
    }
  }

  function closeActionMenuOnOutside(e) {
    const card = $c('cloudPilotCard');
    const menu = $c('cloudMenuPopover');
    if (!card || !menu || !menu.classList.contains('open')) return;
    if (card.contains(e.target)) return;
    closeActionMenu();
  }

  function moveTariffStatusIntoBar() {
    const tariff = $c('tariffStatus');
    const slot = $c('cloudTariffSlot');
    if (tariff && slot && tariff.parentNode !== slot) slot.appendChild(tariff);
  }

  function ensureLoadingOverlay() {
    if ($c('cloudLoadingOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'cloudLoadingOverlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="loading-card">
        <div class="spinner"></div>
        <strong id="cloudLoadingTitle">Loading customer data...</strong>
        <p id="cloudLoadingCopy">Please wait a moment.</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function getPartnerProfile() {
    try {
      const p = JSON.parse(localStorage.getItem('apptCompanionPartner') || 'null');
      return p && p.name && p.join ? p : null;
    } catch (_) {
      return null;
    }
  }

  function defaultOnboardingState() {
    return { version: 2, step: 'connect', complete: false, suspended: '' };
  }

  function readOnboardingState() {
    try {
      const saved = JSON.parse(localStorage.getItem(ONBOARDING_STATE_KEY) || 'null');
      if (saved && saved.version === 2) {
        if (!['connect', 'device', 'partner', 'ready'].includes(saved.step)) saved.step = 'connect';
        return Object.assign(defaultOnboardingState(), saved);
      }
    } catch (_) {}

    const migrated = defaultOnboardingState();
    migrated.complete = localStorage.getItem(LEGACY_ONBOARDING_KEY) === '1';
    const legacyStep = localStorage.getItem(LEGACY_ONBOARDING_STEP_KEY);
    if (['connect', 'device', 'partner', 'ready'].includes(legacyStep)) migrated.step = legacyStep;
    writeOnboardingState(migrated);
    return migrated;
  }

  function writeOnboardingState(state) {
    const next = Object.assign(defaultOnboardingState(), state || {});
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_ONBOARDING_KEY);
    localStorage.removeItem(LEGACY_ONBOARDING_STEP_KEY);
    return next;
  }

  function onboardingComplete() {
    writeOnboardingState({ step: 'ready', complete: true, suspended: '' });
    onboardingExplicit = false;
  }

  function onboardingStep() {
    return readOnboardingState().step;
  }

  function setOnboardingStep(step, options) {
    const state = readOnboardingState();
    state.step = step;
    state.suspended = options && options.suspended ? options.suspended : '';
    writeOnboardingState(state);
    renderOnboardingStep(step);
  }

  function openOnboarding() {
    ensureOnboardingModal();
    const state = readOnboardingState();
    state.suspended = '';
    writeOnboardingState(state);
    const prompt = $c('partnerPrompt');
    const settings = $c('cloudSettingsModal');
    if (prompt) prompt.classList.remove('open');
    if (settings) settings.classList.remove('open');
    renderOnboardingStep(state.step);
    $c('cloudOnboardingModal').classList.add('open');
  }

  function maybeStartOnboarding() {
    const state = readOnboardingState();
    if (state.complete) return;
    if (window.__appointmentCompanionSpecialistReturn || new URL(location.href).searchParams.has('ac_return')) return;
    openOnboarding();
  }

  function ensureOnboardingModal() {
    if ($c('cloudOnboardingModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudOnboardingModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:460px;">
        <h3 id="cloudOnboardingTitle">Welcome to Companion</h3>
        <div id="cloudOnboardingBody"></div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudOnboardingLater">Finish later</button>
          <button class="btn-share" type="button" id="cloudOnboardingNext">Continue</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudOnboardingLater').addEventListener('click', () => {
      const state = readOnboardingState();
      state.suspended = '';
      writeOnboardingState(state);
      modal.classList.remove('open');
      onboardingExplicit = false;
    });
    $c('cloudOnboardingNext').addEventListener('click', advanceOnboarding);
  }

  function renderOnboardingStep(step) {
    ensureOnboardingModal();
    const title = $c('cloudOnboardingTitle');
    const body = $c('cloudOnboardingBody');
    const next = $c('cloudOnboardingNext');
    const later = $c('cloudOnboardingLater');
    if (step === 'connect') {
      const auth = getAuth();
      title.textContent = 'Step 1 - Connect to Companion';
      body.innerHTML = `
        <p class="sub">Your Companion Login ID and Password are issued by Adrian Croft.</p>
        <div class="field"><label for="onboardLoginId">Companion Login ID</label><input type="text" id="onboardLoginId" autocomplete="off" value="${esc(localStorage.getItem(PARTNER_ID_KEY) || '')}"></div>
        <div class="field"><label for="onboardPassword">Password</label><input type="password" id="onboardPassword" autocomplete="off" placeholder="${auth ? '•••••••• (available this session)' : 'Password'}">${auth ? '<p class="sub" style="margin:.35rem 0 0;color:#1d7f45;font-weight:700;">Password already available for this session. Leave this blank to reuse it, or type a replacement.</p>' : ''}</div>
        <p class="sub hidden" id="cloudOnboardingError" role="alert" style="margin:0 0 .65rem;color:#c43b3b;font-weight:750;"></p>
        <a class="pill cloud-menu-item" href="${ADRIAN_WHATSAPP_URL}" target="_blank" rel="noopener"><span class="menu-ico"><span class="whatsapp-ico">☎</span></span><span>Need login details? WhatsApp Adrian</span></a>
      `;
      next.textContent = 'Connect';
      later.textContent = 'Finish later';
    } else if (step === 'device') {
      const device = window.AppointmentCompanionDevice && window.AppointmentCompanionDevice.getDevice ? window.AppointmentCompanionDevice.getDevice() : { device_name: '' };
      title.textContent = 'Step 2 - Name this device';
      body.innerHTML = `
        <p class="sub">Use a recognisable name, like Adrian's Laptop, iPad, or Work phone.</p>
        <div class="field"><label for="onboardDeviceName">Device name</label><input type="text" id="onboardDeviceName" autocomplete="off" value="${esc(device.device_name || '')}"></div>
      `;
      next.textContent = 'Save device';
      later.textContent = 'Finish later';
    } else if (step === 'partner') {
      title.textContent = 'Step 3 - Partner details';
      body.innerHTML = '<p class="sub">Add the Partner identity used for sharing and customer-facing output. Save the Partner details modal, then continue.</p><button class="pill cloud-menu-item" type="button" id="onboardPartnerOpen"><span class="menu-ico">👤</span><span>Open Partner details</span></button>';
      next.textContent = 'I have saved Partner details';
      later.textContent = 'Finish later';
      setTimeout(() => {
        const btn = $c('onboardPartnerOpen');
        if (btn) btn.addEventListener('click', openPartnerProfile);
      }, 0);
    } else {
      title.textContent = 'Step 4 - Ready';
      body.innerHTML = '<p class="sub">Setup is complete. You can revisit setup from Settings whenever you need to.</p>';
      next.textContent = 'Enter Appointment Companion';
      later.textContent = 'Close';
    }
  }

  async function advanceOnboarding() {
    const step = onboardingStep();
    if (step === 'connect') {
      const id = $c('onboardLoginId');
      const pw = $c('onboardPassword');
      if ($c('cloudPilotPartnerId') && id) $c('cloudPilotPartnerId').value = id.value;
      if ($c('cloudPilotWorkspaceKey') && pw) $c('cloudPilotWorkspaceKey').value = pw.value;
      const ok = await connect({
        partnerId: id && id.value,
        workspaceKey: pw && pw.value,
        errorId: 'cloudOnboardingError',
        button: $c('cloudOnboardingNext'),
        keepModal: true
      });
      if (ok) setOnboardingStep('device');
      return;
    }
    if (step === 'device') {
      const name = $c('onboardDeviceName');
      try {
        if (window.AppointmentCompanionDevice && window.AppointmentCompanionDevice.rename) {
          window.AppointmentCompanionDevice.rename(name && name.value);
        }
        setOnboardingStep('partner');
        openPartnerProfile();
      } catch (_) {
        if (name) name.focus();
      }
      return;
    }
    if (step === 'partner') {
      if (!getPartnerProfile()) {
        openPartnerProfile();
        return;
      }
      setOnboardingStep('ready');
      return;
    }
    onboardingComplete();
    const modal = $c('cloudOnboardingModal');
    if (modal) modal.classList.remove('open');
    setStatus('Setup complete ✓', 'good');
  }

  function showLoading(title, copy) {
    ensureLoadingOverlay();
    loadingDepth++;
    $c('cloudLoadingTitle').textContent = title || 'Loading customer data...';
    $c('cloudLoadingCopy').textContent = copy || 'Please wait a moment.';
    $c('cloudLoadingOverlay').classList.add('open');
  }

  function hideLoading() {
    loadingDepth = Math.max(0, loadingDepth - 1);
    if (!loadingDepth && $c('cloudLoadingOverlay')) $c('cloudLoadingOverlay').classList.remove('open');
  }

  function openPartnerProfile() {
    const onboarding = $c('cloudOnboardingModal');
    if (onboarding && onboarding.classList.contains('open')) {
      const state = readOnboardingState();
      state.step = 'partner';
      state.suspended = 'partner';
      writeOnboardingState(state);
      onboardingPartnerSuspended = true;
      onboarding.classList.remove('open');
    }
    closeSettingsModal();
    if ($c('partnerSettingsBtn')) $c('partnerSettingsBtn').click();
    enhancePartnerPrompt();
  }

  function openSettingsModal(section) {
    ensureSettingsModal();
    const onboarding = $c('cloudOnboardingModal');
    const partner = $c('partnerPrompt');
    if (onboarding) onboarding.classList.remove('open');
    if (partner) partner.classList.remove('open');
    relocateConnectedWidgets();
    showSettingsSection(section || 'hub');
    $c('cloudSettingsModal').classList.add('open');
  }

  function closeSettingsModal() {
    const modal = $c('cloudSettingsModal');
    if (modal) modal.classList.remove('open');
  }

  function showSettingsSection(section) {
    activeSettingsSection = section || 'hub';
    const titles = {
      hub: '⚙️ Settings',
      cloud: '☁️ Cloud settings',
      local: '💻 Local backup',
      contact: '📞 Contact',
      about: 'ℹ️ About'
    };
    const title = $c('cloudSettingsTitle');
    if (title) title.textContent = titles[activeSettingsSection] || titles.hub;
    document.querySelectorAll('#cloudSettingsModal [data-settings-pane]').forEach(pane => {
      pane.classList.toggle('open', pane.dataset.settingsPane === activeSettingsSection);
    });
  }

  function ensureSettingsModal() {
    if ($c('cloudSettingsModal')) return;
    const modal = document.createElement('div');
    modal.className = 'basket-prompt';
    modal.id = 'cloudSettingsModal';
    modal.innerHTML = `
      <div class="basket-prompt-card" style="max-width:440px;">
        <h3 id="cloudSettingsTitle">⚙️ Settings</h3>
        <div class="cloud-settings-pane open" data-settings-pane="hub">
          <div class="cloud-settings-list">
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsPartner"><span class="menu-ico">👤</span><span>Partner details</span></button>
            <button class="pill cloud-menu-item" type="button" data-settings-section="cloud"><span class="menu-ico">☁️</span><span>Cloud settings</span></button>
            <button class="pill cloud-menu-item" type="button" data-settings-section="local"><span class="menu-ico">💻</span><span>Local backup</span></button>
            <button class="pill cloud-menu-item" type="button" data-settings-section="contact"><span class="menu-ico">📞</span><span>Contact</span></button>
            <button class="pill cloud-menu-item" type="button" data-settings-section="about"><span class="menu-ico">ℹ️</span><span>About</span></button>
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsOnboarding"><span class="menu-ico">✅</span><span>Setup / onboarding</span></button>
          </div>
        </div>
        <div class="cloud-settings-pane" data-settings-pane="cloud">
          <button class="btn-ghost cloud-settings-back" type="button" data-settings-section="hub">← Settings</button>
          <p class="sub">Connection, device, autosave and open-on-other-device status.</p>
          <div class="cloud-settings-list">
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsConnect"><span class="menu-ico">☁️</span><span>Connect / reconnect Companion</span></button>
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsReload"><span class="menu-ico">🔄</span><span>Reload current from Cloud</span></button>
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsDisconnect"><span class="menu-ico">⏻</span><span>Disconnect Cloud for this session</span></button>
          </div>
          <div id="cloudSettingsDynamic" style="margin-top:.75rem;"></div>
        </div>
        <div class="cloud-settings-pane" data-settings-pane="local">
          <button class="btn-ghost cloud-settings-back" type="button" data-settings-section="hub">← Settings</button>
          <p class="sub">Local backup is a safety copy on this device. Cloud remains the main customer record.</p>
          <div class="cloud-settings-list">
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsLocalSave"><span class="menu-ico">💻💾</span><span>Local backup save</span></button>
            <button class="pill cloud-menu-item" type="button" id="cloudSettingsLocalOpen"><span class="menu-ico">📂</span><span>Open local backup</span></button>
          </div>
        </div>
        <div class="cloud-settings-pane" data-settings-pane="contact">
          <button class="btn-ghost cloud-settings-back" type="button" data-settings-section="hub">← Settings</button>
          <p class="sub">Need login details or help with Companion?</p>
          <div class="cloud-contact-actions">
            <a class="pill cloud-menu-item" id="cloudSettingsWhatsApp" href="${ADRIAN_WHATSAPP_URL}" target="_blank" rel="noopener"><span class="menu-ico"><span class="whatsapp-ico">☎</span></span><span>WhatsApp Adrian Croft</span></a>
            <a class="pill cloud-menu-item" id="cloudSettingsTel" href="${ADRIAN_TEL_URL}"><span class="menu-ico">📞</span><span>Call Adrian Croft</span></a>
          </div>
        </div>
        <div class="cloud-settings-pane" data-settings-pane="about">
          <button class="btn-ghost cloud-settings-back" type="button" data-settings-section="hub">← Settings</button>
          <div class="cloud-about" style="margin-top:0;">
            <h4>About Appointment Companion</h4>
            <p>Appointment Companion is a pet project by Adrian Croft, built to support conversations during or after UW appointments. It helps make the bigger picture easier to see - the customer's first-year position, bundle benefits and Partner income - so the decision feels clearer.</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-ghost" type="button" id="cloudSettingsClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    $c('cloudSettingsClose').addEventListener('click', closeSettingsModal);
    modal.addEventListener('click', e => { if (e.target.id === 'cloudSettingsModal') closeSettingsModal(); });
    modal.querySelectorAll('[data-settings-section]').forEach(btn => {
      btn.addEventListener('click', () => showSettingsSection(btn.dataset.settingsSection || 'hub'));
    });
    $c('cloudSettingsPartner').addEventListener('click', () => {
      closeSettingsModal();
      openPartnerProfile();
    });
    $c('cloudSettingsOnboarding').addEventListener('click', () => {
      closeSettingsModal();
      onboardingExplicit = true;
      const state = readOnboardingState();
      state.step = 'connect';
      state.suspended = '';
      writeOnboardingState(state);
      openOnboarding();
    });
    $c('cloudSettingsConnect').addEventListener('click', () => {
      closeSettingsModal();
      openConnectModal();
    });
    $c('cloudSettingsReload').addEventListener('click', () => {
      closeSettingsModal();
      reloadCurrent();
    });
    $c('cloudSettingsLocalSave').addEventListener('click', () => {
      closeSettingsModal();
      localSaveNow();
    });
    $c('cloudSettingsLocalOpen').addEventListener('click', () => {
      closeSettingsModal();
      openLocalBackups();
    });
    $c('cloudSettingsDisconnect').addEventListener('click', () => {
      closeSettingsModal();
      disconnect();
    });
  }

  function enhancePartnerPrompt() {
    const existing = $c('partnerLocalBackupTools');
    if (existing) existing.remove();
    const prompt = $c('partnerPrompt');
    if (!prompt || prompt.dataset.onboardingWatched) return;
    prompt.dataset.onboardingWatched = '1';
    let wasOpen = prompt.classList.contains('open');
    new MutationObserver(() => {
      const isOpen = prompt.classList.contains('open');
      if (wasOpen && !isOpen && onboardingPartnerSuspended) {
        onboardingPartnerSuspended = false;
        const state = readOnboardingState();
        state.suspended = '';
        state.step = getPartnerProfile() ? 'ready' : 'partner';
        writeOnboardingState(state);
        renderOnboardingStep(state.step);
        $c('cloudOnboardingModal').classList.add('open');
      }
      wasOpen = isOpen;
    }).observe(prompt, { attributes: true, attributeFilter: ['class'] });
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
    showLoading('Loading customer data...', 'Reloading the latest Cloud version.');
    try {
      await loadCustomer(currentCloudCustomerId, { noLoading: true });
    } finally {
      hideLoading();
    }
  }

  async function loadCustomer(customerId, opts) {
    opts = opts || {};
    if (!opts.force && customerId !== currentCloudCustomerId && !canReplaceWorkingCustomer()) return;
    const auth = getAuth();
    if (!auth) return setStatus('Cloud is not connected.', 'bad');
    setStatus('Loading customer...');
    if (!opts.noLoading) showLoading('Loading customer data...', 'Loading this customer into Companion.');
    try {
      const res = await api.getCustomer(auth, customerId);
      const customer = res.customer;
      if (!customer) throw new Error('Customer was not returned by Cloud.');

      const appt = appointmentSnapshot(customer);
      if (appt && appt.inputs && appt.state && typeof window.restoreForm === 'function') {
        window.restoreForm(appt);
        applyCanonicalUsage(customer);
        setStatus(customer.customer_name + ' loaded from Cloud ✓', 'good');
      } else {
        if (typeof window.resetForm === 'function') window.resetForm();
        const nameEl = $c('customerName');
        if (nameEl) nameEl.value = customer.customer_name || '';
        const notesEl = $c('apptNotes');
        if (notesEl) notesEl.value = customer.private_notes || '';
        const basketEl = $c('basketLink');
        if (basketEl) basketEl.value = customer.basket_url || '';
        applyCanonicalUsage(customer);
        if (typeof window.calc === 'function') window.calc();
        setStatus(customer.customer_name + ' is linked. No full Appointment Companion state existed yet, so a fresh form has been started for this Cloud customer.', 'good');
      }

      setCurrent(customer);
      scheduleWorkingRecordSave(0);
      syncNotesVisibility();
      renderCloudList();
      closeCloudList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus((err && err.message) || String(err), 'bad');
    } finally {
      if (!opts.noLoading) hideLoading();
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
      electricity_usage_revision: existing.electricity_usage_revision || 0,
      electricity_usage_day_kwh: existing.electricity_usage_day_kwh,
      electricity_usage_night_kwh: existing.electricity_usage_night_kwh,
      gas_usage_kwh: existing.gas_usage_kwh,
      gas_usage_source: existing.gas_usage_source || '',
      gas_usage_captured_at: existing.gas_usage_captured_at || '',
      energy_has_electricity: existing.energy_has_electricity,
      energy_has_gas: existing.energy_has_gas,
      ev_state_json: existing.ev_state == null ? null : existing.ev_state
    };
  }

  async function saveToCloud(opts) {
    opts = opts || {};
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
    setStatus((opts.saveAs ? 'Saving a new Cloud scenario for ' : 'Saving ') + name + ' to Cloud...');

    try {
      let existing = null;

      if (!opts.saveAs && currentCloudCustomerId) {
        const got = await api.getCustomer(auth, currentCloudCustomerId);
        existing = got.customer || null;
      } else if (!opts.saveAs) {
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

      const usage = formUsage();
      const priorUsage = existing && existing.electricity_usage_kwh != null ? Number(existing.electricity_usage_kwh) : null;
      const usageChanged = priorUsage !== usage.electricity_usage_kwh || String((existing && existing.electricity_usage_source) || '') !== usage.electricity_usage_source;
      const usageRevision = usage.electricity_usage_kwh == null
        ? 0
        : usageChanged ? Number((existing && existing.electricity_usage_revision) || 0) + 1 : Number((existing && existing.electricity_usage_revision) || 1);
      const payload = Object.assign({}, preservedCustomerFields(existing), usage, {
        customer_id: existing ? existing.customer_id : '',
        customer_name: name,
        electricity_usage_mode: usage.electricity_usage_kwh == null ? '' : 'known',
        electricity_usage_preset: '',
        electricity_usage_revision: usageRevision,
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
    const bridge = window.AppointmentCompanionBridge;
    if (!currentCloudCustomerId && bridge && typeof bridge.getWorkingRecord === 'function') {
      const record = bridge.getWorkingRecord();
      const name = $c('customerName');
      if (record && record.appointment_state && name && !String(name.value || '').trim() && typeof window.restoreForm === 'function') {
        try {
          window.restoreForm(record.appointment_state);
          setStatus('Local working customer restored ✓', 'good');
        } catch (_) {}
      } else if (record && record.customer_name && name && !String(name.value || '').trim()) {
        name.value = String(record.customer_name);
        if (typeof window.calc === 'function') window.calc();
        renderCloudCurrent();
      }
    }
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
