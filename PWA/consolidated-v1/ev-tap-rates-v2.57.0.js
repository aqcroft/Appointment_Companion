/* EV Companion v2.57.0 - one rate breakdown from either hero card.
 * Uses selected raw live tariff rates exported from the calculator; presentation
 * only, with no rate lookups, independent estimates or calculation changes.
 */
(function(){
  'use strict';
  var doc=document, model=null, dialog=null, lastActivator=null;
  var $=function(id){return doc.getElementById(id)};
  function formatPence(raw,digits){
    if(!Number.isFinite(raw))return '—';
    return raw.toLocaleString('en-GB',{minimumFractionDigits:digits,maximumFractionDigits:digits})+'p';
  }
  function style(){
    if($('acEvTapRatesStyle'))return;
    var el=doc.createElement('style');el.id='acEvTapRatesStyle';
    el.textContent=[
      'html .hero-grid>.hero-box.ac-ev-rate-tap{position:relative!important;cursor:pointer!important;touch-action:manipulation!important;outline-offset:2px!important}',
      'html .hero-grid>.hero-box.ac-ev-rate-tap:after{content:"ⓘ";position:absolute;top:6px;right:7px;font:900 12px/1 system-ui;color:#fff;background:rgba(255,255,255,.15);border-radius:50%;width:17px;height:17px;display:flex;align-items:center;justify-content:center;pointer-events:none}',
      'html .hero-grid>.hero-box.ac-ev-rate-tap:focus-visible{outline:3px solid #e5d8ff!important}',
      '@media(hover:hover){html .hero-grid>.hero-box.ac-ev-rate-tap:hover{box-shadow:inset 0 0 0 2px rgba(255,255,255,.48)!important}}',
      'html #acEvRateDialog{border:0!important;border-radius:17px!important;box-sizing:border-box!important;background:#fff!important;color:#322545!important;padding:0!important;width:min(390px,calc(100vw - 36px))!important;max-height:calc(100dvh - 40px)!important;overflow-y:auto!important;box-shadow:0 20px 60px rgba(22,8,43,.25)!important}',
      'html #acEvRateDialog:not([open]){display:none!important}',
      'html #acEvRateDialog::backdrop{background:rgba(28,19,43,.62)!important}',
      'html #acEvRateDialog .ac-ev-rate-content{padding:19px 17px 15px!important}',
      'html #acEvRateDialog h2{margin:0 34px 4px 0!important;font:850 19px/1.25 system-ui!important;color:#4e3377!important}',
      'html #acEvRateDialog .ac-ev-rate-caption{font:500 12px/1.4 system-ui!important;color:#746583!important;margin:0 0 13px!important}',
      'html #acEvRateDialog .ac-ev-rate-figures{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}',
      'html #acEvRateDialog .ac-ev-rate-figure{padding:11px 8px!important;background:#f5f0fa!important;border:1px solid #e2d7ec!important;border-radius:11px!important;text-align:center!important}',
      'html #acEvRateDialog .ac-ev-rate-figure small{display:block!important;font:650 11px/1.3 system-ui!important;color:#71637d!important}',
      'html #acEvRateDialog .ac-ev-rate-figure strong{display:block!important;margin:5px 0 2px!important;font:850 clamp(17px,4.3vw,23px)/1.15 system-ui!important;color:#4e3377!important;font-variant-numeric:tabular-nums!important}',
      'html #acEvRateDialog .ac-ev-rate-figure em{display:block!important;font:500 10px/1.3 system-ui!important;color:#71637d!important;font-style:normal!important}',
      'html #acEvRateDialog .ac-ev-rate-standing{grid-column:1 / -1!important;display:flex!important;align-items:center!important;justify-content:space-around!important;gap:10px!important}',
      'html #acEvRateDialog .ac-ev-rate-note{font:500 11px/1.45 system-ui!important;color:#685c75!important;margin:12px 1px!important}',
      'html #acEvRateDialog .ac-ev-rate-done{display:block!important;width:100%!important;min-height:39px!important;padding:9px!important;background:#7651b0!important;border:0!important;border-radius:9px!important;font:850 13px system-ui!important;color:#fff!important;cursor:pointer!important}',
      'html #acEvRateDialog .ac-ev-rate-close{position:absolute!important;top:10px!important;right:11px!important;width:30px!important;height:30px!important;border:0!important;border-radius:8px!important;background:#f5f0fa!important;color:#503777!important;font:800 22px system-ui!important;cursor:pointer!important}',
      '@media(max-width:350px){html #acEvRateDialog .ac-ev-rate-content{padding:16px 12px 12px!important}html #acEvRateDialog .ac-ev-rate-figure strong{font-size:17px!important}}'
    ].join('');
    doc.head.appendChild(el);
  }
  function addDialog(){
    if(dialog)return dialog;
    dialog=doc.createElement('dialog');dialog.id='acEvRateDialog';
    dialog.setAttribute('aria-labelledby','acEvRateDialogTitle');
    dialog.innerHTML='<div class="ac-ev-rate-content">'+
      '<button type="button" class="ac-ev-rate-close" id="acEvRateDialogClose" aria-label="Close rate details">×</button>'+
      '<h2 id="acEvRateDialogTitle">⚡ Your UW EV electricity rates</h2>'+
      '<p class="ac-ev-rate-caption" id="acEvRateDialogCaption"></p>'+
      '<div class="ac-ev-rate-figures">'+
        '<div class="ac-ev-rate-figure"><small>🌙 Off-peak rate</small><strong id="acEvRateOffPeak">—</strong><em>per kWh</em></div>'+
        '<div class="ac-ev-rate-figure"><small>☀️ Peak rate</small><strong id="acEvRatePeak">—</strong><em>per kWh</em></div>'+
        '<div class="ac-ev-rate-figure ac-ev-rate-standing"><div><small>Daily standing charge</small><strong id="acEvRateStanding">—</strong></div><em>per day</em></div>'+
      '</div>'+
      '<p class="ac-ev-rate-note" id="acEvRateDialogNote"></p>'+
      '<button type="button" class="ac-ev-rate-done" id="acEvRateDialogDone">Got it</button>'+
      '</div>';
    doc.body.appendChild(dialog);
    function close(){if(dialog.open)dialog.close()}
    $('acEvRateDialogClose').addEventListener('click',close);
    $('acEvRateDialogDone').addEventListener('click',close);
    dialog.addEventListener('click',function(e){
      if(e.target===dialog)close();
    });
    dialog.addEventListener('close',function(){
      if(lastActivator&&lastActivator.isConnected)lastActivator.focus();
    });
    return dialog;
  }
  function render(){
    if(!dialog)return;
    var d=model||window.__AC_EV_TRADEOFF||{};
    var vat=Number(d.vatPercent)===0?0:5;
    var factor=vat===0?1:1.05;
    var offPeak=d.evOffPeakRateExVatP, peak=d.evPeakRateExVatP, standing=d.evStandingChargeExVatP;
    $('acEvRateDialogCaption').textContent='Selected UW EV tariff · '+vat+'% electricity VAT';
    $('acEvRateOffPeak').textContent=formatPence(Number.isFinite(offPeak)?offPeak*factor:NaN,3);
    $('acEvRatePeak').textContent=formatPence(Number.isFinite(peak)?peak*factor:NaN,3);
    $('acEvRateStanding').textContent=formatPence(Number.isFinite(standing)?standing*factor:NaN,2);
    var available=Number.isFinite(offPeak)&&Number.isFinite(peak)&&Number.isFinite(standing);
    var note=available?'One daily standing charge applies to both peak and off-peak electricity.':'Current tariff rates are still loading. Please try again shortly.';
    if(available&&d.dualFuelSelected&&Number(d.evDualFuelDiscountExVatAnnual)>0){
      note+=' Your estimate also includes the UW dual fuel discount.';
    }
    $('acEvRateDialogNote').textContent=note;
  }
  function open(source){
    lastActivator=source;
    var popup=addDialog();
    render();
    if(!popup.open){
      if(typeof popup.showModal==='function')popup.showModal();
      else popup.setAttribute('open','');
    }
    $('acEvRateDialogClose').focus();
  }
  function activate(box){
    var grid=box&&box.parentElement;
    if(!grid||!grid.classList.contains('hero-grid'))return;
    var idx=Array.prototype.indexOf.call(grid.children,box);
    if(idx!==0&&idx!==1)return;
    open(box);
  }
  function setup(){
    var grid=doc.querySelector('.hero .hero-grid');
    if(!grid||grid.children.length<2)return false;
    style();
    ['Overnight','Daytime'].forEach(function(label,i){
      var box=grid.children[i];
      if(!box)return;
      box.classList.add('ac-ev-rate-tap');
      box.setAttribute('role','button');
      box.setAttribute('tabindex','0');
      box.setAttribute('aria-haspopup','dialog');
      box.setAttribute('aria-controls','acEvRateDialog');
      box.setAttribute('aria-label','Show peak, off-peak and daily standing charge for the UW EV tariff');
      box.title='Tap to see both EV unit rates and the standing charge';
    });
    return true;
  }
  doc.addEventListener('click',function(e){
    var box=e.target.closest&&e.target.closest('.hero-grid>.hero-box.ac-ev-rate-tap');
    if(box){e.preventDefault();activate(box)}
  });
  doc.addEventListener('keydown',function(e){
    var box=e.target.closest&&e.target.closest('.hero-grid>.hero-box.ac-ev-rate-tap');
    if(box&&(e.key==='Enter'||e.key===' ')){
      e.preventDefault();activate(box);
    }
  });
  doc.addEventListener('ac:ev-comparison',function(e){
    model=e.detail||window.__AC_EV_TRADEOFF;
    setup();
    if(dialog&&dialog.open)render();
  });
  doc.addEventListener('ac:ev-workspace-ready',setup);
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',setup);else setup();
  var tries=0,retry=setInterval(function(){if(setup()||++tries>120)clearInterval(retry)},120);
})();