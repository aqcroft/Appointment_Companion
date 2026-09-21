(function(){
'use strict';

var $=function(id){return document.getElementById(id)};
var startPayload=null;
var toastTimer=null;
var companionStarted=false;

function numValue(id){
  var el=$(id),v=el?el.value:'';
  if(v===null||v===undefined||v==='')return null;
  var n=parseFloat(v);
  return isNaN(n)?null:n;
}
function activeButton(selector){return document.querySelector(selector+'.on')}
function b64urlEncode(str){
  var b64=btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  var b64=str.replace(/-/g,'+').replace(/_/g,'/');
  while(b64.length%4)b64+='=';
  return decodeURIComponent(escape(atob(b64)));
}
function cleanName(s){return String(s||'').trim().replace(/\s+/g,' ').slice(0,80)}
function safeCarIcon(s){return ['🚗','🚙','🚘','🚐'].indexOf(s)>=0?s:'🚙'}
function safeHttps(value){
  try{var u=new URL(String(value||'').trim());return u.protocol==='https:'?u.href:''}catch(_){return ''}
}
function escapeAttr(value){return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}
function showToast(msg){
  var el=$('shareToast');
  if(!el)return;
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('show')},2300);
}
function trigger(id,type){
  var el=$(id);
  if(!el)return;
  el.dispatchEvent(new Event(type,{bubbles:true}));
}
function click(selector){
  var el=document.querySelector(selector);
  if(el)el.click();
}
function loadScript(src){
  return new Promise(function(resolve,reject){
    var s=document.createElement('script');
    s.src=src;
    s.onload=resolve;
    s.onerror=function(){reject(new Error('Could not load '+src))};
    document.body.appendChild(s);
  });
}

function capture(name,basket){
  var vehicle=activeButton('#vehiclePills .vpill');
  var usage=activeButton('#usagePills button');
  var service=activeButton('#serviceButtons button');
  var period=activeButton('#periodToggle button');
  var stress=activeButton('#stressButtons button');
  var fixJan=activeButton('#fixJanButtons button');
  var e7Actual=!$('e7ActualWrap').hidden;
  var data={
    v:'16C',
    n:cleanName(name),
    ts:new Date().toISOString(),
    um:usage?usage.dataset.use:'medium',
    hk:numValue('houseKwh'),
    mi:numValue('miles'),
    ve:vehicle?parseFloat(vehicle.dataset.eff):3.2,
    vi:vehicle?vehicle.dataset.icon:'🚙',
    ti:service?parseInt(service.dataset.tier,10):2,
    rg:parseInt($('region').value,10)||11,
    ep:numValue('evTimingSlider'),
    e7:numValue('e7TimingSlider'),
    ea:e7Actual,
    ed:e7Actual?numValue('e7DayActualInput'):null,
    en:e7Actual?numValue('e7NightActualInput'):null,
    aw:numValue('awayPct'),
    ar:numValue('awayRate'),
    eo:numValue('effOverride'),
    ke:numValue('knownEvKwh'),
    df:!!$('dualFuel').checked,
    pe:period?period.dataset.period:'month',
    st:stress?parseInt(stress.dataset.stress,10)||0:0,
    hp:$('heatingProfile')?$('heatingProfile').value:'none',
    fj:fixJan?parseFloat(fixJan.dataset.fixjan)||0:24.9
  };
  var safeBasket=safeHttps(basket);
  if(safeBasket)data.b=safeBasket;
  return data;
}

function setInput(id,value,type){
  if(value===undefined)return;
  var el=$(id);
  if(!el)return;
  el.value=(value===null?'':value);
  trigger(id,type||'input');
}

function restoreUsage(p){
  var mode=p.um||'medium';
  if(mode==='custom'){
    document.querySelectorAll('#usagePills button').forEach(function(b){b.classList.toggle('on',b.dataset.use==='custom')});
    $('customWrap').classList.add('show');
    if(p.hk!==null&&p.hk!==undefined)$('houseKwh').value=p.hk;
    if(typeof $('houseKwh').oninput==='function')$('houseKwh').oninput();
  }else{
    var preset=document.querySelector('#usagePills button[data-use="'+mode+'"]');
    if(preset)preset.click();
  }
}

