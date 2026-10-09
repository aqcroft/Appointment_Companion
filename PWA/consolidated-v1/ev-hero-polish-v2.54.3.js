/* EV Companion v2.54.3: clear full-house icon presentation in both modes. */
(function(){
 'use strict';
 var lastMode=null, last=null, formatted=false;
 function el(id){return document.getElementById(id)}
 function pounds(n){return '£'+Math.round(Math.abs(n)).toLocaleString('en-GB')}
 function house(quarter, description){
   // Identical full house icon everywhere; no misleading fractional shading.
   return '<span class="ac-v2482-house-full" role="img" aria-label="'+description+'">🏠</span>';
 }
 function ensureStyle(){
   if(el('acV2482Style'))return;
   var st=document.createElement('style');st.id='acV2482Style';
   st.textContent=[
    '.ac-v2482-house{display:inline-grid;grid-template-columns:1fr;grid-template-rows:1fr;width:1.08em;height:1.12em;vertical-align:middle;line-height:1}',
    '.ac-v2482-base,.ac-v2482-colour{grid-area:1/1;line-height:1;white-space:nowrap}',
    '.ac-v2482-base{filter:grayscale(1);opacity:.42}',
    '.ac-v2482-house.bottom .ac-v2482-colour{clip-path:inset(75% 0 0 0)}',
    '.ac-v2482-house.top .ac-v2482-colour{clip-path:inset(0 0 25% 0)}',
    '.hero .hero-box{min-width:0;overflow:hidden}.hero .hero-value-row{min-width:0;width:100%;max-width:100%;box-sizing:border-box;overflow:hidden;gap:1px}.hero .hero-main-icon{display:inline-flex!important;align-items:center;justify-content:center;flex:0 1 auto;min-width:0;max-width:48%;overflow:hidden;white-space:nowrap;font-size:clamp(12px,3.5vw,18px)!important;letter-spacing:-2px}.ac-metered-mode .hero-main-icon{display:inline-flex!important;max-width:50%;font-size:clamp(12px,3.5vw,18px)!important;letter-spacing:-2px}',
    '.ac-metered-mode .hero-box .k{font-size:8px!important;white-space:normal!important}',
    '.ac-metered-mode .hero-box .meta{font-size:8px!important}',
    '#acEvTradeoff[hidden]{display:none!important}',
    '.ac-v2482-vat{border-radius:12px;border:1px solid #cce6e0;background:#eef9f6;padding:10px 12px;margin:10px 0 12px;color:#18534c}',
    '.ac-v2482-vat-header{display:flex;align-items:center;justify-content:space-between;gap:7px}',
    '.ac-v2482-vat-title{font-size:11px;font-weight:900}',
    '.ac-v2482-vat-switch{display:flex;flex:0 0 auto;border-radius:9px;border:1px solid #a2d2c8;overflow:hidden}',
    '.ac-v2482-vat-switch button{border:0;background:transparent;color:#126d61;padding:7px 8px;font:800 10px system-ui;cursor:pointer}',
    '.ac-v2482-vat-switch button.on{background:#00897d;color:#fff}',
    '.ac-v2482-vat #acEvVatNote{margin:7px 0 0!important;padding:0!important;border:0!important;background:transparent!important;color:#315b55!important;font-size:10px!important;line-height:1.4!important}',
    '.ac-v2482-vat #acEvVatNote strong{font-weight:900}',
    '.ac-v2482-vat #acEvVatNote small{display:block;margin-top:3px;font-size:9px;color:#55746d}',
    'html body .hero[data-v16c-layout="1"] .hero-footer-v16c{justify-content:flex-start!important;align-items:flex-start!important;text-align:left!important}',
    'html body .hero[data-v16c-layout="1"] .hero-footer-v16c>.ac-ev-service-stack{align-self:flex-start!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-service-row{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:5px!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-service-label{font-size:9px!important;white-space:normal!important;line-height:1.2!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc{gap:4px!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc button{width:30px!important;min-width:30px!important;height:28px!important;min-height:28px!important;border-radius:17px!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc button[data-tier="0"]{width:75px!important;min-width:75px!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc button .num{font-size:12px!important}',
    '.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc button[data-tier="0"] .num{font-size:9px!important}',
    '@media(max-width:365px){.hero .hero-main-icon,.ac-metered-mode .hero-main-icon{font-size:12px!important}.ac-v2482-vat-switch button{font-size:9px;padding:6px}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-svc button[data-tier="0"]{width:68px!important;min-width:68px!important}}'
   ].join('');
   document.head.appendChild(st);
 }
 function iconify(meter){
   var grid=document.querySelector('.hero-grid');
   if(!grid||!grid.querySelector('.hero-main-icon'))return;
   var boxes=grid.querySelectorAll('.hero-box');if(boxes.length<3)return;
   var first=boxes[0].querySelector('.hero-main-icon');
   var second=boxes[1].querySelector('.hero-main-icon');
   var third=boxes[2].querySelector('.hero-main-icon');
   if(!first||!second||!third)return;
   // Icons show what is powered, not a proportional division of kWh.
   if(grid.dataset.acV2482Mode!=='universal'){
     var car=el('heroCarIcon')?el('heroCarIcon').textContent:'🚙';
     first.innerHTML='<span id="heroCarIcon">'+car+'</span>'+house('bottom','Household electricity overnight');
     second.innerHTML=house('top','Household electricity in daytime');
     third.innerHTML='<span id="heroTotalIcon">'+car+'</span><span role="img" aria-label="Whole house">🏠</span>';
     grid.dataset.acV2482Mode='universal';
   }
   boxes[0].title='🌙 Overnight: charging the car plus home electricity';
   boxes[1].title='☀️ Daytime: home electricity and daily standing charge';
   boxes[2].title='⚡ Total home electricity and EV charging';
 }
 function services(){
   var footer=document.querySelector('.hero-footer-v16c');
   var row=footer&&footer.querySelector('.hero-service-row');
   if(!row)return;
   var label=row.querySelector('.hero-service-label');
   if(label)label.textContent='Extra services with energy';
   var names=['Energy only','+1','+2'];
   row.querySelectorAll('#serviceButtons button[data-tier]').forEach(function(button){
     var tier=Number(button.dataset.tier);
     if(tier<0||tier>2)return;
     var number=button.querySelector('.num');
     if(number)number.textContent=names[tier];
     button.setAttribute('aria-label',tier===0?'Energy only':('Energy plus '+tier+' extra service'+(tier===1?'':'s')));
     button.title=['Energy only - EV Value','Energy +1 - EV Gold','Energy +2 - EV Double Gold'][tier];
   });
   ['Energy','+1','+2'].forEach(function(t,i){var col=el('th'+i);if(col){col.textContent=t;col.title=['Energy only','Energy plus one additional service','Energy plus two additional services'][i]}});
 }
 function vatStrip(){
   var strip=el('acV2482Vat');
   if(strip)return strip;
   var note=el('acEvVatNote'),hero=document.querySelector('.hero');
   if(!note||!hero)return null;
   strip=document.createElement('section');
   strip.id='acV2482Vat';strip.className='ac-v2482-vat';
   strip.innerHTML='<div class="ac-v2482-vat-header"><span class="ac-v2482-vat-title">⚡ Electricity VAT</span><div class="ac-v2482-vat-switch" role="group" aria-label="Electricity VAT"><button type="button" data-ac-vat="5" class="on" aria-pressed="true">5% included</button><button type="button" data-ac-vat="0" aria-pressed="false">0% VAT</button></div></div>';
   strip.appendChild(note);
   hero.insertAdjacentElement('afterend',strip);
   strip.querySelectorAll('[data-ac-vat]').forEach(function(button){
     button.addEventListener('click',function(){
       document.dispatchEvent(new CustomEvent('ac:ev-vat-request',{detail:{percent:Number(button.dataset.acVat)}}));
     });
   });
   return strip;
 }
 function updateVat(model){
   var strip=vatStrip();if(!strip)return;
   var percentage=model.vatPercent===0?0:5;
   strip.querySelectorAll('[data-ac-vat]').forEach(function(btn){
     var on=Number(btn.dataset.acVat)===percentage;
     btn.classList.toggle('on',on);btn.setAttribute('aria-pressed',String(on));
   });
   var e=model.ev,s=model.standard,note=el('acEvVatNote');
   if(!e||!s||!Number.isFinite(e.total)||!Number.isFinite(s.total)){
     note.textContent='Costs shown only when matching tariff data is available.';
     return;
   }
   // Reconstruct the conservative five-percent annual value in either mode.
   var five=e.total*(percentage===0?1.05:1);
   var reliefYear=five/21,reliefMonth=reliefYear/12,reliefSix=reliefYear/2;
   var shown=model.period==='year'?(pounds(reliefYear)+' annual equivalent'):(pounds(reliefMonth)+'/month');
   note.innerHTML='<strong>'+(percentage===5?'5% included · 0% would save ':'0% electricity VAT · estimated saving ')+shown+' · ~'+pounds(reliefSix)+' over six months</strong><small>Temporary electricity VAT relief: Oct 2026–Mar 2027. Six-month estimate assumes even use. Underlying tariff rates unchanged.</small>';
 }
 function pounds(n){return '£'+Math.round(Math.abs(n)).toLocaleString('en-GB')}
 function apply(data){
   if(!data)return;last=data;
   ensureStyle();
   var root=el('acEvTradeoff');
   if(root)root.hidden=!!data.meter;
   iconify(!!data.meter);
   services();
   updateVat(data);
 }
 document.addEventListener('ac:ev-comparison',function(event){apply(event.detail)});
 if(window.__AC_EV_TRADEOFF)apply(window.__AC_EV_TRADEOFF);
 // Legacy v16c-table constructs the hero footer after the EV engine starts.
 // Correct service labels once it arrives without installing a persistent observer.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){if(last)apply(last)},350)});
 setTimeout(function(){if(last)apply(last)},1000);
})();