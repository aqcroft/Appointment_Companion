/* Appointment Companion v2.55.3 - EV journey colour and robust hero controls.
   Presentation only: never changes tariffs, assumptions or saved values. */
(function(global){
'use strict';
const doc=global.document;
function installStyle(){
 if(doc.getElementById('acEvModeStyleV2553'))return;
 const style=doc.createElement('style');style.id='acEvModeStyleV2553';
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
  'html body .hero .hero-service-row{position:static!important;transform:none!important;float:none!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:6px!important;max-width:100%!important;min-height:0!important}',
  'html body .hero .hero-service-label{font-size:11px!important;line-height:1.25!important;font-weight:800!important;letter-spacing:0!important;white-space:normal!important;opacity:1!important}',
  'html body .hero .hero-service-label:before{content:none!important;display:none!important}',
  'html body .hero #serviceButtons{display:flex!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;gap:7px!important;max-width:100%!important;min-width:0!important}',
  'html body .hero #serviceButtons button,html body .hero #serviceButtons button.on{position:static!important;transform:none!important;margin:0!important;flex:0 0 auto!important;box-sizing:border-box!important;width:46px!important;min-width:46px!important;height:34px!important;min-height:34px!important;max-height:34px!important;padding:0 7px!important;border-radius:20px!important;line-height:1!important}',
  'html body .hero #serviceButtons button[data-tier="0"],html body .hero #serviceButtons button[data-tier="0"].on{width:104px!important;min-width:104px!important}',
  'html body .hero #serviceButtons button .num,html body .hero #serviceButtons button.on .num{font-size:13px!important;font-weight:850!important;line-height:1.05!important;white-space:nowrap!important}',
  'html body .hero #serviceButtons button[data-tier="0"] .num{font-size:11px!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;column-gap:9px!important;row-gap:6px!important;align-items:center!important;justify-content:stretch!important;min-height:0!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-service-stack{grid-column:1/-1!important;grid-row:1!important;align-self:stretch!important;width:100%!important;min-width:0!important;align-items:flex-start!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-fuel-button{grid-column:2!important;grid-row:2!important;align-self:center!important}',
  'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>#periodToggle{grid-column:3!important;grid-row:2!important;align-self:center!important}',
  'html body .hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff{margin:5px 0 0!important;max-width:100%!important}',
  'html body .hero .hero-head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:8px!important;min-height:25px!important}',
  '.ac-ev-mode-label{display:inline-flex;align-items:center;gap:3px;min-width:0;font:800 11px/1.25 system-ui;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:5px 9px;white-space:nowrap}',
  '@media(max-width:370px){html body .hero #serviceButtons{gap:5px!important}html body .hero #serviceButtons button[data-tier="0"]{width:94px!important;min-width:94px!important}.ac-ev-mode-label{font-size:10px;padding:5px 7px}}'
 ].join('');
 doc.head.appendChild(style);
}
function apply(){
 installStyle();
 const root=doc.documentElement;
 const existing=root.classList.contains('ac-metered-mode')||root.dataset.evJourney==='existing';
 const hero=doc.querySelector('.hero');
 if(!hero)return false;
 const head=hero.querySelector('.hero-head');
 if(head){
  let label=doc.getElementById('acEvModeLabel');
  if(!label){label=doc.createElement('span');label.id='acEvModeLabel';label.className='ac-ev-mode-label';head.insertBefore(label,head.firstChild);}
  label.textContent=existing?'🔌 Already owns an EV':'🚗 Considering an EV';
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
[100,350,1100,2200].forEach(ms=>setTimeout(apply,ms));
})(window);
