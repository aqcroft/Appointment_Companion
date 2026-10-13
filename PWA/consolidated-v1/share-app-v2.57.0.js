/* v2.57.0 - share the app, not a customer's summary or profile. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  if (!/\/consolidated-v1\/?(?:index\.html)?$/.test(location.pathname)) return;

  var APP_LINK = 'https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/';
  var ICON = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4"/><path d="M8 10H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3"/></svg>';
  var lastFocus = null;
  function $(id) { return document.getElementById(id); }

  function ensureStyle() {
    if ($('acShareAppStyle')) return;
    var st = document.createElement('style');
    st.id = 'acShareAppStyle';
    st.textContent = [
      '#acShareAppMenuIcon{display:flex;align-items:center;justify-content:center}',
      '#acShareAppModal{position:fixed;inset:0;z-index:16500;display:flex;align-items:center;justify-content:center;background:rgba(24,15,37,.53);padding:16px;box-sizing:border-box}',
      '#acShareAppModal[hidden]{display:none!important}',
      '#acShareAppModal .ac-app-share-card{position:relative;width:min(420px,100%);padding:20px;background:#fff;color:#26164f;border-radius:16px;box-shadow:0 20px 55px #26164f40;box-sizing:border-box;font-family:system-ui,sans-serif}',
      '#acShareAppModal h2{font-size:18px;margin:0 30px 8px 0;color:#513378}',
      '#acShareAppModal p{font-size:13px;line-height:1.45;margin:0 0 13px;color:#655d6e}',
      '#acShareAppModal label{display:block;font-size:12px;font-weight:800;margin-bottom:5px}',
      '#acShareAppModal input{box-sizing:border-box;width:100%;min-width:0;border-radius:9px;border:1px solid #d6c8e9;background:#f9f6fc;color:#32254b;font-size:12px;padding:12px}',
      '#acShareAppModal .ac-app-share-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}',
      '#acShareAppModal .ac-app-share-actions button{min-height:42px;flex:1 1 110px;border-radius:10px;border:1px solid #d6c8e9;background:#fff;color:#513378;font-weight:750;padding:9px;cursor:pointer}',
      '#acShareAppModal .ac-app-share-actions button.primary{background:#7347aa;color:#fff;border-color:#7347aa}',
      '#acShareAppModal #acShareAppClose{position:absolute;right:12px;top:12px;background:#f6f1fc;border:0;border-radius:7px;width:30px;height:30px;font-size:21px;cursor:pointer;color:#513378}',
      '#acShareAppModal #acShareAppStatus{min-height:18px;margin-top:8px;font-size:12px;color:#347146}',
      '#acShareAppModal button:focus-visible,#acShareAppModal input:focus-visible,#acShareAppMenuButton:focus-visible{outline:3px solid #a88bd9;outline-offset:2px}'
    ].join('');
    document.head.appendChild(st);
  }

  function close() {
    var modal = $('acShareAppModal');
    if (modal) modal.remove();
    document.removeEventListener('keydown', onKey);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  }

  async function copyLink() {
    var status = $('acShareAppStatus');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(APP_LINK);
      } else {
        var input = $('acShareAppLink');
        input.focus(); input.select();
        if (!document.execCommand || !document.execCommand('copy')) throw new Error('Clipboard unavailable');
      }
      status.textContent = '✓ App link copied';
    } catch (_) {
      status.textContent = 'Select the link above and copy it manually.';
      $('acShareAppLink').focus();
      $('acShareAppLink').select();
    }
  }

  async function nativeShare() {
    var status = $('acShareAppStatus');
    try {
      await navigator.share({
        title: 'Appointment Companion',
        text: 'Here is the Appointment Companion app link:',
        url: APP_LINK
      });
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      status.textContent = 'Sharing unavailable - use Copy link instead.';
    }
  }

  function open() {
    ensureStyle();
    lastFocus = $('acShareAppMenuButton') || document.activeElement;
    var menu = $('cloudMenuPopover');
    if (menu) menu.classList.remove('open');
    var toggle = $('cloudActionMenu');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if ($('acShareAppModal')) $('acShareAppModal').remove();
    var modal = document.createElement('div');
    modal.id = 'acShareAppModal';
    modal.innerHTML =
      '<div class="ac-app-share-card" role="dialog" aria-modal="true" aria-labelledby="acShareAppTitle">'+
      '<button type="button" id="acShareAppClose" aria-label="Close">×</button>'+
      '<h2 id="acShareAppTitle">Share Appointment Companion</h2>'+
      '<p>Send the app to a new team member. This is the app link only - no customer details or saved work are shared.</p>'+
      '<label for="acShareAppLink">App link</label>'+
      '<input id="acShareAppLink" readonly type="url" value="'+APP_LINK+'">'+
      '<div class="ac-app-share-actions">'+
      '<button type="button" class="primary" id="acShareAppCopy">Copy link</button>'+
      (typeof navigator.share === 'function' ? '<button type="button" id="acShareAppNative">Share…</button>' : '')+
      '<button type="button" id="acShareAppDone">Close</button>'+
      '</div><div id="acShareAppStatus" role="status" aria-live="polite"></div>'+
      '</div>';
    modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
    document.body.appendChild(modal);
    $('acShareAppClose').addEventListener('click', close);
    $('acShareAppDone').addEventListener('click', close);
    $('acShareAppCopy').addEventListener('click', copyLink);
    if ($('acShareAppNative')) $('acShareAppNative').addEventListener('click', nativeShare);
    document.addEventListener('keydown', onKey);
    $('acShareAppCopy').focus();
  }

  function install() {
    var menu = $('cloudMenuPopover');
    if (!menu) return false;
    if ($('acShareAppMenuButton')) return true;
    ensureStyle();
    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'acShareAppMenuButton';
    button.className = 'pill cloud-menu-item';
    button.setAttribute('role', 'menuitem');
    button.setAttribute('aria-label', 'Share app link');
    button.innerHTML = '<span class="menu-ico" id="acShareAppMenuIcon">'+ICON+'</span><span>Share app link</span>';
    button.addEventListener('click', function (event) { event.preventDefault(); open(); });
    var status = $('acV22StatusBlock');
    if (status) menu.insertBefore(button, status);
    else menu.appendChild(button);
    return true;
  }
  var tries = 0;
  var setup = setInterval(function () {
    if (install() || ++tries > 160) clearInterval(setup);
  }, 100);
  document.addEventListener('click', function(e) {
    if (e.target && e.target.closest && e.target.closest('#cloudActionMenu') && !$('acShareAppMenuButton')) install();
  }, true);
})(window);
