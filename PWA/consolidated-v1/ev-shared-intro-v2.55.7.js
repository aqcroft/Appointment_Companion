/* EV shared welcome v2.55.7.
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
    'html.shared-view{--ev:#7347aa!important;--ev-dark:#38245b!important;--bg:#f9f6fc!important}',
    'html.shared-view body{background:#faf8fd!important;color:#352b43}',
    'html.shared-view .hero{background:linear-gradient(135deg,#8053bb,#453064)!important}',
    'html.shared-view .customer-welcome{background:#f3edfc!important;border-color:#d9caec!important}',
    'html.shared-view .customer-welcome button{color:#593889!important;border-color:#d7c4ed!important}',
    'html.shared-view .hero #serviceButtons button.on{background:#fff!important;color:#3c285c!important}',
    'html.shared-view .ac-ev-vat-switch button.on{background:#7347aa!important;color:#fff!important}',
    'html.shared-view .hero .hero-box{border-color:rgba(255,255,255,.19)!important}',
    'html.shared-view .tablewrap thead th.numh.sel{background:#efe6f9!important;color:#4b2f73!important}',
    'html.shared-view #comparison td.sel{background:#f5eefc!important}',
    'html.shared-view .ac-ev-cta{background:#7448a9!important}',
    'html.shared-view .ac-ev-cta.secondary{background:#fff!important;color:#633e92!important;border-color:#d9caed!important}',
    'html.shared-view .ac-ev-conversion{background:#f6f0fc!important;border-color:#ddcbef!important;color:#4a346d!important}',
    'html.shared-view .ac-ev-conversion h2{color:#432b68!important}',
    'html.shared-view .personal-splash{background:linear-gradient(160deg,#faf8fd,#f2eaf9)!important;padding:16px!important;box-sizing:border-box;overflow-y:auto;align-items:center!important}',
    'html.shared-view .personal-splash-card{box-sizing:border-box;max-width:440px!important;width:100%!important;margin:auto!important;padding:22px 20px 20px!important;border:1px solid #e3d7f0;border-radius:20px;background:#fff!important;box-shadow:0 14px 44px rgba(12,82,73,.11)!important;text-align:center;overflow:visible!important}',
    'html.shared-view .personal-splash-icon{display:inline-flex!important;align-items:center;justify-content:center;width:42px;height:42px;background:#f1e9fa;border-radius:12px;font-size:23px!important;letter-spacing:0!important;margin:0 auto 10px!important;white-space:nowrap!important;overflow:hidden!important}',
    'html.shared-view .personal-splash-hi{font:800 clamp(21px,5vw,26px)/1.2 system-ui!important;letter-spacing:-.4px;color:#422d64!important}',
    'html.shared-view .personal-splash-copy{font:800 clamp(18px,4.5vw,22px)/1.25 system-ui!important;color:#6b429c!important;margin:6px 0 0!important}',
    'html.shared-view .personal-splash-sub{font:500 13px/1.45 system-ui!important;color:#736d7b!important;margin:8px auto 0!important;max-width:360px!important}',
    'html.shared-view #acSharedAssumptions{box-sizing:border-box!important;margin:16px 0 0!important;padding:0!important;white-space:normal!important;border:none!important;background:transparent!important;color:#463555!important;font:inherit!important;text-align:left!important}',
    '.ac-v254-welcome-assumptions{margin:3px 0 12px;font:500 11px/1.5 system-ui;color:#58716b;text-align:left}',
    '.ac-v254-welcome-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:13px}',
    '.ac-v254-welcome-stats.two{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.ac-v254-welcome-stat{min-width:0;border:1px solid #e6dbf1;border-radius:11px;background:#f9f5fd;padding:10px 5px;text-align:center}',
    '.ac-v254-welcome-stat .ac-stat-icon{display:block;font-size:19px;line-height:1.1;margin:1px auto 6px}',
    '.ac-v254-welcome-stat small{display:block;font-size:10px;font-weight:750;color:#746b80;margin-bottom:4px}',
    '.ac-v254-welcome-stat strong{display:block;font-size:15px;line-height:1.2;color:#623a94;font-weight:900;overflow-wrap:anywhere}',
    '.ac-v254-welcome-stat span{display:block;font-size:9px;color:#7b7185;margin-top:2px}',
    '.ac-v254-welcome-basket{border-top:1px solid #e9def1;padding:12px 2px 0;margin-top:2px}',
    '.ac-v254-welcome-basket strong{font-size:13px;color:#4f3474;line-height:1.35;display:block}',
    '.ac-v254-welcome-basket ul{list-style:disc;padding:0 0 0 18px;margin:8px 0 0;text-align:left}',
    '.ac-v254-welcome-basket li{font-size:11px;line-height:1.5;color:#746c7d;margin:5px 0;padding-left:2px}',
    '.ac-v254-welcome-basket li::marker{color:#8a5ec2}',
    '.ac-v254-welcome-vat{display:block;font-size:11px;line-height:1.4;color:#756f7d;margin:10px 0 0}',
    'html.shared-view .personal-splash-live:not(.error){display:none!important}',
    'html.shared-view .personal-splash-live.error{display:flex!important;gap:7px;justify-content:flex-start!important;text-align:left!important;max-width:none!important;margin:10px 0 0!important;padding:0!important;background:none!important;border:0!important;color:#986129!important;font:650 11px/1.4 system-ui!important}',
    'html.shared-view .personal-splash-live .live-dot{flex:0 0 auto;width:6px!important;height:6px!important;box-shadow:none!important}',
    'html.shared-view .personal-splash-ok{display:block;width:100%!important;min-height:47px;min-width:0!important;margin:16px 0 0!important;background:#7347aa!important;color:#fff!important;border-radius:11px!important;box-shadow:none!important;font:800 15px system-ui!important;cursor:pointer}',
    'html.shared-view .personal-splash-ok:focus-visible{outline:3px solid #e3b33a;outline-offset:3px}',
    // No full-screen loading blocker after the customer opens the calculator.
    'html.shared-view.shared-started #loadingModal{display:none!important}',
    '#acEvShareLoading{display:none;background:#f1faf8;border:1px solid #b9ddd5;border-radius:10px;margin:8px 0;padding:9px 11px;color:#386d65;font:650 11px/1.4 system-ui}',
    'html.shared-view.shared-started #acEvShareLoading{display:block}',
    '#acEvShareLoading[hidden]{display:none!important}',
    '#acEvShareLoading.error{background:#fff8eb;border-color:#f0d8ad;color:#815f28}',
    '#acEvShareLoading .ac-ev-retry{margin:8px 0 0;display:block;border:1px solid #b9ddd5;border-radius:8px;background:#fff;color:#006c62;padding:7px 11px;font:750 11px system-ui;cursor:pointer}',
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
  doc.documentElement.dataset.evJourney=data.meter?'existing':'considering';
  setText('.personal-splash-icon',data.meter?'🔌':'🚗');
  setText('.personal-splash-copy','Your personalised UW EV electricity comparison');
  var welcome=doc.querySelector('#customerWelcome small');
  if(welcome)welcome.textContent='Try changing the UW services, exploring possible variable price rises, or comparing a fixed Economy 7 tariff.';
  var source=String(data.usageOrigin||'bill_estimate');
  var isAgreed=['agreed_sources','actual_12m','customer_estimate'].indexOf(source)>=0;
  var meterDescription=isAgreed?
    'Based on annual day and night electricity figures agreed during your review.':
    'Based on Estimated Annual Consumption (kWh) figures from your electricity bill.';
  // Keep the source metadata for the partner, but don't repeat it on the customer's launch card.
  var splashSub=doc.querySelector('.personal-splash-sub');
  if(splashSub){splashSub.textContent='';splashSub.style.setProperty('display','none','important');}
  var original=$('acSharedAssumptions');if(original)original.remove();
  var block=e('section');block.id='acSharedAssumptions';
  var stats=e('div','ac-v254-welcome-stats');
  function stat(symbol,label,value,unit){
   var card=e('div','ac-v254-welcome-stat');
   var image=e('span','ac-stat-icon',symbol);image.setAttribute('aria-hidden','true');card.appendChild(image);
   card.appendChild(e('small',null,label));card.appendChild(e('strong',null,value));card.appendChild(e('span',null,unit));stats.appendChild(card);
  }
  // The same three usage cards are used in both EV situations. Existing
  // owners use the annual day/night figures supplied. Prospective owners
  // combine assumed home use with anticipated charging at home on the EV
  // overnight rate; charging away from home is excluded from the home bill.
  function finiteNonNegative(v){return v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0}
  function usageSplit(d){
    if(d.meter){
      if(!finiteNonNegative(d.day)||!finiteNonNegative(d.night))return null;
      return{day:Number(d.day),night:Number(d.night)};
    }
    if(!finiteNonNegative(d.home)||!finiteNonNegative(d.miles))return null;
    var efficiency=Number(d.efficiency);
    var known=finiteNonNegative(d.knownEvKwh)&&Number(d.knownEvKwh)>0?Number(d.knownEvKwh):null;
    if(known===null&&(!Number.isFinite(efficiency)||efficiency<=0))return null;
    var car=known===null?Number(d.miles)/efficiency:known;
    var away=Number.isFinite(Number(d.awayPct))?Math.max(0,Math.min(100,Number(d.awayPct))):0;
    var homeOff=Number.isFinite(Number(d.homeNightPct))?Math.max(0,Math.min(100,Number(d.homeNightPct))):10;
    return{
      night:Number(d.home)*homeOff/100+car*(1-away/100),
      day:Number(d.home)*(1-homeOff/100)
    };
  }
  var split=usageSplit(data),night=split?Math.round(split.night):null;
  var day=split?Math.round(split.day):null;
  var total=split?night+day:null;
  stat('🌙','Overnight',night===null?'—':fmt(night),'kWh/year');
  stat('☀️','Daytime',day===null?'—':fmt(day),'kWh/year');
  stat('⚡','Total',total===null?'—':fmt(total),'kWh/year');
  block.appendChild(stats);
  var basket=e('div','ac-v254-welcome-basket');
  var count=Math.max(0,Math.min(2,Number.isFinite(Number(data.tier))?Number(data.tier):2));
  basket.appendChild(e('strong',null,'Your comparison starts with:'));
  var bullets=e('ul');
  function bullet(message){bullets.appendChild(e('li',null,message));}
  bullet(count===2?"UW's best EV rates (variable)":"UW's EV rates (variable)");
  bullet(['Energy only','Energy + 1 other UW service','Energy + 2 other UW services'][count]);
  var vatZero=Number(data.vat)===0;
  bullet(vatZero ?
    '0% electricity VAT selected' :
    '5% electricity VAT included');
  basket.appendChild(bullets);
  basket.appendChild(e('p','ac-v254-welcome-vat','Change services, tariffs and VAT inside the tool.'));
  block.appendChild(basket);
  var sub=doc.querySelector('.personal-splash-sub');
  if(sub)sub.insertAdjacentElement('afterend',block);
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
  if(msg){
    x.hidden=false;x.textContent=msg;x.classList.toggle('error',!!bad);
    if(bad){
      var retry=e('button','ac-ev-retry','Retry loading');retry.type='button';
      retry.addEventListener('click',function(){global.location.reload();});
      x.appendChild(retry);
    }
  }else{x.hidden=true}
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
 setText('.personal-splash-icon','🚗');
})(window);
