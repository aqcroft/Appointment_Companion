/* Appointment Companion v2.63.0 - 70/30 customer name and region, explicit name confirmation. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;
  var DEFAULT_NEW_REGION = '11'; // East Midlands, only for newly created profiles.
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

    // The name and regional selector belong to one compact row, not two tall rows.
    var nameRegionRow=document.createElement('div');
    nameRegionRow.className='ac-customer-name-region';
    field.parentNode.insertBefore(nameRegionRow,field);
    nameRegionRow.appendChild(field);

    var nameConfirm=document.createElement('button');
    nameConfirm.type='button';
    nameConfirm.className='ac-name-confirm';
    nameConfirm.textContent='✓';
    nameConfirm.hidden=true;
    nameConfirm.title='Confirm the finished customer name and save it locally';
    nameConfirm.setAttribute('aria-label','Confirm customer name and save locally');
    field.appendChild(nameConfirm);

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
    select.value = DEFAULT_NEW_REGION;

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
      '.ac-customer-name-region{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,3fr);align-items:start;gap:8px;margin-bottom:9px}',
      '.ac-customer-name-region>.field{min-width:0;margin:0;position:relative}',
      '.ac-customer-name-region #customerName{box-sizing:border-box;width:100%;min-width:0;padding-right:34px}',
      '.ac-name-confirm[hidden]{display:none!important}',
      '.ac-name-confirm{position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:1;height:28px;min-width:28px;border:1px solid #74b895;border-radius:8px;background:#e9f9f0;color:#137242;font:900 17px/1 system-ui;cursor:pointer;padding:0}',
      '.ac-name-confirm:disabled{opacity:.5;cursor:wait}',
      '.ac-customer-region{position:relative;min-width:0;margin:0;z-index:10}',
      '.ac-region-chip{display:block;box-sizing:border-box;width:100%;min-width:0;min-height:42px;border:1px solid #ddd4ec;border-radius:11px;background:#faf7ff;color:#5d4293;padding:8px 20px 8px 8px;font:750 12px/1.25 system-ui;cursor:pointer;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ac-region-chip::after{content:"✎";font-size:13px;opacity:.75;margin-left:3px}',
      '.ac-region-chip.missing{color:#835d0b;border-color:#f1d698;background:#fff9ea}',
      '.ac-region-editor[hidden]{display:none!important}',
      '.ac-region-editor{position:absolute;right:0;top:100%;z-index:100;box-sizing:border-box;width:min(310px,calc(100vw - 30px));margin:5px 0 0;padding:10px 12px;border:1px solid #e5ddf1;border-radius:12px;background:#fbf9ff;box-shadow:0 10px 22px rgba(38,22,79,.14)}',
      '.ac-region-editor label{display:block;font-size:12px;font-weight:750;color:#4b376c;margin-bottom:6px}',
      '.ac-region-editor select{display:block;box-sizing:border-box;width:100%;min-height:42px;border:1px solid #d9d2e5;border-radius:10px;background:#fff;color:#26164f;font:650 14px system-ui;padding:9px 10px}',
      '.ac-region-editor small{display:block;font-size:11px;line-height:1.4;color:#716a7e;margin-top:6px}',
      '.ac-region-chip:focus-visible,.ac-region-editor select:focus-visible{outline:2px solid #7a42c8;outline-offset:2px}'
    ].join('');
    document.head.appendChild(style);
    nameRegionRow.appendChild(box);
    // The old donor Save / Update control no longer creates a parallel legacy
    // localStorage copy in the consolidated app; label its actual action clearly.
    var legacySave=document.getElementById('saveProfileBtn');
    if(legacySave){legacySave.textContent='💾 Save locally';legacySave.title='Confirm this customer name and save the current record locally';}


    function paint() {
      var option = select.options[select.selectedIndex];
      button.textContent = select.value && option ? '⚡ ' + option.textContent.split(' - ')[1] : '⚡ Region';
      button.classList.toggle('missing', !select.value);
      button.title = select.value && option ? 'Region ' + option.textContent + ' - tap to change' : 'Set the region used for this customer\'s energy comparisons';
      button.setAttribute('aria-label',button.title);
    }
    function paintNameGate(){
      var api=window.AppointmentCompanionConsolidated;
      var saved=api&&typeof api.currentRecord==='function'?api.currentRecord():null;
      var storedName=String(saved&&saved.customer_name||'').trim();
      nameConfirm.hidden=!String(name.value||'').trim() || String(name.value||'').trim()===storedName;
    }
    name.addEventListener('input',paintNameGate);
    nameConfirm.addEventListener('click',function(){
      var api=window.AppointmentCompanionConsolidated;
      if(!api||typeof api.confirmCustomerName!=='function'||!String(name.value||'').trim())return;
      nameConfirm.disabled=true;
      Promise.resolve(api.confirmCustomerName()).then(paintNameGate,function(){name.focus();}).finally(function(){
        nameConfirm.disabled=false;paintNameGate();
      });
    });
    window.addEventListener('ac:customer-name-committed',paintNameGate);
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
      // Every new profile starts in East Midlands, regardless of the previous profile.
      // Named existing profiles retain the region supplied by canonical.restore.
      if (e && e.detail && !e.detail.customer_name) select.value = DEFAULT_NEW_REGION;
      expand(false);
      setTimeout(function(){paint();paintNameGate();},80); // Canonical restore/hydrate runs asynchronously.
    });
    paint();paintNameGate();
    return true;
  }
  var tries = 0, timer = setInterval(function () { if (install() || ++tries > 120) clearInterval(timer); }, 50);
})();