function applyPayload(p){
  if(!p)return;

  var vehicle=document.querySelector('#vehiclePills .vpill[data-eff="'+p.ve+'"]');
  if(!vehicle&&p.vi)vehicle=document.querySelector('#vehiclePills .vpill[data-icon="'+p.vi+'"]');
  if(vehicle)vehicle.click();

  if(p.mi!==null&&p.mi!==undefined)setInput('miles',p.mi,'input');
  restoreUsage(p);

  if(p.ti!==null&&p.ti!==undefined)click('#serviceButtons button[data-tier="'+p.ti+'"]');

  if(p.rg!==null&&p.rg!==undefined){$('region').value=String(p.rg);trigger('region','change')}
  if(p.aw!==undefined)setInput('awayPct',p.aw,'input');
  if(p.ar!==undefined)setInput('awayRate',p.ar,'input');
  if(p.eo!==undefined)setInput('effOverride',p.eo,'input');
  if(p.ke!==undefined)setInput('knownEvKwh',p.ke,'input');
  if(p.df!==undefined){$('dualFuel').checked=!!p.df;trigger('dualFuel','change')}

  if(p.ep!==null&&p.ep!==undefined)setInput('evTimingSlider',p.ep,'input');
  if(p.e7!==null&&p.e7!==undefined)setInput('e7TimingSlider',p.e7,'input');

  if(p.ea){
    if($('e7ActualWrap').hidden)$('e7ActualToggle').click();
    if(p.ed!==null&&p.ed!==undefined){$('e7DayActualInput').value=p.ed;trigger('e7DayActualInput','change')}
    if(p.en!==null&&p.en!==undefined){$('e7NightActualInput').value=p.en;trigger('e7NightActualInput','change')}
  }

  if(p.st!==null&&p.st!==undefined)click('#stressButtons button[data-stress="'+p.st+'"]');
  if(p.hp&&$('heatingProfile')){$('heatingProfile').value=p.hp;trigger('heatingProfile','change')}
  if(p.fj!==null&&p.fj!==undefined)click('#fixJanButtons button[data-fixjan="'+p.fj+'"]');
  if(p.pe)click('#periodToggle button[data-period="'+p.pe+'"]');
}

function startCompanion(payload){
  if(companionStarted)return;
  companionStarted=true;
  document.documentElement.classList.add('shared-started');

  loadScript('tariff-cache-v1.js?v=20260910-feedback1').then(function(){
    return loadScript('v13-ev.js?v=20260921-e7fix1');
  }).then(function(){
    if(payload)applyPayload(payload);
    return loadScript('v16b-hero.js');
  }).then(function(){
    return loadScript('v16c-table.js');
  }).then(function(){
    return loadScript('v15-freshness.js?v=20260910-feedback1');
  }).catch(function(){
    var lm=$('loadingModal');
    if(lm)lm.style.display='none';
    showToast('The EV tool could not be loaded');
  });
}

function makeLink(name,basket){
  name=cleanName(name);
  if(!name)return null;
  window.dispatchEvent(new CustomEvent('ac:ev-share-name',{detail:{name:name}}));
  var data=capture(name,basket);
  var url=new URL(location.href.split('#')[0]);
  url.searchParams.delete('s');
  url.searchParams.delete('ac_launch');
  url.searchParams.delete('ac_return');
  var slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);
  if(slug)url.searchParams.set('for',slug);
  return url.toString()+'#p='+b64urlEncode(JSON.stringify(data));
}

function copyText(text){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function(resolve,reject){
    try{
      var ta=document.createElement('textarea');
      ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      var ok=document.execCommand('copy');document.body.removeChild(ta);
      ok?resolve():reject(new Error('copy failed'));
    }catch(e){reject(e)}
  });
}

function ensureGateStyle(){
  if(document.getElementById('acEvLegacyShareGateStyle'))return;
  var st=document.createElement('style');
  st.id='acEvLegacyShareGateStyle';
  st.textContent='.ac-ev-share-gate{position:fixed;inset:0;z-index:20000;background:rgba(38,22,79,.48);display:flex;align-items:center;justify-content:center;padding:16px}.ac-ev-share-gate-card{width:min(430px,100%);background:#fff;color:#26164f;border-radius:17px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.ac-ev-share-gate-card h3{margin:0 0 5px;font-size:18px}.ac-ev-share-gate-card p{margin:.3rem 0 .8rem;color:#6b6b76;font-size:12px;line-height:1.45}.ac-ev-share-gate-card label{display:block;font-size:11px;font-weight:800;margin:9px 0 5px}.ac-ev-share-gate-card input{width:100%;box-sizing:border-box;border:1.5px solid #e4dfec;border-radius:10px;padding:10px 11px;font:650 12px system-ui;color:#26164f}.ac-ev-share-gate-card .hint{font-size:10px;color:#81788d;margin-top:5px}.ac-ev-share-gate-actions{display:grid;gap:7px;margin-top:13px}.ac-ev-share-gate-actions button{min-height:42px;border:1px solid rgba(122,66,200,.2);border-radius:10px;background:#fff;color:#26164f;font:800 13px system-ui;cursor:pointer}.ac-ev-share-gate-actions button.primary{background:#7a42c8;color:#fff;border-color:#7a42c8}.ac-ev-share-gate-error{min-height:16px;margin-top:5px;color:#a33232;font-size:10px;font-weight:700}';
  document.head.appendChild(st);
}

