/* Adds the shared Relationship Follow-up module to the v2.42 Companion menu.
   Stable route: /PWA/outreach/ so the menu always opens the current pilot. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var OUTREACH_URL = new URL('../outreach/', location.href).href;

  function install() {
    var menu = document.getElementById('cloudMenuPopover');
    if (!menu) return false;
    if (document.getElementById('acRelationshipFollowupLink')) return true;

    var wrap = document.createElement('div');
    wrap.id = 'acRelationshipFollowupLink';
    wrap.style.cssText = 'margin-top:8px;padding-top:8px;border-top:1px solid rgba(122,66,200,.14)';
    var a = document.createElement('a');
    a.href = OUTREACH_URL;
    a.textContent = '🤝 Relationship follow-up';
    a.setAttribute('aria-label','Open Relationship Follow-up');
    a.style.cssText = 'display:flex;align-items:center;min-height:44px;padding:9px 11px;border:1px solid rgba(122,66,200,.14);border-radius:10px;background:#fff;color:#26164f;text-decoration:none;font:750 12px/1.2 system-ui';
    wrap.appendChild(a);
    menu.appendChild(wrap);
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (install() || ++tries > 200) clearInterval(timer);
  }, 50);
})();