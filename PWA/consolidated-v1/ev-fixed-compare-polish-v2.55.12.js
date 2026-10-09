/* EV Companion v2.55.12 - customer-facing fixed/variable comparison polish.
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
   'html.shared-view #acEvFixedDetails[open]>summary{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:9px!important;padding:12px 14px 10px!important;border-bottom:1px solid #eee7f5!important;min-height:24px!important}',
   'html.shared-view #acEvFixedDetails[open]>summary .ac-ev-fixed-title{font-size:14px!important;line-height:1.25!important;margin:0!important;color:#523878!important}',
   'html.shared-view #acEvFixedDetails[open]>summary .ac-ev-fixed-sub{display:none!important}',
   'html.shared-view #acEvFixedDetails[open]>summary:after{content:"⌃"!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:none!important;margin:0!important;padding:2px 8px!important;background:transparent!important;color:#7250a0!important;font-size:20px!important;font-weight:700!important;border:0!important;border-radius:6px!important}',
   'html.shared-view #acEvFixedDetails[open]>.card{padding:12px 10px 13px!important}',
   'html.shared-view #acEvFixedDetails[open] .stressbar{margin-top:0!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-simple-rates{margin:10px 0 6px!important;gap:8px!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-simple-rate{padding:10px 6px!important;border-radius:10px!important}',
   'html.shared-view .ac-v25512-insight{text-align:center;color:#49336a;font:800 12px/1.4 system-ui,sans-serif;margin:8px 2px 0;padding:3px 3px 0}',
   'html.shared-view .ac-v25512-insight[hidden]{display:none!important}',
   'html.shared-view .ac-v25512-usage{text-align:center;color:#7b7186;font:500 10px/1.4 system-ui,sans-serif;margin:5px 6px 10px}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-all-rates{margin-top:9px!important;padding-top:7px!important}',
   'html.shared-view #acEvFixedDetails[open] .ac-ev-all-rates>summary{font-size:11px!important;padding:9px 7px!important}',
   '@media(max-width:370px){html.shared-view #acEvFixedDetails[open]>summary{padding:11px 10px 9px!important}html.shared-view .ac-v25512-insight{font-size:11px!important}}'
  ].join('');
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
  if(title)title.textContent=outer.open?'🛡️ Fixed vs variable':'🛡️ Prefer the certainty of a fixed price?';
 }
 function updateTariffLink(){
  var more=$('acEvAllTariffs');
  if(!more)return;
  var summary=more.querySelector('summary');
  if(summary)summary.textContent=more.open?'Hide UW tariff details ▴':'Show all UW electricity tariffs ▾';
 }
 function refresh(){
  if(!ready)return;
  updateTitle();
  updateTariffLink();
  var insight=$('acEvScenarioInsight');
  if(!insight)return;
  var cards=document.querySelectorAll('#acEvSimpleRates .ac-ev-simple-rate');
  if(cards.length<2){insight.hidden=true;return;}
  var variable=amount(cards[0].querySelector('strong'));
  var fixed=amount(cards[1].querySelector('strong'));
  if(!Number.isFinite(variable)||!Number.isFinite(fixed)){insight.hidden=true;return;}
  var yearly=/year/i.test((cards[0].querySelectorAll('small')[1]||{}).textContent||'');
  var unit=yearly?'year':'month';
  var stress=document.querySelector('#stressButtons button.on');
  var pct=stress?Number(stress.dataset.stress||0):0;
  var opening=pct>0?'With an illustrative +'+pct+'% rise, ':'At today\u2019s rates, ';
  var delta=Math.abs(variable-fixed);
  if(delta<0.5){
   insight.textContent=opening+'both tariffs cost about the same.';
  }else{
   var cheaper=variable<fixed?'EV variable':'Economy 7 fixed';
   insight.textContent=opening+cheaper+' costs £'+Math.round(delta).toLocaleString('en-GB')+'/'+unit+' less.';
  }
  insight.hidden=false;
 }
 function install(){
  if(ready)return true;
  outer=$('acEvFixedDetails');
  var rates=$('acEvSimpleRates');
  if(!outer||!rates)return false;
  style();
  var insight=document.createElement('div');
  insight.id='acEvScenarioInsight';insight.className='ac-v25512-insight';
  insight.setAttribute('aria-live','polite');insight.hidden=true;
  rates.insertAdjacentElement('afterend',insight);
  var note=document.createElement('div');note.className='ac-v25512-usage';
  note.textContent='Allows for 2 extra hours of off-peak usage on Economy 7.';
  insight.insertAdjacentElement('afterend',note);
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