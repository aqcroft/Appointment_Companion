/* Appointment Companion v2.42 - true discrepancies + multi-delete. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION = 'v2.42';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var AUTH_KEY = 'apptCloudPilotAuthSession';
  var DEVICE_AUTH_KEY = 'apptCloudPilotAuthDeviceV1';

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function escapeHtml(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function display(v) {
    if (v == null || v === '') return 'Not set';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch (_) { return String(v); } }
    return String(v);
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

  function addStyles() {
    if (document.getElementById('acV242Style')) return;
    var st = document.createElement('style'); st.id = 'acV242Style';
    st.textContent = [
      '#acV242BulkBar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:8px 0 10px}',
      '#acV242BulkBar button{min-height:34px;border:1px solid rgba(122,66,200,.18);border-radius:9px;background:#fff;color:#26164f;padding:6px 9px;font:750 11px system-ui;cursor:pointer}',
      '#acV242BulkBar button.danger{background:#fff3f3;border-color:#e6b5b5;color:#8b2e2e}',
      '#acV242BulkBar .count{font-size:10px;color:#6b6b76}',
      '.ac-v242-check{display:none;align-items:center;justify-content:center;flex:0 0 28px}',
      '.ac-v242-check input{width:18px;height:18px;accent-color:#7a42c8}',
      '#localFirstCustomers.ac-v242-selecting .ac-v242-check{display:flex}',
      '#localFirstCustomers.ac-v242-selecting [data-local-delete]{display:none!important}',
      '.ac-v242-diff-modal{display:none;position:fixed;inset:0;z-index:15100;background:rgba(38,22,79,.48);padding:16px;align-items:center;justify-content:center}',
      '.ac-v242-diff-modal.open{display:flex}',
      '.ac-v242-diff-card{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28);color:#26164f}',
      '.ac-v242-diff-card h3{margin:0 0 5px;font-size:17px}',
      '.ac-v242-diff-card>.sub{margin:0 0 10px;color:#6b6b76;font-size:11px;line-height:1.4}',
      '.ac-v242-diff-row{border:1px solid rgba(122,66,200,.13);border-radius:10px;overflow:hidden;margin-top:8px}',
      '.ac-v242-diff-label{padding:6px 8px;background:#faf8fe;font-size:11px;font-weight:850}',
      '.ac-v242-diff-values{display:grid;grid-template-columns:1fr 1fr}',
      '.ac-v242-diff-values>div{padding:8px;font-size:11px;line-height:1.35;word-break:break-word}',
      '.ac-v242-diff-values>div+div{border-left:1px solid rgba(122,66,200,.12)}',
      '.ac-v242-diff-values b{display:block;margin-bottom:3px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b6b76}',
      '.ac-v242-close{width:100%;min-height:42px;margin-top:12px;border:0;border-radius:10px;background:#7a42c8;color:#fff;font:800 13px system-ui;cursor:pointer}',
      '@media(max-width:520px){.ac-v242-diff-values{grid-template-columns:1fr}.ac-v242-diff-values>div+div{border-left:0;border-top:1px solid rgba(122,66,200,.12)}}'
    ].join('');
    document.head.appendChild(st);
  }

  function installVersion() {
    var old = document.querySelector('.ac-version-mini');
    if (!old || old.dataset.acReleaseV242 === '1') return !!old;
    var fresh = old.cloneNode(true); fresh.dataset.acReleaseV242 = '1'; fresh.textContent = VERSION;
    fresh.title = 'About this version'; fresh.setAttribute('aria-label','About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout'); if (previous) previous.remove();
      var modal = document.createElement('div'); modal.id = 'acVersionAbout'; modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>A customer profile is not persisted until a name exists, preventing unnamed draft profiles from proliferating.</li><li>Cloud reconciliation now uses a three-way merge: one-sided information is merged automatically and only genuinely conflicting populated values require review.</li><li>The customer browser now supports Select multiple and one-confirmation bulk deletion.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }

  function ensureDiffModal() {
    var modal = document.getElementById('acV242DiffModal');
    if (modal) return modal;
    modal = document.createElement('div'); modal.id = 'acV242DiffModal'; modal.className = 'ac-v242-diff-modal';
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-v242-close')) modal.classList.remove('open'); });
    document.body.appendChild(modal); return modal;
  }

  async function showTrueConflict(id) {
    var store = global.AppointmentCompanionLocalStore; if (!store || !store.get) return;
    var row = await store.get(id); if (!row || !row.conflict) return;
    var conflicts = row.conflict.true_conflicts || [];
    if (!conflicts.length && global.AppointmentCompanionReconcileV242 && global.AppointmentCompanionReconcileV242.analyse) {
      var analysed = global.AppointmentCompanionReconcileV242.analyse(row); conflicts = analysed && analysed.conflicts || [];
    }
    var modal = ensureDiffModal();
    var rows = conflicts.map(function (d) {
      return '<div class="ac-v242-diff-row"><div class="ac-v242-diff-label">' + escapeHtml(d.label || d.path || 'Difference') + '</div><div class="ac-v242-diff-values"><div><b>This device</b>' + escapeHtml(display(d.local)) + '</div><div><b>Cloud</b>' + escapeHtml(display(d.cloud)) + '</div></div></div>';
    }).join('');
    if (!rows) rows = '<p class="sub">There are no genuine populated-value conflicts left. One-sided information will be merged automatically.</p>';
    modal.innerHTML = '<div class="ac-v242-diff-card"><h3>🔍 Local / Cloud differences</h3><p class="sub">' + escapeHtml(row.customer_name || 'This customer') + ' - only fields where both versions contain different meaningful values are shown.</p>' + rows + '<button type="button" class="ac-v242-close">Close</button></div>';
    modal.classList.add('open');
  }

  function interceptInspector() {
    if (!isMain || document.documentElement.dataset.acV242Inspector === '1') return;
    document.documentElement.dataset.acV242Inspector = '1';
    document.addEventListener('click', function (e) {
      var inspect = e.target.closest && e.target.closest('.ac-v23-conflict-inspect'); if (!inspect) return;
      var row = inspect.parentElement; var choice = row && row.querySelector('[data-local-conflict]'); if (!choice) return;
      e.preventDefault(); e.stopImmediatePropagation(); showTrueConflict(choice.dataset.localConflict);
    }, true);
  }

  function selectedIds(modal) {
    return Array.prototype.slice.call(modal.querySelectorAll('.ac-v242-check input:checked')).map(function (cb) { return cb.value; });
  }
  function updateBulkCount(modal) {
    var ids = selectedIds(modal), count = modal.querySelector('#acV242BulkCount'), del = modal.querySelector('#acV242BulkDelete');
    if (count) count.textContent = ids.length ? ids.length + ' selected' : 'None selected';
    if (del) { del.hidden = !ids.length; del.textContent = '🗑️ Delete selected (' + ids.length + ')'; }
  }

  function decorateRows() {
    if (!isMain) return;
    var modal = document.getElementById('localFirstCustomers'), wrap = document.getElementById('localFirstCustomerRows');
    if (!modal || !wrap) return;
    Array.prototype.slice.call(wrap.children).forEach(function (row) {
      var load = row.querySelector('[data-local-load]'); if (!load || row.querySelector('.ac-v242-check')) return;
      var id = load.dataset.localLoad;
      var holder = document.createElement('label'); holder.className = 'ac-v242-check'; holder.title = 'Select customer';
      holder.innerHTML = '<input type="checkbox" value="' + escapeHtml(id) + '" aria-label="Select customer">';
      holder.addEventListener('click', function (e) { e.stopPropagation(); });
      holder.querySelector('input').addEventListener('change', function () { updateBulkCount(modal); });
      row.insertBefore(holder, row.firstChild);
    });
  }

  async function deleteMany(ids) {
    var store = global.AppointmentCompanionLocalStore, api = global.AppointmentCompanionCloud, credentials = auth();
    if (!store || !ids.length) return;
    if (!global.confirm('Delete ' + ids.length + ' selected customer profile' + (ids.length === 1 ? '' : 's') + '?')) return;
    var engine = global.AppointmentCompanionConsolidated;
    var currentId = engine && engine.currentId ? engine.currentId() : '';
    var deletedCurrent = ids.indexOf(currentId) >= 0;
    for (var i = 0; i < ids.length; i++) {
      var row = await store.get(ids[i]); if (!row) continue;
      if (!row.cloud_id) { await store.remove(row.local_id); continue; }
      var removed = false;
      if (credentials && navigator.onLine && api && typeof api.deleteCustomer === 'function') {
        try { await api.deleteCustomer(credentials, row.cloud_id); await store.remove(row.local_id); removed = true; } catch (_) {}
      }
      if (!removed) await store.put(Object.assign({}, row, { deleted:true, tombstone:true, deletion_requested_at:new Date().toISOString(), sync_state:'pending_delete' }), { keepRevision:true, keepSyncState:true });
    }
    if (engine && engine.scheduleSync) engine.scheduleSync(100);
    if (deletedCurrent) {
      var newCustomer = document.querySelector('[data-cloud-action="new-customer"]'); if (newCustomer) newCustomer.click();
    }
    var modal = document.getElementById('localFirstCustomers'); if (modal) modal.classList.remove('open');
    setTimeout(function () { var open = document.getElementById('cloudCustomerShortcut'); if (open) open.click(); }, 80);
  }

  function ensureBulkBar() {
    if (!isMain) return false;
    var modal = document.getElementById('localFirstCustomers'); if (!modal) return false;
    var note = modal.querySelector('#localFirstCustomersNote'); if (!note) return false;
    if (!modal.querySelector('#acV242BulkBar')) {
      var bar = document.createElement('div'); bar.id = 'acV242BulkBar';
      bar.innerHTML = '<button type="button" id="acV242BulkToggle">☑️ Select multiple</button><span class="count" id="acV242BulkCount">None selected</span><button type="button" class="danger" id="acV242BulkDelete" hidden>🗑️ Delete selected (0)</button><button type="button" id="acV242BulkCancel" hidden>Cancel</button>';
      note.insertAdjacentElement('afterend', bar);
      bar.querySelector('#acV242BulkToggle').addEventListener('click', function () {
        modal.classList.add('ac-v242-selecting'); this.hidden = true; bar.querySelector('#acV242BulkCancel').hidden = false; decorateRows();
      });
      bar.querySelector('#acV242BulkCancel').addEventListener('click', function () {
        modal.classList.remove('ac-v242-selecting'); bar.querySelector('#acV242BulkToggle').hidden = false; this.hidden = true;
        modal.querySelectorAll('.ac-v242-check input').forEach(function (cb) { cb.checked = false; }); updateBulkCount(modal);
      });
      bar.querySelector('#acV242BulkDelete').addEventListener('click', function () { deleteMany(selectedIds(modal)); });
    }
    decorateRows(); return true;
  }

  function observe() {
    if (!isMain || document.documentElement.dataset.acV242Observed === '1') return;
    document.documentElement.dataset.acV242Observed = '1';
    var obs = new MutationObserver(function () { ensureBulkBar(); decorateRows(); });
    obs.observe(document.body, { childList:true, subtree:true });
  }

  addStyles(); interceptInspector(); observe();
  var tries = 0, timer = setInterval(function () {
    var versionReady = installVersion(); ensureBulkBar(); decorateRows();
    if (versionReady && ++tries > 20) clearInterval(timer); else if (++tries > 220) clearInterval(timer);
  }, 50);
})(window);
