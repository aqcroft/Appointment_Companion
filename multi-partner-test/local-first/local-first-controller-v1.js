/* Local-first controller: every edit is committed to IndexedDB before Cloud sync. */
(function (global) {
  'use strict';
  var store = global.AppointmentCompanionLocalStore;
  var api = global.AppointmentCompanionCloud;
  var LOCAL_ONLY = !!global.__AC_LOCAL_ONLY;
  var CURRENT_KEY = 'apptCompanionLocalFirstCurrentV1';
  var CLOUD_CURRENT_KEY = 'apptCloudPilotCurrentCustomer';
  var AUTH_KEY = 'apptCloudPilotAuthSession';
  var currentId = sessionStorage.getItem(CURRENT_KEY) || '';
  var current = null, saveTimer = null, syncTimer = null, syncing = false, retryMs = 2500;
  var $ = function (id) { return document.getElementById(id); };
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function auth() { try { var value = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); return value && value.partner_id && value.workspace_key ? value : null; } catch (_) { return null; } }
  function escapeHtml(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function remoteVersion(remote) { return String(remote && (remote.cloud_revision || remote.sync_revision || remote.updated_at) || ''); }
  function appointment(remote) {
    var value = remote && (remote.appointment_state || remote.appointment_state_json || remote.appointment_snapshot);
    if (!value) return null; if (typeof value === 'object') return clone(value); try { return JSON.parse(value); } catch (_) { return null; }
  }
  function setIcon(id, good, title) {
    var el = $(id); if (!el) return; var state = good ? 'ok' : 'warn';
    el.innerHTML = id === 'cloudConnectionState'
      ? '<img src="../cloud/status-icons/cloud-' + state + '.svg" alt="" aria-hidden="true">'
      : '<picture><source media="(any-pointer: coarse), (max-width: 620px)" srcset="../cloud/status-icons/mobile-' + state + '.svg"><img src="../cloud/status-icons/desktop-' + state + '.svg" alt="" aria-hidden="true"></picture>';
    el.classList.toggle('warn', !good); el.title = title;
  }
  function status(text, tone) { var el = $('cloudPilotStatus'); if (el) { el.textContent = text; el.style.color = tone === 'bad' ? '#c43b3b' : tone === 'good' ? '#1d7f45' : 'var(--muted)'; } }
  function isSynced(record) { return !!(record && record.sync_state === 'synced' && Number(record.cloud_synced_local_revision) === Number(record.local_revision)); }
  function paint(record, saving) {
    setIcon('cloudLocalState', !saving, saving ? 'Saving the latest working revision locally' : 'Latest working revision is safely stored on this device');
    var synced = !LOCAL_ONLY && isSynced(record);
    setIcon('cloudConnectionState', synced, synced ? 'This exact local revision is safely synchronised to Cloud' : (LOCAL_ONLY ? 'Cloud is deliberately paused in local-only mode' : 'Work is safe locally; Cloud is behind or unavailable'));
  }
  function meaningful(data) { return !!(data && (String(data.customerName || '').trim() || data.notes || data.quoteSharedAt || data.inputs && Object.keys(data.inputs).some(function (key) { var v = data.inputs[key]; return v !== '' && v !== false && v !== 0 && v != null; }))); }
  function recordUsage(record, existing) {
    var inputs = record && record.appointment_state && record.appointment_state.inputs || {};
    function number(id) { var value = inputs[id] !== '' && inputs[id] != null ? Number(inputs[id]) : null; return Number.isFinite(value) && value > 0 ? Math.round(value) : null; }
    var electricity = number('electricityUsageKwh'), gas = number('gasUsageKwh');
    var priorElectricity = existing && existing.electricity_usage_kwh != null ? Number(existing.electricity_usage_kwh) : null;
    var priorSource = String(existing && existing.electricity_usage_source || '');
    var source = electricity ? String(inputs.electricityUsageSource || 'legacy/unknown') : '';
    var usageChanged = priorElectricity !== electricity || priorSource !== source;
    return {
      electricity_usage_kwh: electricity,
      electricity_usage_mode: electricity == null ? '' : 'known',
      electricity_usage_preset: '',
      electricity_usage_source: source,
      electricity_usage_captured_at: electricity ? String(inputs.electricityUsageCapturedAt || existing && existing.electricity_usage_captured_at || new Date().toISOString()) : '',
      electricity_usage_basis: electricity ? String(inputs.electricityUsageBasis || '') : '',
      electricity_usage_day_kwh: number('electricityUsageDayKwh'), electricity_usage_night_kwh: number('electricityUsageNightKwh'),
      gas_usage_kwh: gas, gas_usage_source: gas ? String(inputs.gasUsageSource || 'legacy/unknown') : '',
      gas_usage_captured_at: gas ? String(inputs.gasUsageCapturedAt || existing && existing.gas_usage_captured_at || new Date().toISOString()) : '',
      energy_has_electricity: inputs.energyHasElectricity !== undefined ? !!inputs.energyHasElectricity : !!(existing && existing.energy_has_electricity), energy_has_gas: inputs.energyHasGas !== undefined ? !!inputs.energyHasGas : !!(existing && existing.energy_has_gas),
      electricity_usage_revision: electricity == null ? 0 : usageChanged ? Number(existing && existing.electricity_usage_revision || 0) + 1 : Number(existing && existing.electricity_usage_revision || 1)
    };
  }
  function draft() {
    var bridge = global.AppointmentCompanionBridge;
    var data = typeof global.serializeForm === 'function' ? global.serializeForm() : {};
    var name = String(data.customerName || $('customerName') && $('customerName').value || '').trim();
    return { local_id: currentId || store.makeId(), cloud_id: current && current.cloud_id || '', customer_name: name, appointment_state: clone(data), specialist_state: bridge && bridge.getJourney ? clone(bridge.getJourney().specialists || {}) : clone(current && current.specialist_state || {}), basket_url: String(data.inputs && data.inputs.basketLink || $('basketLink') && $('basketLink').value || ''), cloud_customer: clone(current && current.cloud_customer || null), cloud_revision: current && current.cloud_revision || '', last_cloud_updated_at: current && current.last_cloud_updated_at || '', cloud_synced_local_revision: current && current.cloud_synced_local_revision || 0 };
  }
  async function persist(announce) {
    paint(current, true);
    var next = draft(); currentId = next.local_id; sessionStorage.setItem(CURRENT_KEY, currentId);
    current = await store.put(next); paint(current, false);
    if (announce) status(LOCAL_ONLY ? 'Saved safely on this device. Cloud is paused in local-only mode.' : 'Saved safely on this device. Cloud sync is queued in the background.', 'good');
    scheduleSync(900); return clone(current);
  }
  function queuePersist(event) {
    if (event && event.target && event.target.closest && event.target.closest('#cloudPilotCard,#localFirstCustomers,#cloudConnectModal,#cloudSettingsModal')) return;
    paint(current, true); clearTimeout(saveTimer); saveTimer = setTimeout(function () { persist(false).catch(function () { setIcon('cloudLocalState', false, 'Local persistence needs attention'); status('Local save needs attention. Keep this page open and try again.', 'bad'); }); }, 180);
  }
  async function loadRecord(record, quiet) {
    if (!record || record.deleted) return;
    currentId = record.local_id; current = clone(record); sessionStorage.setItem(CURRENT_KEY, currentId);
    if (record.cloud_id) sessionStorage.setItem(CLOUD_CURRENT_KEY, record.cloud_id); else sessionStorage.removeItem(CLOUD_CURRENT_KEY);
    if (record.appointment_state && typeof global.restoreForm === 'function') global.restoreForm(clone(record.appointment_state));
    var bridge = global.AppointmentCompanionBridge;
    if (bridge && bridge.updateWorkingRecord) {
      bridge.updateWorkingRecord({ customer_id: record.cloud_id || '', customer_name: record.customer_name || '', appointment_state: clone(record.appointment_state), specialists: clone(record.specialist_state || {}), basket_url: record.basket_url || '' });
      if (bridge.setToolState) Object.keys(record.specialist_state || {}).forEach(function (tool) { bridge.setToolState(tool, clone(record.specialist_state[tool])); });
    }
    paint(record, false); if (!quiet) status((record.customer_name || 'Local customer') + ' opened from this device.', 'good');
  }
  function recentRows(records) { try { localStorage.setItem('apptCompanionRecentCustomersV1', JSON.stringify(records.filter(function (r) { return !r.deleted; }).slice(0, 20).map(function (r) { return { customer_id: r.local_id, customer_name: r.customer_name || 'Unnamed', updated_at: r.updated_at, summary: r.appointment_state && r.appointment_state.summary || {}, has_ev: !!(r.specialist_state && r.specialist_state.ev), locally_available: true }; }))); } catch (_) {} }
  async function customerBrowser() {
    var modal = $('localFirstCustomers');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'localFirstCustomers'; modal.className = 'basket-prompt';
      modal.innerHTML = '<div class="basket-prompt-card" role="dialog" aria-modal="true" aria-labelledby="localFirstCustomersTitle" style="width:min(100%,700px);max-height:calc(100dvh - 30px);overflow:auto"><h3 id="localFirstCustomersTitle">Customers on this device</h3><p class="sub" id="localFirstCustomersNote"></p><div id="localFirstCustomerRows" style="display:grid;gap:8px"></div><div class="modal-actions"><button class="btn-ghost" type="button" data-local-close>Close</button></div></div>';
      modal.addEventListener('click', async function (event) {
        if (event.target === modal || event.target.dataset.localClose !== undefined) modal.classList.remove('open');
        var row = event.target.closest('[data-local-load]'); if (row) { modal.classList.remove('open'); await loadRecord(await store.get(row.dataset.localLoad)); }
        var del = event.target.closest('[data-local-delete]'); if (del) { await markDeleted(del.dataset.localDelete); await customerBrowser(); }
        var choice = event.target.closest('[data-local-conflict]'); if (choice) { await resolveConflict(choice.dataset.localConflict, choice.dataset.choice); await customerBrowser(); }
      }); document.body.appendChild(modal);
    }
    var records = await store.list(true); recentRows(records);
    $('localFirstCustomersNote').textContent = LOCAL_ONLY ? 'Local-only mode. Cloud access is deliberately paused.' : 'Cached customers open immediately. Cloud-only customers appear here after background hydration.';
    $('localFirstCustomerRows').innerHTML = records.filter(function (r) { return !r.deleted; }).map(function (r) {
      var conflict = !!r.conflict, label = conflict ? '⚠️ Another device also changed this customer' : isSynced(r) ? '☁️ Latest revision synced' : '💾 Safe here · Cloud pending';
      return '<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:9px"><button type="button" class="pill" style="flex:1;text-align:left;justify-content:flex-start" data-local-load="' + r.local_id + '"><span style="display:grid"><strong>' + escapeHtml(r.customer_name || 'Unnamed') + '</strong><small style="color:var(--muted)">' + label + '</small></span></button>' + (conflict ? '<button class="btn-ghost" type="button" data-local-conflict="' + r.local_id + '" data-choice="local">Keep mine</button><button class="btn-ghost" type="button" data-local-conflict="' + r.local_id + '" data-choice="cloud">Use other</button>' : '') + '<button type="button" class="btn-ghost" title="Delete customer" aria-label="Delete customer" data-local-delete="' + r.local_id + '">🗑️</button></div>';
    }).join('') || '<p class="sub">No saved customers on this device yet.</p>';
    modal.classList.add('open');
  }
  async function markDeleted(localId) {
    var record = await store.get(localId); if (!record) return;
    if (!global.confirm('Delete ' + (record.customer_name || 'this customer') + '? If Cloud is unavailable, deletion will finish automatically after reconnecting.')) return;
    current = await store.put(Object.assign({}, record, { deleted: true, tombstone: true, deletion_requested_at: new Date().toISOString(), sync_state: 'pending_delete' }));
    if (localId === currentId) await startNewCustomer(true); scheduleSync(50); status('Customer removed from this device. Cloud deletion is pending until acknowledged.', '');
  }
  async function resolveConflict(localId, choice) {
    var record = await store.get(localId); if (!record || !record.conflict) return;
    var history = (record.conflict_history || []).concat([{ resolved_at: new Date().toISOString(), choice: choice, local: { appointment_state: record.appointment_state, specialist_state: record.specialist_state, local_revision: record.local_revision }, remote: record.conflict.remote }]).slice(-5);
    if (choice === 'cloud') {
      var remote = record.conflict.remote || {};
      if (remote.deleted) { await store.remove(localId); if (currentId === localId) await startNewCustomer(true); return; }
      current = await store.put(Object.assign({}, record, { customer_name: remote.customer_name || record.customer_name, appointment_state: appointment(remote) || record.appointment_state, specialist_state: appointment(remote) && appointment(remote)._journey && appointment(remote)._journey.specialists || record.specialist_state, cloud_customer: remote, cloud_revision: remoteVersion(remote), last_cloud_updated_at: remote.updated_at || '', cloud_synced_local_revision: record.local_revision, sync_state: 'synced', conflict: null, conflict_history: history }), { keepRevision: true, keepSyncState: true });
    } else current = await store.put(Object.assign({}, record, { conflict: null, conflict_history: history, sync_state: 'pending' }), { keepRevision: true, keepSyncState: true });
    if (currentId === localId) await loadRecord(current, true); scheduleSync(50);
  }
  function cloudPayload(record) {
    var data = record.appointment_state || {}, existing = clone(record.cloud_customer || {}), usage = recordUsage(record, existing);
    return Object.assign(existing, usage, { customer_id: record.cloud_id || '', customer_name: record.customer_name, appointment_state_json: data, basket_url: record.basket_url || '', private_notes: data.notes || '', ev_state_json: record.specialist_state && record.specialist_state.ev || existing.ev_state_json || null, client_revision_id: record.client_revision_id || '', local_sync_revision: record.local_revision, base_cloud_revision: record.cloud_revision || '' });
  }
  function equivalent(record, remote) { return JSON.stringify(record.appointment_state || null) === JSON.stringify(appointment(remote) || null) && JSON.stringify(record.specialist_state && record.specialist_state.ev || null) === JSON.stringify(remote && (remote.ev_state || remote.ev_state_json) || null); }
  async function conflict(record, remote) { return store.put(Object.assign({}, record, { conflict: { remote: clone(remote), detected_at: new Date().toISOString() }, sync_state: 'conflict' }), { keepRevision: true, keepSyncState: true }); }
  async function syncOne(record, credentials) {
    if (record.deleted) { if (!record.cloud_id) { await store.remove(record.local_id); return null; } await api.deleteCustomer(credentials, record.cloud_id); await store.remove(record.local_id); return null; }
    if (!record.customer_name) return record;
    if (record.cloud_id) {
      var remote;
      try { remote = (await api.getCustomer(credentials, record.cloud_id)).customer; }
      catch (error) { if (/not found|could not be found|missing customer/i.test(String(error && error.message || error))) return conflict(record, { deleted: true, customer_id: record.cloud_id }); throw error; }
      var rv = remoteVersion(remote), base = String(record.cloud_revision || record.last_cloud_updated_at || '');
      if ((!base && !equivalent(record, remote)) || (base && rv && rv !== base)) return conflict(record, remote);
      if (!base && equivalent(record, remote)) return store.put(Object.assign({}, record, { cloud_customer: remote, cloud_revision: rv, last_cloud_updated_at: remote.updated_at || '', cloud_synced_local_revision: record.local_revision, sync_state: 'synced' }), { keepRevision: true, keepSyncState: true });
    }
    var saved = (await api.saveCustomer(credentials, cloudPayload(record))).customer;
    if (!saved) throw new Error('Cloud did not acknowledge the saved customer.');
    return store.put(Object.assign({}, record, { cloud_id: saved.customer_id, customer_name: saved.customer_name || record.customer_name, cloud_customer: saved, cloud_revision: remoteVersion(saved) || 'ack:' + (record.client_revision_id || record.local_revision), last_cloud_updated_at: saved.updated_at || '', cloud_synced_local_revision: record.local_revision, sync_state: 'synced', tombstone: false, conflict: null }), { keepRevision: true, keepSyncState: true });
  }
  async function hydrate(credentials) {
    var listing = await api.listCustomers(credentials), metas = Array.isArray(listing.customers) ? listing.customers : [], ids = {};
    metas.forEach(function (meta) { if (meta.customer_id) ids[String(meta.customer_id)] = true; });
    var locals = await store.list(true);
    for (var i = 0; i < metas.length; i++) {
      var meta = metas[i], local = await store.findCloud(meta.customer_id); if (local && local.deleted) continue;
      var rv = remoteVersion(meta), known = local && String(local.cloud_revision || local.last_cloud_updated_at || '');
      if (!local || rv && rv !== known) {
        var full = (await api.getCustomer(credentials, meta.customer_id)).customer; if (!full) continue;
        if (local && local.sync_state !== 'synced') await conflict(local, full);
        else {
          var state = appointment(full), specialists = state && state._journey && state._journey.specialists || {};
          await store.put({ local_id: local && local.local_id, cloud_id: full.customer_id, customer_name: full.customer_name || '', appointment_state: state, specialist_state: Object.assign({}, specialists, full.ev_state || full.ev_state_json ? { ev: full.ev_state || full.ev_state_json } : {}), basket_url: full.basket_url || '', cloud_customer: full, local_revision: local && local.local_revision || 0, cloud_synced_local_revision: local && local.local_revision || 0, cloud_revision: remoteVersion(full), last_cloud_updated_at: full.updated_at || '', sync_state: 'synced', deleted: false, tombstone: false }, { keepRevision: true, keepSyncState: true });
        }
      }
    }
    for (var j = 0; j < locals.length; j++) {
      var row = locals[j];
      if (row.cloud_id && row.sync_state === 'synced' && !ids[row.cloud_id]) await store.remove(row.local_id);
      else if (row.cloud_id && row.sync_state !== 'synced' && !row.deleted && !ids[row.cloud_id]) await conflict(row, { deleted: true, customer_id: row.cloud_id });
    }
  }
  async function sync() {
    if (LOCAL_ONLY || syncing || !navigator.onLine || !api) return;
    var credentials = auth(); if (!credentials) { setIcon('cloudConnectionState', false, 'Cloud sync awaits Partner sign-in'); return; }
    syncing = true;
    try {
      var rows = await store.list(true);
      for (var i = 0; i < rows.length; i++) if (rows[i].sync_state === 'pending' || rows[i].sync_state === 'pending_delete') await syncOne(rows[i], credentials);
      await hydrate(credentials); retryMs = 2500;
      current = currentId ? await store.get(currentId) : null; paint(current, false); recentRows(await store.list(true));
      if (current && isSynced(current)) status('Latest local revision synchronised to Cloud.', 'good');
    } catch (error) {
      retryMs = Math.min(retryMs * 2, 120000); setIcon('cloudConnectionState', false, 'Cloud unavailable; work remains safe locally'); status('Cloud unavailable - working locally. Your appointment is safe on this device.', ''); scheduleSync(retryMs);
    } finally { syncing = false; }
  }
  function scheduleSync(delay) { if (LOCAL_ONLY) return; clearTimeout(syncTimer); syncTimer = setTimeout(sync, delay == null ? retryMs : delay); }
  async function startNewCustomer(fromDelete) {
    clearTimeout(saveTimer);
    if (!fromDelete && current && current.appointment_state && meaningful(current.appointment_state)) await persist(false);
    currentId = ''; current = null; sessionStorage.removeItem(CURRENT_KEY); sessionStorage.removeItem(CLOUD_CURRENT_KEY);
    var bridge = global.AppointmentCompanionBridge; if (bridge && bridge.clearWorkingRecord) bridge.clearWorkingRecord();
    if (typeof global.resetForm === 'function') global.resetForm();
    var fresh = draft(); currentId = fresh.local_id; sessionStorage.setItem(CURRENT_KEY, currentId); current = await store.put(fresh); paint(current, false); status('New customer started locally. Cloud sync will run in the background when ready.', 'good');
  }
  async function saveAsNew() { await persist(false); currentId = ''; current = null; sessionStorage.removeItem(CURRENT_KEY); sessionStorage.removeItem(CLOUD_CURRENT_KEY); await persist(true); }
  function intercept() {
    document.addEventListener('input', queuePersist, true); document.addEventListener('change', queuePersist, true);
    document.addEventListener('click', function (event) {
      var action = event.target.closest && event.target.closest('[data-cloud-action]'); if (!action) return;
      var kind = action.dataset.cloudAction;
      if (['save', 'save-as', 'all-customers', 'recent-customers', 'delete-current', 'new-customer'].indexOf(kind) < 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (kind === 'save') persist(true); else if (kind === 'save-as') saveAsNew(); else if (kind === 'all-customers' || kind === 'recent-customers') customerBrowser(); else if (kind === 'new-customer') startNewCustomer(false); else if (currentId) markDeleted(currentId);
    }, true);
    global.addEventListener('online', function () { scheduleSync(50); }); global.addEventListener('focus', function () { scheduleSync(100); }); global.addEventListener('ac:cloud-authenticated', function () { scheduleSync(50); });
  }
  async function boot() {
    await store.migrate(); var rows = await store.list(); recentRows(rows);
    var record = currentId && await store.get(currentId);
    if (!record) {
      var working = global.AppointmentCompanionBridge && global.AppointmentCompanionBridge.getWorkingRecord ? global.AppointmentCompanionBridge.getWorkingRecord() : null;
      if (working && (working.appointment_state || working.customer_name)) record = await store.put({ cloud_id: working.customer_id || '', customer_name: working.customer_name || '', appointment_state: working.appointment_state || null, specialist_state: working.specialists || {}, basket_url: working.basket_url || '', sync_state: 'pending' }, { keepSyncState: true });
    }
    if (record) await loadRecord(record, true); else await startNewCustomer(true);
    if (LOCAL_ONLY) { var banner = document.createElement('div'); banner.className = 'md-note'; banner.style.margin = '0 0 .7rem'; banner.innerHTML = '📵 <strong>Local-only mode</strong> — Cloud sync, Cloud customers and Cloud-backed sharing are paused. Your appointment is safe on this device. <a href="./">Return to normal mode</a>.'; var wrap = document.querySelector('.wrap'); if (wrap) wrap.insertBefore(banner, wrap.firstChild); status('Local-only mode - working safely on this device.', 'good'); }
    intercept(); scheduleSync(700); setInterval(function () { scheduleSync(0); }, 45000);
  }
  global.AppointmentCompanionLocalFirst = { persist: persist, load: loadRecord, list: function () { return store.list(); }, currentId: function () { return currentId; }, currentRecord: function () { return clone(current); }, scheduleSync: scheduleSync, sync: sync, persistSpecialist: async function (tool, state) { if (!currentId) return null; current = await store.updateSpecialist(currentId, tool, state); paint(current, false); scheduleSync(900); return clone(current); } };
  var attempts = 0, timer = setInterval(function () { if ($('cloudPilotCard') && store) { clearInterval(timer); boot().catch(function (error) { setIcon('cloudLocalState', false, 'Local persistence needs attention'); status('Local-first setup needs attention: ' + error.message, 'bad'); }); } else if (++attempts > 120) clearInterval(timer); }, 50);
})(window);
