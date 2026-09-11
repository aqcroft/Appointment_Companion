/* Shared Companion toolbar polish + specialist shortcuts for consolidated v1. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v1.9';
  var EARNINGS = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';
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
      '#cloudPilotCard .cloudicons{gap:3px!important}',
      '#cloudPilotCard .cloudicon{width:34px!important;height:34px!important;min-width:34px!important;border-radius:9px!important;font-size:16px!important}',
      '#cloudPilotCard .cloud-health-row{margin-top:.30rem!important;font-size:9px!important;opacity:.86}',
      '#cloudPilotCard .cloud-status-label{font-size:8px!important;font-weight:650!important}',
      '#cloudPilotCard .cloud-status-primary{font-size:8px!important;font-weight:650!important}',
      '#cloudPilotCard #tariffStatus,#cloudPilotCard #tariffStatus *{font-size:9px!important;font-weight:600!important;line-height:1.15!important}',
      '#cloudPilotCard #cloudConnectionState{cursor:pointer;border-radius:7px;padding:2px}',
      '#cloudPilotCard #cloudConnectionState:focus-visible{outline:2px solid #7a42c8;outline-offset:2px}',
      '#cloudCompanionCard.ac-muted{opacity:.28!important;filter:grayscale(1)}',
      '#acVersionBadge{border:0;background:transparent;color:var(--muted,#6b6b76);font:650 8px/1 system-ui;padding:2px 4px;cursor:pointer}',
      '.ac-toolstrip{position:sticky;top:0;z-index:9997;width:100%;box-sizing:border-box;padding:6px 8px;background:rgba(255,251,227,.96);backdrop-filter:blur(8px);border-bottom:1px solid rgba(122,66,200,.14)}',
      '.ac-toolstrip-inner{max-width:720px;margin:0 auto;display:flex;align-items:center;gap:4px;justify-content:space-between}',
      '.ac-toolbtn{width:34px;height:34px;min-width:34px;border:1px solid rgba(122,66,200,.22);border-radius:9px;background:white;color:#26164f;display:inline-flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;padding:0}',
      '.ac-toolbtn.active{border-color:#7a42c8;background:rgba(122,66,200,.10);box-shadow:inset 0 -2px 0 rgba(122,66,200,.45)}',
      '.ac-toolbtn.muted{opacity:.28;filter:grayscale(1)}',
      '.ac-version-mini{margin-left:auto;border:0;background:transparent;color:#6b6b76;font:650 8px/1 system-ui;padding:3px;cursor:pointer}',
      '.ac-about{display:none;position:fixed;inset:0;z-index:10050;background:rgba(38,22,79,.38);padding:18px;align-items:center;justify-content:center}',
      '.ac-about.open{display:flex}',
      '.ac-about-card{width:min(390px,100%);background:white;color:#26164f;border-radius:14px;padding:16px;box-shadow:0 20px 60px rgba(38,22,79,.25)}',
      '.ac-about-card h3{margin:0 0 8px;font-size:16px}.ac-about-card ul{margin:8px 0 14px;padding-left:20px;font-size:13px;line-height:1.45}.ac-about-close{width:100%;min-height:40px;border:0;border-radius:9px;background:#7a42c8;color:white;font-weight:750;cursor:pointer}',
      '@media(max-width:430px){.ac-toolstrip{padding-left:5px;padding-right:5px}.ac-toolstrip-inner{gap:2px}.ac-toolbtn{width:32px;height:32px;min-width:32px;font-size:15px}.ac-version-mini{font-size:7px;padding:2px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function showAbout() {
    var modal = document.getElementById('acVersionAbout');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'acVersionAbout';
      modal.className = 'ac-about';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>Consolidated local-first PWA promoted to the main phone app.</li><li>Energy and Mobile inputs simplified, including the E7 bill-split helper.</li><li>EV and Should I Fix now sit inside the same Companion tool journey.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
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

  function wireMain() {
    var registry = global.AppointmentCompanionSpecialists;
    if (!registry || !registry.register || !document.getElementById('cloudCustomerShortcut')) return false;

    ensureButton('cloudCompanionFix', 'cloudCompanionEv', '📌', 'Should I Fix?');
    ensureButton('cloudCompanionEarnings', 'cloudCompanionFix', '📈', 'Partner Earnings Tool');
    ensureButton('cloudTeamTriumph', 'cloudCompanionEarnings', '🏆', 'Team Triumph Resources');

    var customers = document.getElementById('cloudCustomerShortcut');
    customers.textContent = '📂'; customers.title = 'Open customers'; customers.setAttribute('aria-label', 'Open customers');

    var fix = document.getElementById('cloudCompanionFix'); if (fix) fix.textContent = '📌';
    var earnings = document.getElementById('cloudCompanionEarnings');
    if (earnings) { earnings.textContent = '📈'; if (!earnings.dataset.acWired) { earnings.dataset.acWired = '1'; earnings.addEventListener('click', function () { global.location.assign(EARNINGS); }); } }
    var team = document.getElementById('cloudTeamTriumph');
    if (team && !team.dataset.acWired) { team.dataset.acWired = '1'; team.addEventListener('click', function () { global.location.assign(TEAM); }); }

    var card = document.getElementById('cloudCompanionCard'); if (card) card.classList.add('ac-muted');

    var cloud = document.getElementById('cloudConnectionState');
    if (cloud && !cloud.dataset.acWired) {
      cloud.dataset.acWired = '1'; cloud.tabIndex = 0; cloud.setAttribute('role', 'button');
      var cloudAction = function () {
        if (cloud.classList.contains('warn')) {
          var save = document.getElementById('cloudSaveShortcut'); if (save) save.click();
        } else {
          var menu = document.getElementById('cloudActionMenu'); if (menu) menu.click();
        }
      };
      cloud.addEventListener('click', cloudAction);
      cloud.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cloudAction(); } });
    }

    var health = document.querySelector('#cloudPilotCard .cloud-health-row');
    if (health && !document.getElementById('acVersionBadge')) {
      var badge = document.createElement('button'); badge.id = 'acVersionBadge'; badge.type = 'button'; badge.textContent = VERSION; badge.title = 'About this version'; badge.addEventListener('click', showAbout);
      var primary = health.querySelector('.cloud-status-primary'); if (primary) primary.insertAdjacentElement('afterend', badge); else health.prepend(badge);
    }

    registry.register({ tool_id: 'ev', label: 'EV Companion', url: new URL('./ev/', location.href).href, description: 'Explore EV charging and live tariff costs using this local customer journey.' });
    registry.register({ tool_id: 'fix', label: 'Should I Fix?', url: new URL('./should-i-fix/', location.href).href, description: 'Compare this customer\'s usage against the price cap and UW fixed tariffs.' });

    var open = new URL(location.href).searchParams.get('open');
    if (open && !document.documentElement.dataset.acOpenHandled) {
      document.documentElement.dataset.acOpenHandled = '1';
      setTimeout(function () {
        var map = { customers: 'cloudCustomerShortcut', save: 'cloudSaveShortcut', share: 'cloudShareShortcut', menu: 'cloudActionMenu', cloud: 'cloudConnectionState' };
        var target = document.getElementById(map[open] || ''); if (target) target.click();
        try { var u = new URL(location.href); u.searchParams.delete('open'); history.replaceState(null, '', u.href); } catch (_) {}
      }, 120);
    }
    return true;
  }

  function specialistButton(emoji, label, action, cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ac-toolbtn' + (cls ? ' ' + cls : ''); b.textContent = emoji; b.title = label; b.setAttribute('aria-label', label); b.addEventListener('click', action); return b;
  }

  function buildSpecialistStrip() {
    if (document.getElementById('acSharedToolstrip')) return true;
    var strip = document.createElement('div'); strip.id = 'acSharedToolstrip'; strip.className = 'ac-toolstrip';
    var inner = document.createElement('div'); inner.className = 'ac-toolstrip-inner'; strip.appendChild(inner);

    inner.appendChild(specialistButton('📂', 'Open customers', function () { location.assign(new URL('./?open=customers', root).href); }));
    inner.appendChild(specialistButton('💾', 'Save customer', function () { location.assign(new URL('./?open=save', root).href); }));
    inner.appendChild(specialistButton('🚙', 'EV Companion', function () { if (!isEv) location.assign(new URL('./ev/', root).href); }, isEv ? 'active' : ''));
    inner.appendChild(specialistButton('📌', 'Should I Fix?', function () { if (!isFix) location.assign(new URL('./should-i-fix/', root).href); }, isFix ? 'active' : ''));
    inner.appendChild(specialistButton('📈', 'Partner Earnings Tool', function () { location.assign(EARNINGS); }));
    inner.appendChild(specialistButton('🏆', 'Team Triumph Resources', function () { location.assign(TEAM); }));
    inner.appendChild(specialistButton('💳', 'Cashback Card Companion', function () { alert('Cashback Card Companion is not available yet.'); }, 'muted'));
    inner.appendChild(specialistButton('📤', 'Share', function () {
      var share = document.getElementById('createShareBtn') || document.getElementById('shareBtn');
      if (share) share.click(); else location.assign(new URL('./?open=share', root).href);
    }));
    inner.appendChild(specialistButton('☰', 'Companion menu', function () { location.assign(new URL('./?open=menu', root).href); }));
    var version = document.createElement('button'); version.type = 'button'; version.className = 'ac-version-mini'; version.textContent = VERSION; version.title = 'About this version'; version.addEventListener('click', showAbout); inner.appendChild(version);

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
