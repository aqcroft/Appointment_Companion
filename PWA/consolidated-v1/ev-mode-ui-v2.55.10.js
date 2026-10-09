/* Appointment Companion v2.55.10 - prospective customer petrol shortcut beside period selector.
   Presentation only: never changes tariffs, assumptions or saved values. */
(function(global){
'use strict';
const doc=global.document;
function installStyle(){
 if(doc.getElementById('acEvModeStyleV25510'))return;
 const style=doc.createElement('style');style.id='acEvModeStyleV25510';
 style.textContent=[
  'html:not(.shared-view):not(.ac-metered-mode){--ev:#ae4f60!important;--ev-dark:#803343!important}',
  'html:not(.shared-view).ac-metered-mode{--ev:#2778af!important;--ev-dark:#155381!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]){--ev:#9b558f!important;--ev-dark:#643567!important}',
  'html.shared-view.ac-metered-mode,html.shared-view[data-ev-journey="existing"]{--ev:#6655b2!important;--ev-dark:#40377b!important}',
  'html:not(.shared-view):not(.ac-metered-mode) .hero{background:linear-gradient(135deg,#c76875,#8a3f56)!important}',
  'html:not(.shared-view).ac-metered-mode .hero{background:linear-gradient(135deg,#368fca,#185b97)!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .hero{background:linear-gradient(135deg,#b56aa7,#713b78)!important}',
  'html.shared-view.ac-metered-mode .hero,html.shared-view[data-ev-journey="existing"] .hero{background:linear-gradient(135deg,#8474ca,#4d418b)!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .personal-splash-ok{background:#9b558f!important}',
  'html.shared-view.ac-metered-mode .personal-splash-ok,html.shared-view[data-ev-journey="existing"] .personal-splash-ok{background:#6655b2!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .ac-v254-welcome-stat strong{color:#8b4a83!important}',
  'html.shared-view.ac-metered-mode .ac-v254-welcome-stat strong,html.shared-view[data-ev-journey="existing"] .ac-v254-welcome-stat strong{color:#6051a4!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .ac-v254-welcome-stat{background:#fbf4fa!important;border-color:#efdfeb!important}',
  'html.shared-view.ac-metered-mode .ac-v254-welcome-stat,html.shared-view[data-ev-journey="existing"] .ac-v254-welcome-stat{background:#f5f3fc!important;border-color:#e0daf5!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .customer-welcome{background:#f9eff7!important;border-color:#e8cfe5!important}',
  'html.shared-view.ac-metered-mode .customer-welcome,html.shared-view[data-ev-journey="existing"] .customer-welcome{background:#f2effa!important;border-color:#ded5f4!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .ac-ev-vat-switch button.on{background:#9b558f!important}',
  'html.shared-view.ac-metered-mode .ac-ev-vat-switch button.on,html.shared-view[data-ev-journey="existing"] .ac-ev-vat-switch button.on{background:#6655b2!important}',
  'html:not(.shared-view):not(.ac-metered-mode) .ac-v2482-vat-switch button.on{background:#ae4f60!important}',
  'html:not(.shared-view).ac-metered-mode .ac-v2482-vat-switch button.on{background:#2778af!important}',
  'html.shared-view:not(.ac-metered-mode):not([data-ev-journey="existing"]) .ac-v2482-vat-switch button.on{background:#9b558f!important}',
  'html.shared-view.ac-metered-mode .ac-v2482-vat-switch button.on,html.shared-view[data-ev-journey="existing"] .ac-v2482-vat-switch button.on{background:#6655b2!important}',
  'html body #acMeterModeCard>.ac-meter-choices,html body #acMeterModeCard>.ac-meter-question{display:none!important}',
  'html.ac-metered-mode .hero .ac-ev-fuel-button,html[data-ev-journey="existing"] .hero .ac-ev-fuel-button{display:none!important}',
  'html body .ac-v2482-vat{border-left:3px solid var(--ev,#008a7f)!important}',
  'html body #comparison .detail-head{border-left:3px solid var(--ev,#008a7f)!important;padding-left:9px!important}',
  'html body #comparison .tod-title{border-bottom:2px solid color-mix(in srgb,var(--ev,#008a7f) 34%,transparent)!important;padding-bottom:5px!important}',
  'html body #comparison .tod-grid .tod-box.off{box-shadow:inset 0 2px var(--ev,#008a7f)!important}',
  'html body .card .ac-meter-source-label{border-left:3px solid var(--ev,#008a7f)!important;padding-left:7px!important}',
  'html body .hero .hero-head{display:none!important}',
  '.hero .ac-ev-topline{display:flex;align-items:center;justify-content:space-between;gap:9px;width:100%;box-sizing:border-box;margin:0 0 8px}',
  '.hero .ac-ev-topline .ac-ev-mode-label{margin:0;flex:0 1 auto;min-width:0;max-width:calc(100% - 50px)}',
  'html body .hero .ac-ev-topline .ac-ev-fuel-button{position:static!important;flex:0 0 30px!important;width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;margin-left:auto!important;border-radius:9px!important;font-size:15px!important;line-height:1!important;padding:0!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:end!important;justify-content:space-between!important;gap:7px 8px!important;min-height:0!important;max-width:100%!important;margin-top:10px!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-service-stack{grid-column:1!important;grid-row:1!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;align-self:stretch!important;min-width:0!important;width:100%!important;gap:5px!important}',
  'html body .hero .hero-service-row{position:static!important;transform:none!important;float:none!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:5px!important;max-width:100%!important;min-width:0!important;min-height:0!important}',
  'html body .hero .hero-service-label{font-size:10px!important;line-height:1.15!important;font-weight:800!important;letter-spacing:0!important;white-space:normal!important;opacity:1!important}',
  'html body .hero .hero-service-label:before{content:none!important;display:none!important}',
  'html body .hero #serviceButtons{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;gap:5px!important;max-width:100%!important;min-width:0!important}',
  'html body .hero #serviceButtons button,html body .hero #serviceButtons button.on{position:static!important;transform:none!important;margin:0!important;flex:0 0 auto!important;box-sizing:border-box!important;width:34px!important;min-width:34px!important;height:32px!important;min-height:32px!important;max-height:32px!important;padding:0 3px!important;border-radius:18px!important;line-height:1!important}',
  'html body .hero #serviceButtons button[data-tier="0"],html body .hero #serviceButtons button[data-tier="0"].on{width:83px!important;min-width:83px!important}',
  'html body .hero #serviceButtons button .num,html body .hero #serviceButtons button.on .num{font-size:12px!important;font-weight:850!important;line-height:1!important;white-space:nowrap!important}',
  'html body .hero #serviceButtons button[data-tier="0"] .num{font-size:10px!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>#periodToggle{grid-column:2!important;grid-row:1!important;align-self:end!important;justify-self:end!important;position:static!important;transform:none!important;margin:0!important;min-width:0!important;max-width:100%!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>.hero-tariff{grid-column:1/-1!important;grid-row:2!important;align-self:start!important;margin:3px 0 0!important;padding:0!important;border:0!important;text-align:left!important;max-width:100%!important;font-size:10px!important;line-height:1.35!important}',
  '@media(max-width:370px){html body .hero #serviceButtons{gap:3px!important}html body .hero #serviceButtons button[data-tier="0"]{width:75px!important;min-width:75px!important}html body .hero #serviceButtons button{width:30px!important;min-width:30px!important}.hero .ac-ev-topline .ac-ev-mode-label{font-size:10px!important}}',
  'html.shared-view body .hero #acEvToplineV2554{display:none!important}',
  'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c{grid-template-columns:minmax(0,1fr) 30px auto!important;gap:5px!important}',
  'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-fuel-button{grid-column:2!important;grid-row:1!important;justify-self:end!important;align-self:end!important;position:static!important;display:inline-flex!important;visibility:visible!important;width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;max-height:30px!important;font-size:15px!important;line-height:1!important;padding:0!important;margin:0!important;border-radius:9px!important}',
  'html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>#periodToggle{grid-column:3!important;grid-row:1!important;align-self:end!important;justify-self:end!important}',
  '@media(max-width:375px){html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c{grid-template-columns:minmax(0,1fr) 28px auto!important;gap:3px!important}html.shared-view.ac-ev-prospective-fuel body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-fuel-button{width:28px!important;min-width:28px!important;height:28px!important;min-height:28px!important}}',
  '.ac-ev-mode-label{display:inline-flex;align-items:center;gap:3px;min-width:0;font:800 11px/1.25 system-ui;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:5px 9px;white-space:nowrap}',
  '@media(max-width:370px){.ac-ev-mode-label{font-size:10px;padding:5px 7px}}'
 ].join('');
 doc.head.appendChild(style);
}
function apply(){
 installStyle();
 const root=doc.documentElement;
 const existing=root.classList.contains('ac-metered-mode')||root.dataset.evJourney==='existing';
 const customerProspective=root.classList.contains('shared-view')&&!existing;
 root.classList.toggle('ac-ev-prospective-fuel',customerProspective);
 const hero=doc.querySelector('.hero');
 if(!hero)return false;
 const grid=hero.querySelector('.hero-grid');
 if(grid){
  let top=doc.getElementById('acEvToplineV2554');
  if(!top){top=doc.createElement('div');top.id='acEvToplineV2554';top.className='ac-ev-topline';}
  if(top.nextElementSibling!==grid)hero.insertBefore(top,grid);
  let label=doc.getElementById('acEvModeLabel');
  if(!label){label=doc.createElement('span');label.id='acEvModeLabel';label.className='ac-ev-mode-label';}
  if(label.parentNode!==top)top.insertBefore(label,top.firstChild);
  label.textContent=existing?'🔌 Already owns an EV':'🚗 Considering an EV';
  const fuel=doc.querySelector('.ac-ev-fuel-button');
  if(fuel){
   if(!customerProspective && fuel.parentNode!==top)top.appendChild(fuel);
   fuel.hidden=existing;
   fuel.setAttribute('aria-hidden',existing?'true':'false');
   fuel.tabIndex=existing?-1:0;
   if(existing){
    const dialog=doc.getElementById('acEvFuelModal');
    if(dialog&&dialog.classList.contains('open')){
     const close=doc.getElementById('acEvFuelClose');
     if(close)close.click();
     else dialog.classList.remove('open');
    }
   }
  }
 }
 const footer=hero.querySelector('.hero-footer-v16c');
 if(footer){
  const row=hero.querySelector('.hero-service-row');
  const period=doc.getElementById('periodToggle');
  const tariff=hero.querySelector('.hero-tariff');
  let stack=footer.querySelector('.ac-ev-service-stack');
  if(!stack){stack=doc.createElement('div');stack.className='ac-ev-service-stack';}
  if(stack.parentNode!==footer)footer.appendChild(stack);
  if(row&&row.parentNode!==stack)stack.appendChild(row);
  if(period&&period.parentNode!==footer)footer.appendChild(period);
  if(tariff&&tariff.parentNode!==footer)footer.appendChild(tariff);
  // Align content order without replacing nodes or disconnecting listeners.
  const fuel=hero.querySelector('.ac-ev-fuel-button');
  if(customerProspective&&fuel&&period){
   // Move the original, still-wired button immediately left of Monthly/Yearly.
   if(fuel.parentNode!==footer||fuel.nextElementSibling!==period)footer.insertBefore(fuel,period);
   if(stack.nextElementSibling!==fuel)footer.insertBefore(stack,fuel);
  }else if(stack.nextElementSibling!==period&&period)footer.insertBefore(stack,period);
  if(tariff&&period&&tariff.previousElementSibling!==period)footer.appendChild(tariff);
 }
 const row=doc.querySelector('.hero-service-row');
 if(row){
  const label=row.querySelector('.hero-service-label');if(label)label.textContent='Extra services with energy';
  const names=['Energy only','+1','+2'];
  row.querySelectorAll('#serviceButtons button[data-tier]').forEach(function(button){
   const tier=Number(button.dataset.tier);if(tier<0||tier>2)return;
   const num=button.querySelector('.num');if(num)num.textContent=names[tier];
   button.title=['Energy only','Energy + 1 service','Energy + 2 services'][tier];
  });
 }
 return true;
}
doc.addEventListener('ac:ev-comparison',apply);
doc.addEventListener('ac:ev-mode-change',apply);
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',apply);else apply();
[100,350,700,1400,2200,4000].forEach(ms=>setTimeout(apply,ms));
})(window);
