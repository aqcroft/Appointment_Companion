/* Appointment Companion v2 spring-clean pass.
   Shared toolbar hierarchy, direct status actions, connection-state semantics,
   exact UW service colour families, and removal of duplicate specialist chrome.
*/
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var isEv = /\/consolidated-v1\/ev\//.test(path);
  var isFix = /\/consolidated-v1\/should-i-fix\//.test(path);
  var mainUrl = isMain ? new URL('./', location.href).href : new URL('../', location.href).href;

  function injectCss() {
    if (document.getElementById('acV2SpringCleanStyle')) return;
    var st = document.createElement('style');
    st.id = 'acV2SpringCleanStyle';
    st.textContent = [
      ':root{',
        '--ac-energy-base:#BDDEE4;--ac-energy-soft:color-mix(in srgb,#BDDEE4 28%,white);--ac-energy-strong:#4E8F9B;',
        '--ac-broadband-base:#A2E2C3;--ac-broadband-soft:color-mix(in srgb,#A2E2C3 28%,white);--ac-broadband-strong:#3B9469;',
        '--ac-mobile-base:#FAD0E9;--ac-mobile-soft:color-mix(in srgb,#FAD0E9 34%,white);--ac-mobile-strong:#B9558D;',
        '--ac-insurance-base:#FFAB70;--ac-insurance-soft:color-mix(in srgb,#FFAB70 26%,white);--ac-insurance-strong:#D86A2B;',
        '--ac-cashback-base:#C6B5E2;--ac-cashback-soft:color-mix(in srgb,#C6B5E2 30%,white);--ac-cashback-strong:#7557A7;',
      '}',
      '.ac-toolbtn[data-ac-main="1"].active{border-color:#7a42c8;background:rgba(122,66,200,.11);box-shadow:inset 0 -2px 0 rgba(122,66,200,.5)}',
      '#cloudPilotCard .cloud-health-row{margin-top:.10rem!important;padding-top:.10rem!important;opacity:.72!important;gap:2px!important}',
      '#cloudPilotCard .cloud-health-right{gap:3px!important}',
      '#cloudPilotCard .cloud-health-tariffs,#cloudPilotCard .cloud-health-backup{gap:2px!important}',
      '#cloudPilotCard .cloud-status-label{display:none!important}',
      '#cloudPilotCard #tariffStatus .tstat-top{gap:2px!important}',
      '#cloudPilotCard #tariffStatus .tstat-btn{min-height:18px!important;height:18px!important;padding:0 4px!important;border-radius:999px!important;box-shadow:none!important}',
      '#cloudPilotCard #tariffStatus .tstat-fixed strong,#cloudPilotCard #tariffStatus .tstat-season,#cloudPilotCard #tariffStatus .tstat-quarter,#cloudPilotCard #tariffStatus .tstat-part{font-size:7px!important;line-height:1!important;font-weight:650!important}',
      '#cloudPilotCard #cloudConnectionState,#cloudPilotCard #cloudLocalState{width:20px!important;height:20px!important;padding:1px!important;cursor:pointer!important}',
      '#cloudPilotCard #cloudConnectionState img,#cloudPilotCard #cloudLocalState img,#cloudPilotCard #cloudLocalState picture{max-width:18px!important;max-height:18px!important}',
      '#cloudPilotCard .cloud-current-line{margin-top:.30rem!important;padding-top:.30rem!important}',
      'body[data-companion-tool="ev"] header .fresh-mini,body[data-companion-tool="ev"] #shareSetup,body[data-companion-tool="ev"] #evBridgeFooterBar,body[data-companion-tool="ev"] .evBridgeActions,body[data-companion-tool="ev"] .evBridgeMenu{display:none!important}',
      'body[data-companion-tool="ev"] #evBridgeBar{padding-top:7px!important;padding-bottom:7px!important}',
      'body[data-companion-tool="ev"] #evBridgeBar .evBridgeSaveState{margin-top:4px!important;font-size:10px!important}',
      'body[data-companion-tool="fix"] #backBtn{display:none!important}',
      'body[data-companion-tool="fix"] .bar{height:43px!important;flex-basis:43px!important;padding-top:4px!important;padding-bottom:4px!important;box-shadow:none!important}',
      '@media(max-width:430px){#cloudPilotCard #tariffStatus .tstat-btn{height:17px!important;min-height:17px!important;padding:0 3px!important}#cloudPilotCard #cloudConnectionState,#cloudPilotCard #cloudLocalState{width:19px!important;height:19px!important}}'
    ].join('');
    document.head.appendChild(st);
  }

  function makeMainButton() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ac-toolbtn' + (isMain ? ' active' : '');
    b.dataset.acMain = '1';
    b.textContent = '🔢';
    b.title = 'Main Companion';
    b.setAttribute('aria-label', 'Main Companion');
    b.addEventListener('click', function () { if (!isMain) location.assign(mainUrl); });
    return b;
  }

  function separator() {
    var s = document.createElement('span');
    s.className = 'ac-sep'; s.setAttribute('aria-hidden', 'true'); return s;
  }

  function reorderToolbar() {
    var strip = document.getElementById('acSharedToolstrip');
    if (!strip) return false;
    var inner = strip.querySelector('.ac-toolstrip-inner');
    if (!inner) return false;

    var version = inner.querySelector('.ac-version-mini');
    var buttons = Array.prototype.slice.call(inner.querySelectorAll('.ac-toolbtn'));
    function byLabel(label) { return buttons.find(function (b) { return b.getAttribute('aria-label') === label; }); }
    var main = byLabel('Main Companion');
    if (!main) main = makeMainButton();

    var open = byLabel('Open customers');
    var save = byLabel('Save customer');
    var share = byLabel('Share');
    var fix = byLabel('Should I Fix?');
    var ev = byLabel('EV Companion');
    var card = byLabel('Cashback Card Companion');
    var team = byLabel('Team Triumph Resources');
    var menu = byLabel('Companion menu');

    if (main) main.classList.toggle('active', isMain);
    if (fix) fix.classList.toggle('active', isFix);
    if (ev) ev.classList.toggle('active', isEv);

    while (inner.firstChild) inner.removeChild(inner.firstChild);
    if (version) inner.appendChild(version);
    inner.appendChild(separator());
    [open, save, share].filter(Boolean).forEach(function (b) { inner.appendChild(b); });
    inner.appendChild(separator());
    [main, fix, ev, card].filter(Boolean).forEach(function (b) { inner.appendChild(b); });
    inner.appendChild(separator());
    if (team) inner.appendChild(team);
    inner.appendChild(separator());
    if (menu) inner.appendChild(menu);
    inner.dataset.acSpringOrder = '1';
    return true;
  }

  function readAuth() {
    try {
      var a = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) { return null; }
  }

  function openCloudCredentials() {
    var direct = document.getElementById('cloudSettingsConnect');
    if (direct) { direct.click(); return true; }
    var settings = document.querySelector('[data-cloud-action="settings"]');
    if (settings) settings.click();
    setTimeout(function () {
      var cloudSection = document.querySelector('#cloudSettingsModal [data-settings-section="cloud"]');
      if (cloudSection) cloudSection.click();
      setTimeout(function () {
        var connect = document.getElementById('cloudSettingsConnect');
        if (connect) connect.click();
      }, 0);
    }, 0);
    return !!settings;
  }

  function openLocalSettings() {
    var settings = document.querySelector('[data-cloud-action="settings"]');
    if (!settings) return false;
    settings.click();
    setTimeout(function () {
      var local = document.querySelector('#cloudSettingsModal [data-settings-section="local"]');
      if (local) local.click();
    }, 0);
    return true;
  }

  function syncCloudIndicator() {
    var cloud = document.getElementById('cloudConnectionState');
    if (!cloud) return false;
    var connected = !!readAuth();
    var wanted = '../cloud/status-icons/cloud-' + (connected ? 'ok' : 'warn') + '.svg';
    var img = cloud.querySelector('img');
    if (!img || img.getAttribute('src') !== wanted) cloud.innerHTML = '<img src="' + wanted + '" alt="" aria-hidden="true">';
    if (cloud.classList.contains('warn') === connected) cloud.classList.toggle('warn', !connected);
    var title = connected ? 'Cloud connected - tap for login / Cloud settings' : 'Cloud not connected - tap to enter login ID and password';
    if (cloud.title !== title) cloud.title = title;
    return true;
  }

  function wireStatusIcons() {
    if (!isMain) return true;
    var cloud = document.getElementById('cloudConnectionState');
    var local = document.getElementById('cloudLocalState');
    if (!cloud || !local) return false;

    if (!cloud.dataset.acSpringClick) {
      cloud.dataset.acSpringClick = '1'; cloud.tabIndex = 0; cloud.setAttribute('role', 'button');
      function cloudAct(e) { if (e) { e.preventDefault(); e.stopImmediatePropagation(); } openCloudCredentials(); }
      cloud.addEventListener('click', cloudAct, true);
      cloud.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') cloudAct(e); }, true);
      var observer = new MutationObserver(function () { setTimeout(syncCloudIndicator, 0); });
      observer.observe(cloud, { childList:true, subtree:true, attributes:true, attributeFilter:['class','title','src'] });
      window.addEventListener('ac:cloud-authenticated', function () { setTimeout(syncCloudIndicator, 0); });
      window.addEventListener('ac:cloud-disconnected', function () { setTimeout(syncCloudIndicator, 0); });
    }

    if (!local.dataset.acSpringClick) {
      local.dataset.acSpringClick = '1'; local.tabIndex = 0; local.setAttribute('role', 'button');
      local.setAttribute('aria-label', 'Local device backup settings');
      function localAct(e) { if (e) { e.preventDefault(); e.stopImmediatePropagation(); } openLocalSettings(); }
      local.addEventListener('click', localAct, true);
      local.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') localAct(e); }, true);
    }
    syncCloudIndicator();
    return true;
  }

  function specialistCleanup() {
    if (isEv) {
      document.body.dataset.companionTool = 'ev';
      var bridgeBar = document.getElementById('evBridgeBar');
      if (bridgeBar) bridgeBar.setAttribute('aria-label', 'EV customer context and autosave status');
    }
    if (isFix) document.body.dataset.companionTool = 'fix';
  }

  injectCss();
  specialistCleanup();
  var tries = 0;
  var timer = setInterval(function () {
    var a = reorderToolbar();
    var b = wireStatusIcons();
    specialistCleanup();
    if ((a && b) || ++tries > 180) clearInterval(timer);
  }, 50);
})();
