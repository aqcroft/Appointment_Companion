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

function capture(name){
  var vehicle=activeButton('#vehiclePills .vpill');
  var usage=activeButton('#usagePills button');
  var service=activeButton('#serviceButtons button');
  var period=activeButton('#periodToggle button');
  var stress=activeButton('#stressButtons button');
  var e7Actual=!$('e7ActualWrap').hidden;
  return {
    v:'16B',
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
    st:stress?parseInt(stress.dataset.stress,10)||0:0
  };
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
  if(p.pe)click('#periodToggle button[data-period="'+p.pe+'"]');
}

function startCompanion(payload){
  if(companionStarted)return;
  companionStarted=true;
  document.documentElement.classList.add('shared-started');

  loadScript('v13-ev.js').then(function(){
    if(payload)applyPayload(payload);
    return loadScript('v15-freshness.js');
  }).catch(function(){
    var lm=$('loadingModal');
    if(lm)lm.style.display='none';
    showToast('The EV tool could not be loaded');
  });
}

function makeLink(){
  var name=cleanName($('shareCustomerName').value);
  if(!name){
    $('shareCustomerName').classList.add('error');
    $('shareCustomerName').focus();
    showToast('Add the customer name first');
    return null;
  }
  $('shareCustomerName').classList.remove('error');
  var data=capture(name);
  return location.href.split('#')[0]+'#p='+b64urlEncode(JSON.stringify(data));
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

function shareCurrent(){
  var link=makeLink();
  if(!link)return;
  var name=cleanName($('shareCustomerName').value);
  if(navigator.share){
    navigator.share({title:'UW EV Tariff Companion',text:'Hi '+name+', this EV comparison has been set up for you.',url:link})
      .then(function(){showToast('Personalised link ready')})
      .catch(function(e){if(e&&e.name!=='AbortError')copyText(link).then(function(){showToast('Link copied')})});
  }else{
    copyText(link).then(function(){showToast('Personalised link copied')}).catch(function(){window.prompt('Copy this personalised link:',link)});
  }
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
