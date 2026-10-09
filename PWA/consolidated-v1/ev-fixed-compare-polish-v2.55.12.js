/* EV Companion v2.55.14 - compact customer-facing fixed/variable comparison.
 * Presentation only. Uses the existing live tariff engine and existing buttons;
 * does not modify consumption, tariff prices, VAT, saved data or shared links.
 */
(function(){
 'use strict';
 if(!document.documentElement.classList.contains('shared-view'))return;
 var ready=false,outer=null;
 function $(id){return document.getElementById(id)}
 function style(){
  if($('acEvFixedComparePolishV25512'))return;
  var el=document.createElement('style');el.id='acEvFixedComparePolishV25512';
  el.textContent=[
   'html.shared-view #acEvFixedDetails>summary{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;gap:2px 8px!important;align-items:center!important;min-height:0!important;padding:9px 12px!important}',
   'html.shared-view #acEvFixedDetails>summary .ac-ev-fixed-title{display:block!important;grid-column:1!important;grid-row:1!important;font-size:13px!important;line-height:1.22!important;margin:0!important;color:#513777!important}',
   'html.shared-view #acEvFixedDetails>summary .ac-ev-fixed-sub{display:block!important;grid-column:1!important;grid-row:2!important;color:#776c85!important;font-size:10px!important;line-height:1.3!important;margin:0!important}',
   'html.shared-view #acEvFixedDetails>summary:after{content:"⌄"!important;grid-column:2!important;grid-row:1/span 2!important;align-self:center!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:26px!important;height:27px!important;min-width:26px!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;border-radius:6px!important;font-size:20px!important;color:#7250a0!important}',
   'html.shared-view #acEvFixedDetails[open]>summary:after{content:"⌃"!important}',
   'html.shared-view #acEvFixedDetails[open]>summary{border-bottom:1px solid #eee7f5!important}',
   'html.shared-view #acEvFixedDetails[open]>.card{padding:8px 10px 9px!important}',
   'html.shared-view #acEvFixedDetails[open] .stressbar{margin:0!important;padding:0!important}',
   'html.shared-view #acEvFixedDetails[open] .stressbar>.stresslabel{display:none!important}',
   'html.shared-view #acEvFixedDetails[open] #stressButtons button{min-height:34px!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-simple-rates{margin:7px 0 3px!important;gap:7px!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-simple-rate{padding:8px 5px!important;border-radius:10px!important;transition:background-color .14s ease,border-color .14s ease}',
   'html.shared-view #acEvFixedDetails .ac-ev-simple-rate.ac-v25514-cheaper{background:#e7f6ed!important;border-color:#8fc9a5!important;box-shadow:inset 0 0 0 1px #a6dcb7!important}',
   'html.shared-view #acEvFixedDetails .ac-ev-simple-rate.ac-v25514-cheaper strong{color:#14683c!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-all-rates{margin-top:6px!important;padding-top:5px!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-all-rates>summary{font-size:11px!important;padding:9px 7px!important}',
   'html.shared-view #acEvFixedDetails .ac-v25512-usage{display:none!important}',
   '@media(max-width:370px){html.shared-view #acEvFixedDetails>summary{padding:8px 9px!important}html.shared-view #acEvFixedDetails>summary .ac-ev-fixed-sub{font-size:9.5px!important}}'
  ].join('');;
  document.head.appendChild(el);
 }
 function amount(el){
  if(!el)return NaN;
  var text=(el.textContent||'').trim().replace(/,/g,'');
  var match=text.match(/£\s*(-?\d+(?:\.\d+)?)/);
  return match?Number(match[1]):NaN;
 }
 function updateTitle(){
  if(!outer)return;
  var title=outer.querySelector('summary .ac-ev-fixed-title');
  if(title)title.textContent='🛡️ Fixed vs variable if prices rise';
  var subtitle=outer.querySelector('summary .ac-ev-fixed-sub');
  if(subtitle)subtitle.textContent='Economy 7 gives 2 extra off-peak hours, but daytime rates are typically higher than EV rates.';
 }
 function updateTariffLink(){
  var more=$('acEvAllTariffs');
  if(!more)return;
  var summary=more.querySelector('summary');
  if(summary)summary.textContent=more.open?'Hide UW tariff details ▴':'Show all UW electricity tariffs ▾';
 }
 function refresh(){
  if(!ready)return;
  updateTitle();updateTariffLink();
  var cards=document.querySelectorAll('#acEvSimpleRates .ac-ev-simple-rate');
  if(cards.length<2)return;
  var model=window.__AC_EV_TRADEOFF||{};
  var variable=Number.isFinite(model.evScenarioAnnual)?model.evScenarioAnnual:amount(cards[0].querySelector('strong'));
  var fixed=Number.isFinite(model.fixedE7Annual)?model.fixedE7Annual:amount(cards[1].querySelector('strong'));
  cards.forEach(function(card){card.classList.remove('ac-v25514-cheaper');card.removeAttribute('title')});
  // The price tiles are rendered by the existing tariff engine. No estimates
  // are recomputed here: highlight the lower currently-displayed scenario.
  if(!Number.isFinite(variable)||!Number.isFinite(fixed)||Math.abs(variable-fixed)<.01)return;
  var cheaper=cards[variable<fixed?0:1];
  cheaper.classList.add('ac-v25514-cheaper');
  cheaper.title='Lower estimated cost for this scenario';
 }

 function install(){
  if(ready)return true;
  outer=$('acEvFixedDetails');
  var rates=$('acEvSimpleRates');
  if(!outer||!rates)return false;
  style();
  var scenarios=$('stressButtons');
  if(scenarios)scenarios.setAttribute('aria-label','Illustrative variable electricity price-rise scenarios');
  outer.addEventListener('toggle',updateTitle);
  var more=$('acEvAllTariffs');
  if(more)more.addEventListener('toggle',updateTariffLink);
  ready=true;refresh();
  return true;
 }
 function queueRefresh(){
  if(install())requestAnimationFrame(refresh);
 }
 document.addEventListener('ac:ev-comparison',queueRefresh);
 document.addEventListener('click',function(event){
  if(event.target.closest('#stressButtons,#serviceButtons,#periodToggle'))requestAnimationFrame(function(){requestAnimationFrame(refresh)});
 });
 var tries=0,timer=setInterval(function(){if(install()||++tries>130)clearInterval(timer)},120);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueRefresh);
 else queueRefresh();
})();