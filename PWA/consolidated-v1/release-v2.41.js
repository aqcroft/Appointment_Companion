/* Appointment Companion v2.41 - shared-view clean-up, Cloud state routing and deletion reliability. */
(function (global) {
  'use strict';

  var VERSION = 'v2.41';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var AUTH_KEY = 'apptCloudPilotAuthSession';
  var DEVICE_AUTH_KEY = 'apptCloudPilotAuthDeviceV1';
  var CLOUD_PROMPT_HIDE_KEY = 'apptCompanionCloudPromptHiddenV22';

  function isSharedView() {
    var params = new URL(location.href).searchParams;
    return document.documentElement.classList.contains('view-mode') ||
      document.documentElement.classList.contains('shared-view') ||
      /^d=/.test(location.hash.slice(1)) ||
      params.has('s') || params.get('view') === 'customer' || params.get('mode') === 'customer';
  }

  function addStyles() {
    if (document.getElementById('acV241Style')) return;
    var st = document.createElement('style');
    st.id = 'acV241Style';
    st.textContent = [
      'html.view-mode #acSharedToolstrip,html.shared-view #acSharedToolstrip,html.ac-customer-shared #acSharedToolstrip{display:none!important}',
      '.ac-v241-cloud-modal{display:none;position:fixed;inset:0;z-index:15050;background:rgba(38,22,79,.46);padding:16px;align-items:center;justify-content:center}',
      '.ac-v241-cloud-modal.open{display:flex}',
      '.ac-v241-cloud-card{width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#26164f;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28)}',
      '.ac-v241-cloud-card h3{margin:0 0 5px;font-size:17px}',
      '.ac-v241-cloud-card p{margin:.35rem 0;color:#6b6b76;font-size:12px;line-height:1.45}',
      '.ac-v241-cloud-state{display:grid;gap:7px;margin:10px 0}',
      '.ac-v241-cloud-state>div{display:grid;grid-template-columns:26px 1fr;gap:8px;align-items:start;padding:8px 9px;border:1px solid rgba(122,66,200,.12);border-radius:10px;background:#faf8fe}',
      '.ac-v241-cloud-state strong{display:block;font-size:12px}',
      '.ac-v241-cloud-state small{display:block;margin-top:1px;color:#6b6b76;font-size:10px;line-height:1.35}',
      '.ac-v241-cloud-actions{display:grid;gap:7px;margin-top:12px}',
      '.ac-v241-cloud-actions button{width:100%;min-height:42px;border:1px solid rgba(122,66,200,.18);border-radius:10px;background:#fff;color:#26164f;font:760 13px system-ui;cursor:pointer}',
      '.ac-v241-cloud-actions button.primary{background:#7a42c8;color:#fff;border-color:#7a42c8}',
      '.ac-v241-delete-note{font-size:10px;color:#6b6b76}',
      '#acV23CloudHealth .ac-v23-health-actions button[data-ac-v241-remove="1"]{display:none!important}'
    ].join('');
    document.head.appendChild(st);
  }

  function removeSharedToolbar() {
    if (!isSharedView()) return false;
    document.documentElement.classList.add('ac-customer-shared');
    var strip = document.getElementById('acSharedToolstrip');
    if (strip) strip.remove();
    return true;
  }

  function installVersion() {
    if (isSharedView()) return true;
    var old = document.querySelector('.ac-version-mini');
    if (!old || old.dataset.acReleaseV241 === '1') return !!old;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV241 = '1';
    fresh.textContent = VERSION;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout'); if (previous) previous.remove();
      var modal = document.createElement('div'); modal.id = 'acVersionAbout'; modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>Customer shared views no longer show the Partner toolbar or hamburger menu.</li><li>Cloud status now separates a severed Cloud login from local/Cloud profile mismatches and offers the right action on the first tap.</li><li>Customer deletion now attempts Cloud removal immediately when connected, otherwise retains a hidden tombstone until automatic sync can finish the deletion.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }

  function auth() {
    try {
      var row = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
      if (!(row && row.partner_id && row.workspace_key)) row = JSON.parse(localStorage.getItem(DEVICE_AUTH_KEY) || 'null');
      if (row && row.partner_id && row.workspace_key) {
        try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(row)); } catch (_) {}
        return row;
      }
      return null;
    } catch (_) { return null; }
  }

  async function records() {
    try {
      var store = global.AppointmentCompanionLocalStore;
      if (store && store.list) return await store.list(true);
      var engine = global.AppointmentCompanionConsolidated;
      if (engine && engine.list) return await engine.list();
    } catch (_) {}
    return [];
  }

  async function cloudState() {
    var connected = !!auth();
    var rows = await records();
    rows = Array.isArray(rows) ? rows : [];
    var meaningful = rows.filter(function (r) { return r && (String(r.customer_name || '').trim() || r.deleted || r.tombstone); });
    var conflicts = meaningful.filter(function (r) { return !r.deleted && (r.sync_state === 'conflict' || r.conflict); }).length;
    var pending = meaningful.filter(function (r) { return r.sync_state === 'pending' || r.sync_state === 'pending_delete'; }).length;
    var pendingDeletes = meaningful.filter(function (r) { return r.deleted && (r.sync_state === 'pending_delete' || r.tombstone); }).length;
    return { connected:connected, conflicts:conflicts, pending:pending, pendingDeletes:pendingDeletes };
  }

  function closeSettings() {
    var modal = document.getElementById('cloudSettingsModal');
    if (modal) modal.classList.remove('open');
  }

  function openCloudSettings() {
    var settings = document.querySelector('[data-cloud-action="settings"]');
    if (!settings) return false;
    settings.click();
    setTimeout(function () {
      var cloud = document.querySelector('#cloudSettingsModal [data-settings-section="cloud"]');
      if (cloud) cloud.click();
    }, 0);
    return true;
  }

  function openCloudLogin() {
    if (typeof global.openConnectModal === 'function') { global.openConnectModal(); return true; }
    if (openCloudSettings()) {
      setTimeout(function () { var connect = document.getElementById('cloudSettingsConnect'); if (connect) connect.click(); }, 20);
      return true;
    }
    var direct = document.querySelector('[data-cloud-action="connect"],#cloudSettingsConnect,#cloudPilotConnect');
    if (direct) { direct.click(); return true; }
    return false;
  }

  function openMismatchList() {
    closeSettings();
    var shortcut = document.getElementById('cloudCustomerShortcut');
    if (shortcut) { shortcut.click(); return true; }
    var all = document.querySelector('[data-cloud-action="all-customers"]');
    if (all) { all.click(); return true; }
    return false;
  }

  function ensureCloudModal() {
    var modal = document.getElementById('acV241CloudModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'acV241CloudModal';
    modal.className = 'ac-v241-cloud-modal';
    modal.innerHTML = '<div class="ac-v241-cloud-card" role="dialog" aria-modal="true" aria-labelledby="acV241CloudTitle"><h3 id="acV241CloudTitle">☁️ Cloud status</h3><div id="acV241CloudBody"></div><div class="ac-v241-cloud-actions" id="acV241CloudActions"></div></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });
    document.body.appendChild(modal);
    return modal;
  }

  async function showCloudActions() {
    var state = await cloudState();
    if (state.connected && !state.conflicts && !state.pendingDeletes) { openCloudSettings(); return; }
    var modal = ensureCloudModal();
    var body = modal.querySelector('#acV241CloudBody');
    var actions = modal.querySelector('#acV241CloudActions');
    var blocks = [];
    if (!state.connected) blocks.push('<div><span>🔴</span><span><strong>Cloud link is not connected</strong><small>Your work remains safe on this device. Sign in to resume Cloud sync.</small></span></div>');
    else blocks.push('<div><span>🟢</span><span><strong>Cloud link connected</strong><small>Companion can synchronise this device with Cloud.</small></span></div>');
    if (state.conflicts) blocks.push('<div><span>⚠️</span><span><strong>' + state.conflicts + ' profile mismatch' + (state.conflicts === 1 ? '' : 'es') + '</strong><small>Local and Cloud versions both changed. Review the differences before choosing which version to keep.</small></span></div>');
    if (state.pendingDeletes) blocks.push('<div><span>🗑️</span><span><strong>' + state.pendingDeletes + ' Cloud deletion' + (state.pendingDeletes === 1 ? '' : 's') + ' waiting</strong><small>The profile is already hidden locally. Companion will remove the Cloud copy when the link is available.</small></span></div>');
    body.innerHTML = '<div class="ac-v241-cloud-state">' + blocks.join('') + '</div>';
    actions.innerHTML = '';
    function button(label, primary, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (primary) b.className = 'primary'; b.addEventListener('click', function () { modal.classList.remove('open'); fn(); }); actions.appendChild(b); }
    if (!state.connected) button('🔐 Connect / reconnect Cloud', true, openCloudLogin);
    if (state.conflicts) button('🔍 Review profile mismatches', state.connected, openMismatchList);
    button('⚙️ Cloud settings', false, openCloudSettings);
    button('Close', false, function () {});
    modal.classList.add('open');
  }

  function rewireCloudStatusRow() {
    if (!isMain || isSharedView()) return true;
    var row = document.getElementById('acV22CloudStatusRow');
    if (!row) return false;
    if (row.dataset.acV241Route === '1') return true;
    var fresh = row.cloneNode(true);
    fresh.dataset.acV23Route = '1';
    fresh.dataset.acV241Route = '1';
    fresh.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); showCloudActions(); });
    row.parentNode.replaceChild(fresh, row);
    return true;
  }

  function tidyCloudSettingsActions() {
    if (!isMain) return;
    var box = document.getElementById('acV23CloudHealth');
    if (!box) return;
    Array.prototype.slice.call(box.querySelectorAll('button')).forEach(function (b) {
      if (/view customers on this device/i.test(b.textContent || '')) b.dataset.acV241Remove = '1';
      if (/review .*local \/ Cloud conflict/i.test(b.textContent || '')) b.textContent = (b.textContent || '').replace(/local \/ Cloud conflict(s)?/i, 'profile mismatch$1');
    });
  }

  async function immediateDelete(localId) {
    var store = global.AppointmentCompanionLocalStore;
    if (!store || !store.get || !store.put) return false;
    var row = await store.get(localId);
    if (!row) return true;
    if (!global.confirm('Delete ' + (row.customer_name || 'this customer') + '?')) return false;

    var tombstone = await store.put(Object.assign({}, row, {
      deleted:true,
      tombstone:true,
      deletion_requested_at:new Date().toISOString(),
      sync_state:'pending_delete'
    }));

    var credentials = auth();
    var api = global.AppointmentCompanionCloud;
    if (credentials && navigator.onLine && tombstone.cloud_id && api && typeof api.deleteCustomer === 'function') {
      try {
        await api.deleteCustomer(credentials, tombstone.cloud_id);
        await store.remove(tombstone.local_id);
      } catch (_) {
        var enginePending = global.AppointmentCompanionConsolidated;
        if (enginePending && enginePending.scheduleSync) enginePending.scheduleSync(100);
      }
    } else {
      var engine = global.AppointmentCompanionConsolidated;
      if (engine && engine.scheduleSync) engine.scheduleSync(100);
    }
    return true;
  }

  function wireListDeleteReliability() {
    if (!isMain || document.documentElement.dataset.acV241DeleteWired === '1') return;
    document.documentElement.dataset.acV241DeleteWired = '1';
    document.addEventListener('click', async function (event) {
      var del = event.target.closest && event.target.closest('[data-local-delete]');
      if (!del) return;
      event.preventDefault(); event.stopImmediatePropagation();
      var localId = del.dataset.localDelete;
      var done = await immediateDelete(localId);
      if (!done) return;
      var modal = document.getElementById('localFirstCustomers'); if (modal) modal.classList.remove('open');
      setTimeout(openMismatchList, 30);
    }, true);
  }

  function overrideDeleteCurrentButton() {
    if (!isMain) return true;
    var old = document.querySelector('[data-cloud-action="delete-current"]');
    if (!old) return false;
    if (old.dataset.acV241Delete === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.removeAttribute('data-cloud-action');
    fresh.dataset.acV241Delete = '1';
    fresh.addEventListener('click', async function (event) {
      event.preventDefault(); event.stopPropagation();
      var engine = global.AppointmentCompanionConsolidated;
      var row = engine && engine.currentRecord ? engine.currentRecord() : null;
      if (!row || !row.local_id) return;
      var done = await immediateDelete(row.local_id);
      if (!done) return;
      var newCustomer = document.querySelector('[data-cloud-action="new-customer"]');
      if (newCustomer) newCustomer.click();
    });
    old.parentNode.replaceChild(fresh, old);
    return true;
  }

  function observe() {
    if (document.documentElement.dataset.acV241Observed === '1') return;
    document.documentElement.dataset.acV241Observed = '1';
    var obs = new MutationObserver(function () {
      removeSharedToolbar();
      rewireCloudStatusRow();
      tidyCloudSettingsActions();
      overrideDeleteCurrentButton();
    });
    obs.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
  }

  addStyles();
  removeSharedToolbar();
  wireListDeleteReliability();
  observe();

  var tries = 0;
  var timer = setInterval(function () {
    removeSharedToolbar();
    var versionReady = installVersion();
    var cloudReady = isMain ? rewireCloudStatusRow() : true;
    tidyCloudSettingsActions();
    var deleteReady = isMain ? overrideDeleteCurrentButton() : true;
    if ((isSharedView() || versionReady) && cloudReady && deleteReady) clearInterval(timer);
    else if (++tries > 220) clearInterval(timer);
  }, 50);
})(window);
