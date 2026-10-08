/* EV Companion v2.52.0 - presentation only: natural form order, balanced
   hero actions and tariff freshness moved into settings (source DOM retained). */
(function(){
 'use strict';
 var installed=false;
 function $(id){return document.getElementById(id)}
 function el(tag,klass,label){var node=document.createElement(tag);if(klass)node.className=klass;if(label)node.textContent=label;return node}
 function styles(){
  if($('acV251Styles'))return;
  var style=el('style');style.id='acV251Styles';
  style.textContent=[
    '.ac-ev-vehicle-group{margin-top:13px;padding-top:10px;border-top:1px solid #e6e8ed}',
    '.ac-ev-vehicle-group .label{margin:0 0 8px}',
    '.ac-ev-mile-title{margin:0 0 3px!important}',
    '.hero[data-v16c-layout="1"] .hero-footer-v16c{align-items:center!important;justify-content:space-between!important;min-height:59px!important;gap:7px!important}',
    '.hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-service-stack{align-self:center!important}',
    '.hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-fuel-button{align-self:center!important}',
    '.hero[data-v16c-layout="1"] .hero-footer-v16c #periodToggle{align-self:center!important;margin-left:0!important}',
    '.ac-v251-tariff-row{display:flex;flex-direction:column;gap:9px}',
    '.ac-v251-tariff-row .fresh-mini{display:flex!important;align-items:center!important;justify-content:flex-start!important;position:static!important;padding:0!important;margin:0!important}',
    '.ac-v251-tariff-row .fresh-detail{margin:0!important}',
    '.ac-v251-tariff-row .fresh-mini-label{font-size:10px}',
    '.ac-v251-tariff-row .fresh-mini-btn{min-width:34px}',
    '.ac-v251-tariff-row .fresh-warning:not([hidden]){display:block}',
    '#acV2482Vat{margin-top:10px;margin-bottom:10px}',
    '@media(max-width:380px){.hero[data-v16c-layout="1"] .hero-footer-v16c{min-height:55px!important;gap:4px!important}}'
  ].join('');
  document.head.appendChild(style);
 }
 function moveHeroFirst(){
  var hero=document.querySelector('.hero'),mode=$('acMeterModeCard');
  if(!hero||!mode||hero.parentNode!==mode.parentNode)return false;
  // Give the result visual priority; inputs stay immediately underneath.
  if(hero.nextElementSibling!==mode)mode.parentNode.insertBefore(hero,mode);
  return true;
 }
 function moveVehicleOrder(){
  var pills=$('vehiclePills');if(!pills)return false;
  var card=pills.closest('section.card');if(!card)return false;
  var miles=$('miles'),heading=card.querySelector('.range-title'),ends=miles&&miles.nextElementSibling;
  if(!heading||!miles||!ends)return false;
  // Move live nodes so mileage input handlers, profile saving, and fuel modal
  // synchronisation continue working without duplicate input controls.
  var wrapper=el('div','ac-ev-vehicle-group');
  var title=el('div','label','🚙 What sort of EV are you considering?');
  wrapper.appendChild(title);wrapper.appendChild(pills);
  var previous=card.querySelector('.label');
  if(previous)previous.remove();
  card.insertBefore(wrapper,heading);
  card.insertBefore(heading,wrapper);
  card.insertBefore(miles,wrapper);
  card.insertBefore(ends,wrapper);
  heading.classList.add('ac-ev-mile-title');
  var txt=heading.querySelector('b');if(txt)txt.textContent='How many miles do you drive each year?';
  return true;
 }
 function placeVat(meter){
  var vat=$('acV2482Vat'),hero=document.querySelector('.hero'),pills=$('vehiclePills');
  var car=pills&&pills.closest('section.card');
  if(!vat||!hero)return false;
  if(meter||!car){if(hero.nextElementSibling!==vat)hero.insertAdjacentElement('afterend',vat)}
  else if(car.nextElementSibling!==vat)car.insertAdjacentElement('afterend',vat);
  return true;
 }
 function moveTariffInfo(){
  var modal=$('acV250Modal'),body=modal&&modal.querySelector('.ac-v250-body');
  var bar=document.querySelector('header .fresh-mini');
  if(!body||!bar)return false;
  var section=el('section','ac-v251-tariff-row');section.id='acV251TariffInfo';
  var title=el('div','ac-v250-section-title','Tariff versions and dates');
  section.appendChild(title);section.appendChild(bar);
  ['fixedFreshDetail','variableFreshDetail'].forEach(function(id){var x=$(id);if(x)section.appendChild(x)});
  body.appendChild(section);
  // Keep #freshWarning in its original position: genuinely outdated tariffs
  // must never be hidden behind a settings button.
  return true;
 }
 function handleModel(event){
  var model=event&&event.detail||window.__AC_EV_TRADEOFF;
  if(model)placeVat(!!model.meter);
 }
 function install(){
  if(installed)return true;
  if(!$('vehiclePills')||!$('miles')||!$('acV250Modal')||!$('acV2482Vat'))return false;
  styles();if(!moveVehicleOrder()||!moveHeroFirst())return false;
  moveTariffInfo();
  installed=true;
  handleModel();
  return true;
 }
 document.addEventListener('ac:ev-comparison',function(evt){
  if(installed)handleModel(evt);
 });
 var count=0;
 function run(){if(install())return;if(++count<90)setTimeout(run,100)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);
 else run();
})();