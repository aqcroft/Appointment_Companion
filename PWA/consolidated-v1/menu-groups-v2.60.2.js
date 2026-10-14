/* Appointment Companion v2.60.2 - shared, grouped Companion menu.
   Reorders existing controls without cloning nodes or replacing their handlers.
   All three integrated tools use the same #cloudMenuPopover.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') ||
      document.documentElement.classList.contains('shared-view')) return;

  var GROUPS = [
    { id: 'customers', title: 'Customers & quotes', selectors: [
      '[data-cloud-action="all-customers"]',
      '[data-cloud-action="new-customer"]',
      '[data-cloud-action="save"]',
      '[data-cloud-action="save-as"]',
      '[data-cloud-action="basket"]',
      '[data-cloud-action="delete-current"]'
    ] },
    { id: 'account', title: 'Account & app', selectors: [
      '[data-cloud-action="partner"]',
      '#acUnifiedMenuLink',
      '[data-cloud-action="settings"]'
    ] },
    { id: 'more', title: 'More', selectors: [
      '#acShareAppMenuButton',
      '#acGsMenu',
      '[data-cloud-action="admin"]'
    ] }
  ];

  function findDirect(menu, selector) {
    var node = menu.querySelector(selector);
    return node && node.parentNode === menu ? node : null;
  }

  function heading(group) {
    var id = 'acMenuHeading-' + group.id;
    var node = document.getElementById(id);
    if (node) return node;
    node = document.createElement('div');
    node.id = id;
    node.className = 'ac-menu-heading';
    node.setAttribute('role', 'separator');
    node.setAttribute('aria-label', group.title);
    node.textContent = group.title;
    return node;
  }

  function organise() {
    var menu = document.getElementById('cloudMenuPopover');
    if (!menu) return false;

    // Retired from the Companion now that Cold Outreach is a separate PWA.
    var outreach = menu.querySelector('#acRelationshipFollowupLink');
    if (outreach) outreach.remove();
    // Replaced by the top-left TCP control and the unified status modal.
    var legacyStatus = menu.querySelector('#acV22StatusBlock');
    if (legacyStatus) legacyStatus.remove();

    // Labels should describe the actions that actually exist.
    var customers = findDirect(menu, '[data-cloud-action="all-customers"]');
    if (customers) {
      var customerLabel = customers.querySelector('.menu-ico + span');
      if (customerLabel) customerLabel.textContent = 'Cloud customers';
    }
    var settings = findDirect(menu, '[data-cloud-action="settings"]');
    if (settings) {
      var settingsLabel = settings.querySelector('.menu-ico + span');
      if (settingsLabel) settingsLabel.textContent = 'Settings & backup';
    }

    var desired = [], recognised = new Set();
    GROUPS.forEach(function (group) {
      var head = heading(group);
      recognised.add(head);
      desired.push(head);
      group.selectors.forEach(function (selector) {
        var node = findDirect(menu, selector);
        if (node) { desired.push(node); recognised.add(node); }
      });
    });

    // Leave future extension links accessible instead of dropping them.
    // Place them in More, ahead of the protected Admin shortcut.
    var extras = Array.from(menu.children).filter(function (node) {
      return !recognised.has(node);
    });
    var admin = findDirect(menu, '[data-cloud-action="admin"]');
    var insertAt = admin ? desired.indexOf(admin) : desired.length;
    desired.splice.apply(desired, [insertAt, 0].concat(extras));

    // Keep buttons as DIRECT children: older modules use menu.insertBefore(...)
    // and existing click delegation relies on the original button instances.
    desired.forEach(function (node, index) {
      if (menu.children[index] !== node) menu.insertBefore(node, menu.children[index] || null);
    });
    return true;
  }

  function install() {
    var menu = document.getElementById('cloudMenuPopover');
    var toggle = document.getElementById('cloudActionMenu');
    if (!menu || !toggle) return false;

    if (!document.getElementById('acMenuGroupingCss')) {
      var style = document.createElement('style');
      style.id = 'acMenuGroupingCss';
      style.textContent = [
        '#cloudPilotCard #cloudMenuPopover{max-height:min(76dvh,650px);overflow-y:auto;overscroll-behavior:contain}',
        '#cloudMenuPopover .ac-menu-heading{padding:9px 7px 2px;margin-top:3px;border-top:1px solid rgba(122,66,200,.17);color:#6a5186;font:800 10px/1.3 system-ui,sans-serif;letter-spacing:.075em;text-transform:uppercase}',
        '#cloudMenuPopover .ac-menu-heading:first-child{padding-top:2px;margin-top:0;border-top:0}',
        '#cloudMenuPopover #cloudDeleteCurrent:not(:disabled){color:#903d45}',
        '#cloudMenuPopover .cloud-menu-item:focus-visible{outline:3px solid #a88bd9;outline-offset:2px}'
      ].join('');
      document.head.appendChild(style);
    }
    // Capture before the delegated click handler opens the popover. Also picks
    // up links that have been injected by another module since first paint.
    toggle.addEventListener('click', organise, true);
    organise();
    global.AppointmentCompanionMenuGroups = { refresh: organise };
    return true;
  }

  var tries = 0, timer = setInterval(function () {
    if (install() || ++tries > 240) clearInterval(timer);
  }, 50);
})(window);
