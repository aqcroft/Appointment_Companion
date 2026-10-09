/* EV customer presentation v2.55.16: compact header, non-reflow tariff
 * information, and full-width, right-aligned VAT selector.
 * No tariff calculations, customer inputs, or sharing values are modified. */
(function(){
 'use strict';
 var doc=document, timer=null, active='', installed=false;
 if(!doc.documentElement.classList.contains('shared-view'))return;
 var $=function(id){return doc.getElementById(id)};
 function style(){
  if($('acEvSharedHeaderV25516Style'))return;
  var css=doc.createElement('style');css.id='acEvSharedHeaderV25516Style';
  css.textContent=[
   'html.shared-view .wrap>header{position:relative!important;margin:0 0 7px!important;z-index:200!important}',
   'html.shared-view .wrap>header .title-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:5px!important;min-height:37px!important}',
   'html.shared-view .wrap>header .title-row h1{flex:1 1 auto!important;min-width:0!important;font-size:clamp(13px,3.9vw,19px)!important;line-height:1.14!important;margin:0!important}',
   'html.shared-view .wrap>header .title-row h1 .unofficial{font-size:8px!important}',
   'html.shared-view .wrap>header .fresh-mini{display:flex!important;align-items:center!important;gap:4px!important;margin:0 0 0 auto!important;flex:0 0 auto!important}',
   'html.shared-view .wrap>header .fresh-mini-label{display:none!important}',
   'html.shared-view .wrap>header .fresh-mini-btn,html.shared-view .wrap>header #acEvHeaderInfo{width:31px!important;min-width:31px!important;max-width:42px!important;height:31px!important;min-height:31px!important;border-radius:9px!important;padding:3px!important;font-size:11px!important;box-sizing:border-box!important}',
   'html.shared-view .wrap>header #fixedFresh{min-width:40px!important;width:40px!important}',
   'html.shared-view .wrap>header #fixedFresh strong{font-size:13px!important}',
   'html.shared-view .wrap>header #acEvHeaderInfo{border:1px solid #e1d6ef;background:#f4effa;color:#644596;font-weight:900;cursor:pointer}',
   'html.shared-view .wrap>header #acV250Gear{flex:0 0 31px!important;width:31px!important;min-width:31px!important;height:31px!important;margin:0 0 0 2px!important;padding:3px!important;font-size:16px!important}',
   'html.shared-view #acEvPrepared{display:none!important}',
   'html.shared-view .wrap>header #fixedFreshDetail,html.shared-view .wrap>header #variableFreshDetail{display:none!important}',
   'html.shared-view .wrap .smallnote{display:none!important}',
   'html.shared-view .wrap>#acEvRateVatRow>.strip,html.shared-view .wrap>.strip{display:none!important}',
   'html.shared-view #acEvRateVatRow{display:flex!important;justify-content:flex-end!important;align-items:center!important;padding:0!important;margin:1px 0 7px!important;gap:0!important}',
   'html.shared-view #acEvRateVatRow>#acV2482Vat{display:block!important;flex:1 1 100%!important;max-width:none!important;width:100%!important;padding:3px 6px!important;margin:0!important;border-radius:9px!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v2482-vat-header{display:flex!important;align-items:center!important;justify-content:flex-start!important;min-height:28px!important;gap:5px!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v2482-vat-title{display:inline-block!important;order:0!important;white-space:nowrap!important;font-size:10px!important;color:#68518a!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v254-vat-details{order:1!important;flex:0 0 auto!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v2482-vat-switch{order:2!important;margin-left:auto!important;flex:0 0 auto!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v2482-vat-switch button{font-size:10px!important;min-height:26px!important;padding:4px 10px!important}',
   'html.shared-view #acEvRateVatRow #acV2482Vat .ac-v254-vat-details summary{min-height:23px!important;min-width:22px!important;font-size:14px!important}',
   'html.shared-view #acEvHeaderPopover{position:absolute!important;right:0!important;top:calc(100% + 5px)!important;z-index:12000!important;width:min(335px,calc(100vw - 38px))!important;box-sizing:border-box!important;padding:11px 12px!important;background:#fff!important;border:1px solid #d9c8ed!important;border-radius:12px!important;box-shadow:0 9px 28px #33234c30!important;color:#49345e!important;font:500 11px/1.45 system-ui!important}',
   'html.shared-view #acEvHeaderPopover[hidden]{display:none!important}',
   'html.shared-view #acEvHeaderPopover strong{display:block;font-size:12px;margin-bottom:4px;color:#4c3175}',
   'html.shared-view #acEvHeaderPopover p{margin:4px 0;white-space:normal;overflow-wrap:anywhere}',
   '@media(max-width:380px){html.shared-view .wrap>header .title-row{gap:3px!important}html.shared-view .wrap>header .title-row h1{font-size:13px!important}html.shared-view .wrap>header #acEvHeaderInfo,html.shared-view .wrap>header #variableFresh{width:29px!important;min-width:29px!important}html.shared-view .wrap>header #fixedFresh{min-width:37px!important;width:37px!important}html.shared-view #acEvRateVatRow #acV2482Vat .ac-v2482-vat-switch button{padding:4px 8px!important}}'
  ].join('');
  doc.head.appendChild(css);
 }
 function pop(){
  var p=$('acEvHeaderPopover');if(p)return p;
  var header=doc.querySelector('.wrap>header');if(!header)return null;
  p=doc.createElement('div');p.id='acEvHeaderPopover';p.hidden=true;
  p.setAttribute('role','status');p.setAttribute('aria-live','polite');
  header.appendChild(p);
  return p;
 }
 function close(){
  if(timer){clearTimeout(timer);timer=null}
  var p=$('acEvHeaderPopover');if(p)p.hidden=true;
  ['acEvHeaderInfo','fixedFresh','variableFresh'].forEach(function(id){
   var b=$(id);if(b)b.setAttribute('aria-expanded','false');
  });
  active='';
 }
 function display(which){
  if(active===which){close();return}
  close();
  var p=pop();if(!p)return;
  active=which;p.textContent='';
  function para(value,strong){
   if(!value)return;
   var el=doc.createElement(strong?'strong':'p');el.textContent=value;p.appendChild(el);
  }
  function val(id){var x=$(id);return x?(x.textContent||'').trim():''}
  if(which==='info'){
   para('Prepared for '+(val('welcomeName')||'you'),true);
   para(val('rateStrip').replace(/\\s*·\\s*5% VAT incl\\.?/i,'').replace(/\\s*·\\s*0% VAT.*$/i,''));
   para(val('acEvPrepared')?'':''); // The customer name above replaces the separate prepared-for row.
   para(val('fixedDetailState')==='⚠️ Check version'?'Check tariff version before using these costs.':'');
   para(val('freshWarning'));
   para(val('unused')||'');
   para('This is a guide, not an official UW quote. Variable prices may change; fixed tariffs can have exit fees.');
  }else if(which==='fixed'){
   para(val('fixedDetailTitle')||'Fixed tariff version',true);
   para([val('fixedDetailState'),val('fixedDetailText')].filter(Boolean).join(' - '));
  }else{
   para(val('seasonDetailTitle')||'Variable tariff period',true);
   para([val('seasonDetailState'),val('seasonDetailDates')].filter(Boolean).join(' - '));
  }
  p.hidden=false;
  var trigger=$(which==='info'?'acEvHeaderInfo':which==='fixed'?'fixedFresh':'variableFresh');
  if(trigger)trigger.setAttribute('aria-expanded','true');
  timer=setTimeout(close,5000);
 }
 function refresh(){
  var header=doc.querySelector('.wrap>header');
  var title=header&&header.querySelector('.title-row');
  var mini=header&&header.querySelector('.fresh-mini');
  if(!title||!mini)return false;
  style();pop();
  if(!$('acEvHeaderInfo')){
   var info=doc.createElement('button');info.type='button';info.id='acEvHeaderInfo';
   info.textContent='ⓘ';info.title='About this personalised EV comparison';
   info.setAttribute('aria-label','Customer details, rates and important information');
   info.setAttribute('aria-expanded','false');mini.insertBefore(info,mini.firstChild);
  }
  var gear=$('acV250Gear');
  if(mini.parentElement!==title|| (gear&&mini.nextElementSibling!==gear)){
   title.insertBefore(mini,gear||null);
  }
  if(gear){gear.title='Your figures & settings';gear.setAttribute('aria-label','Open your figures and settings')}
  var label=doc.querySelector('#acV2482Vat .ac-v2482-vat-title');
  if(label)label.textContent='VAT';
  var v5=doc.querySelector('#acV2482Vat [data-ac-vat="5"]');
  var v0=doc.querySelector('#acV2482Vat [data-ac-vat="0"]');
  if(v5){v5.textContent='5% VAT';v5.title='Use the longer-term 5% VAT comparison'}
  if(v0){v0.textContent='0% VAT';v0.title='Use the temporary 0% electricity VAT comparison'}
  return !!(gear&&v5&&v0);
 }
 function capture(e){
  var target=e.target&&e.target.closest&&e.target.closest('#acEvHeaderInfo,#fixedFresh,#variableFresh');
  if(!target)return;
  e.preventDefault();e.stopImmediatePropagation();
  display(target.id==='fixedFresh'?'fixed':target.id==='variableFresh'?'variable':'info');
 }
 doc.addEventListener('click',capture,true);
 doc.addEventListener('click',function(event){
  if(active&&!event.target.closest('#acEvHeaderPopover,#acEvHeaderInfo,#fixedFresh,#variableFresh'))close();
 });
 doc.addEventListener('keydown',function(event){if(event.key==='Escape'&&active){close();event.preventDefault()}});
 ['ac:ev-comparison','ac:ev-workspace-ready'].forEach(function(name){doc.addEventListener(name,refresh)});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',refresh);else refresh();
 var tries=0,attempt=setInterval(function(){if(refresh()||++tries>150)clearInterval(attempt)},120);
})();