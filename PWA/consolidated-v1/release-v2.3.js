/* Appointment Companion v2.3 visual consistency + conflict inspection pass. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v2.3';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);

  function addStyles() {
    if (document.getElementById('acV23Style')) return;
    var st = document.createElement('style');
    st.id = 'acV23Style';
    st.textContent = [
      '/* Main toolbar now uses exactly the same shell as the specialist tools. */',
      'body>#acSharedToolstrip{position:sticky!important;top:0!important;z-index:9997!important;width:100%!important;box-sizing:border-box!important;padding:6px 8px!important;margin:0!important;background:rgba(255,251,227,.96)!important;backdrop-filter:blur(8px)!important;border-bottom:1px solid rgba(122,66,200,.14)!important}',
      'body>#acSharedToolstrip .ac-toolstrip-inner{max-width:720px!important;margin:0 auto!important;display:flex!important;align-items:center!important;gap:4px!important}',
      '@media(max-width:430px){body>#acSharedToolstrip{padding-left:5px!important;padding-right:5px!important}body>#acSharedToolstrip .ac-toolstrip-inner{gap:2px!important}}',
      '/* Softer service colours - the supplied UW colours are now the selected-control colours. */',
      '#servicesCard [data-service="energy"].on,#energyCard .pill.on,#energyCard button.on,#energyCard .btn-primary,#canonicalEnergyPanel .canonical-choice button.on,#canonicalEnergyPanel #useSplitEstimate:not(:disabled){background:#BDDEE4!important;border-color:#9CC6CE!important;color:#26164f!important}',
      '#servicesCard [data-service="broadband"].on,#broadbandCard .pill.on,#broadbandCard button.on,#broadbandCard .btn-primary{background:#A2E2C3!important;border-color:#82CBA6!important;color:#26164f!important}',
      '#servicesCard [data-service="mobile"].on,#mobileCard .pill.on,#mobileCard button.on,#mobileCard .btn-primary{background:#FAD0E9!important;border-color:#E9AFCF!important;color:#26164f!important}',
      '#insuranceCard .pill.on,#insuranceCard button.on,#insuranceCard .btn-primary{background:#FFAB70!important;border-color:#ED9457!important;color:#26164f!important}',
      '#cashbackCard .pill.on,#cashbackCard button.on,#cashbackCard .btn-primary{background:#C6B5E2!important;border-color:#A995CC!important;color:#26164f!important}',
      '#energyCard .switch input:checked + .track,#canonicalEnergyPanel .switch input:checked + .track{background:#9FCAD2!important}',
      '#broadbandCard .switch input:checked + .track{background:#87D1AE!important}',
      '#mobileCard .switch input:checked + .track{background:#E9B5D4!important}',
      '#insuranceCard .switch input:checked + .track{background:#F3A16A!important}',
      '#cashbackCard .switch input:checked + .track{background:#AD99D1!important}',
      '#servicesCard .ac-inline-subchoice[data-kind="energy"] button.on{background:#BDDEE4!important;border-color:#9CC6CE!important;color:#26164f!important}',
      '#servicesCard .ac-inline-subchoice[data-kind="mobile"] button.on{background:#FAD0E9!important;border-color:#E9AFCF!important;color:#26164f!important}',
      '#energyCard{background:linear-gradient(135deg,color-mix(in srgb,#BDDEE4 18%,white),#fff 78%)!important}',
      '#broadbandCard{background:linear-gradient(135deg,color-mix(in srgb,#A2E2C3 18%,white),#fff 78%)!important}',
      '#mobileCard{background:linear-gradient(135deg,color-mix(in srgb,#FAD0E9 20%,white),#fff 78%)!important}',
      '#insuranceCard{background:linear-gradient(135deg,color-mix(in srgb,#FFAB70 16%,white),#fff 78%)!important}',
      '#cashbackCard{background:linear-gradient(135deg,color-mix(in srgb,#C6B5E2 18%,white),#fff 78%)!important}',
      '#energyCard h2,#canonicalEnergyPanel .canonical-title{color:#4C8791!important}',
      '#broadbandCard h2{color:#4F8E6E!important}',
      '#mobileCard h2{color:#A85D87!important}',
      '#insuranceCard h2{color:#B86B39!important}',
      '#cashbackCard h2{color:#715A98!important}',
      '/* Cloud settings status card. */',
      '#acV23CloudHealth{margin:.7rem 0;padding:.72rem;border:1px solid rgba(122,66,200,.13);border-radius:11px;background:#faf8fe}',
      '#acV23CloudHealth .ac-v23-health-line{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start}',
      '#acV23CloudHealth .ac-v23-health-line .light{font-size:18px;text-align:center}',
      '#acV23CloudHealth strong{display:block;font-size:13px;color:#26164f}',
      '#acV23CloudHealth small{display:block;margin-top:2px;font-size:11px;line-height:1.35;color:#6b6b76}',
      '#acV23CloudHealth .ac-v23-health-actions{display:grid;gap:7px;margin-top:9px}',
      '#acV23CloudHealth button{min-height:39px;border:1px solid rgba(122,66,200,.18);border-radius:9px;background:#fff;color:#26164f;font:750 12px/1.2 system-ui;cursor:pointer;text-align:left;padding:8px 10px}',
      '/* Conflict browser + inspector. */',
      '#localFirstCustomerRows .ac-v23-conflict-inspect{width:40px;height:40px;flex:0 0 40px;border:1px solid rgba(122,66,200,.18);border-radius:9px;background:#fff;color:#26164f;font-size:17px;cursor:pointer}',
      '#localFirstCustomerRows .ac-v23-conflict-choice{min-height:40px;border:1px solid rgba(122,66,200,.18)!important;border-radius:9px!important;background:#fff!important;color:#26164f!important;padding:7px 9px!important;text-decoration:none!important;font:750 12px/1.2 system-ui!important}',
      '.ac-v23-diff-modal{display:none;position:fixed;inset:0;z-index:14800;background:rgba(38,22,79,.48);padding:16px;align-items:center;justify-content:center}',
      '.ac-v23-diff-modal.open{display:flex}',
      '.ac-v23-diff-card{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28);color:#26164f}',
      '.ac-v23-diff-card h3{margin:0 0 5px;font-size:17px}',
      '.ac-v23-diff-card>.sub{margin:0 0 10px;color:#6b6b76;font-size:11px;line-height:1.4}',
      '.ac-v23-diff-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}',
      '.ac-v23-diff-meta div{padding:7px 8px;border:1px solid rgba(122,66,200,.12);border-radius:9px;background:#faf8fe;font-size:10px;color:#6b6b76}',
      '.ac-v23-diff-list{display:grid;gap:8px}',
      '.ac-v23-diff-row{border:1px solid rgba(122,66,200,.13);border-radius:10px;overflow:hidden}',
      '.ac-v23-diff-label{padding:6px 8px;background:#faf8fe;font-size:11px;font-weight:850}',
      '.ac-v23-diff-values{display:grid;grid-template-columns:1fr 1fr}',
      '.ac-v23-diff-values>div{min-width:0;padding:8px;font-size:11px;line-height:1.35;word-break:break-word}',
      '.ac-v23-diff-values>div+div{border-left:1px solid rgba(122,66,200,.12)}',
      '.ac-v23-diff-values b{display:block;margin-bottom:3px;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#6b6b76}',
      '.ac-v23-diff-close{width:100%;min-height:42px;margin-top:12px;border:0;border-radius:10px;background:#7a42c8;color:#fff;font:800 13px system-ui;cursor:pointer}',
      '@media(max-width:520px){.ac-v23-diff-values{grid-template-columns:1fr}.ac-v23-diff-values>div+div{border-left:0;border-top:1px solid rgba(122,66,200,.12)}.ac-v23-diff-meta{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(st);
  }

  function unifyMainToolbar() {
    if (!isMain) return true;
    var strip = document.getElementById('acSharedToolstrip');
    if (!strip || !document.body) return false;
    if (strip.parentNode !== document.body) document.body.insertBefore(strip, document.body.firstChild);
    strip.classList.remove('ac-main');
    return true;
  }

  function installVersion() {
    var old = document.querySelector('.ac-version-mini');
    if (!old || old.dataset.acReleaseV23 === '1') return !!old;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV23 = '1';
    fresh.textContent = VERSION;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout'); if (previous) previous.remove();
      var modal = document.createElement('div'); modal.id = 'acVersionAbout'; modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>Unified the Main, Should I Fix and EV top toolbar so the same-sized controls sit in the same top shell everywhere.</li><li>Softened service cards and selected controls around the supplied UW service colours.</li><li>Cloud conflict status now routes straight to the customer conflict list, is repeated in Cloud settings, and each conflict has a 🔍 inspector showing the local-versus-Cloud differences before you choose.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }

  async function rows() {
    try {
      var engine = global.AppointmentCompanionConsolidated;
      if (engine && engine.list) {
        var value = await engine.list();
        return Array.isArray(value) ? value : [];
      }
    } catch (_) {}
    return [];
  }

  async function cloudHealth() {
    var auth = false;
    try { var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null'); auth = !!(a && a.partner_id && a.workspace_key); } catch (_) {}
    var list = await rows();
    var meaningful = list.filter(function (r) { return r && (String(r.customer_name || '').trim() || r.deleted || r.tombstone); });
    var conflicts = meaningful.filter(function (r) { return r.sync_state === 'conflict' || r.conflict; }).length;
    var pending = meaningful.filter(function (r) { return r.sync_state === 'pending' || r.sync_state === 'pending_delete'; }).length;
    if (!auth) return { light:'🔴', text:pending ? pending + ' local change' + (pending === 1 ? '' : 's') + ' waiting - sign in to sync' : 'Not connected - work remains safe on this device', conflicts:conflicts, pending:pending };
    if (conflicts) return { light:'🔴', text:conflicts + ' sync conflict' + (conflicts === 1 ? '' : 's') + ' need review', conflicts:conflicts, pending:pending };
    if (pending) return { light:'🟠', text:pending + ' local change' + (pending === 1 ? '' : 's') + ' waiting to sync', conflicts:0, pending:pending };
    return { light:'🟢', text:'All local changes synced', conflicts:0, pending:0 };
  }

  function openCustomerConflicts() {
    var open = document.getElementById('cloudCustomerShortcut');
    if (open) { open.click(); return true; }
    var load = document.querySelector('[data-cloud-action="all-customers"]');
    if (load) { load.click(); return true; }
    return false;
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

  function wireCloudStatusRoute() {
    if (!isMain) return true;
    var row = document.getElementById('acV22CloudStatusRow');
    if (!row) return false;
    if (row.dataset.acV23Route === '1') return true;
    row.dataset.acV23Route = '1';
    row.addEventListener('click', async function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      var health = await cloudHealth();
      if (health.conflicts) openCustomerConflicts(); else openCloudSettings();
    }, true);
    return true;
  }

  async function updateCloudSettingsHealth() {
    if (!isMain) return;
    var pane = document.querySelector('#cloudSettingsModal [data-settings-pane="cloud"]');
    if (!pane) return;
    var box = document.getElementById('acV23CloudHealth');
    if (!box) {
      box = document.createElement('div'); box.id = 'acV23CloudHealth';
      var intro = pane.querySelector('p.sub');
      if (intro && intro.nextSibling) pane.insertBefore(box, intro.nextSibling); else pane.appendChild(box);
    }
    var health = await cloudHealth();
    box.innerHTML = '<div class="ac-v23-health-line"><span class="light">' + health.light + '</span><span><strong>Cloud status</strong><small>' + health.text + '</small></span></div><div class="ac-v23-health-actions"></div>';
    var actions = box.querySelector('.ac-v23-health-actions');
    if (health.conflicts) {
      var review = document.createElement('button'); review.type = 'button'; review.textContent = '🔍 Review ' + health.conflicts + ' local / Cloud conflict' + (health.conflicts === 1 ? '' : 's');
      review.addEventListener('click', function () { var modal = document.getElementById('cloudSettingsModal'); if (modal) modal.classList.remove('open'); openCustomerConflicts(); });
      actions.appendChild(review);
    }
    var customers = document.createElement('button'); customers.type = 'button'; customers.textContent = '📂 View customers on this device';
    customers.addEventListener('click', function () { var modal = document.getElementById('cloudSettingsModal'); if (modal) modal.classList.remove('open'); openCustomerConflicts(); });
    actions.appendChild(customers);
  }

  function parseObject(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (_) { return {}; }
  }

  function cloudComparable(row) {
    var cloud = row && row.conflict && row.conflict.cloud || {};
    var appt = parseObject(cloud.appointment_state_json || cloud.appointment_state || cloud.appointment_snapshot);
    var specialists = {};
    var ev = parseObject(cloud.ev_state_json || cloud.ev_state);
    if (ev && Object.keys(ev).length) specialists.ev = ev;
    if (appt && appt.ui_state && appt.ui_state._journey && appt.ui_state._journey.specialists) specialists = Object.assign({}, appt.ui_state._journey.specialists, specialists);
    return { appointment_state:appt || {}, specialist_state:specialists };
  }

  function localComparable(row) {
    return { appointment_state:row && row.appointment_state || {}, specialist_state:row && row.specialist_state || {} };
  }

  function ignorePath(path) {
    return /(^|\.)(ui_state|schema_version|updated_at|savedAt|local_revision|cloud_revision|sync_revision|client_revision_id|base_cloud_revision|cloud_synced_local_revision)(\.|$)/i.test(path);
  }

  function flatten(value, prefix, out) {
    out = out || {};
    if (ignorePath(prefix)) return out;
    if (value === null || value === undefined || typeof value !== 'object') { out[prefix] = value; return out; }
    if (Array.isArray(value)) { out[prefix] = value; return out; }
    var keys = Object.keys(value);
    if (!keys.length) { out[prefix] = value; return out; }
    keys.forEach(function (key) { flatten(value[key], prefix ? prefix + '.' + key : key, out); });
    return out;
  }

  function same(a,b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }

  function prettyLabel(path) {
    var map = {
      'appointment_state.canonical.customerName':'Customer name',
      'appointment_state.canonical.homeStatus':'Home status',
      'appointment_state.canonical.privateNotes':'Private notes',
      'appointment_state.canonical.basketUrl':'Basket link',
      'appointment_state.canonical.energy.energyFuelSelection':'Energy fuel',
      'appointment_state.canonical.energy.electricityUsageTotalKwh':'Electricity annual usage',
      'appointment_state.canonical.energy.electricityUsageDayKwh':'Electricity peak / day usage',
      'appointment_state.canonical.energy.electricityUsageNightKwh':'Electricity off-peak / night usage',
      'appointment_state.canonical.energy.gasUsageKwh':'Gas annual usage',
      'specialist_state.ev.annual_mileage':'EV annual mileage',
      'specialist_state.ev.home_usage_kwh':'EV home usage',
      'specialist_state.ev.uw_services':'EV comparison service count'
    };
    if (map[path]) return map[path];
    var p = path.replace(/^appointment_state\.canonical\./,'').replace(/^specialist_state\./,'Specialist - ');
    p = p.replace(/\.selectedServices\./,'.Service - ');
    p = p.replace(/[._]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
    return p.replace(/\b\w/g,function (m) { return m.toUpperCase(); });
  }

  function prettyValue(value) {
    if (value === undefined || value === null || value === '') return 'Not set';
    if (value === true) return 'Yes'; if (value === false) return 'No';
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  function ensureDiffModal() {
    var modal = document.getElementById('acV23DiffModal'); if (modal) return modal;
    modal = document.createElement('div'); modal.id = 'acV23DiffModal'; modal.className = 'ac-v23-diff-modal';
    modal.innerHTML = '<div class="ac-v23-diff-card" role="dialog" aria-modal="true" aria-labelledby="acV23DiffTitle"><h3 id="acV23DiffTitle">🔍 Local / Cloud differences</h3><p class="sub" id="acV23DiffSub"></p><div class="ac-v23-diff-meta" id="acV23DiffMeta"></div><div class="ac-v23-diff-list" id="acV23DiffList"></div><button type="button" class="ac-v23-diff-close">Close - then choose which version to keep</button></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-v23-diff-close')) modal.classList.remove('open'); });
    document.body.appendChild(modal); return modal;
  }

  async function inspectConflict(localId) {
    var list = await rows();
    var row = list.find(function (r) { return String(r.local_id) === String(localId); });
    if (!row || !row.conflict) return;
    var local = flatten(localComparable(row),'',{}), cloud = flatten(cloudComparable(row),'',{});
    var keys = Array.from(new Set(Object.keys(local).concat(Object.keys(cloud)))).filter(function (k) { return k && !ignorePath(k) && !same(local[k],cloud[k]); });
    var modal = ensureDiffModal();
    modal.querySelector('#acV23DiffSub').textContent = (row.customer_name || 'This customer') + ' has changes on both this device and Cloud. Compare them below before choosing Keep mine or Use Cloud.';
    var cloudRow = row.conflict.cloud || {};
    modal.querySelector('#acV23DiffMeta').innerHTML = '<div><strong>THIS DEVICE</strong><br>' + (row.updated_at ? new Date(row.updated_at).toLocaleString('en-GB') : 'Updated time unavailable') + '</div><div><strong>CLOUD</strong><br>' + (cloudRow.updated_at ? new Date(cloudRow.updated_at).toLocaleString('en-GB') : 'Updated time unavailable') + '</div>';
    var wrap = modal.querySelector('#acV23DiffList');
    if (!keys.length) wrap.innerHTML = '<div class="ac-v23-diff-row"><div class="ac-v23-diff-label">No material appointment-field differences found</div><div style="padding:9px;font-size:11px;color:#6b6b76">The conflict appears to be revision or metadata related. If the visible customer information looks identical, either version should be materially equivalent.</div></div>';
    else wrap.innerHTML = keys.slice(0,50).map(function (key) { return '<div class="ac-v23-diff-row"><div class="ac-v23-diff-label">' + prettyLabel(key) + '</div><div class="ac-v23-diff-values"><div><b>This device</b>' + escapeHtml(prettyValue(local[key])) + '</div><div><b>Cloud</b>' + escapeHtml(prettyValue(cloud[key])) + '</div></div></div>'; }).join('');
    modal.classList.add('open');
  }

  function escapeHtml(value) { return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function decorateConflictRows() {
    if (!isMain) return;
    var wrap = document.getElementById('localFirstCustomerRows'); if (!wrap) return;
    Array.prototype.slice.call(wrap.children).forEach(function (row) {
      var choice = row.querySelector('[data-local-conflict]');
      if (!choice || row.querySelector('.ac-v23-conflict-inspect')) return;
      var id = choice.dataset.localConflict;
      row.style.flexWrap = 'wrap';
      var load = row.querySelector('[data-local-load]'); if (load) { load.style.flexBasis = '100%'; load.style.width = '100%'; }
      row.querySelectorAll('[data-local-conflict]').forEach(function (b) { b.classList.add('ac-v23-conflict-choice'); });
      var inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'ac-v23-conflict-inspect'; inspect.textContent = '🔍'; inspect.title = 'Inspect local / Cloud differences'; inspect.setAttribute('aria-label','Inspect local / Cloud differences');
      inspect.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); inspectConflict(id); });
      choice.parentNode.insertBefore(inspect, choice);
    });
  }

  function observe() {
    if (!isMain || document.documentElement.dataset.acV23Observed) return;
    document.documentElement.dataset.acV23Observed = '1';
    var bodyObserver = new MutationObserver(function () { decorateConflictRows(); wireCloudStatusRoute(); });
    bodyObserver.observe(document.body,{childList:true,subtree:true});
    ['ac:cloud-authenticated','ac:cloud-disconnected','online','focus'].forEach(function (name) { global.addEventListener(name,function () { setTimeout(updateCloudSettingsHealth,150); }); });
    setInterval(function () { updateCloudSettingsHealth(); decorateConflictRows(); },3000);
  }

  addStyles();
  var tries = 0;
  var timer = setInterval(function () {
    var a = installVersion();
    var b = unifyMainToolbar();
    var c = wireCloudStatusRoute();
    if (isMain) { updateCloudSettingsHealth(); decorateConflictRows(); }
    if (a && b && (c || !isMain)) { clearInterval(timer); observe(); }
    else if (++tries > 200) { clearInterval(timer); observe(); }
  },50);
})(window);
