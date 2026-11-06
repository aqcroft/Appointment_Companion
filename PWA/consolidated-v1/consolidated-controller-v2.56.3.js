/* Local-first controller v2.63.3: explicit customer-name confirmation, stable local drafts, deliberate Cloud creation. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var store = global.AppointmentCompanionLocalStore, canonical = global.AppointmentCompanionCanonical, api = global.AppointmentCompanionCloud, LOCAL_ONLY = !!global.__AC_LOCAL_ONLY;
  var CURRENT_KEY = 'apptCompanionConsolidatedCurrentV1', CLOUD_KEY = 'apptCloudPilotCurrentCustomer', AUTH_KEY = 'apptCloudPilotAuthSession', DEVICE_AUTH_KEY = 'apptCloudPilotAuthDeviceV1';
  var WORKING_KEY='apptCompanionUnconfirmedWorkingV263'; // One temporary session snapshot, never a customer record.
  var currentId = sessionStorage.getItem(CURRENT_KEY) || '', current = null, saveTimer = null, syncTimer = null, syncing = false, retryMs = 60000, editedSinceSwitch = false, persistQueue = Promise.resolve();
  // Automatic checks are background housekeeping, not a real-time polling feed.
  // Local persistence remains fast; explicit Cloud saves bypass this cadence.
  var BACKGROUND_CHECK_MS = 15 * 60 * 1000;
  var EDIT_SYNC_DELAY_MS = 90 * 1000;
  var LAST_CHECK_FRESH_MS = 5 * 60 * 1000;
  var lastBackgroundCheckAt = 0;
  var lastSyncReport={state:'not-run',attemptedAt:'',completedAt:'',attempted:0,failed:0,error:''};
  var $ = function (id) { return document.getElementById(id); };
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function auth() { try { var row = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); if (!(row && row.partner_id && row.workspace_key)) row = JSON.parse(localStorage.getItem(DEVICE_AUTH_KEY) || 'null'); if (row && row.partner_id && row.workspace_key) { try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(row)); } catch (_) {} return row; } return null; } catch (_) { return null; } }
  function remoteVersion(row) { return String(row && (row.cloud_revision || row.sync_revision || row.updated_at) || ''); }
  function appointment(remote) { var value = remote && (remote.appointment_state || remote.appointment_state_json || remote.appointment_snapshot); if (!value) return null; if (typeof value === 'string') { try { value = JSON.parse(value); } catch (_) { return null; } } return canonical.normaliseAppointment(value); }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function status(text, tone) { var el = $('cloudPilotStatus'); if (el) { el.textContent = text; el.style.color = tone === 'bad' ? '#c43b3b' : tone === 'good' ? '#1d7f45' : 'var(--muted)'; } }
  function icon(id, good, title) { var el = $(id); if (!el) return; var state = good ? 'ok' : 'warn'; el.innerHTML = id === 'cloudConnectionState' ? '<img src="status-icons/cloud-' + state + '.svg" alt="" aria-hidden="true">' : '<picture><source media="(any-pointer: coarse), (max-width: 620px)" srcset="status-icons/mobile-' + state + '.svg"><img src="status-icons/desktop-' + state + '.svg" alt="" aria-hidden="true"></picture>'; el.classList.toggle('warn', !good); el.title = title; }
  function isCloudDraft(row) { return !!(row && !row.deleted && !row.cloud_id && !row.cloud_creation_approved); }
  function isSynced(row) { return !!(row && row.cloud_id && row.sync_state === 'synced' && Number(row.cloud_synced_local_revision) === Number(row.local_revision)); }
  function paint(row, saving) {
    var committed=!!(row && String(row.customer_name||'').trim() && row.sync_state!=='draft');
    icon('cloudLocalState', !saving&&committed, saving?'Saving this local revision…':committed?'Customer record saved on this device':'Unsaved working draft - confirm the name with ✓ or Save to Cloud');
    var synced=!LOCAL_ONLY&&isSynced(row);
    icon('cloudConnectionState', synced, synced?'This exact local revision is synchronised to Cloud':
      LOCAL_ONLY?'Cloud is deliberately paused in local-only mode':
      isCloudDraft(row)?'Working draft stays local until Save to Cloud':'Work is safe locally; Cloud is behind or unavailable');
  }
  function clearWorking(){
    try{sessionStorage.removeItem(WORKING_KEY);}catch(_){}
  }
  function rememberWorking(){
    // Only a not-yet-confirmed new customer gets a temporary recovery snapshot.
    // Saved customers use the normal store, and incomplete names cannot reach it.
    if(!isCloudDraft(current)||String(current&&current.customer_name||'').trim())return;
    try{
      var credentials=auth();
      sessionStorage.setItem(WORKING_KEY,JSON.stringify({
        owner:String(credentials&&credentials.partner_id||''),
        appointment_state:canonical.capture(),saved_at:Date.now()
      }));
    }catch(_){}
  }
  function takeWorking(){
    try{
      var saved=JSON.parse(sessionStorage.getItem(WORKING_KEY)||'null');
      var credentials=auth();
      if(!saved||saved.owner!==String(credentials&&credentials.partner_id||''))return null;
      // Never resurrect a very old scratch draft from a reopened browser session.
      if(!saved.saved_at||Date.now()-Number(saved.saved_at)>12*60*60*1000){clearWorking();return null;}
      return saved.appointment_state||null;
    }catch(_){return null;}
  }
  function meaningful(appt) { var c = appt && appt.canonical; if (!c) return false; return !!(c.customerName || c.privateNotes || c.basketUrl || c.lastQuoteSharedAt || Object.keys(c.selectedServices || {}).some(function (key) { return c.selectedServices[key]; })); }
  // Auto-save protects established records but never promotes a partly typed name
  // into a real customer. Only an explicit confirmation or Save action commits it.
  function draft(commitName) {
    var appt=canonical.capture(),c=appt.canonical,bridge=global.AppointmentCompanionBridge;
    c.homeStatus=$('pillHomeowner')&&$('pillHomeowner').classList.contains('on')?'homeowner':
      $('pillTenant')&&$('pillTenant').classList.contains('on')?'tenant':c.homeStatus;
    if(!commitName)c.customerName=String(current&&current.customer_name||'').trim();
    return {
      local_id:currentId||store.makeId(),cloud_id:current&&current.cloud_id||'',
      customer_name:c.customerName,appointment_state:appt,
      specialist_state:bridge&&bridge.getJourney?clone(bridge.getJourney().specialists||{}):
        clone(current&&current.specialist_state||{}),
      basket_url:c.basketUrl||'',cloud_customer:clone(current&&current.cloud_customer||null),
      base_cloud_revision:current&&current.base_cloud_revision||'',
      base_cloud_snapshot:clone(current&&current.base_cloud_snapshot||null),
      cloud_synced_local_revision:current&&current.cloud_synced_local_revision||0,
      cloud_creation_approved:!!(current&&current.cloud_creation_approved)
    };
  }
  // User data is compared without the timestamp generated on every capture.
  function stableAppointment(appt) {
    if (!appt) return null;
    var stable=clone(appt);
    delete stable.saved_at;
    return stable;
  }
  function unchangedDraft(next,row) {
    return !!row && String(next.cloud_id||'')===String(row.cloud_id||'') &&
      String(next.customer_name||'')===String(row.customer_name||'') &&
      String(next.basket_url||'')===String(row.basket_url||'') &&
      !!next.cloud_creation_approved===!!row.cloud_creation_approved &&
      JSON.stringify(stableAppointment(next.appointment_state))===JSON.stringify(stableAppointment(row.appointment_state)) &&
      JSON.stringify(next.specialist_state||{})===JSON.stringify(row.specialist_state||{});
  }
  function persist(announce,approveCloudCreation,commitName) {
    var commit=!!(approveCloudCreation||commitName);
    if(commit)clearTimeout(saveTimer);
    var next=draft(commit);
    if(commit&&!String(next.customer_name||'').trim()){
      status('Finish the customer name before saving.','bad');
      var nameField=$('customerName');if(nameField)nameField.focus();
      return Promise.resolve(null);
    }
    if(approveCloudCreation)next.cloud_creation_approved=true;
    if(!commit && unchangedDraft(next,current)){
      paint(current,false);
      return Promise.resolve(clone(current));
    }
    var targetId=next.local_id;
    currentId=targetId;sessionStorage.setItem(CURRENT_KEY,targetId);
    paint(current,true);
    // Ordered writes prevent a fast background save from overwriting a confirmed name.
    var write=persistQueue.then(function(){return store.put(next);}).then(function(saved){
      if(currentId===targetId) {
        current=saved;paint(current,false);
        if(commit){
          clearWorking();
          try{global.dispatchEvent(new CustomEvent('ac:customer-name-committed'));}catch(_){}
        }else if(saved&&saved.sync_state==='draft')rememberWorking();
        if(announce)status(LOCAL_ONLY?'Saved locally. Cloud is paused.':
          isCloudDraft(saved)?'Customer saved on this device. Use Save to Cloud when ready.':
          'Customer saved locally. Cloud sync is queued.','good');
        else if(saved&&saved.sync_state==='draft')status('Working draft - confirm the customer name to save.','');
        scheduleSync(EDIT_SYNC_DELAY_MS);
      }
      return clone(saved);
    });
    persistQueue=write.catch(function(){});
    return write;
  }
  function queuePersist(event) {
    if(event&&event.target&&event.target.closest&&event.target.closest('#cloudPilotCard,#localFirstCustomers,#cloudConnectModal,#cloudSettingsModal,#cloudOnboardingModal'))return;
    if(event&&event.isTrusted&&event.target&&event.target.matches&&event.target.matches('input,textarea,select'))editedSinceSwitch=true;
    // Name edits stay in the field until ✓ or explicit Save. Never write one profile
    // per keystroke, including when the user pauses to type brackets or a surname.
    if(event&&event.target&&event.target.id==='customerName'){rememberWorking();return;}
    rememberWorking();
    paint(current,true);
    clearTimeout(saveTimer);
    saveTimer=setTimeout(function(){
      persist(false,false,false).catch(function(){
        icon('cloudLocalState',false,'Local persistence needs attention');
        status('Local save needs attention. Keep this page open and try again.','bad');
      });
    },600);
  }
  function confirmCustomerName(){
    return persist(true,true,true).then(function(saved){
      // A deliberate Save is also permission to back up this named customer.
      // Edits still use the quiet 90-second debounce; no Cloud creation is
      // possible for an incomplete, unconfirmed name.
      if(saved && !LOCAL_ONLY) scheduleSync(12000,true);
      return saved;
    });
  }
  async function loadRecord(row, quiet) {
    if (!row || row.deleted) return; currentId = row.local_id; current = clone(row); sessionStorage.setItem(CURRENT_KEY, currentId); if (row.cloud_id) sessionStorage.setItem(CLOUD_KEY, row.cloud_id); else sessionStorage.removeItem(CLOUD_KEY);
    var bridge = global.AppointmentCompanionBridge;
    if (bridge && bridge.getWorkingRecord && row.appointment_state && row.appointment_state.canonical) {
      try {
        var working = bridge.getWorkingRecord() || {};
        var workingBasket = String(working.basket_url || '').trim();
        var sameCustomer = workingBasket && (
          (row.cloud_id && working.customer_id && String(row.cloud_id) === String(working.customer_id)) ||
          (!row.cloud_id && !working.customer_id && row.customer_name && working.customer_name && String(row.customer_name).trim() === String(working.customer_name).trim())
        );
        if (sameCustomer && String(row.appointment_state.canonical.basketUrl || '').trim() !== workingBasket) {
          var mergedAppointment = clone(row.appointment_state);
          mergedAppointment.canonical.basketUrl = workingBasket;
          row = await store.put(Object.assign({}, row, { appointment_state: mergedAppointment, basket_url: workingBasket }));
          current = clone(row);
        }
      } catch (_) {}
    }
    canonical.restore(row.appointment_state); if (bridge && bridge.updateWorkingRecord) { bridge.updateWorkingRecord({ customer_id: row.cloud_id || '', customer_name: row.customer_name || '', appointment_state: canonical.toLegacySnapshot(row.appointment_state), specialists: clone(row.specialist_state || {}), basket_url: row.basket_url || row.appointment_state && row.appointment_state.canonical && row.appointment_state.canonical.basketUrl || '' }); if (bridge.setToolState) Object.keys(row.specialist_state || {}).forEach(function (tool) { bridge.setToolState(tool, clone(row.specialist_state[tool])); }); }
    paint(row, false);
    clearWorking();
    editedSinceSwitch=false;
    try { global.dispatchEvent(new CustomEvent('ac:customer-switched', { detail:{ local_id:row.local_id, customer_name:row.customer_name || '' } })); } catch (_) {}
    if (!quiet) status((row.customer_name || 'Local customer') + ' opened from this device.', 'good');
  }
  function recentRows(rows) { try { localStorage.setItem('apptCompanionRecentCustomersV1', JSON.stringify(rows.filter(function (row) { return !row.deleted; }).slice(0, 20).map(function (row) { var c = row.appointment_state && row.appointment_state.canonical || {}, spec = row.specialist_state || {}; return { customer_id: row.local_id, customer_name: row.customer_name || 'Unnamed', updated_at: row.updated_at, summary: row.appointment_state && row.appointment_state.ui_state && row.appointment_state.ui_state.summary || {}, has_ev: !!spec.ev, has_fix: !!(spec.fix || spec.should_i_fix || spec['should-i-fix']), locally_available: true, services: c.selectedServices || {} }; }))); } catch (_) {} }
  function customerJourneyIcons(row) {
    row = row || {};
    var appt = row.appointment_state || {};
    var canonical = appt.canonical || {};
    var ui = appt.ui_state || {};
    var summary = ui.summary || appt.summary || {};
    var selected = canonical.selectedServices || {};
    var legacyServices = ui.state && ui.state.services || {};
    var mobile = canonical.mobile || {};
    var specialists = row.specialist_state || {};

    var energy = summary.energy != null ? !!summary.energy : !!(selected.energy || legacyServices.energy);
    var broadband = summary.broadband != null ? !!summary.broadband : !!(selected.broadband || legacyServices.broadband);
    var simCount = Number(summary.sims || 0);
    if (!simCount && (selected.mobile || legacyServices.mobile)) simCount = Math.max(1, Number(mobile.simCount || (ui.state && ui.state.simCount) || 1));
    var cover = !!(summary.insurance || selected.insurance || selected.boiler || selected.homeCover || legacyServices.insurance || legacyServices.boiler || legacyServices.homeCover);
    var basket = !!(summary.basketLink || row.basket_url || canonical.basketUrl);
    var shared = !!(summary.quoteShared || canonical.lastQuoteSharedAt);
    var fix = !!(specialists.fix || specialists.should_i_fix || specialists['should-i-fix']);
    var ev = !!specialists.ev;
    var cashback = summary.cashback != null ? !!summary.cashback : (ui.state ? ui.state.includeCashback !== false : true);

    function mini(emoji, on, title, extra) {
      return '<span title="' + title + '" style="display:inline-flex;align-items:center;justify-content:center;min-width:' + (extra ? '27px' : '18px') + ';height:20px;' + (extra ? 'padding:0 3px;border:1px solid rgba(122,66,200,.14);border-radius:999px;background:#f8f5fe;letter-spacing:-1px;white-space:nowrap;' : '') + 'font-size:11px;' + (on ? '' : 'opacity:.28;filter:grayscale(1);') + '">' + emoji + '</span>';
    }

    return '<span aria-label="Services and tools" style="display:inline-flex;align-items:center;justify-content:flex-start;gap:3px;flex-wrap:nowrap;white-space:nowrap;">' +
      mini('<span>⚡</span><span>🔥</span>', energy, 'Energy', true) +
      mini('🛜', broadband, 'Broadband') +
      mini('📱', simCount >= 1, 'Mobile SIM 1') +
      mini('📱', simCount >= 2, 'Mobile SIM 2') +
      mini('🛠️', cover, 'Boiler Cover') +
      mini('💳', cashback, 'Cashback Card') +
      mini('🔗', basket, 'UW basket linked') +
      mini('✉️', shared, 'Summary shared') +
      '<span aria-hidden="true" style="width:1px;height:18px;background:rgba(38,22,79,.20);margin:0 2px"></span>' +
      mini('📌', fix, 'Should I Fix?') +
      mini('🚙', ev, 'EV Companion') +
    '</span>';
  }

  var pendingSwitchResolve = null;
  function closeSwitchGuard(result) {
    var modal = $('acProfileSwitchGuard');
    if (modal) modal.classList.remove('open');
    var resolve = pendingSwitchResolve;
    pendingSwitchResolve = null;
    if (resolve) resolve(result || 'stay');
  }
  function ensureSwitchGuard() {
    var modal = $('acProfileSwitchGuard');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'acProfileSwitchGuard';
    modal.className = 'basket-prompt';
    modal.innerHTML = '<div class="basket-prompt-card" role="dialog" aria-modal="true" aria-labelledby="acProfileSwitchTitle" style="max-width:410px">' +
      '<h3 id="acProfileSwitchTitle">Save and close this customer?</h3>' +
      '<p class="sub" id="acProfileSwitchText"></p>' +
      '<div class="modal-actions" style="display:grid;gap:7px">' +
        '<button class="btn-share" type="button" data-switch-choice="save">💾 Save locally & switch</button>' +
        '<button class="btn-ghost" type="button" data-switch-choice="without">Switch without saving again</button>' +
        '<button class="btn-ghost" type="button" data-switch-choice="stay">Stay here</button>' +
      '</div></div>';
    modal.addEventListener('click', function (event) {
      var choice = event.target.closest('[data-switch-choice]');
      if (choice) closeSwitchGuard(choice.dataset.switchChoice);
      else if (event.target === modal) closeSwitchGuard('stay');
    });
    document.body.appendChild(modal);
    return modal;
  }
  function shouldAskBeforeSwitch(targetId) {
    if (!current || !currentId || String(targetId || '') === String(currentId)) return false;
    try { return meaningful(canonical.capture()); } catch (_) { return meaningful(current.appointment_state); }
  }
  function askBeforeSwitch(targetName) {
    var modal = ensureSwitchGuard();
    var currentName = String(current && current.customer_name || 'this customer');
    $('acProfileSwitchText').textContent = 'Do you want to save and close ' + currentName + ' before opening ' + String(targetName || 'another customer') + '?';
    modal.classList.add('open');
    return new Promise(function (resolve) { pendingSwitchResolve = resolve; });
  }
  async function requestSwitchRecord(row) {
    if (!row || row.deleted) return false;
    if (String(row.local_id || '') === String(currentId || '')) return true;
    if (shouldAskBeforeSwitch(row.local_id)) {
      clearTimeout(saveTimer);
      var choice = await askBeforeSwitch(row.customer_name);
      if (choice === 'stay') return false;
      if (choice === 'save') { var stored=await persist(false,false,true); if(!stored)return false; }
    }
    await loadRecord(row, false);
    return true;
  }
  async function switchToLocalId(localId) {
    var row = await store.get(String(localId || ''));
    return requestSwitchRecord(row);
  }

  var customerBrowserSequence=0;
  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(String(navigator.userAgent||''));
  }
  function storageSignals(presentHere, cloudState, synced) {
    var mobile=isMobileDevice();
    // A single, compact status badge per location, not an icon followed by a
    // separate tick/cross. Other devices remain UNKNOWN, never assumed absent.
    function cell(emoji,state,label) {
      var tint=state==='yes'?'#168447':state==='no'?'#bc3545':'#8e819b';
      var glyph=state==='yes'?'✓':state==='no'?'×':'?';
      return '<span class="ac-location-cell" title="'+escapeHtml(label)+'" aria-label="'+escapeHtml(label)+
        '" role="img" style="position:relative;display:inline-flex;width:25px;height:26px;flex:0 0 25px;align-items:flex-start;justify-content:center;vertical-align:middle">'+
        '<span aria-hidden="true" style="font-size:17px;line-height:23px">'+emoji+'</span>'+
        '<span aria-hidden="true" style="position:absolute;right:0;bottom:0;display:flex;align-items:center;justify-content:center;width:13px;height:13px;box-sizing:border-box;border:1.5px solid white;border-radius:50%;background:'+tint+';color:#fff;font:900 10px/1 system-ui,sans-serif">'+glyph+'</span></span>';
    }
    return '<span class="ac-location-status" style="display:inline-flex;gap:3px;align-items:center;white-space:nowrap;line-height:1" role="group" aria-label="Record locations">'+
      cell('📱',mobile?(presentHere?'yes':'no'):'unknown',mobile?'Local record on this mobile':'Another mobile cannot be checked from this device')+
      cell('💻',!mobile?(presentHere?'yes':'no'):'unknown',!mobile?'Local record on this computer':'Another computer cannot be checked from this device')+
      cell('☁️',cloudState,cloudState==='yes'?(synced?'Confirmed in Cloud and current revision synchronised':'Confirmed in Cloud; revision may still need syncing'):cloudState==='no'?'Not found in the checked Cloud account':'Cloud presence not verified')+
      '</span>';
  }
  // Background Cloud reconciliation may be reading many customers. A manual
  // upload must wait for that single in-flight pass, not fail immediately or
  // open a second writer against the same device state.
  var syncWaiters=[];
  function releaseSync() {
    syncing=false;
    var waiters=syncWaiters.splice(0);
    waiters.forEach(function(wake){wake();});
  }
  async function takeManualSyncTurn() {
    var deadline=Date.now()+60000;
    while(syncing){
      await new Promise(function(resolve){
        var finished=false,timeout=setTimeout(wake,Math.max(1,deadline-Date.now()));
        function wake(){
          if(finished)return;
          finished=true;clearTimeout(timeout);
          var ix=syncWaiters.indexOf(wake);if(ix>=0)syncWaiters.splice(ix,1);
          resolve();
        }
        syncWaiters.push(wake);
      });
      if(syncing&&Date.now()>=deadline)
        throw new Error('The ongoing Cloud check is taking longer than expected. Your customer remains safely on this device. Please try again shortly.');
    }
    // Reserve the single writer before any awaited local/database work.
    syncing=true;
  }
  async function saveLocalToCloud(localId, options) {
    if(LOCAL_ONLY)throw new Error('Cloud synchronisation is paused in local-only mode.');
    if(!navigator.onLine)throw new Error('This device is offline. Work remains safely stored locally.');
    if(!api || typeof api.saveCustomer!=='function' || typeof api.listCustomers!=='function')
      throw new Error('Cloud save is currently unavailable.');
    var credentials=auth();
    if(!credentials)throw new Error('Please sign in to Companion Cloud first.');
    // Ask before the potentially long Cloud checks, while the click is still
    // a user gesture. Customer-list Save to Cloud is itself an explicit opt-in.
    var selected=await store.get(localId);
    if(!selected || selected.deleted || !String(selected.customer_name||'').trim())
      throw new Error('This customer record is missing or has no confirmed name.');
    if(selected.cloud_id || selected.conflict)
      throw new Error('This record is already linked to Cloud or needs conflict review.');
    if(!(options && options.confirmed) &&
       !global.confirm('Save '+selected.customer_name+' to Companion Cloud? This will make the customer available to your other signed-in devices.'))
      return {message:'Cloud save cancelled. The customer remains safely on this device.'};
    await takeManualSyncTurn();
    try {
    // Preserve any unsaved edits in the currently open customer form before
    // reading the record to upload, including the saved quote basket URL.
    if(currentId===localId){
      clearTimeout(saveTimer);
      await persist(false,false,true);
    }
    var row=await store.get(localId);
    if(!row || row.deleted || !String(row.customer_name||'').trim())
      throw new Error('This customer record is missing or has no name.');
    if(row.cloud_id || row.conflict)
      throw new Error('This record is already linked to Cloud or needs conflict review.');
    // First-creation duplicate checks run for both manual and background
    // uploads inside syncOne(), so neither path can create a blind duplicate.
    try {
      row=await store.get(localId);
      if(!row || row.deleted || row.cloud_id || row.conflict)throw new Error('Customer record changed. Review it again.');
      // Keep all existing customer state and the local revision. Only explicitly
      // authorise this first Cloud creation after the user pressed Save to Cloud.
      var approved=await store.put(Object.assign({},row,{cloud_creation_approved:true,sync_state:'pending'}),{keepRevision:true,keepSyncState:true});
      if(currentId===localId)current=clone(approved);
      var uploaded=await syncOne(approved,credentials);
      if(!uploaded || !uploaded.cloud_id)throw new Error('Cloud did not confirm a customer ID.');
      var server=await api.getCustomer(credentials,uploaded.cloud_id);
      if(!server || !server.customer || String(server.customer.customer_id||'')!==String(uploaded.cloud_id))
        return {message:'Cloud received the customer, but confirmation is still pending. The local copy is safe.'};
      var stored=await store.get(localId);
      if(currentId===localId){current=clone(stored);paint(current,false);}
      return {message:isSynced(stored)?
        '✓ '+stored.customer_name+' is saved on this device AND verified in Cloud.':
        'Cloud has the customer. Further local edits are waiting to synchronise.'};
    } catch(err) {
      // A missing acknowledgement can conceal a successful Cloud creation.
      // Do not allow blind automatic retries to create duplicate customers.
      var latest=await store.get(localId);
      if(latest && !latest.cloud_id && latest.cloud_creation_approved){
        var safe=await store.put(Object.assign({},latest,{cloud_creation_approved:false,sync_state:'pending'}),{keepRevision:true,keepSyncState:true});
        if(currentId===localId)current=clone(safe);
      }
      throw err;
    }
    } finally {
      releaseSync();
      try{global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed'));}catch(_){}
      scheduleSync(EDIT_SYNC_DELAY_MS);
    }
  }
  async function customerBrowser(options) {
    var modal = $('localFirstCustomers');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'localFirstCustomers';
      modal.className = 'basket-prompt';
      modal.innerHTML = '<div class="basket-prompt-card" role="dialog" aria-modal="true" aria-labelledby="localFirstCustomersTitle" style="width:min(100%,720px);max-height:calc(100dvh - 30px);overflow:auto">' +
        '<style> #localFirstCustomers .ac-customer-action{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1.5px solid #7a42c8;border-radius:9px;background:#f4effc;color:#482477;min-height:34px;min-width:0;padding:7px 10px;font:750 12px/1.25 system-ui,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 1px 2px #2a1b4920} #localFirstCustomers .ac-customer-action:hover{background:#e9ddfa} #localFirstCustomers .ac-customer-action:focus-visible{outline:3px solid #9b7bce;outline-offset:2px} #localFirstCustomers .ac-customer-action:disabled{opacity:.55;cursor:wait}#localFirstCustomers .ac-customer-action[hidden]{display:none!important} #localFirstCustomers .ac-customer-action-danger{border-color:#a83d52;background:#fff2f3;color:#922841} #localFirstCustomers .ac-customer-action-danger:hover{background:#ffe5e9} #localFirstCustomers .ac-customer-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0} #localFirstCustomers .ac-customer-toolbar select{flex:1 1 225px} #localFirstCustomers .ac-customer-toolbar button{flex:0 0 auto;max-width:100%} #localFirstCustomers .ac-customer-bulk{display:flex;flex-wrap:wrap;gap:7px;margin:5px 0 9px} #localFirstCustomers [data-local-upload]{font-size:11px;min-height:32px;padding:6px 9px} #localFirstCustomers [data-local-delete]{min-width:34px;min-height:34px;padding:5px 8px;font-size:17px} #localFirstCustomers .ac-customer-filters{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0 10px} #localFirstCustomers .ac-customer-filter{appearance:none;border:1.5px solid #d9cbea;background:#fff;color:#56327d;border-radius:999px;padding:8px 11px;min-height:36px;max-width:100%;font:750 12px/1.25 system-ui,sans-serif;white-space:nowrap;cursor:pointer} #localFirstCustomers .ac-customer-filter[aria-pressed="true"]{background:#7541bd;color:#fff;border-color:#7541bd} #localFirstCustomers .ac-customer-filter:focus-visible{outline:3px solid #9b7bce;outline-offset:2px} </style>' +
        '<h3 id="localFirstCustomersTitle">Customers on this device</h3>' +
        '<p class="sub" id="localFirstCustomersNote"></p>' +
        '<div id="localFirstCustomerTools" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:10px 0 12px">' +
          '<input type="search" id="localFirstCustomerSearch" placeholder="🔎 Search profiles…" autocomplete="off" aria-label="Search customer profiles" style="width:100%;min-width:0;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 10px;font:inherit;background:#fff;color:inherit">' +
          '<select id="localFirstCustomerSort" aria-label="Sort customer profiles" style="max-width:150px;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 28px 9px 9px;font:inherit;background:#fff;color:inherit">' +
            '<option value="recent">Most recent</option>' +
            '<option value="oldest">Oldest first</option>' +
            '<option value="name-asc">Name A-Z</option>' +
            '<option value="name-desc">Name Z-A</option>' +
          '</select>' +
        '</div>' +
        '<div class="ac-customer-filters" role="group" aria-label="Filter customer records">' +
          '<button type="button" class="ac-customer-filter" data-local-scope="all" aria-pressed="true">All</button>' +
          '<button type="button" class="ac-customer-filter" data-local-scope="localOnly" aria-pressed="false">Device only</button>' +
          '<button type="button" class="ac-customer-filter" data-local-scope="cloudOnly" aria-pressed="false">Cloud only</button>' +
          '<button type="button" class="ac-customer-filter" data-local-scope="pending" aria-pressed="false">To sync</button>' +
          '<button type="button" class="ac-customer-filter" data-local-scope="conflicts" aria-pressed="false">Conflicts</button>' +
        '</div>' +
        '<div class="ac-customer-bulk" id="localFirstBulkTools"><button type="button" class="ac-customer-action" data-local-upload-all hidden>☁️ Save all to Cloud</button><button type="button" class="ac-customer-action ac-customer-action-danger" data-local-delete-conflicts hidden>🗑️ Delete all conflicts</button></div>' +
        '<p id="localFirstCustomerFeedback" role="status" aria-live="polite" style="font-size:12px;font-weight:600;min-height:18px;margin:5px 0;color:#28643e"></p>' +
        '<div id="localFirstCustomerRows" style="display:grid;gap:8px"></div>' +
        '<div class="modal-actions"><button class="btn-ghost" type="button" data-local-close>Close</button></div>' +
      '</div>';
      modal.addEventListener('click', async function (event) {
        if (event.target === modal || event.target.dataset.localClose !== undefined){modal.classList.remove('open');return;}
        var filter=event.target.closest('[data-local-scope]');
        if(filter){event.preventDefault();if(modal._setCustomerScope)modal._setCustomerScope(filter.getAttribute('data-local-scope'));return;}
        var feedback=$('localFirstCustomerFeedback');
        var uploadAll=event.target.closest('[data-local-upload-all]');
        if(uploadAll){
          event.preventDefault();event.stopPropagation();
          if(LOCAL_ONLY||!navigator.onLine||!auth()){
            if(feedback)feedback.textContent='Cloud is offline or not signed in. Profiles remain on this device.';
            return;
          }
          var candidates=(await store.list(true)).filter(function(r){
            return !r.deleted&&!r.conflict&&r.sync_state!=='conflict'&&!r.cloud_id&&String(r.customer_name||'').trim();
          });
          if(!candidates.length){if(feedback)feedback.textContent='No device-only named customers need uploading.';return;}
          if(!global.confirm('Save '+candidates.length+' customer profile'+(candidates.length===1?'':'s')+' to Cloud? Existing Cloud names will be checked; duplicates will be skipped.'))return;
          uploadAll.disabled=true;
          var successes=0,failures=[];
          for(var batchIndex=0;batchIndex<candidates.length;batchIndex++){
            var candidate=candidates[batchIndex];
            if(feedback)feedback.textContent='☁️ Saving '+(batchIndex+1)+' of '+candidates.length+': '+candidate.customer_name+'…';
            try{
              var result=await saveLocalToCloud(candidate.local_id,{confirmed:true});
              if(result&&/saved on this device AND verified in Cloud|Cloud has the customer/.test(result.message||''))successes++;
              else failures.push(candidate.customer_name+': '+String(result&&result.message||'Cloud confirmation missing'));
            }catch(error){failures.push(candidate.customer_name+': '+String(error&&error.message||error));}
          }
          await customerBrowser({scope:modal.dataset.customerScope});
          var message='☁️ '+successes+' of '+candidates.length+' customer profiles verified in Cloud.';
          if(failures.length)message+=' '+failures.length+' need review: '+failures.slice(0,2).join('; ')+(failures.length>2?' (+more)':'');
          var output=$('localFirstCustomerFeedback');if(output)output.textContent=message;
          try{global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed'));}catch(_){}
          return;
        }
        var deleteAll=event.target.closest('[data-local-delete-conflicts]');
        if(deleteAll){
          event.preventDefault();event.stopPropagation();
          var conflicts=(await store.list(true)).filter(function(r){return !r.deleted&&(r.conflict||r.sync_state==='conflict');});
          if(!conflicts.length){if(feedback)feedback.textContent='No outstanding conflicts to delete.';return;}
          if(!global.confirm('Permanently delete all '+conflicts.length+' conflicting customer profile'+(conflicts.length===1?'':'s')+' from this device AND Cloud where linked? This cannot be undone.'))return;
          deleteAll.disabled=true;
          var queued=0;
          for(var batchDelete=0;batchDelete<conflicts.length;batchDelete++){
            if(feedback)feedback.textContent='🗑️ Removing '+(batchDelete+1)+' of '+conflicts.length+'…';
            if(await markDeleted(conflicts[batchDelete].local_id,{confirmed:true,deferSync:true}))queued++;
          }
          if(queued){
            var report=await syncNow();
            if(report&&report.state==='running')scheduleSync(12000,true);
          }
          await customerBrowser({scope:modal.dataset.customerScope});
          var remaining=(await store.list(true)).filter(function(r){return r.deleted&&r.sync_state==='pending_delete';}).length;
          var message=queued+' conflicting profile'+(queued===1?'':'s')+' removed from the normal list.'+
            (remaining?' '+remaining+' Cloud deletion'+(remaining===1?' is':'s are')+' still awaiting confirmation.':' Cloud deletion check complete.');
          var output=$('localFirstCustomerFeedback');if(output)output.textContent=message;
          try{global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed'));}catch(_){}
          return;
        }
        var upload=event.target.closest('[data-local-upload]');
        if(upload){
          event.preventDefault();event.stopPropagation();
          var localId=upload.getAttribute('data-local-upload');
          var feedback=$('localFirstCustomerFeedback');
          if(feedback)feedback.textContent=syncing?
            '⏳ A Cloud check is running. Your upload is queued and will continue when it finishes…':
            'Uploading to Cloud and verifying…';
          upload.disabled=true;
          upload.textContent='⏳ Uploading…';
          var message='';
          try{message=(await saveLocalToCloud(localId,{confirmed:true})).message;}
          catch(err){message='Could not confirm Cloud save: '+String(err&&err.message||err);}
          finally{upload.disabled=false;}
          await customerBrowser({scope:modal.dataset.customerScope});
          var resultLabel=$('localFirstCustomerFeedback');if(resultLabel)resultLabel.textContent=message;
          return;
        }
        var load = event.target.closest('[data-local-load]');
        if (load) {
          var target = await store.get(load.dataset.localLoad);
          if (await requestSwitchRecord(target)) modal.classList.remove('open');
        }
        var del = event.target.closest('[data-local-delete]');
        if (del) {
          event.preventDefault();event.stopPropagation();
          var removed=await markDeleted(del.dataset.localDelete);
          if(removed){
            await customerBrowser({scope:modal.dataset.customerScope});
            var notice=$('localFirstCustomerFeedback');
            if(notice)notice.textContent='🗑️ Customer removed from the list. Any Cloud deletion will finish automatically.';
          }
          return;
        }
        var choice = event.target.closest('[data-local-conflict]');
        if (choice) {
          var rowToReview=await store.get(choice.dataset.localConflict);
          if(!rowToReview || !rowToReview.conflict)return;
          var keepDevice=choice.dataset.choice==='local';
          var cloudDeleted=!!(rowToReview.conflict.cloud && rowToReview.conflict.cloud.deleted);
          var explanation=keepDevice?
            rowToReview.deleted?'Confirm deleting this customer from Cloud? Your existing deletion request will be completed.':
            cloudDeleted?'This customer is no longer in Cloud. Keep the saved device version as a local draft? You can then choose Save to Cloud after checking for duplicates.':
            'Keep the version saved on this device? Once Cloud sync completes, it will replace the Cloud version.':
            cloudDeleted?
            'Cloud says this customer was deleted. Using Cloud will remove the copy on this device.':
            rowToReview.deleted?'Restore this customer from Cloud and cancel the deletion request?':
            'Use the Cloud version? It will replace the version saved on this device.';
          if(!global.confirm(explanation+'\n\nReview both versions before proceeding. Cancel keeps the conflict unresolved.'))return;
          await resolveConflict(choice.dataset.localConflict,choice.dataset.choice);
          await customerBrowser({scope:modal.dataset.customerScope});
        }
      });
      document.body.appendChild(modal);
    }

    var view=options && options.scope || options && options.conflictsOnly && 'conflicts' || 'all';
    if(['all','localOnly','cloudOnly','pending','conflicts'].indexOf(view)<0)view='all';
    modal.dataset.customerScope=view;
    var sequence=++customerBrowserSequence;
    // Open the customer browser immediately, ahead of IndexedDB and Cloud
    // requests. Users see instant feedback even when Cloud takes seconds.
    modal.classList.add('open');
    modal.setAttribute('aria-busy','true');
    var note=$('localFirstCustomersNote');
    var list=$('localFirstCustomerRows');
    if(note)note.textContent='Checking customer records on this device and in Cloud…';
    if(list)list.innerHTML='<p class="sub" role="status" aria-live="polite" style="padding:12px 4px">⏳ Loading customers…</p>';
    var rows;
    try {
      rows=await store.list(true);
    } catch (err) {
      if(sequence!==customerBrowserSequence)return;
      if(note)note.textContent='Could not read the customers on this device.';
      if(list)list.textContent='Customer records could not be loaded. Close and reopen to retry. Nothing has been deleted.';
      modal.removeAttribute('aria-busy');
      return;
    }
    if(sequence!==customerBrowserSequence)return;
    recentRows(rows);
    if(note)note.textContent='Found '+rows.filter(function(r){return !r.deleted;}).length+' record(s) on this device. Checking Cloud…';
    var cloudRows=null,cloudError='',credentials=auth();
    if(!LOCAL_ONLY && credentials && api && typeof api.listCustomers==='function' && navigator.onLine){
      try{var result=await api.listCustomers(credentials);cloudRows=Array.isArray(result&&result.customers)?result.customers:[];}
      catch(err){cloudError=String(err&&err.message||err||'Cloud unavailable');}
    }
    if(sequence!==customerBrowserSequence)return;
    var cloudIdSet=cloudRows?new Set(cloudRows.map(function(r){return String(r.customer_id||'');})):null;
    var localLinked=new Set(rows.filter(function(r){return r.cloud_id;}).map(function(r){return String(r.cloud_id);}));
    var remoteOnly=cloudRows?cloudRows.filter(function(r){return r&&r.customer_id&&!localLinked.has(String(r.customer_id));}):[];
    var missingCloud=cloudIdSet?rows.filter(function(r){return !r.deleted&&r.customer_name&&(!r.cloud_id||!cloudIdSet.has(String(r.cloud_id)));}).length:null;
    $('localFirstCustomersNote').textContent=LOCAL_ONLY?'Local-only mode: Cloud sync is paused.':
      cloudRows?'On this device only: '+missingCloud+' · Cloud only: '+remoteOnly.length+'. Ticks show record presence. Another device cannot be checked remotely.':
      'This device is available. Cloud presence could not be verified'+(cloudError?' ('+cloudError+')':'')+'.';

    var search=$('localFirstCustomerSearch');
    if(search && view!=='all')search.value='';
    var sort=$('localFirstCustomerSort');
    var wrap=$('localFirstCustomerRows');
    var conflictCount=rows.filter(function(row){return !row.deleted&&(row.conflict||row.sync_state==='conflict');}).length;
    function scopeCounts(){
      var active=rows.filter(function(r){return !r.deleted;});
      return {
        all:active.length+remoteOnly.length,
        localOnly:active.filter(function(r){return !r.cloud_id||(cloudIdSet&&!cloudIdSet.has(String(r.cloud_id)));}).length,
        cloudOnly:cloudRows?remoteOnly.length:null,
        pending:rows.filter(function(r){
          return (r.sync_state==='pending'||r.sync_state==='pending_delete')&&(r.cloud_id||r.cloud_creation_approved||r.deleted);
        }).length,
        conflicts:active.filter(function(r){return r.conflict||r.sync_state==='conflict';}).length
      };
    }
    function updateBrowserButtons(){
      var counts=scopeCounts();
      var labels={all:'All',localOnly:'Device only',cloudOnly:'Cloud only',pending:'To sync',conflicts:'Conflicts'};
      modal.querySelectorAll('[data-local-scope]').forEach(function(button){
        var key=button.getAttribute('data-local-scope'),n=counts[key];
        button.textContent=labels[key]+(n!=null&&(n>0||key==='all')?' ('+n+')':'');
        button.setAttribute('aria-pressed',String(key===view));
      });
      var candidates=rows.filter(function(r){
        return !r.deleted&&!r.conflict&&r.sync_state!=='conflict'&&!r.cloud_id&&String(r.customer_name||'').trim();
      });
      var allSave=modal.querySelector('[data-local-upload-all]');
      if(allSave){allSave.hidden=!candidates.length||LOCAL_ONLY;allSave.textContent='☁️ Save all to Cloud ('+candidates.length+')';}
      var deleteConflicts=modal.querySelector('[data-local-delete-conflicts]');
      if(deleteConflicts){deleteConflicts.hidden=!counts.conflicts;deleteConflicts.textContent='🗑️ Delete all conflicts ('+counts.conflicts+')';}
    }

    function renderRows() {
      updateBrowserButtons();
      var query = String(search && search.value || '').trim().toLocaleLowerCase('en-GB');
      var mode = String(sort && sort.value || 'recent');
      var visible = rows.filter(function (row) {
        if (row.deleted && !(view==='pending' && row.sync_state==='pending_delete')) return false;
        if(view==='pending' && !(row.sync_state==='pending'||row.sync_state==='pending_delete') )return false;
        if(view==='pending' && !(row.cloud_id||row.cloud_creation_approved||row.deleted))return false;
        if(view==='conflicts' && !row.conflict && row.sync_state!=='conflict')return false;
        if(view==='localOnly' && row.cloud_id && (!cloudIdSet||cloudIdSet.has(String(row.cloud_id))))return false;
        if(view==='cloudOnly')return false;
        if (!query) return true;
        return String(row.customer_name || 'Unnamed').toLocaleLowerCase('en-GB').indexOf(query) !== -1;
      });

      visible.sort(function (a, b) {
        function priority(r){
          if(!r.cloud_id || cloudIdSet&&!cloudIdSet.has(String(r.cloud_id)))return 0;
          if(r.conflict||r.sync_state==='conflict')return 1;
          if(r.sync_state==='pending')return 2;
          return 3;
        }
        var difference=priority(a)-priority(b);
        if(difference)return difference;
        var aName = String(a.customer_name || 'Unnamed');
        var bName = String(b.customer_name || 'Unnamed');
        if (mode === 'name-asc') return aName.localeCompare(bName, 'en-GB', { sensitivity: 'base' });
        if (mode === 'name-desc') return bName.localeCompare(aName, 'en-GB', { sensitivity: 'base' });
        if (mode === 'oldest') return String(a.updated_at || '').localeCompare(String(b.updated_at || ''));
        return String(b.updated_at || '').localeCompare(String(a.updated_at || ''));
      });

      wrap.innerHTML = visible.map(function (row) {
        var conflict=!!row.conflict;
        var cloudPresent=cloudIdSet?(row.cloud_id&&cloudIdSet.has(String(row.cloud_id))?'yes':'no'):'unknown';
        var exactlySynced=isSynced(row)&&cloudPresent==='yes';
        var onlyHere=cloudIdSet?!row.cloud_id||cloudPresent==='no':!row.cloud_id;
        return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;border:1px solid var(--line);border-radius:10px;padding:6px">' +
          '<button type="button" class="pill"'+(row.deleted?' disabled aria-disabled="true"':'')+' style="flex:1;min-width:0;text-align:left;justify-content:flex-start;padding:7px 9px" data-local-load="' + row.local_id + '">' +
            '<span style="display:grid;gap:4px;width:100%;min-width:0">' +
              '<span style="display:flex;align-items:center;gap:7px;min-width:0">' +
                '<strong style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(row.customer_name || 'Unnamed') + '</strong>' +
                (isCloudDraft(row) ? '<span title="Saved on this device only. Tap Save to Cloud when ready." style="font-size:10px;white-space:nowrap;color:#785298">Draft</span>' : '') +
                (row.deleted?'<span style="font-size:10px;color:#a35d0d">Deletion requested</span>':'') +
                (view==='pending'?'<span style="font-size:10px;color:#96611b">Awaiting Cloud sync</span>':'') +
                (conflict ? '<span title="Local and Cloud both changed" aria-label="Local and Cloud both changed" style="flex:0 0 auto;font-size:14px;line-height:1">⚠️</span>' : '') +
              '</span>' +
              '<span style="display:block;min-width:0;overflow:hidden">' + customerJourneyIcons(row) + '</span>' +
            '</span>' +
          '</button>' +
          '<span style="margin:auto 0">'+storageSignals(!row.deleted,cloudPresent,exactlySynced)+'</span>'+
          (onlyHere && !row.cloud_id && !conflict && row.customer_name && !LOCAL_ONLY?
            '<button type="button" class="ac-customer-action" data-local-upload="'+escapeHtml(row.local_id)+'">☁️ Save to Cloud</button>':'')+
          (conflict && row.conflict ? '<details style="flex:1 0 100%;font-size:11px;line-height:1.5;padding:4px 6px"><summary style="cursor:pointer;font-weight:650">Compare device and Cloud versions before choosing</summary>'+
            '<div><b>This device:</b> '+escapeHtml(row.updated_at || 'Date unavailable')+
              '<br>Basket link: '+(row.appointment_state && row.appointment_state.canonical && row.appointment_state.canonical.basketUrl?'saved':'not set')+'</div>'+
            '<div><b>Cloud:</b> '+escapeHtml(row.conflict.cloud && row.conflict.cloud.updated_at || 'Date unavailable')+
              '<br>Basket link: '+(row.conflict.cloud && row.conflict.cloud.basket_url?'saved':'not set')+'</div></details>' : '')+
          (conflict ? '<button class="btn-ghost" type="button" data-local-conflict="' + row.local_id + '" data-choice="local">'+(row.deleted?'Confirm deletion':row.conflict&&row.conflict.cloud&&row.conflict.cloud.deleted?'Keep local draft':'Keep mine')+'</button><button class="btn-ghost" type="button" data-local-conflict="' + row.local_id + '" data-choice="cloud">'+(row.deleted?'Restore from Cloud':'Use Cloud')+'</button>' : '') +
          (row.deleted?'':'<button type="button" class="ac-customer-action ac-customer-action-danger" title="Delete customer" aria-label="Delete customer" data-local-delete="' + row.local_id + '">🗑️</button>') +
        '</div>';
      }).join('');
      var remoteVisible=(view==='all'||view==='cloudOnly')?remoteOnly.filter(function(row){
        return !query||String(row.customer_name||'').toLocaleLowerCase('en-GB').indexOf(query)>=0;
      }):[];
      if(remoteVisible.length)wrap.innerHTML+=remoteVisible.map(function(row){
        return '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px">'+
          '<strong style="flex:1;min-width:90px;overflow-wrap:anywhere">'+escapeHtml(row.customer_name||'Unnamed Cloud customer')+'</strong>'+
          storageSignals(false,'yes',false)+'<small>Cloud only on this device</small></div>';
      }).join('');
      if(!wrap.innerHTML)wrap.innerHTML='<p class="sub">'+
        (view==='conflicts'?'No outstanding sync conflicts on this device.':
        view==='pending'?'No Cloud-linked customer records currently awaiting sync.':
        view==='cloudOnly'?(cloudIdSet?'No Cloud-only records.':'Cloud not verified yet.'):
        view==='localOnly'?'No device-only profiles match the filter.':
        query?'No customers match that search.':'No saved customers on this device yet.')+'</p>';
    }

    // Keep the modal and its filter selection mounted while customer records
    // change. A local refresh must never repeat the Cloud list loading screen.
    modal._setCustomerScope=function(next){
      if(['all','localOnly','cloudOnly','pending','conflicts'].indexOf(next)<0)return;
      view=next;modal.dataset.customerScope=next;renderRows();
    };
    modal._refreshLocalCustomerRows=async function(){
      var token=(modal._localRefreshToken||0)+1;modal._localRefreshToken=token;
      var fresh=await store.list(true);
      if(token!==modal._localRefreshToken||sequence!==customerBrowserSequence||!modal.classList.contains('open'))return;
      rows=fresh;
      recentRows(rows);
      renderRows();
      if(note){
        var missing=cloudIdSet?rows.filter(function(r){return !r.deleted&&r.customer_name&&(!r.cloud_id||!cloudIdSet.has(String(r.cloud_id)));}).length:null;
        note.textContent=LOCAL_ONLY?'Local-only mode: Cloud sync is paused.':
          cloudRows?'On this device only: '+missing+' · Cloud only: '+remoteOnly.length+'. Ticks show record presence.':
          'Customer records updated on this device. Cloud verification is not currently available.';
      }
    };
    if (search) search.oninput = renderRows;
    if (sort) sort.onchange = renderRows;
    renderRows();
    modal.removeAttribute('aria-busy');
  }
  async function markDeleted(localId,options) {
    var row=await store.get(localId);
    if(!row||row.deleted)return false;
    if(!(options&&options.confirmed)&&!global.confirm('Permanently delete '+(row.customer_name||'this customer')+' from this device and Cloud where linked? This cannot be undone.'))return false;
    // One confirmation only: clear stale conflict and hide the record.
    // A tombstone stays until Cloud acknowledges deletion, so offline is safe.
    var marked=await store.put(Object.assign({},row,{
      deleted:true,tombstone:true,conflict:null,
      sync_state:'pending_delete',deletion_requested_at:new Date().toISOString()
    }),{keepSyncState:true});
    if(localId===currentId)await startNewCustomer(true);
    status('Customer removed. Confirming Cloud deletion…','good');
    if(!(options&&options.deferSync)){
      if(!LOCAL_ONLY&&navigator.onLine&&auth()){
        try{
          var report=await syncNow();
          if(report&&report.state==='running')scheduleSync(12000,true);
        }catch(error){
          status('Deleted locally. Cloud deletion is queued until sync succeeds.','');
          scheduleSync(12000,true);
        }
      }else scheduleSync(12000,true);
    }
    try{global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed'));}catch(_){}
    return !!marked;
  }
  async function resolveConflict(localId, choice) {
    var row = await store.get(localId); if (!row || !row.conflict) return; var conflict = row.conflict, history = (row.conflict_history || []).concat([{ resolved_at: new Date().toISOString(), choice: choice, conflict: clone(conflict) }]).slice(-5);
    if (choice === 'cloud') { if (conflict.cloud && conflict.cloud.deleted) { await store.remove(localId); if (currentId === localId) await startNewCustomer(true); return; } var remote = conflict.cloud || {}; var appt = appointment(remote); row = await store.put(Object.assign({}, row, { deleted:false,tombstone:false,deletion_requested_at:'', customer_name: remote.customer_name || row.customer_name, appointment_state: appt || row.appointment_state, specialist_state: remote.ev_state || remote.ev_state_json ? Object.assign({}, row.specialist_state, { ev: remote.ev_state || remote.ev_state_json }) : row.specialist_state, cloud_customer: remote, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote, cloud_synced_local_revision: row.local_revision, sync_state: 'synced', conflict: null, conflict_history: history }), { keepRevision: true, keepSyncState: true }); }
    else if(conflict.cloud&&conflict.cloud.deleted&&!row.deleted){
      // Cloud deleted this ID. Preserve the surviving local copy without creating
      // a new Cloud record automatically (which could duplicate a renamed customer).
      // The user can deliberately use Save to Cloud, with its duplicate-name check.
      row=await store.put(Object.assign({},row,{
        cloud_id:'',cloud_creation_approved:false,cloud_customer:null,
        base_cloud_revision:'',base_cloud_snapshot:null,
        cloud_synced_local_revision:0,sync_state:'draft',
        conflict:null,conflict_history:history
      }),{keepRevision:true,keepSyncState:true});
    }
    else row = await store.put(Object.assign({}, row, { base_cloud_revision: remoteVersion(conflict.cloud), base_cloud_snapshot: conflict.cloud, conflict: null, conflict_history: history, sync_state: row.deleted?'pending_delete':'pending' }), { keepRevision: true, keepSyncState: true });
    if (currentId === localId) await loadRecord(row, true); scheduleSync(50);
  }
  function cloudPayload(row) { var c = row.appointment_state.canonical, e = c.energy, existing = clone(row.cloud_customer || {}); return Object.assign(existing, { customer_id: row.cloud_id || '', customer_name: c.customerName, appointment_state_json: row.appointment_state, basket_url: c.basketUrl || '', private_notes: c.privateNotes || '', electricity_usage_kwh: e.electricityUsageTotalKwh, electricity_usage_mode: e.electricityUsageTotalKwh == null ? '' : 'known', electricity_usage_source: e.electricityUsageSourceDetail || e.electricityUsageSource || '', electricity_usage_day_kwh: e.electricityUsageDayKwh, electricity_usage_night_kwh: e.electricityUsageNightKwh, gas_usage_kwh: e.gasUsageKwh, gas_usage_source: e.gasUsageSourceDetail || e.gasUsageSource || '', energy_has_electricity: e.energyFuelSelection !== 'gas', energy_has_gas: e.energyFuelSelection !== 'electricity', ev_state_json: row.specialist_state && row.specialist_state.ev || existing.ev_state_json || null, client_revision_id: row.client_revision_id || '', local_sync_revision: row.local_revision, base_cloud_revision: row.base_cloud_revision || '' }); }
  function comparableLocal(row) { return { appointment_state: row.appointment_state, specialist_state: row.specialist_state || {} }; }
  function comparableRemote(remote) { var appt = appointment(remote), specialists = appt && appt.ui_state && appt.ui_state._journey && appt.ui_state._journey.specialists || {}; if (remote && (remote.ev_state || remote.ev_state_json)) specialists.ev = remote.ev_state || remote.ev_state_json; return { appointment_state: appt, specialist_state: specialists }; }
  function equivalent(row, remote) {
    var here=comparableLocal(row),there=comparableRemote(remote);
    return JSON.stringify(stableAppointment(here.appointment_state))===JSON.stringify(stableAppointment(there.appointment_state)) &&
      JSON.stringify(here.specialist_state)===JSON.stringify(there.specialist_state);
  }
  async function conflict(row, remote) { return store.put(Object.assign({}, row, { conflict: { local: comparableLocal(row), cloud: clone(remote), base: clone(row.base_cloud_snapshot), detected_at: new Date().toISOString() }, sync_state: 'conflict' }), { keepRevision: true, keepSyncState: true }); }
  async function adoptRemote(row, remote) { var appt = appointment(remote), specialists = comparableRemote(remote).specialist_state; return store.put(Object.assign({}, row, { customer_name: remote.customer_name || row.customer_name, appointment_state: appt || row.appointment_state, specialist_state: specialists, basket_url: remote.basket_url || appt && appt.canonical && appt.canonical.basketUrl || '', cloud_customer: remote, base_cloud_revision: remoteVersion(remote), base_cloud_snapshot: remote, cloud_synced_local_revision: row.local_revision, sync_state: 'synced', conflict: null }), { keepRevision: true, keepSyncState: true }); }
  async function syncOne(row, credentials) {
    if (row.deleted) {
      if(!row.cloud_id){await store.remove(row.local_id);return null;}
      try{await api.deleteCustomer(credentials,row.cloud_id);}
      catch(error){if(!/not found|could not be found|missing customer/i.test(String(error&&error.message||error)))throw error;}
      await store.remove(row.local_id);return null;
    }
    if (!row.customer_name || (!row.cloud_id && !row.cloud_creation_approved)) return row;
    if (!row.cloud_id) {
      // A previously lost acknowledgement must never create a second Cloud
      // customer. This guard also protects automatic first-time uploads.
      var known=(await api.listCustomers(credentials)).customers||[];
      var nameKey=function(value){return String(value||'').trim().toLocaleLowerCase('en-GB');};
      var matches=known.filter(function(remote){return nameKey(remote.customer_name)===nameKey(row.customer_name);});
      if(matches.length){
        // If the same local revision reached Cloud but its reply was lost,
        // safely reconnect it after verifying the full stored snapshot.
        var candidate=matches.length===1?matches[0]:null;
        if(candidate && row.client_revision_id &&
          String(candidate.client_revision_id||'')===String(row.client_revision_id)){
          var recovered=(await api.getCustomer(credentials,candidate.customer_id)).customer;
          if(recovered && equivalent(row,recovered)){
            return store.put(Object.assign({},row,{
              cloud_id:recovered.customer_id,cloud_customer:recovered,
              base_cloud_revision:remoteVersion(recovered)||'ack:'+row.client_revision_id,
              base_cloud_snapshot:recovered,cloud_synced_local_revision:row.local_revision,
              sync_state:'synced',tombstone:false,conflict:null
            }),{keepRevision:true,keepSyncState:true});
          }
        }
        throw new Error('A customer named '+row.customer_name+' already exists in Cloud. No duplicate was created. Review the Cloud copy before trying again.');
      }
    }
    if (row.cloud_id) {
      var remote; try { remote = (await api.getCustomer(credentials, row.cloud_id)).customer; } catch (error) { if (/not found|could not be found|missing customer/i.test(String(error && error.message || error))) return conflict(row, { deleted: true, customer_id: row.cloud_id }); throw error; }
      var remoteChanged = !!(row.base_cloud_revision && remoteVersion(remote) && remoteVersion(remote) !== row.base_cloud_revision), localChanged = Number(row.local_revision) !== Number(row.cloud_synced_local_revision);
      if (remoteChanged && localChanged && !equivalent(row, remote)) return conflict(row, remote);
      if (remoteChanged && !localChanged) return adoptRemote(row, remote);
      if (equivalent(row, remote)) return adoptRemote(row, remote);
      if (!row.base_cloud_revision && localChanged) return conflict(row, remote);
    }
    var saved = (await api.saveCustomer(credentials, cloudPayload(row))).customer; if (!saved) throw new Error('Cloud did not acknowledge the saved customer.');
    return store.put(Object.assign({}, row, { cloud_id: saved.customer_id, customer_name: saved.customer_name || row.customer_name, cloud_customer: saved, base_cloud_revision: remoteVersion(saved) || 'ack:' + (row.client_revision_id || row.local_revision), base_cloud_snapshot: saved, cloud_synced_local_revision: row.local_revision, sync_state: 'synced', tombstone: false, conflict: null }), { keepRevision: true, keepSyncState: true });
  }
  async function hydrate(credentials) {
    var listing = await api.listCustomers(credentials), metas = Array.isArray(listing.customers) ? listing.customers : [], ids = {}, locals = await store.list(true); metas.forEach(function (meta) { if (meta.customer_id) ids[String(meta.customer_id)] = true; });
    for (var i = 0; i < metas.length; i++) { var meta = metas[i], local = await store.findCloud(meta.customer_id); if (local && local.deleted) continue; var changed = !local || remoteVersion(meta) && remoteVersion(meta) !== local.base_cloud_revision; if (changed) { var full = (await api.getCustomer(credentials, meta.customer_id)).customer; if (!full) continue; if (local && Number(local.local_revision) !== Number(local.cloud_synced_local_revision) && !equivalent(local, full)) await conflict(local, full); else if (local) await adoptRemote(local, full); else { var appt = appointment(full); await store.put({ cloud_id: full.customer_id, customer_name: full.customer_name || '', appointment_state: appt, specialist_state: comparableRemote(full).specialist_state, basket_url: full.basket_url || appt && appt.canonical && appt.canonical.basketUrl || '', cloud_customer: full, local_revision: 0, cloud_synced_local_revision: 0, base_cloud_revision: remoteVersion(full), base_cloud_snapshot: full, sync_state: 'synced' }, { keepRevision: true, keepSyncState: true }); } } }
    for (var j = 0; j < locals.length; j++) { var row = locals[j]; if (row.cloud_id && !ids[row.cloud_id] && !row.deleted && !row.conflict) await conflict(row, { deleted: true, customer_id: row.cloud_id }); }
  }
  async function sync() {
    if (LOCAL_ONLY || syncing || !navigator.onLine || !api) return;
    var credentials = auth();
    if (!credentials) {
      icon('cloudConnectionState', false, 'Cloud sync awaits Partner sign-in');
      try { global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed')); } catch (_) {}
      return;
    }

    syncing = true;
    lastSyncReport={state:'running',attemptedAt:new Date().toISOString(),completedAt:'',attempted:0,failed:0,error:''};
    try{global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed'));}catch(_){}
    lastBackgroundCheckAt = Date.now();
    var failures = 0;
    var firstError = '';
    try {
      var rows = await store.list(true);
      for (var i = 0; i < rows.length; i++) {
        // Old releases left already-confirmed deletions in conflict state.
        // Resume their Cloud deletion automatically rather than ask again.
        if(rows[i].deleted&&(rows[i].conflict||rows[i].sync_state==='conflict')){
          rows[i]=await store.put(Object.assign({},rows[i],{conflict:null,sync_state:'pending_delete'}),{keepRevision:true,keepSyncState:true});
        }
        if (rows[i].sync_state !== 'pending' && rows[i].sync_state !== 'pending_delete') continue;
        // An unfinished local draft must never create a permanent Cloud row.
        if (!rows[i].deleted && !rows[i].cloud_id && !rows[i].cloud_creation_approved) continue;
        lastSyncReport.attempted++;
        try {
          await syncOne(rows[i], credentials);
        } catch (rowError) {
          failures++;
          lastSyncReport.failed++;
          if (!firstError) firstError = String(rowError && rowError.message || rowError || 'Cloud sync failed');
        }
      }

      try {
        await hydrate(credentials);
      } catch (hydrateError) {
        failures++;
        if (!firstError) firstError = String(hydrateError && hydrateError.message || hydrateError || 'Cloud reconciliation failed');
      }

      current = currentId ? await store.get(currentId) : null;
      paint(current, false);
      recentRows(await store.list(true));

      lastSyncReport.state=failures?'incomplete':'completed';
      lastSyncReport.error=failures?firstError:'';
      if (failures) {
        retryMs = Math.min(Math.max(retryMs * 2, 120000), BACKGROUND_CHECK_MS);
        icon('cloudConnectionState', current && isSynced(current), current && isSynced(current) ? 'Current profile is synced; another local profile still needs Cloud attention' : 'Cloud sync is still catching up');
        status(failures + ' local profile' + (failures === 1 ? '' : 's') + ' still need Cloud attention. Automatic retry is queued.', '');
        scheduleSync(retryMs);
      } else {
        retryMs = 60000;
        if (current && isSynced(current)) status('Latest local revision synchronised to Cloud.', 'good');
      }
    } catch (error) {
      lastSyncReport.state='failed';lastSyncReport.error=String(error&&error.message||error||'Cloud check failed');
      retryMs = Math.min(Math.max(retryMs * 2, 120000), BACKGROUND_CHECK_MS);
      icon('cloudConnectionState', false, 'Cloud unavailable; work remains safe locally');
      status('Cloud unavailable — working locally. Your appointment is safe on this device.', '');
      scheduleSync(retryMs);
    } finally {
      lastSyncReport.completedAt=new Date().toISOString();
      releaseSync();
      try { global.dispatchEvent(new CustomEvent('ac:cloud-sync-state-changed')); } catch (_) {}
    }
    return clone(lastSyncReport);
  }
  function scheduleSync(delay, eager) {
    if (LOCAL_ONLY) return;
    clearTimeout(syncTimer);
    // Clamp callers that request immediate checks on every edit or focus.
    // The initial sign-in/load can perform one earlier check; routine edit
    // activity and retries otherwise wait at least 90 seconds.
    var requested=delay == null ? EDIT_SYNC_DELAY_MS : Number(delay);
    var minimum=eager ? 12000 : EDIT_SYNC_DELAY_MS;
    syncTimer=setTimeout(function(){
      syncTimer=null;
      if(document.hidden || !navigator.onLine)return;
      sync();
    },Math.max(minimum,Number.isFinite(requested)?requested:EDIT_SYNC_DELAY_MS));
  }
  function checkAfterResume() {
    if(LOCAL_ONLY || document.hidden || !navigator.onLine)return;
    if(Date.now()-lastBackgroundCheckAt < LAST_CHECK_FRESH_MS)return;
    scheduleSync(15000,true);
  }
  function syncNow() {
    if(LOCAL_ONLY)return {state:'paused',error:'Cloud is paused in local-only mode.'};
    if(!navigator.onLine)return {state:'offline',error:'This device is offline.'};
    clearTimeout(syncTimer);syncTimer=null;
    if(syncing)return clone(lastSyncReport);
    return sync();
  }
  async function startNewCustomer(fromDelete) {
    clearTimeout(saveTimer);
    if (!fromDelete && (editedSinceSwitch || shouldAskBeforeSwitch('__new_customer__'))) {
      var choice = await askBeforeSwitch('a new customer');
      if (choice === 'stay') return false;
      if (choice === 'save') {
        try { if(!await persist(false,false,true))return false; } catch(error){status('Could not save this customer: '+((error&&error.message)||'Please retry.'),'bad');return false;}
      }
    }
    editedSinceSwitch=false;
    clearWorking();
    currentId = ''; current = null; sessionStorage.removeItem(CURRENT_KEY); sessionStorage.removeItem(CLOUD_KEY);
    var bridge = global.AppointmentCompanionBridge; if (bridge && bridge.clearWorkingRecord) bridge.clearWorkingRecord();
    if (typeof global.resetForm === 'function') global.resetForm();
    var controls = global.AppointmentCompanionCanonicalControls; if (controls && controls.reset) controls.reset();
    // Set the starting region before the first local snapshot is captured.
    // This is intentionally only in the NEW customer path, not loadRecord/restore.
    var freshRegion = $('customerRegion'); if (freshRegion) freshRegion.value = '11';
    var fresh = draft(); currentId = fresh.local_id; sessionStorage.setItem(CURRENT_KEY, currentId); current = await store.put(fresh);
    paint(current, false);
    try { global.dispatchEvent(new CustomEvent('ac:customer-switched', { detail:{ local_id:currentId, customer_name:'' } })); } catch (_) {}
    status(LOCAL_ONLY ? 'New customer started locally. Cloud is paused.' : 'New draft saved on this device. Tap Save to Cloud when ready.', 'good');
    return true;
  }
  async function saveCurrentCloudNow() {
    // Cloud Save is one user action: preserve locally first, then send now.
    var saved=await confirmCustomerName();
    if(!saved)return;
    if(LOCAL_ONLY || !navigator.onLine){
      status('Saved on this device. Cloud will sync when online and enabled.','good');
      return;
    }
    status('Customer saved locally. Uploading to Cloud…','');
    try{
      if(!saved.cloud_id){
        var result=await saveLocalToCloud(saved.local_id,{confirmed:true});
        status(result&&result.message||'Cloud save completed.','good');
      }else{
        var report=await syncNow();
        var updated=await store.get(saved.local_id);
        if(updated && isSynced(updated))status('✓ Customer saved on this device and synchronised to Cloud.','good');
        else status('Saved locally. Cloud verification is still pending'+(report&&report.error?': '+report.error:'')+'.','');
      }
    }catch(error){
      status('Saved locally, but Cloud could not confirm: '+String(error&&error.message||error).slice(0,220),'bad');
    }
  }
  async function saveAsNew() {
    // An unsaved draft is already new; don't leave behind a duplicate draft.
    if (!current || isCloudDraft(current)) return persist(true, true, true);
    await persist(false,false,false);
    currentId = ''; current = null; sessionStorage.removeItem(CURRENT_KEY); sessionStorage.removeItem(CLOUD_KEY);
    return persist(true, true, true);
  }
  function intercept() { document.addEventListener('input', queuePersist, true); document.addEventListener('change', queuePersist, true); document.addEventListener('click', function (event) { var legacy=event.target.closest&&event.target.closest('#saveProfileBtn'); if(legacy){event.preventDefault();event.stopImmediatePropagation();confirmCustomerName();return;} var action = event.target.closest && event.target.closest('[data-cloud-action]'); if (!action) return; var kind = action.dataset.cloudAction; if (['save','save-as','all-customers','recent-customers','delete-current','new-customer'].indexOf(kind) < 0) return; event.preventDefault(); event.stopImmediatePropagation(); if(kind==='new-customer'||kind==='all-customers'||kind==='recent-customers'||kind==='save-as'||kind==='delete-current'||kind==='save'){var menu=$('cloudMenuPopover');if(menu)menu.classList.remove('open');var toggle=$('cloudActionMenu');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.title='Show actions';}} if (kind === 'save') saveCurrentCloudNow().catch(function(error){status('Local/Cloud save needs attention: '+String(error&&error.message||error),'bad');}); else if (kind === 'save-as') saveAsNew(); else if (kind === 'all-customers' || kind === 'recent-customers') customerBrowser(); else if (kind === 'new-customer') startNewCustomer(false); else if (currentId) markDeleted(currentId); }, true); document.addEventListener('click', function (event) { if (!event.target.closest || !event.target.closest('button,.cbchip') || event.target.closest('#cloudPilotCard,#conflictPanel,#localCustomerList,#localFirstCustomers,#acUnifiedStatusModal,#cloudMenuPopover,#acUnifiedStatusTrigger,[data-cloud-action]')) return; setTimeout(function () { queuePersist(); }, 0); }, true); global.addEventListener('ac:cloud-sync-state-changed',function(){var browser=$('localFirstCustomers');if(browser&&browser.classList.contains('open')&&browser.dataset.customerScope==='conflicts')customerBrowser({scope:'conflicts'});}); global.addEventListener('online', function () { if(!document.hidden) scheduleSync(12000,true); }); global.addEventListener('focus', checkAfterResume); document.addEventListener('visibilitychange', checkAfterResume); global.addEventListener('ac:cloud-authenticated', function () { lastBackgroundCheckAt=0; if(!document.hidden) scheduleSync(12000,true); }); }
  async function boot() { await store.migrate(); var rows = await store.list(); recentRows(rows); var row = currentId && await store.get(currentId); if (!row) { var oldCurrent = sessionStorage.getItem('apptCompanionLocalFirstCurrentV1'); if (oldCurrent) row = await store.get(oldCurrent); } var scratch=row?null:takeWorking(); if (row) await loadRecord(row, true); else { await startNewCustomer(true); if(scratch){canonical.restore(scratch);editedSinceSwitch=true; setTimeout(function(){rememberWorking();try{global.dispatchEvent(new CustomEvent('ac:customer-working-restored'));}catch(_){}},100);}} if (LOCAL_ONLY) { var banner = document.createElement('div'); banner.className = 'md-note'; banner.style.margin = '0 0 .7rem'; banner.innerHTML = '📵 <strong>Local-only mode</strong> — Cloud sync and Cloud-backed sharing are paused. Your appointment is safe on this device. <a href="../consolidated-v1/">Return to normal mode</a>.'; var wrap = document.querySelector('.wrap'); if (wrap) wrap.insertBefore(banner, wrap.firstChild); status('Local-only mode — working safely on this device.', 'good'); } intercept(); document.documentElement.dataset.acLocalFirstReady='1'; scheduleSync(12000,true); setInterval(function () { if(!document.hidden && !syncing && Date.now()-lastBackgroundCheckAt>=BACKGROUND_CHECK_MS) scheduleSync(12000,true); }, BACKGROUND_CHECK_MS); }
  global.AppointmentCompanionConsolidated = { persist: persist, load: loadRecord, switchTo: switchToLocalId, list: function () { return store.list(); }, currentId: function () { return currentId; }, currentRecord: function () { return clone(current); }, openCustomerBrowser: customerBrowser, saveLocalToCloud: saveLocalToCloud, confirmCustomerName:confirmCustomerName, scheduleSync: scheduleSync, syncNow:syncNow, syncHealth:function(){return clone(lastSyncReport);}, sync: sync, persistSpecialist: async function (tool, state) { if (!currentId) return null; current = await store.updateSpecialist(currentId, tool, state); paint(current, false); scheduleSync(900); return clone(current); } };
  global.AppointmentCompanionLocalFirst = global.AppointmentCompanionConsolidated;
  var attempts = 0, timer = setInterval(function () { if ($('cloudPilotCard') && $('customerRegion') && store && canonical && global.AppointmentCompanionCanonicalControls) { clearInterval(timer); boot().catch(function (error) { icon('cloudLocalState', false, 'Local persistence needs attention'); status('Consolidated setup needs attention: ' + error.message, 'bad'); }); } else if (++attempts > 160) clearInterval(timer); }, 50);
})(window);