function chooseShareOptions(){
  ensureGateStyle();
  return new Promise(function(resolve){
    var overlay=document.createElement('div');
    overlay.className='ac-ev-share-gate';
    var existingName=cleanName($('shareCustomerName')&&$('shareCustomerName').value);
    overlay.innerHTML='<div class="ac-ev-share-gate-card" role="dialog" aria-modal="true"><h3>📤 Share personalised EV comparison</h3><p>Add the customer name, then choose whether this is part of a wider UW quote.</p><label for="acEvShareName">Customer name</label><input id="acEvShareName" type="text" autocomplete="off" value="'+escapeAttr(existingName)+'" placeholder="e.g. Richard Sharpe"><label for="acEvShareBasket">UW basket / quote link <span style="font-weight:600">(optional)</span></label><input id="acEvShareBasket" type="url" inputmode="url" placeholder="https://..."><div class="hint">Include the basket when it removes a step for the customer.</div><div class="ac-ev-share-gate-error" id="acEvShareGateError"></div><div class="ac-ev-share-gate-actions"><button type="button" class="primary" data-choice="include">Include basket and share</button><button type="button" data-choice="plain">Share without basket</button><button type="button" data-choice="cancel">Cancel</button></div></div>';
    function done(value){overlay.remove();resolve(value)}
    overlay.addEventListener('click',function(e){
      if(e.target===overlay)return done({cancelled:true});
      var choice=e.target&&e.target.dataset&&e.target.dataset.choice;
      if(!choice)return;
      if(choice==='cancel')return done({cancelled:true});
      var name=cleanName(overlay.querySelector('#acEvShareName').value);
      if(!name){overlay.querySelector('#acEvShareGateError').textContent='Add the customer name first.';overlay.querySelector('#acEvShareName').focus();return}
      if(choice==='plain')return done({cancelled:false,name:name,basket:''});
      var raw=overlay.querySelector('#acEvShareBasket').value.trim();
      var basket=safeHttps(raw);
      if(!basket){overlay.querySelector('#acEvShareGateError').textContent=raw?'Please use a valid https:// basket link.':'Add a basket link, or choose Share without basket.';return}
      done({cancelled:false,name:name,basket:basket});
    });
    document.body.appendChild(overlay);
    setTimeout(function(){var input=overlay.querySelector('#acEvShareName');if(input)input.focus()},0);
  });
}

async function shareCurrent(){
  var choice=await chooseShareOptions();
  if(!choice||choice.cancelled)return;
  if($('shareCustomerName'))$('shareCustomerName').value=choice.name;
  var link=makeLink(choice.name,choice.basket);
  if(!link)return;
  if(navigator.share){
    try{
      await navigator.share({title:'UW EV Tariff Companion',text:'Hi '+choice.name+' - I prepared this EV comparison for you.',url:link});
      showToast('Personalised link ready');
      return;
    }catch(e){
      if(e&&e.name==='AbortError')return;
    }
  }
  copyText(link).then(function(){showToast('Personalised link copied')}).catch(function(){window.prompt('Copy this personalised link:',link)});
}

function prepareShared(raw){
  try{
    var p=JSON.parse(b64urlDecode(raw));
    if(!p||!p.n)throw new Error('Missing customer name');
    startPayload=p;
    var name=cleanName(p.n)||'there';
    $('splashName').textContent=name;
    $('welcomeName').textContent=name;
    $('customerWelcome').hidden=false;

    /* Hand the optional basket to the shared customer contact treatment. */
    window.__AppointmentCompanionEvSharedSnapshot={customer_name:name,basket_url:safeHttps(p.b||'')};
    loadScript('consolidated-v1/ev-customer-contact-v1.js?v=20260916-sharegate2').catch(function(){});

    var splashIcons=document.querySelector('.personal-splash-icon');
    if(splashIcons)splashIcons.textContent=safeCarIcon(p.vi)+'  🔌  🏠';

    $('personalSplashOk').onclick=function(){
      this.disabled=true;
      this.textContent='Loading…';
      startCompanion(startPayload);
      $('personalSplash').classList.add('fade');
      setTimeout(function(){$('personalSplash').style.display='none'},320);
    };

    $('resetSharedBtn').onclick=function(){
      if(companionStarted){applyPayload(startPayload);showToast('Starting figures restored')}
    };
  }catch(e){
    document.documentElement.classList.remove('shared-view');
    $('personalSplash').style.display='none';
    $('customerWelcome').hidden=true;
    showToast('This personalised link could not be read');
    startCompanion(null);
  }
}

$('createShareBtn').addEventListener('click',shareCurrent);
$('shareCustomerName').addEventListener('input',function(){this.classList.remove('error')});
$('shareCustomerName').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();shareCurrent()}});

var hash=location.hash.slice(1);
if(/^p=/.test(hash)){
  prepareShared(hash.slice(2));
}else{
  startCompanion(null);
}

})();