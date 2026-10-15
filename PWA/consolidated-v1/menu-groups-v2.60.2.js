/* Appointment Companion v2.61.1 - quick-action rows plus three grouped submenus with Back.
   Reorders existing controls without cloning nodes or replacing their handlers.
   All three integrated tools use the same #cloudMenuPopover.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') ||
      document.documentElement.classList.contains('shared-view')) return;

  // Main-menu shortcuts reuse the existing menu items and their click handlers.
  // Never duplicate their save/load/quote-link logic.
  var QUICK_ACTIONS = [
    { id:'new', emoji:'📄', label:'New customer', action:'new-customer' },
    { id:'basket', emoji:'🛒', label:'Saved quote basket link', action:'basket' },
    { id:'scenario', emoji:'💾', label:'Save as new scenario', action:'save-as' },
    { id:'customers', emoji:'☁️', label:'All Cloud customers', action:'all-customers' }
  ];

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
    var back = document.getElementById('acMenuBack');
    var rootButtons = document.getElementById('acMenuRootActions');
    if (back) { desired.push(back); recognised.add(back); }
    if (rootButtons) { desired.push(rootButtons); recognised.add(rootButtons); }
    GROUPS.forEach(function (group) {
      var head = heading(group);
      recognised.add(head);
      head.setAttribute('data-ac-menu-group', group.id);
      desired.push(head);
      group.selectors.forEach(function (selector) {
        var node = findDirect(menu, selector);
        if (node) { node.setAttribute('data-ac-menu-group', group.id); desired.push(node); recognised.add(node); }
      });
    });

    // Leave future extension links accessible instead of dropping them.
    // Place them in More, ahead of the protected Admin shortcut.
    var extras = Array.from(menu.children).filter(function (node) {
      return !recognised.has(node);
    });
    var admin = findDirect(menu, '[data-cloud-action="admin"]');
    var insertAt = admin ? desired.indexOf(admin) : desired.length;
    extras.forEach(function (node) { node.setAttribute('data-ac-menu-group', 'more'); });
    desired.splice.apply(desired, [insertAt, 0].concat(extras));

    // Keep buttons as DIRECT children: older modules use menu.insertBefore(...)
    // and existing click delegation relies on the original button instances.
    desired.forEach(function (node, index) {
      if (menu.children[index] !== node) menu.insertBefore(node, menu.children[index] || null);
    });
    // Keep the root first, then Back above the selected sub-menu.
    if (rootButtons && menu.firstElementChild !== rootButtons) menu.insertBefore(rootButtons, menu.firstElementChild);
    if (back && rootButtons && rootButtons.nextElementSibling !== back) menu.insertBefore(back, rootButtons.nextElementSibling);
    if (!menu.dataset.acMenuView) menu.dataset.acMenuView = 'root';
    return true;
  }

  function setView(which) {
    var menu = document.getElementById('cloudMenuPopover');
    if (!menu) return;
    if (!GROUPS.some(function (g) { return g.id === which; })) which = 'root';
    menu.dataset.acMenuView = which;
    var back = document.getElementById('acMenuBack');
    if (back) back.setAttribute('aria-label', 'Back to main menu');
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
        '#cloudMenuPopover .cloud-menu-item:focus-visible{outline:3px solid #a88bd9;outline-offset:2px}',
        '#cloudMenuPopover .ac-menu-root{display:grid;gap:4px}',
        '#cloudMenuPopover .ac-menu-root button{display:flex;align-items:center;width:100%;min-height:40px;padding:7px 10px;text-align:left;justify-content:flex-start;font-size:12.5px;line-height:1.25}',
        '#cloudMenuPopover .ac-menu-root-heading{padding:5px 6px 1px;margin-top:1px;color:#6a5186;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.07em;text-transform:uppercase}',
        '#cloudMenuPopover .ac-menu-group-link{font-weight:750}',
        '#cloudMenuPopover .ac-menu-shortcut{font-weight:650}',
        '#cloudMenuPopover .ac-menu-back{width:100%;min-height:40px;justify-content:flex-start;text-align:left;font-weight:750}',
        '#cloudMenuPopover[data-ac-menu-view="root"]> :not(.ac-menu-root){display:none!important}',
        '#cloudMenuPopover[data-ac-menu-view="root"]>.ac-menu-root{display:grid!important}',
        '#cloudMenuPopover[data-ac-menu-view]:not([data-ac-menu-view="root"])>.ac-menu-root{display:none!important}',
        '#cloudMenuPopover[data-ac-menu-view]:not([data-ac-menu-view="root"])>.ac-menu-back{display:flex!important}',
        '#cloudMenuPopover[data-ac-menu-view="customers"]>[data-ac-menu-group]:not([data-ac-menu-group="customers"]){display:none!important}',
        '#cloudMenuPopover[data-ac-menu-view="account"]>[data-ac-menu-group]:not([data-ac-menu-group="account"]){display:none!important}',
        '#cloudMenuPopover[data-ac-menu-view="more"]>[data-ac-menu-group]:not([data-ac-menu-group="more"]){display:none!important}'
      ].join('');
      document.head.appendChild(style);
    }
    var root = document.getElementById('acMenuRootActions');
    if (!root) {
      root = document.createElement('div'); root.id = 'acMenuRootActions';
      root.className = 'ac-menu-root';
      function label(text) {
        var caption = document.createElement('div');
        caption.className = 'ac-menu-root-heading';
        caption.textContent = text;
        root.appendChild(caption);
      }
      label('Quick actions');
      QUICK_ACTIONS.forEach(function (quick) {
        var btn = document.createElement('button');
        btn.id = 'acQuickAction-' + quick.id;
        btn.type = 'button';
        btn.className = 'pill cloud-menu-item ac-menu-shortcut';
        btn.setAttribute('role','menuitem');
        btn.setAttribute('aria-label',quick.label);
        btn.setAttribute('data-ac-quick-action',quick.action);
        var icon = document.createElement('span');
        icon.className = 'menu-ico';
        icon.textContent = quick.emoji;
        var name = document.createElement('span');
        name.textContent = quick.label;
        btn.appendChild(icon); btn.appendChild(name);
        btn.addEventListener('click',function (e) {
          e.preventDefault(); e.stopPropagation();
          // The source menu item is kept directly in #cloudMenuPopover.
          // .click() invokes the existing delegated Cloud/action handler,
          // including its checks for unsaved changes and Cloud connectivity.
          var source = findDirect(menu,'[data-cloud-action="' + quick.action + '"]');
          if (source && !source.disabled) source.click();
        });
        root.appendChild(btn);
      });
      label('More options');
      GROUPS.forEach(function (group) {
        var btn = document.createElement('button');
        btn.id = 'acMenuSection-' + group.id;
        btn.type = 'button'; btn.className = 'pill cloud-menu-item ac-menu-group-link';
        btn.textContent = (group.id === 'customers' ? '👥 ' : group.id === 'account' ? '⚙️ ' : '📚 ') + group.title + '  ›';
        btn.setAttribute('role','menuitem');
        btn.setAttribute('aria-label','Open ' + group.title);
        btn.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          organise(); setView(group.id);
        });
        root.appendChild(btn);
      });
      menu.insertBefore(root, menu.firstChild);
    }
    if (!document.getElementById('acMenuBack')) {
      var back = document.createElement('button');
      back.id = 'acMenuBack'; back.type = 'button'; back.className = 'pill cloud-menu-item ac-menu-back';
      back.textContent = '‹  Back to menu';
      back.setAttribute('role','menuitem');
      back.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setView('root'); });
      menu.insertBefore(back, root.nextSibling);
    }
    // The Companion menu is recreated by other modules only at bootstrap.
    // Always reset to the three-choice root on a new open.
    toggle.addEventListener('click', function () {
      if (!menu.classList.contains('open')) setView('root');
      organise();
    }, true);
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.dataset.acMenuView !== 'root') {
        e.preventDefault(); e.stopPropagation(); setView('root');
      }
    });
    organise();
    setView('root');
    global.AppointmentCompanionMenuGroups = { refresh: organise, openRoot: function () { setView('root'); } };
    return true;
  }

  var tries = 0, timer = setInterval(function () {
    if (install() || ++tries > 240) clearInterval(timer);
  }, 50);
})(window);
