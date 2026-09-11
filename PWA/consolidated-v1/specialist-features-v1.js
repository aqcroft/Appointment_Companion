/* Shared Companion toolbar + specialist shortcuts for Appointment Companion v2.0. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v2.0';
  var TEAM = 'https://aqcroft.github.io/TeamTriumph/';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var isEv = /\/consolidated-v1\/ev\//.test(path);
  var isFix = /\/consolidated-v1\/should-i-fix\//.test(path);
  var root = isMain ? new URL('./', location.href) : new URL('../', location.href);

  function ensureStyle() {
    if (document.getElementById('acSharedToolbarStyle')) return;
    var style = document.createElement('style');
    style.id = 'acSharedToolbarStyle';
    style.textContent = [
      '#cloudPilotCard .cloudbar{display:none!important}',
      '#cloudPilotCard .cloud-health-row{margin-top:.2rem!important;padding-top:.2rem!important;font-size:8px!important;opacity:.82;align-items:center!important}',
      '#cloudPilotCard .cloud-status-primary{display:none!important}',
      '#cloudPilotCard .cloud-status-label{font-size:7px!important;font-weight:600!important;letter-spacing:0!important}',
      '#cloudPilotCard #cloudTariffSlot{display:flex!important;align-items:center!important}',
      '#cloudPilotCard #tariffStatus,#cloudPilotCard #tariffStatus *{font-size:8px!important;font-weight:600!important;line-height:1!important}',
      '#cloudPilotCard #tariffStatus .tstat-top{gap:3px!important}',
      '#cloudPilotCard #tariffStatus .tstat-btn{min-height:21px!important;height:21px!important;padding:1px 5px!important;border-width:1px!important;box-shadow:none!important}',
      '#cloudPilotCard #tariffStatus .tstat-fixed strong{font-size:8px!important;font-weight:650!important}',
      '#cloudPilotCard #tariffStatus .tstat-season{font-size:8px!important;min-width:0!important}',
      '#cloudPilotCard #cloudConnectionState,#cloudPilotCard #cloudLocalState{cursor:pointer;border-radius:6px;padding:1px;display:inline-flex!important;align-items:center!important;justify-content:center!important}',
      '#cloudPilotCard #cloudConnectionState img,#cloudPilotCard #cloudLocalState img,#cloudPilotCard #cloudLocalState picture{max-height:21px!important}',
      '#cloudPilotCard #cloudConnectionState:focus-visible{outline:2px solid #7a42c8;outline-offset:2px}',
      '.ac-toolstrip{position:sticky;top:0;z-index:9997;width:100%;box-sizing:border-box;padding:6px 8px;background:rgba(255,251,227,.96);backdrop-filter:blur(8px);border-bottom:1px solid rgba(122,66,200,.14)}',
      '.ac-toolstrip.ac-main{position:static;background:transparent;backdrop-filter:none;border-bottom:1px solid rgba(122,66,200,.12);padding:0 0 6px;margin-bottom:4px}',
      '.ac-toolstrip-inner{max-width:720px;margin:0 auto;display:flex;align-items:center;gap:4px;justify-content:flex-start}',
      '.ac-toolbtn{width:34px;height:34px;min-width:34px;border:1px solid rgba(122,66,200,.22);border-radius:9px;background:white;color:#26164f;display:inline-flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;padding:0}',
      '.ac-toolbtn.active{border-color:#7a42c8;background:rgba(122,66,200,.10);box-shadow:inset 0 -2px 0 rgba(122,66,200,.45)}',
      '.ac-toolbtn.muted{opacity:.28;filter:grayscale(1)}',
      '.ac-sep{width:1px;height:23px;background:rgba(38,22,79,.18);margin:0 2px;flex:0 0 1px}',
      '.ac-version-mini{border:1px solid rgba(122,66,200,.14);border-radius:999px;background:#fff;color:#6b6b76;font:700 9px/1 system-ui;padding:5px 6px;cursor:pointer;white-space:nowrap}',
      '.ac-about{display:none;position:fixed;inset:0;z-index:10050;background:rgba(38,22,79,.38);padding:18px;align-items:center;justify-content:center}',
      '.ac-about.open{display:flex}',
      '.ac-about-card{width:min(390px,100%);background:white;color:#26164f;border-radius:14px;padding:16px;box-shadow:0 20px 60px rgba(38,22,79,.25)}',
      '.ac-about-card h3{margin:0 0 8px;font-size:16px}.ac-about-card ul{margin:8px 0 14px;padding-left:20px;font-size:13px;line-height:1.45}.ac-about-close{width:100%;min-height:40px;border:0;border-radius:9px;background:#7a42c8;color:white;font-weight:750;cursor:pointer}',
      '@media(max-width:430px){.ac-toolstrip{padding-left:5px;padding-right:5px}.ac-toolstrip-inner{gap:2px}.ac-toolbtn{width:31px;height:31px;min-width:31px;font-size:14px}.ac-sep{height:20px;margin:0 1px}.ac-version-mini{font-size:8px;padding:4px 5px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function showAbout() {
    var modal = document.getElementById('acVersionAbout');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'acVersionAbout';
      modal.className = 'ac-about';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>One consistent Companion toolbar across Main, EV and Should I Fix.</li><li>Energy and Mobile controls now nest under their service buttons with service-specific colours.</li><li>Cloud remains local-first, with direct access to Cloud login/settings from the warning icon.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.classList.remove('open'); });
      document.body.appendChild(modal);
    }
    modal.classList.add('open');
  }

  function ensureButton(id, anchorId, emoji, label) {
    if (document.getElementById(id)) return true;
    var anchor = document.getElementById(anchorId);
    if (!anchor || !anchor.parentNode) return false;
    var button = document.createElement('button');
    button.className = 'cloudicon cloud-top-shortcut'; button.type = 'button'; button.id = id;
    button.title = label; button.setAttribute('aria-label', label); button.textContent = emoji;
    anchor.insertAdjacentElement('afterend', button);
    return true;
  }

  function specialistButton(emoji, label, action, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ac-toolbtn' + (cls ? ' ' + cls : '');
    b.textContent = emoji; b.title = label; b.setAttribute('aria-label', label); b.addEventListener('click', action);
    return b;
  }

  function separator() {
    var s = document.createElement('span'); s.className = 'ac-sep'; s.setAttribute('aria-hidden', 'true'); return s;
  }

  function versionButton() {
    var version = document.createElement('button');
    version.type = 'button'; version.className = 'ac-version-mini'; version.textContent = VERSION;
    version.title = 'About this version'; version.addEventListener('click', showAbout); return version;
  }

  function clickMain(id) {
    var el = document.getElementById(id); if (el) el.click();
  }

  function addToolbarContents(inner, specialistMode) {
    inner.appendChild(versionButton());
    inner.appendChild(separator());

    inner.appendChild(specialistButton('📂', 'Open customers', function () {
      if (specialistMode) location.assign(new URL('./?open=customers', root).href); else clickMain('cloudCustomerShortcut');
    }));
    inner.appendChild(specialistButton('💾', 'Save customer', function () {
      if (specialistMode) location.assign(new URL('./?open=save', root).href); else clickMain('cloudSaveShortcut');
    }));
    inner.appendChild(specialistButton('📤', 'Share', function () {
      if (specialistMode) {
        var share = document.getElementById('createShareBtn') || document.getElementById('shareBtn');
        if (share) share.click(); else location.assign(new URL('./?open=share', root).href);
      } else clickMain('cloudShareShortcut');
    }));

    inner.appendChild(separator());
    inner.appendChild(specialistButton('📌', 'Should I Fix?', function () {
      if (isFix) return;
      if (specialistMode) location.assign(new URL('./should-i-fix/', root).href); else clickMain('cloudCompanionFix');
    }, isFix ? 'active' : ''));
    inner.appendChild(specialistButton('🚙', 'EV Companion', function () {
      if (isEv) return;
      if (specialistMode) location.assign(new URL('./ev/', root).href); else clickMain('cloudCompanionEv');
    }, isEv ? 'active' : ''));
    inner.appendChild(specialistButton('💳', 'Cashback Card Companion', function () {
      if (specialistMode) alert('Cashback Card Companion is not available yet.'); else clickMain('cloudCompanionCard');
    }, 'muted'));

    inner.appendChild(separator());
    inner.appendChild(specialistButton('🏆', 'Team Triumph Resources', function () { location.assign(TEAM); }));
    inner.appendChild(separator());
    inner.appendChild(specialistButton('☰', 'Companion menu', function () {
      if (specialistMode) location.assign(new URL('./?open=menu', root).href); else clickMain('cloudActionMenu');
    }));
  }

  function buildMainStrip() {
    if (document.getElementById('acSharedToolstrip')) return true;
    var card = document.getElementById('cloudPilotCard');
    if (!card) return false;
    var strip = document.createElement('div'); strip.id = 'acSharedToolstrip'; strip.className = 'ac-toolstrip ac-main';
    var inner = document.createElement('div'); inner.className = 'ac-toolstrip-inner'; strip.appendChild(inner);
    addToolbarContents(inner, false);
    card.insertBefore(strip, card.firstChild);
    return true;
  }

  function openCloudCredentials() {
    if (typeof global.openConnectModal === 'function') { global.openConnectModal(); return true; }
    var direct = document.querySelector('[data-cloud-action="connect"],#cloudSettingsConnect,#cloudPilotConnect');
    if (direct) { direct.click(); return true; }
    return false;
  }

  function wireMain() {
    var registry = global.AppointmentCompanionSpecialists;
    if (!registry || !registry.register || !document.getElementById('cloudCustomerShortcut')) return false;

    ensureButton('cloudCompanionFix', 'cloudCompanionEv', '📌', 'Should I Fix?');
    var customers = document.getElementById('cloudCustomerShortcut');
    customers.textContent = '📂'; customers.title = 'Open customers'; customers.setAttribute('aria-label', 'Open customers');
    var fix = document.getElementById('cloudCompanionFix'); if (fix) fix.textContent = '📌';
    var card = document.getElementById('cloudCompanionCard'); if (card) card.style.opacity = '.28';

    if (!buildMainStrip()) return false;

    var cloud = document.getElementById('cloudConnectionState');
    if (cloud && !cloud.dataset.acV2Wired) {
      cloud.dataset.acV2Wired = '1'; cloud.tabIndex = 0; cloud.setAttribute('role', 'button');
      var cloudAction = function () {
        if (cloud.classList.contains('warn')) {
          if (!openCloudCredentials()) clickMain('cloudActionMenu');
        } else clickMain('cloudActionMenu');
      };
      cloud.addEventListener('click', cloudAction);
      cloud.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cloudAction(); } });
    }

    registry.register({ tool_id: 'ev', label: 'EV Companion', url: new URL('./ev/', location.href).href, description: 'Explore EV charging and live tariff costs using this local customer journey.' });
    registry.register({ tool_id: 'fix', label: 'Should I Fix?', url: new URL('./should-i-fix/', location.href).href, description: 'Compare this customer\'s usage against the price cap and UW fixed tariffs.' });

    var open = new URL(location.href).searchParams.get('open');
    if (open && !document.documentElement.dataset.acOpenHandled) {
      document.documentElement.dataset.acOpenHandled = '1';
      setTimeout(function () {
        if (open === 'cloud') openCloudCredentials();
        else {
          var map = { customers:'cloudCustomerShortcut', save:'cloudSaveShortcut', share:'cloudShareShortcut', menu:'cloudActionMenu' };
          var target = document.getElementById(map[open] || ''); if (target) target.click();
        }
        try { var u = new URL(location.href); u.searchParams.delete('open'); history.replaceState(null, '', u.href); } catch (_) {}
      }, 120);
    }
    return true;
  }

  function buildSpecialistStrip() {
    if (document.getElementById('acSharedToolstrip')) return true;
    var strip = document.createElement('div'); strip.id = 'acSharedToolstrip'; strip.className = 'ac-toolstrip';
    var inner = document.createElement('div'); inner.className = 'ac-toolstrip-inner'; strip.appendChild(inner);
    addToolbarContents(inner, true);
    document.body.insertBefore(strip, document.body.firstChild);
    return true;
  }

  ensureStyle();
  if (isMain) {
    var tries = 0, t = setInterval(function () { if (wireMain() || ++tries > 120) clearInterval(t); }, 50);
  } else if (isEv || isFix) {
    var attempts = 0, timer = setInterval(function () { if (document.body && (buildSpecialistStrip() || ++attempts > 80)) clearInterval(timer); }, 50);
  }
})(window);
