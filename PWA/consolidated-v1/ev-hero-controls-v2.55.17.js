/* Shared customer EV hero controls v2.55.17.
 * Reuses the actual VAT buttons and live tariff data. Presentation only.
 */
(function(){
 'use strict';
 if(!document.documentElement.classList.contains('shared-view'))return;
 var doc=document,$=function(id){return doc.getElementById(id)},installed=false;
 function styles(){
  if($('acEvHeroControlsV25517Style'))return;
  var css=doc.createElement('style');css.id='acEvHeroControlsV25517Style';
  css.textContent=[
   'html.shared-view #acEvRateVatRow{display:none!important}',
   'html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c{grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto auto!important;column-gap:7px!important;row-gap:4px!important;align-items:center!important}',
   'html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-service-stack{grid-column:1!important;grid-row:1/span 2!important;align-self:center!important}',
   'html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c>#periodToggle{grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:center!important}',
   'html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c>#acEvHeroVatSlot{grid-column:2!important;grid-row:2!important;justify-self:end!important;align-self:center!important;display:flex!important;justify-content:flex-end!important;min-height:28px!important}',
   'html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c>.hero-tariff{grid-column:1/-1!important;grid-row:3!important;margin:2px 0 0!important;padding:0!important;font-size:11px!important;line-height:1.35!important}',
   'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c{grid-template-columns:minmax(0,1fr) 30px auto!important}',
   'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-fuel-button{grid-column:2!important;grid-row:1!important}',
   'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>#periodToggle{grid-column:3!important;grid-row:1!important}',
   'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>#acEvHeroVatSlot{grid-column:3!important;grid-row:2!important}',
   'html.shared-view .hero .hero-service-label{font-size:9px!important;line-height:1.25!important}',
   'html.shared-view .hero .hero-tariff #heroTariff,html.shared-view .hero .hero-tariff>span:not(.ac-ev-friendly-rate){display:none!important}',
   'html.shared-view .hero .hero-tariff .ac-ev-friendly-rate{display:block!important;font-size:11px!important;font-weight:750!important;line-height:1.3!important;color:#fff!important}',
   'html.shared-view .hero .hero-footer-v16c #acEvTwoSimHint{display:none!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat{display:block!important;position:static!important;width:auto!important;min-width:0!important;max-width:none!important;flex:0 0 auto!important;margin:0!important;padding:0!important;border:0!important;border-left:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;color:#fff!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-header{display:flex!important;align-items:center!important;min-height:26px!important;margin:0!important;gap:0!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-title,html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v254-vat-details{display:none!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-switch{display:flex!important;align-items:center!important;gap:1px!important;min-width:0!important;margin:0!important;padding:2px!important;border:0!important;border-radius:9px!important;background:rgba(255,255,255,.19)!important;box-shadow:none!important;overflow:hidden!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-switch button{border:0!important;border-radius:7px!important;background:transparent!important;color:#fff!important;font-size:10px!important;font-weight:750!important;line-height:1.2!important;min-height:24px!important;padding:4px 7px!important;white-space:nowrap!important;box-shadow:none!important}',
   'html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-switch button.on{background:#fff!important;color:#46316c!important;font-weight:900!important;box-shadow:0 1px 3px #26123b26!important}',
   'html.shared-view #acEvHeroVatSlot #acEvVatNote{display:none!important}',
   'html.shared-view .ac-ev-service-value-hint{display:flex!important;align-items:flex-start!important;gap:8px!important;padding:3px 4px!important;margin:6px 0 8px!important;font:650 12px/1.38 system-ui!important;color:#604687!important}',
   'html.shared-view .ac-ev-service-value-hint .ac-ev-lightbulb{flex:0 0 auto!important;font-size:17px!important;line-height:1.1!important}',
   '@media(max-width:380px){html.shared-view body .hero[data-v16c-layout="1"] .hero-footer-v16c{column-gap:4px!important}html.shared-view #acEvHeroVatSlot #acV2482Vat .ac-v2482-vat-switch button{font-size:9px!important;padding:4px 6px!important}.ac-ev-service-value-hint{font-size:11px!important}}'
  ].join('');
  doc.head.appendChild(css);
 }
 function tier(){
  var button=doc.querySelector('#serviceButtons button.on[data-tier]');
  return button?Math.max(0,Math.min(2,Number(button.dataset.tier)||0)):2;
 }
 function updateLabels(){
  var label=doc.querySelector('.hero .hero-service-label');
  if(label)label.textContent='Number of extra services with energy';
  var t=tier(),line=$('acEvFriendlyRateLine');
  if(line)line.textContent=[
   'UW EV rates - Energy only',
   'UW EV rates - Energy + 1 other service',
   "UW's best-value EV rates - Energy + 2 other services"
  ][t];
  var hint=$('acEvServiceValueHint'),copy=$('acEvServiceValueCopy');
  if(copy){
   var hasGas=$('dualFuel')&&$('dualFuel').checked;
   copy.textContent=t===2?
    ('+2 services could be two £6 mobile SIMs'+(hasGas?' - and reduces your gas costs too.':'.')):
    (t===1?'Add 1 more service to unlock the best EV rates.':'Add 2 other services to unlock the best EV rates.');
  }
  if(hint)hint.hidden=false;
 }
 function place(){
  var hero=doc.querySelector('.hero'),footer=hero&&hero.querySelector('.hero-footer-v16c');
  var vat=$('acV2482Vat'),period=$('periodToggle');
  if(!hero||!footer||!vat||!period)return false;
  styles();
  var slot=$('acEvHeroVatSlot');
  if(!slot){slot=doc.createElement('div');slot.id='acEvHeroVatSlot';footer.appendChild(slot)}
  if(slot.parentElement!==footer)footer.appendChild(slot);
  if(vat.parentElement!==slot)slot.appendChild(vat);
  var tariff=footer.querySelector('.hero-tariff');
  if(tariff&&!$('acEvFriendlyRateLine')){
   var line=doc.createElement('span');line.id='acEvFriendlyRateLine';line.className='ac-ev-friendly-rate';
   tariff.appendChild(line);
  }
  var hint=$('acEvServiceValueHint');
  if(!hint){
   hint=doc.createElement('div');hint.id='acEvServiceValueHint';hint.className='ac-ev-service-value-hint';
   var icon=doc.createElement('span');icon.className='ac-ev-lightbulb';icon.setAttribute('aria-hidden','true');icon.textContent='💡';
   var copy=doc.createElement('span');copy.id='acEvServiceValueCopy';
   hint.appendChild(icon);hint.appendChild(copy);
   hero.insertAdjacentElement('afterend',hint);
  }else if(hero.nextElementSibling!==hint)hero.insertAdjacentElement('afterend',hint);
  updateLabels();
  installed=true;
  return true;
 }
 var queued=false;
 function schedule(){
  if(queued)return;
  queued=true;requestAnimationFrame(function(){queued=false;place()});
 }
 doc.addEventListener('ac:ev-comparison',schedule);
 doc.addEventListener('ac:ev-mode-change',schedule);
 doc.addEventListener('ac:ev-core-ready',schedule);
 doc.addEventListener('click',function(e){
  if(e.target.closest('#serviceButtons,#periodToggle,[data-ac-vat]'))requestAnimationFrame(schedule);
 });
 doc.addEventListener('change',function(e){if(e.target.id==='dualFuel')schedule()});
 if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',schedule);else schedule();
 var attempts=0,timer=setInterval(function(){if(place()||++attempts>140)clearInterval(timer)},120);
})();