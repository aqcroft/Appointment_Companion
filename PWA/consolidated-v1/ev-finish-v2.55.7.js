/* EV Companion v2.55.7: compact VAT and optional Economy 7 selection.
 * Live nodes and underlying input events are preserved.
 */
(function(){
 'use strict';
 var $=function(id){return document.getElementById(id)},installed=false;
 function make(tag,klass,text){var x=document.createElement(tag);if(klass)x.className=klass;if(text)x.textContent=text;return x}
 function installStyles(){
  if($('acEvFinishV254Style'))return;
  var st=make('style');st.id='acEvFinishV254Style';
  st.textContent=[
    '.ac-v254-detail-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}',
    '.ac-v254-tod-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}',
    '.ac-v254-detail-grid>div,.ac-v254-tod-grid>.tod-box{min-width:0!important;overflow-wrap:anywhere!important}',
    '.ac-v254-tod-grid .tod-box{padding:8px 5px!important;text-align:center!important}',
    '.ac-v254-tod-grid .tod-period{font-size:10px!important;line-height:1.25!important}',
    '.ac-v254-tod-grid .tod-usage{font-size:11px!important;font-weight:850!important}',
    '.ac-v254-tod-grid .tod-rate{font-size:10px!important}',
    '.ac-v254-tod-grid .tod-box.total{background:#e8f5f2!important;border-radius:9px!important}',
    '.ac-v254-detail .detail-grid .k{font-size:10px!important;line-height:1.28!important}',
    '.ac-v254-vat.ac-v2482-vat{position:relative;padding:5px 8px!important;margin:5px 0 7px!important;border-radius:9px!important}',
    '.ac-v254-vat .ac-v2482-vat-header{gap:5px!important;min-height:28px!important;flex-wrap:nowrap!important}',
    '.ac-v254-vat .ac-v2482-vat-title{font-size:10px!important;white-space:nowrap!important}',
    '.ac-v254-vat .ac-v2482-vat-switch{margin-left:auto!important}',
    '.ac-v254-vat .ac-v2482-vat-switch button{padding:5px 7px!important;min-height:28px!important;font-size:10px!important}',
    '.ac-v254-vat .ac-v254-vat-details{order:1;flex:0 0 auto;position:static}',
    '.ac-v254-vat .ac-v254-vat-details summary{cursor:pointer;list-style:none;color:#237e70;font-weight:900;font-size:14px;padding:2px 5px;min-height:25px;display:flex;align-items:center}',
    '.ac-v254-vat .ac-v254-vat-details summary::-webkit-details-marker{display:none}',
    '.ac-v254-vat .ac-v254-vat-details summary:focus-visible{outline:2px solid #007b70;border-radius:5px}',
    '.ac-v254-vat .ac-v254-vat-details #acEvVatNote{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:120;background:#fff!important;border:1px solid #c4ded7!important;box-shadow:0 5px 18px #002c2326;border-radius:9px;padding:10px 11px!important;margin:0!important;line-height:1.45!important}',
    '.ac-v254-vat .ac-v254-vat-details #acEvVatNote small{font-size:10px!important}',
    '#acMeterActual>.ac-meter-source-label,#acMeterActual>.ac-source-choices{display:none!important}',
    '#acMeterActual .ac-v254-source{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 9px;padding:6px 0;border-bottom:1px solid #e2eae7;font-size:11px;color:#536a65}',
    '#acMeterActual .ac-v254-source>span{font-weight:850;color:#275e54}',
    '#acMeterActual .ac-v254-source button{font:750 10px system-ui;border:0;background:transparent;color:#087b6c;text-decoration:underline;cursor:pointer;padding:6px 2px;flex:0 0 auto}',
    '@media(max-width:370px){.ac-v254-tod-grid .tod-box{padding:6px 3px!important}.ac-v254-tod-grid .tod-usage{font-size:10px!important}.ac-v254-vat .ac-v2482-vat-switch button{font-size:9px!important;padding:4px 6px!important}}'
  ].join('');
  document.head.appendChild(st);
 }
 function installVat(){
  var strip=$('acV2482Vat'),note=$('acEvVatNote');
  if(!strip||!note)return false;
  if(strip.classList.contains('ac-v254-vat'))return true;
  var header=strip.querySelector('.ac-v2482-vat-header');
  if(!header)return false;
  strip.classList.add('ac-v254-vat');
  var title=strip.querySelector('.ac-v2482-vat-title');if(title)title.textContent='⚡ VAT';
  var info=make('details','ac-v254-vat-details');info.id='acEvVatHelp';
  var summary=make('summary',null,'ⓘ');
  summary.title='How VAT affects this annualised estimate';summary.setAttribute('aria-label','VAT explanation');
  info.appendChild(summary);info.appendChild(note);
  // Insert ahead of switch; CSS orders info after it to keep the segmented control easy to reach.
  header.insertBefore(info,header.querySelector('.ac-v2482-vat-switch'));
  return true;
 }
 function installE7(){
  var actual=$('acMeterActual');if(!actual)return false;
  if($('acV254MeterSource'))return true;
  var old=actual.querySelector('.ac-meter-source-label');
  if(!old)return false;
  var row=make('div','ac-v254-source');row.id='acV254MeterSource';
  var text=make('span');text.id='acV254SourceText';
  var button=make('button',null,'Use Economy 7');button.id='acV254SourceToggle';button.type='button';
  button.setAttribute('aria-label','Change the source tariff for the day and night readings');
  button.onclick=function(){
    var active=document.querySelector('#acMeterModeCard [data-ac-source].on');
    var next=active&&active.dataset.acSource==='e7'?'ev':'e7';
    var target=document.querySelector('#acMeterModeCard [data-ac-source="'+next+'"]');
    if(target)target.click();
    updateE7();
  };
  row.appendChild(text);row.appendChild(button);actual.insertBefore(row,old);
  updateE7();
  return true;
 }
 function updateE7(){
  var label=$('acV254SourceText'),btn=$('acV254SourceToggle');if(!label||!btn)return;
  var active=document.querySelector('#acMeterModeCard [data-ac-source].on');
  var e7=!!(active&&active.dataset.acSource==='e7');
  var isCustomer=document.documentElement.classList.contains('shared-view');
  label.textContent=isCustomer?'Home + EV estimated annual consumption':(e7?'🌙 Economy 7 readings (7 hours)':'🌙 EV tariff readings (5 hours)');
  btn.textContent=e7?'Use EV readings instead':'Using Economy 7?';
 }
 function install(){
  if(installed)return true;
  if(!$('acMeterActual')||!$('acEvVatNote')||!$('acV2482Vat'))return false;
  installStyles();
  if(!installVat()||!installE7())return false;
  installed=true;return true;
 }
 document.addEventListener('ac:ev-comparison',function(){if(installed)updateE7()});
 var tries=0;function start(){if(install())return;if(++tries<110)setTimeout(start,100)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();