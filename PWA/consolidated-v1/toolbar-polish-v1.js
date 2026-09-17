/* Shared toolbar finishing pass for consolidated v1.9.
   - Main Companion mirrors the EV / Should I Fix toolbar.
   - Version sits first; hamburger remains far right.
   - Cashback sits immediately left of the hamburger.
   - Tapping a warning Cloud indicator opens Cloud connection directly when disconnected.
*/
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v1.9';
  var EARNINGS = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';
  var TEAM = 'https://aqcroft.github.io/TeamTriumph/';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);

  function clickId(id) {
    var el = document.getElementById(id);
    if (el) { el.click(); return true; }
    return false;
  }

  function showAbout() {
    var existing = document.getElementById('acVersionBadge');
    if (existing) { existing.click(); return; }
    var modal = document.getElementById('acVersionAbout');
    if (modal) { modal.classList.add('open'); return; }
  }

  function hasCloudAuth() {
    try {
      var row = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null');
      return !!(row && row.partner_id && row.workspace_key);
    } catch (_) { return false; }
  }

  function directCloudAction() {
    if (!hasCloudAuth()) {
      /* all-customers already owns the supported path into openConnectModal(). */
      if (clickId('cloudPilotLoad')) return;
      clickId('cloudSettingsConnect');
      return;
    }
    /* Connected but warning means this revision is behind Cloud: save/sync it. */
    if (!clickId('cloudSaveShortcut')) clickId('cloudSettingsReload');
  }

  function installCloudDirectAction() {
    var cloud = document.getElementById('cloudConnectionState');
    if (!cloud || cloud.dataset.acDirectCloud === '1') return false;
    cloud.dataset.acDirectCloud = '1';
    cloud.style.cursor = 'pointer';
    cloud.tabIndex = 0;
    cloud.setAttribute('role', 'button');
    cloud.setAttribute('aria-label', 'Cloud connection and sync');
    function act(e) {
      /* Capture phase prevents the older save/menu shortcut from winning. */
      if (e) { e.preventDefault(); e.stopImmediatePropagation(); }
      directCloudAction();
    }
    cloud.addEventListener('click', act, true);
    cloud.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') act(e);
    }, true);
    return true;
  }

  function mainButton(emoji, label, action, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ac-toolbtn' + (cls ? ' ' + cls : '');
    b.textContent = emoji;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', action);
    return b;
  }

  function buildMainStrip() {
    if (!isMain) return true;
    if (document.getElementById('acMainMirrorToolstrip')) return true;
    if (!document.getElementById('cloudPilotCard') || !document.getElementById('cloudCustomerShortcut')) return false;

    var oldbar = document.querySelector('#cloudPilotCard .cloudbar');
    if (oldbar) oldbar.style.display = 'none';

    /* Version belongs to the toolbar now, not the Status row. */
    var oldVersion = document.getElementById('acVersionBadge');
    if (oldVersion) oldVersion.style.display = 'none';

    var strip = document.createElement('div');
    strip.id = 'acMainMirrorToolstrip';
    strip.className = 'ac-toolstrip';
    var inner = document.createElement('div');
    inner.className = 'ac-toolstrip-inner';
    strip.appendChild(inner);

    var version = document.createElement('button');
    version.type = 'button';
    version.className = 'ac-version-mini';
    version.textContent = VERSION;
    version.title = 'About this version';
    version.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    version.addEventListener('click', showAbout);
    inner.appendChild(version);

    inner.appendChild(mainButton('📂', 'Open customers', function () { clickId('cloudCustomerShortcut'); }));
    inner.appendChild(mainButton('💾', 'Save customer', function () { clickId('cloudSaveShortcut'); }));
    inner.appendChild(mainButton('🚙', 'EV Companion', function () { clickId('cloudCompanionEv'); }));
    inner.appendChild(mainButton('📌', 'Should I Fix?', function () { clickId('cloudCompanionFix'); }));
    inner.appendChild(mainButton('📈', 'Partner Earnings Tool', function () { location.assign(EARNINGS); }));
    inner.appendChild(mainButton('🏆', 'Team Triumph Resources', function () { location.assign(TEAM); }));
    inner.appendChild(mainButton('📤', 'Share', function () { clickId('cloudShareShortcut'); }));
    inner.appendChild(mainButton('💳', 'Cashback Card Companion', function () { clickId('cloudCompanionCard'); }, 'muted'));
    inner.appendChild(mainButton('☰', 'Companion menu', function () { clickId('cloudActionMenu'); }));

    var card = document.getElementById('cloudPilotCard');
    card.parentNode.insertBefore(strip, card);
    return true;
  }

  function reorderSpecialistStrip() {
    if (isMain) return true;
    var strip = document.getElementById('acSharedToolstrip');
    if (!strip) return false;
    var inner = strip.querySelector('.ac-toolstrip-inner');
    if (!inner || inner.dataset.acOrderV2 === '1') return true;

    var buttons = Array.prototype.slice.call(inner.querySelectorAll('.ac-toolbtn'));
    var version = inner.querySelector('.ac-version-mini');
    function byLabel(text) { return buttons.find(function (b) { return b.getAttribute('aria-label') === text; }); }
    var ordered = [
      byLabel('Open customers'),
      byLabel('Save customer'),
      byLabel('EV Companion'),
      byLabel('Should I Fix?'),
      byLabel('Partner Earnings Tool'),
      byLabel('Team Triumph Resources'),
      byLabel('Share'),
      byLabel('Cashback Card Companion'),
      byLabel('Companion menu')
    ].filter(Boolean);

    if (version) inner.appendChild(version);
    ordered.forEach(function (b) { inner.appendChild(b); });
    if (version) inner.insertBefore(version, inner.firstChild);
    inner.dataset.acOrderV2 = '1';
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    var a = buildMainStrip();
    var b = reorderSpecialistStrip();
    installCloudDirectAction();
    if ((a && b) || ++tries > 160) clearInterval(timer);
  }, 50);
})();
