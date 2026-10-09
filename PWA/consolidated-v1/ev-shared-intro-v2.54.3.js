/* EV shared welcome v2.54.3.
 * One customer-facing presentation shared by #p2 links and Cloud token links.
 * No tariff maths, service-selection changes, or automatic purchases.
 */
(function(global){
 'use strict';
 var doc=global.document;
 function $(id){return doc.getElementById(id)}
 function e(tag,klass,txt){var x=doc.createElement(tag);if(klass)x.className=klass;if(txt!==undefined)x.textContent=txt;return x}
 function fmt(n){return Math.round(Number(n)||0).toLocaleString('en-GB')}
 function tierLabel(value){
   var n=Math.max(0,Math.min(2,Number.isFinite(Number(value))?Number(value):2));
   return n===0?'Energy only':n===1?'Energy + 1 other service':'Energy + 2 other services';
 }
 function theme(){
  if($('acEvSharedWelcomeStyle'))return;
  var st=e('style');st.id='acEvSharedWelcomeStyle';
  st.textContent=[
    'html.shared-view{--ev:#00877b!important;--ev-dark:#005e56!important;--bg:#f6faf8!important}',
    'html.shared-view body{background:#f6faf8!important;color:#223c39}',
    'html.shared-view .hero{background:linear-gradient(135deg,#079a8c,#00685e)!important}',
    'html.shared-view .customer-welcome{background:#eaf7f3!important;border-color:#b9ded5!important}',
    'html.shared-view .customer-welcome button{color:#006e64!important;border-color:#b1d9d0!important}',
    'html.shared-view .tablewrap thead th.numh.sel{background:#e3f4ee!important;color:#135e53!important}',
    'html.shared-view #comparison td.sel{background:#edf9f4!important}',
    'html.shared-view .ac-ev-cta{background:#087e73!important}',
    'html.shared-view .ac-ev-cta.secondary{background:#fff!important;color:#006c62!important;border-color:#b9ddd5!important}',
    'html.shared-view .ac-ev-conversion{background:#f0faf6!important;border-color:#bcded6!important;color:#22554c!important}',
    'html.shared-view .ac-ev-conversion h2{color:#174c44!important}',
    'html.shared-view .personal-splash{background:linear-gradient(160deg,#f5faf8,#eaf6f2)!important;padding:16px!important;box-sizing:border-box;overflow-y:auto;align-items:center!important}',
    'html.shared-view .personal-splash-card{box-sizing:border-box;max-width:440px!important;width:100%!important;margin:auto!important;padding:22px 20px 20px!important;border:1px solid #d3e9e1;border-radius:20px;background:#fff!important;box-shadow:0 14px 44px rgba(12,82,73,.11)!important;text-align:center;overflow:visible!important}',
    'html.shared-view .personal-splash-icon{display:inline-flex!important;align-items:center;justify-content:center;width:42px;height:42px;background:#e8f7f2;border-radius:12px;font-size:23px!important;letter-spacing:0!important;margin:0 auto 10px!important;white-space:nowrap!important;overflow:hidden!important}',
    'html.shared-view .personal-splash-hi{font:800 clamp(21px,5vw,26px)/1.2 system-ui!important;letter-spacing:-.4px;color:#214c45!important}',
    'html.shared-view .personal-splash-copy{font:800 clamp(18px,4.5vw,22px)/1.25 system-ui!important;color:#146f63!important;margin:6px 0 0!important}',
    'html.shared-view .personal-splash-sub{font:500 13px/1.45 system-ui!important;color:#61716f!important;margin:8px auto 0!important;max-width:360px!important}',
    'html.shared-view #acSharedAssumptions{box-sizing:border-box!important;margin:16px 0 0!important;padding:0!important;white-space:normal!important;border:none!important;background:transparent!important;color:#294640!important;font:inherit!important;text-align:left!important}',
    '.ac-v254-welcome-assumptions{margin:3px 0 12px;font:500 11px/1.5 system-ui;color:#58716b;text-align:left}',
    '.ac-v254-welcome-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:13px}',
    '.ac-v254-welcome-stats.two{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.ac-v254-welcome-stat{min-width:0;border:1px solid #d6e9e2;border-radius:11px;background:#f4faf7;padding:10px 5px;text-align:center}',
    '.ac-v254-welcome-stat small{display:block;font-size:10px;font-weight:750;color:#627d76;margin-bottom:4px}',
    '.ac-v254-welcome-stat strong{display:block;font-size:15px;line-height:1.2;color:#156c60;font-weight:900;overflow-wrap:anywhere}',
    '.ac-v254-welcome-stat span{display:block;font-size:9px;color:#687a76;margin-top:2px}',
    '.ac-v254-welcome-basket{border-top:1px solid #dcece6;padding:12px 2px 0;margin-top:2px}',
    '.ac-v254-welcome-basket strong{font-size:13px;color:#235f54;line-height:1.35;display:block}',
    '.ac-v254-welcome-basket p{font-size:12px;line-height:1.45;color:#66746f;margin:5px 0 0}',
    '.ac-v254-welcome-vat{display:block;font-size:11px;line-height:1.4;color:#677872;margin:10px 0 0}',
    'html.shared-view .personal-splash-live{display:flex;gap:7px;max-width:none!important;margin:13px auto 0!important;padding:0!important;background:none!important;border:0!important;color:#66817b!important;font:550 11px/1.4 system-ui!important}',
    'html.shared-view .personal-splash-live .live-dot{flex:0 0 auto;width:6px!important;height:6px!important;box-shadow:none!important}',
    'html.shared-view .personal-splash-ok{display:block;width:100%!important;min-height:47px;min-width:0!important;margin:16px 0 0!important;background:#00877b!important;color:#fff!important;border-radius:11px!important;box-shadow:none!important;font:800 15px system-ui!important;cursor:pointer}',
    'html.shared-view .personal-splash-ok:focus-visible{outline:3px solid #e3b33a;outline-offset:3px}',
    // No full-screen loading blocker after the customer opens the calculator.
    'html.shared-view.shared-started #loadingModal{display:none!important}',
    '#acEvShareLoading{display:none;background:#f1faf8;border:1px solid #b9ddd5;border-radius:10px;margin:8px 0;padding:9px 11px;color:#386d65;font:650 11px/1.4 system-ui}',
    'html.shared-view.shared-started #acEvShareLoading{display:block}',
    '#acEvShareLoading[hidden]{display:none!important}',
    '#acEvShareLoading.error{background:#fff8eb;border-color:#f0d8ad;color:#815f28}',
    '@media(max-width:390px){html.shared-view .personal-splash-card{padding:18px 14px!important}.ac-v254-welcome-stat strong{font-size:13px}.ac-v254-welcome-stat{padding:8px 3px}}'
  ].join('');
  doc.head.appendChild(st);
 }
 function setText(selector,value){var x=doc.querySelector(selector);if(x)x.textContent=value}
 function render(data){
  if(!data||!$('personalSplash'))return;
  theme();
  var name=String(data.name||'').trim().replace(/\s+/g,' ').slice(0,80)||'there';
  if($('splashName'))$('splashName').textContent=name;
  if($('welcomeName'))$('welcomeName').textContent=name;
  setText('.personal-splash-icon','⚡');
  setText('.personal-splash-copy','Your personalised UW EV electricity comparison');
  setText('.personal-splash-sub',data.meter?(data.source==='e7'?'Based on your Economy 7 day and night electricity readings.':'Based on your EV tariff day and night electricity readings.'):'Based on the home electricity and EV mileage assumptions supplied.');
  var original=$('acSharedAssumptions');if(original)original.remove();
  var block=e('section');block.id='acSharedAssumptions';
  var stats=e('div','ac-v254-welcome-stats'+(data.meter?'':' two'));
  function stat(label,value,unit){
   var card=e('div','ac-v254-welcome-stat');
   card.appendChild(e('small',null,label));card.appendChild(e('strong',null,value));card.appendChild(e('span',null,unit));stats.appendChild(card);
  }
  if(data.meter){
    stat('🌙 Overnight',fmt(data.night),'kWh/year');
    stat('☀️ Daytime',fmt(data.day),'kWh/year');
    stat('⚡ Total',fmt((Number(data.night)||0)+(Number(data.day)||0)),'kWh/year');
  }else{
    stat('🚙 EV mileage',fmt(data.miles),'miles/year');
    stat('🏠 Home electricity',fmt(data.home),'kWh/year');
  }
  block.appendChild(stats);
  // The customer should see what makes the estimate personalised, without
  // claiming to know a home/car split from meter readings.
  if(data.meter){
    block.appendChild(e('p','ac-v254-welcome-assumptions','These meter readings cover your home and EV together. The tool compares tariffs using this day/night split.'));
  }else{
    var factors=[];
    if(Number(data.efficiency)>0)factors.push('Vehicle: '+Number(data.efficiency).toLocaleString('en-GB',{maximumFractionDigits:2})+' miles/kWh');
    if(data.homeNightPct!==undefined&&data.homeNightPct!==null)factors.push(Number(data.homeNightPct)+'% of household use overnight');
    if(data.awayPct!==undefined&&data.awayPct!==null)factors.push(Number(data.awayPct)+'% of car charging away from home');
    if(factors.length)block.appendChild(e('p','ac-v254-welcome-assumptions','Assumptions: '+factors.join(' · ')+'.'));
  }
  var basket=e('div','ac-v254-welcome-basket');
  var count=Math.max(0,Math.min(2,Number.isFinite(Number(data.tier))?Number(data.tier):2));
  basket.appendChild(e('strong',null,'Based on '+tierLabel(count)+' in the UW basket'));
  basket.appendChild(e('p',null,count===2?
    'UW’s best EV rates are shown for this basket. Other service combinations can be compared in the tool.':
    'Other UW service combinations can be compared in the tool.'));
  block.appendChild(basket);
  var vatZero=Number(data.vat)===0;
  block.appendChild(e('small','ac-v254-welcome-vat',vatZero?
    '0% electricity VAT shown. Switch to 5% in the tool to see the higher annualised estimate.':
    '5% electricity VAT included in this annualised estimate. You can switch to 0% in the tool.'));
  var sub=doc.querySelector('.personal-splash-sub');
  if(sub)sub.insertAdjacentElement('afterend',block);
  var live=doc.querySelector('.personal-splash-live span:last-child');
  if(live)live.textContent='Latest UW tariff rates are checked when you open the tool.';
  var ok=$('personalSplashOk');
  if(ok){ok.textContent='Explore my UW EV options';ok.setAttribute('aria-label','Explore my UW EV options')}
 }
 function status(msg,bad){
  var x=$('acEvShareLoading');
  if(!x){
    var target=doc.querySelector('.hero')||doc.querySelector('.wrap');
    if(!target)return;
    x=e('div');x.id='acEvShareLoading';x.setAttribute('role','status');x.setAttribute('aria-live','polite');
    if(target.parentNode)target.parentNode.insertBefore(x,target);
  }
  if(msg){x.hidden=false;x.textContent=msg;x.classList.toggle('error',!!bad)}
  else{x.hidden=true}
 }
 function beginLoad(){
  theme();
  status('Checking the latest UW electricity rates…',false);
  var done=false;
  function loaded(evt){
    var data=evt&&evt.detail;
    if(data&&data.ev&&Number.isFinite(data.ev.total)){
      done=true;status('',false);doc.removeEventListener('ac:ev-comparison',loaded);
    }
  }
  doc.addEventListener('ac:ev-comparison',loaded);
  if(global.__AC_EV_TRADEOFF&&global.__AC_EV_TRADEOFF.ev&&Number.isFinite(global.__AC_EV_TRADEOFF.ev.total))loaded({detail:global.__AC_EV_TRADEOFF});
  global.setTimeout(function(){
   if(!done){status('The latest UW rates could not be confirmed yet. No prices will be guessed - please retry or contact your UW Partner.',true);
    doc.removeEventListener('ac:ev-comparison',loaded);}
  },20000);
 }
 global.AppointmentCompanionEvSharedIntro={render:render,beginLoad:beginLoad,status:status,tierLabel:tierLabel};
 theme();
 // Even before the cloud snapshot arrives, the fallback icon must never
 // stack the original car/plug/house emojis over the greeting on a phone.
 setText('.personal-splash-icon','⚡');
})(window);
