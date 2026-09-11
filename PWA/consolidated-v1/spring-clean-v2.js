/* Appointment Companion v2.2 spring-clean pass.
   - Keeps the main appointment surface free of persistent status chrome.
   - Moves tariff / Cloud / device health into a stacked STATUS section in the Companion menu.
   - Keeps stale tariff data prominent via the existing mismatch modal.
   - Adds a Cloud attention modal with a session-only local-working escape hatch.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var isEv = /\/consolidated-v1\/ev\//.test(path);
  var isFix = /\/consolidated-v1\/should-i-fix\//.test(path);
  var mainUrl = isMain ? new URL('./', location.href).href : new URL('../', location.href).href;
  var CLOUD_PROMPT_HIDE_KEY = 'apptCompanionCloudPromptHiddenV22';

  function injectCss() {
    if (document.getElementById('acV22SpringCleanStyle')) return;
    var st = document.createElement('style');
    st.id = 'acV22SpringCleanStyle';
    st.textContent = [
      ':root{',
        '--ac-energy-base:#BDDEE4;--ac-energy-soft:color-mix(in srgb,#BDDEE4 28%,white);--ac-energy-strong:#4E8F9B;',
        '--ac-broadband-base:#A2E2C3;--ac-broadband-soft:color-mix(in srgb,#A2E2C3 28%,white);--ac-broadband-strong:#3B9469;',
        '--ac-mobile-base:#FAD0E9;--ac-mobile-soft:color-mix(in srgb,#FAD0E9 34%,white);--ac-mobile-strong:#B9558D;',
        '--ac-insurance-base:#FFAB70;--ac-insurance-soft:color-mix(in srgb,#FFAB70 26%,white);--ac-insurance-strong:#D86A2B;',
        '--ac-cashback-base:#C6B5E2;--ac-cashback-soft:color-mix(in srgb,#C6B5E2 30%,white);--ac-cashback-strong:#7557A7;',
      '}',
      '.ac-toolbtn[data-ac-main="1"].active{border-color:#7a42c8;background:rgba(122,66,200,.11);box-shadow:inset 0 -2px 0 rgba(122,66,200,.5)}',
      '#cloudPilotCard .cloud-health-row{display:none!important}',
      '#cloudPilotCard .cloud-current-line{margin-top:.28rem!important;padding-top:.28rem!important}',
      '#cloudMenuPopover .ac-status-block{display:grid;gap:6px;margin-top:4px;padding-top:8px;border-top:1px solid rgba(122,66,200,.14)}',
      '#cloudMenuPopover .ac-status-title{padding:0 4px 1px;color:#6b6b76;font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}',
      '#cloudMenuPopover .ac-status-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;min-height:46px;padding:7px 9px;border:1px solid rgba(122,66,200,.14);border-radius:10px;background:#fff;color:#26164f;text-align:left;cursor:pointer}',
      '#cloudMenuPopover .ac-status-row:hover{background:#faf8fe}',
      '#cloudMenuPopover .ac-status-icon{font-size:17px;text-align:center}',
      '#cloudMenuPopover .ac-status-copy{display:grid;min-width:0;gap:1px}',
      '#cloudMenuPopover .ac-status-copy strong{font-size:12px;line-height:1.15}',
      '#cloudMenuPopover .ac-status-copy small{font-size:10px;line-height:1.2;color:#6b6b76;white-space:normal}',
      '#cloudMenuPopover .ac-status-mark{font-size:15px;line-height:1}',
      '.ac-status-modal{display:none;position:fixed;inset:0;z-index:14600;background:rgba(38,22,79,.44);padding:18px;align-items:center;justify-content:center}',
      '.ac-status-modal.open{display:flex}',
      '.ac-status-modal-card{width:min(420px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;color:#26164f;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28)}',
      '.ac-status-modal-card h3{margin:0 0 7px;font-size:17px}',
      '.ac-status-modal-card p{margin:.35rem 0;color:#6b6b76;font-size:12px;line-height:1.45}',
      '.ac-status-modal-detail{margin:.7rem 0;padding:.7rem;border:1px solid rgba(122,66,200,.14);border-radius:10px;background:#faf8fe;font-size:12px;line-height:1.45}',
      '.ac-status-modal-actions{display:grid;gap:7px;margin-top:12px}',
      '.ac-status-modal-actions button{width:100%;min-height:42px;border-radius:10px;border:1px solid rgba(122,66,200,.22);background:#fff;color:#26164f;font:750 13px/1.2 system-ui;cursor:pointer}',
      '.ac-status-modal-actions button.primary{background:#7a42c8;color:#fff;border-color:#7a42c8}',
      '.ac-cloud-light{font-size:15px}',
      'body[data-companion-tool="ev"] header .fresh-mini,body[data-companion-tool="ev"] #shareSetup,body[data-companion-tool="ev"] #evBridgeFooterBar,body[data-companion-tool="ev"] .evBridgeActions,body[data-companion-tool="ev"] .evBridgeMenu{display:none!important}',
      'body[data-companion-tool="ev"] #evBridgeBar{padding-top:7px!important;padding-bottom:7px!important}',
      'body[data-companion-tool="ev"] #evBridgeBar .evBridgeSaveState{margin-top:4px!important;font-size:10px!important}',
      'body[data-companion-tool="fix"] #backBtn{display:none!important}',
      'body[data-companion-tool="fix"] .bar{height:43px!important;flex-basis:43px!important;padding-top:4px!important;padding-bottom:4px!important;box-shadow:none!important}'
    ].join('');
    document.head.appendChild(st);
  }

  function makeMainButton() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ac-toolbtn' + (isMain ? ' active' : '');
    b.dataset.acMain = '1'; b.textContent = '🔢'; b.title = 'Main Companion'; b.setAttribute('aria-label', 'Main Companion');
    b.addEventListener('click', function () { if (!isMain) location.assign(mainUrl); });
    return b;
  }

  function separator() { var s = document.createElement('span'); s.className = 'ac-sep'; s.setAttribute('aria-hidden', 'true'); return s; }

  function reorderToolbar() {
    var strip = document.getElementById('acSharedToolstrip'); if (!strip) return false;
    var inner = strip.querySelector('.ac-toolstrip-inner'); if (!inner) return false;
    if (inner.dataset.acV22Order === '1') return true;
    var version = inner.querySelector('.ac-version-mini');
    var buttons = Array.prototype.slice.call(inner.querySelectorAll('.ac-toolbtn'));
    function byLabel(label) { return buttons.find(function (b) { return b.getAttribute('aria-label') === label; }); }
    var main = byLabel('Main Companion') || makeMainButton();
    var open = byLabel('Open customers'), save = byLabel('Save customer'), share = byLabel('Share');
    var fix = byLabel('Should I Fix?'), ev = byLabel('EV Companion'), card = byLabel('Cashback Card Companion');
    var team = byLabel('Team Triumph Resources'), menu = byLabel('Companion menu');
    main.classList.toggle('active', isMain); if (fix) fix.classList.toggle('active', isFix); if (ev) ev.classList.toggle('active', isEv);
    while (inner.firstChild) inner.removeChild(inner.firstChild);
    if (version) inner.appendChild(version); inner.appendChild(separator());
    [open,save,share].filter(Boolean).forEach(function (b) { inner.appendChild(b); }); inner.appendChild(separator());
    [main,fix,ev,card].filter(Boolean).forEach(function (b) { inner.appendChild(b); }); inner.appendChild(separator());
    if (team) inner.appendChild(team); inner.appendChild(separator()); if (menu) inner.appendChild(menu);
    inner.dataset.acV22Order = '1'; return true;
  }

  function readAuth() {
    try { var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null'); return a && a.partner_id && a.workspace_key ? a : null; }
    catch (_) { return null; }
  }

  function openCloudCredentials() {
    var direct = document.getElementById('cloudSettingsConnect');
    if (direct) { direct.click(); return true; }
    var settings = document.querySelector('[data-cloud-action="settings"]');
    if (settings) settings.click();
    setTimeout(function () {
      var cloudSection = document.querySelector('#cloudSettingsModal [data-settings-section="cloud"]'); if (cloudSection) cloudSection.click();
      setTimeout(function () { var connect = document.getElementById('cloudSettingsConnect'); if (connect) connect.click(); }, 0);
    }, 0);
    return !!settings;
  }

  function openCloudSettings() {
    var settings = document.querySelector('[data-cloud-action="settings"]'); if (!settings) return false;
    settings.click(); setTimeout(function () { var cloud = document.querySelector('#cloudSettingsModal [data-settings-section="cloud"]'); if (cloud) cloud.click(); }, 0); return true;
  }

  function openLocalSettings() {
    var settings = document.querySelector('[data-cloud-action="settings"]'); if (!settings) return false;
    settings.click(); setTimeout(function () { var local = document.querySelector('#cloudSettingsModal [data-settings-section="local"]'); if (local) local.click(); }, 0); return true;
  }

  function ensureStatusModal() {
    var modal = document.getElementById('acV22StatusModal'); if (modal) return modal;
    modal = document.createElement('div'); modal.id = 'acV22StatusModal'; modal.className = 'ac-status-modal';
    modal.innerHTML = '<div class="ac-status-modal-card" role="dialog" aria-modal="true" aria-labelledby="acV22StatusTitle"><h3 id="acV22StatusTitle"></h3><div id="acV22StatusBody"></div><div class="ac-status-modal-actions" id="acV22StatusActions"></div></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });
    document.body.appendChild(modal); return modal;
  }

  function showStatusModal(title, bodyHtml, actions) {
    var modal = ensureStatusModal();
    modal.querySelector('#acV22StatusTitle').textContent = title;
    modal.querySelector('#acV22StatusBody').innerHTML = bodyHtml || '';
    var wrap = modal.querySelector('#acV22StatusActions'); wrap.innerHTML = '';
    (actions || []).forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = a.label; if (a.primary) b.className = 'primary';
      b.addEventListener('click', function () { if (a.close !== false) modal.classList.remove('open'); if (a.action) a.action(); }); wrap.appendChild(b);
    });
    modal.classList.add('open');
  }

  function tariffSnapshot() {
    var mount = document.getElementById('tariffStatus');
    if (!mount) return null;
    var fixed = mount.querySelector('.tstat-fixed');
    var season = mount.querySelector('.tstat-season');
    var fixedText = fixed && fixed.querySelector('strong') ? fixed.querySelector('strong').textContent.replace(/[✅⚠️]/g,'').trim() : 'Fixed';
    var quarter = season && season.querySelector('.tstat-quarter') ? season.querySelector('.tstat-quarter').textContent.trim() : 'Checking';
    var parts = season ? Array.prototype.slice.call(season.querySelectorAll('.tstat-part')) : [];
    function state(el) { if (!el) return 'check'; if (el.classList.contains('is-green')) return 'green'; if (el.classList.contains('is-amber')) return 'amber'; if (el.classList.contains('is-red')) return 'red'; return 'check'; }
    function partState(prefix) {
      var p = parts.find(function (el) { return String(el.textContent || '').trim().toLowerCase().indexOf(prefix) === 0; });
      if (!p) return 'check'; var t = p.textContent || ''; return t.indexOf('✅') >= 0 ? 'green' : t.indexOf('⚠️') >= 0 ? 'amber' : 'red';
    }
    var fixedLines = mount.querySelector('.tstat-fixed-lines');
    var seasonLines = mount.querySelectorAll('.tstat-season-lines > div');
    return {
      fixed:{ label:fixedText || 'Fixed', state:state(fixed), detail:fixedLines ? fixedLines.innerHTML : 'Checking fixed tariff suite.' },
      variable:{ label:'Variable', period:quarter, state:partState('std'), detail:seasonLines[0] ? seasonLines[0].innerHTML : 'Checking Standard variable tariff dates.' },
      ev:{ label:'EV', period:quarter, state:partState('ev'), detail:seasonLines[1] ? seasonLines[1].innerHTML : 'Checking EV variable tariff dates.' }
    };
  }

  async function cloudSnapshot() {
    var connected = !!readAuth();
    var rows = [];
    try { if (global.AppointmentCompanionConsolidated && global.AppointmentCompanionConsolidated.list) rows = await global.AppointmentCompanionConsolidated.list(); } catch (_) {}
    rows = Array.isArray(rows) ? rows : [];
    var meaningful = rows.filter(function (r) { return r && (String(r.customer_name || '').trim() || r.deleted || r.tombstone); });
    var conflicts = meaningful.filter(function (r) { return r.sync_state === 'conflict' || r.conflict; }).length;
    var pending = meaningful.filter(function (r) { return r.sync_state === 'pending' || r.sync_state === 'pending_delete'; }).length;
    if (!connected) return { state:'red', light:'🔴', title:'Cloud', text: pending ? pending + ' local change' + (pending === 1 ? '' : 's') + ' waiting - sign in to sync' : 'Not connected - work remains safe on this device', pending:pending, conflicts:conflicts };
    if (conflicts) return { state:'red', light:'🔴', title:'Cloud', text:conflicts + ' sync conflict' + (conflicts === 1 ? '' : 's') + ' need review', pending:pending, conflicts:conflicts };
    if (pending) return { state:'amber', light:'🟠', title:'Cloud', text:pending + ' local change' + (pending === 1 ? '' : 's') + ' waiting to sync', pending:pending, conflicts:0 };
    return { state:'green', light:'🟢', title:'Cloud', text:'All local changes synced', pending:0, conflicts:0 };
  }

  function markForState(state) { return state === 'green' ? '✅' : state === 'amber' ? '⚠️' : state === 'red' ? '⚠️' : '…'; }

  function statusRow(icon, title, text, mark, action, id) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ac-status-row'; if (id) b.id = id;
    b.innerHTML = '<span class="ac-status-icon">' + icon + '</span><span class="ac-status-copy"><strong>' + title + '</strong><small>' + text + '</small></span><span class="ac-status-mark">' + mark + '</span>';
    if (action) b.addEventListener('click', action); return b;
  }

  function showTariffDetail(kind) {
    var snap = tariffSnapshot(); if (!snap || !snap[kind]) return;
    var row = snap[kind]; var titleIcon = kind === 'fixed' ? '📌' : kind === 'variable' ? '📈' : '🚙';
    var period = row.period ? '<p><strong>Period:</strong> ' + row.period + '</p>' : '';
    showStatusModal(titleIcon + ' ' + row.label, period + '<div class="ac-status-modal-detail">' + row.detail + '</div>', [
      { label:'Re-check tariff feed', primary:true, action:function () { var refresh = document.querySelector('#tariffStatus .tstat-refresh'); if (refresh) refresh.click(); } },
      { label:'Close' }
    ]);
  }

  async function renderStatusMenu() {
    if (!isMain) return true;
    var menu = document.getElementById('cloudMenuPopover'); if (!menu) return false;
    var block = document.getElementById('acV22StatusBlock');
    if (!block) { block = document.createElement('div'); block.id = 'acV22StatusBlock'; block.className = 'ac-status-block'; menu.appendChild(block); }
    var tariffs = tariffSnapshot(); var cloud = await cloudSnapshot();
    block.innerHTML = '<div class="ac-status-title">Status</div>';
    if (tariffs) {
      block.appendChild(statusRow('📌', tariffs.fixed.label, tariffs.fixed.state === 'green' ? 'Current tariff suite' : tariffs.fixed.state === 'amber' ? 'Check tariff version' : 'Tariff version unavailable', markForState(tariffs.fixed.state), function () { showTariffDetail('fixed'); }));
      block.appendChild(statusRow('📈', 'Variable', (tariffs.variable.period || 'Checking') + ' - ' + (tariffs.variable.state === 'green' ? 'Current' : tariffs.variable.state === 'amber' ? 'Out of date' : 'Check unavailable'), markForState(tariffs.variable.state), function () { showTariffDetail('variable'); }));
      block.appendChild(statusRow('🚙', 'EV', (tariffs.ev.period || 'Checking') + ' - ' + (tariffs.ev.state === 'green' ? 'Current' : tariffs.ev.state === 'amber' ? 'Out of date' : 'Check unavailable'), markForState(tariffs.ev.state), function () { showTariffDetail('ev'); }));
    } else {
      block.appendChild(statusRow('📌','Tariffs','Checking live tariff data…','…'));
    }
    block.appendChild(statusRow('<span class="ac-cloud-light">' + cloud.light + '</span>', 'Cloud', cloud.text, '', function () { if (!readAuth()) openCloudCredentials(); else openCloudSettings(); }, 'acV22CloudStatusRow'));
    block.appendChild(statusRow('💻', 'This device', 'Latest changes saved locally', '✅', openLocalSettings, 'acV22DeviceStatusRow'));
    return true;
  }

  async function maybePromptCloud() {
    if (!isMain || sessionStorage.getItem(CLOUD_PROMPT_HIDE_KEY)) return;
    var engine = global.AppointmentCompanionConsolidated;
    if (engine && engine.sync) { try { await engine.sync(); } catch (_) {} }
    setTimeout(async function () {
      if (sessionStorage.getItem(CLOUD_PROMPT_HIDE_KEY)) return;
      var snap = await cloudSnapshot();
      if (snap.state === 'green') return;
      var body = snap.state === 'amber'
        ? '<p>Your work is safe on this device, but Cloud has not caught up yet.</p><div class="ac-status-modal-detail">🟠 ' + snap.text + '</div><p>Companion will keep trying automatically in the background.</p>'
        : '<p>Your work is safe locally, but Cloud needs attention before this device can fully synchronise.</p><div class="ac-status-modal-detail">🔴 ' + snap.text + '</div>';
      var actions = [];
      if (snap.conflicts) actions.push({ label:'Review local / Cloud conflicts', primary:true, action:function () { var open = document.getElementById('cloudCustomerShortcut'); if (open) open.click(); } });
      else if (readAuth()) actions.push({ label:'Sync now', primary:true, action:function () { if (engine && engine.scheduleSync) engine.scheduleSync(0); setTimeout(renderStatusMenu, 900); } });
      else actions.push({ label:'Connect Cloud', primary:true, action:openCloudCredentials });
      actions.push({ label:'Work locally this session', action:function () { sessionStorage.setItem(CLOUD_PROMPT_HIDE_KEY, '1'); } });
      body += '<p><strong>Work locally this session</strong> hides this warning until you close the session. Local saves continue, and automatic Cloud sync can still resume if the connection becomes available.</p>';
      showStatusModal('☁️ Cloud sync needs attention', body, actions);
    }, 1400);
  }

  function specialistCleanup() {
    if (isEv) { document.body.dataset.companionTool = 'ev'; var bridgeBar = document.getElementById('evBridgeBar'); if (bridgeBar) bridgeBar.setAttribute('aria-label', 'EV customer context and autosave status'); }
    if (isFix) document.body.dataset.companionTool = 'fix';
  }

  function observeStatusSources() {
    if (!isMain || document.documentElement.dataset.acV22StatusObserved) return;
    document.documentElement.dataset.acV22StatusObserved = '1';
    var tariff = document.getElementById('tariffStatus');
    if (tariff) new MutationObserver(function () { renderStatusMenu(); }).observe(tariff, { childList:true, subtree:true, attributes:true, characterData:true });
    ['ac:cloud-authenticated','ac:cloud-disconnected'].forEach(function (name) { global.addEventListener(name, function () { setTimeout(renderStatusMenu, 100); }); });
    global.addEventListener('online', function () { setTimeout(renderStatusMenu, 600); });
    global.addEventListener('focus', function () { setTimeout(renderStatusMenu, 600); });
    setInterval(renderStatusMenu, 3000);
  }

  injectCss(); specialistCleanup();
  var tries = 0;
  var timer = setInterval(function () {
    var a = reorderToolbar();
    var b = isMain ? renderStatusMenu() : Promise.resolve(true);
    specialistCleanup();
    Promise.resolve(b).then(function (ok) {
      if (a && ok) {
        observeStatusSources(); clearInterval(timer);
        if (isMain) setTimeout(maybePromptCloud, 900);
      } else if (++tries > 180) clearInterval(timer);
    });
  }, 50);
})(window);
