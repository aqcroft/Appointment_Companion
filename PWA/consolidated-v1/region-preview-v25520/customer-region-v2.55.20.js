/* Appointment Companion v2.55.20 - unobtrusive, per-customer electricity region. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var regions = [
    [10,'Eastern'],[11,'East Midlands'],[12,'London'],[13,'Manweb'],
    [14,'Midlands'],[15,'Northern'],[16,'Norweb'],[17,'Scottish Hydro'],
    [18,'Scottish Power'],[19,'Seeboard'],[20,'Southern'],[21,'Swalec'],
    [22,'Sweb'],[23,'Yorkshire']
  ];

  function install() {
    if (document.getElementById('customerRegion')) return true;
    var name = document.getElementById('customerName'), field = name && name.closest('.field');
    if (!field || !field.parentNode) return false;

    var box = document.createElement('div');
    box.className = 'ac-customer-region';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ac-region-chip';
    button.setAttribute('aria-controls', 'acRegionEditor');
    button.setAttribute('aria-expanded', 'false');

    var editor = document.createElement('div');
    editor.className = 'ac-region-editor';
    editor.id = 'acRegionEditor';
    editor.hidden = true;

    var label = document.createElement('label');
    label.htmlFor = 'customerRegion';
    label.textContent = 'Electricity region';

    var select = document.createElement('select');
    select.id = 'customerRegion';
    select.setAttribute('aria-describedby', 'customerRegionHelp');
    select.add(new Option('Select the customer region', ''));
    regions.forEach(function (r) { select.add(new Option(r[0] + ' - ' + r[1], String(r[0]))); });

    var help = document.createElement('small');
    help.id = 'customerRegionHelp';
    help.textContent = 'Saved for this customer. Used by Should I Fix and EV Companion.';

    editor.appendChild(label);
    editor.appendChild(select);
    editor.appendChild(help);
    box.appendChild(button);
    box.appendChild(editor);

    var style = document.createElement('style');
    style.id = 'acCustomerRegionStyle';
    style.textContent = [
      '.ac-customer-region{margin:-1px 0 12px}',
      '.ac-region-chip{display:inline-flex;align-items:center;max-width:100%;gap:6px;min-height:30px;border:1px solid #ddd4ec;border-radius:999px;background:#faf7ff;color:#5d4293;padding:5px 12px;font:750 12px/1.25 system-ui;cursor:pointer;text-align:left}',
      '.ac-region-chip::after{content:"✎";font-size:13px;opacity:.75;margin-left:3px}',
      '.ac-region-chip.missing{color:#835d0b;border-color:#f1d698;background:#fff9ea}',
      '.ac-region-editor[hidden]{display:none!important}',
      '.ac-region-editor{box-sizing:border-box;margin:8px 0 0;padding:10px 12px;border:1px solid #e5ddf1;border-radius:12px;background:#fbf9ff}',
      '.ac-region-editor label{display:block;font-size:12px;font-weight:750;color:#4b376c;margin-bottom:6px}',
      '.ac-region-editor select{display:block;box-sizing:border-box;width:100%;min-height:42px;border:1px solid #d9d2e5;border-radius:10px;background:#fff;color:#26164f;font:650 14px system-ui;padding:9px 10px}',
      '.ac-region-editor small{display:block;font-size:11px;line-height:1.4;color:#716a7e;margin-top:6px}',
      '.ac-region-chip:focus-visible,.ac-region-editor select:focus-visible{outline:2px solid #7a42c8;outline-offset:2px}'
    ].join('');
    document.head.appendChild(style);
    field.insertAdjacentElement('afterend', box);

    function paint() {
      var option = select.options[select.selectedIndex];
      button.textContent = select.value && option ? '⚡ ' + option.textContent.replace(' - ', ' · ') : '⚡ Set customer electricity region';
      button.classList.toggle('missing', !select.value);
      button.title = select.value ? 'Tap to change this customer region' : 'Set the region used for this customer\'s energy comparisons';
    }
    function expand(on) {
      editor.hidden = !on;
      button.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) select.focus();
    }
    button.addEventListener('click', function () { expand(editor.hidden); });
    select.addEventListener('change', function () { paint(); if (select.value) expand(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !editor.hidden) { expand(false); button.focus(); }
    });
    window.addEventListener('ac:customer-switched', function (e) {
      // New customer must not silently inherit the previous customer's region.
      if (e && e.detail && !e.detail.customer_name) select.value = '';
      expand(false);
      setTimeout(paint, 80); // Canonical restore/hydrate runs asynchronously.
    });
    paint();
    return true;
  }
  var tries = 0, timer = setInterval(function () { if (install() || ++tries > 120) clearInterval(timer); }, 50);
})();