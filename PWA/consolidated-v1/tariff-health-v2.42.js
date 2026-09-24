/* Appointment Companion v2.42 - compact tariff health light. No polling. */
(function(global){
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var api=global.AppointmentCompanionTariffsV242;
  if(!api) return;

  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function state(){return api.state ? api.state() : {status:'amber'};}
  function colour(s){return s==='green'?'#1d9b50':s==='red'?'#c43b3b':'#d98a00';}
  function label(s){return s==='green'?'Tariff data verified':s==='red'?'Tariff data needs attention':'Tariff data checking / cached';}

  function styles(){
    if(document.getElementById('acTariffHealth242Style'))return;
    var st=document.createElement('style');st.id='acTariffHealth242Style';
    st.textContent=[
      '.ac-tariff-health242{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;margin-left:4px;border:0;background:transparent;cursor:pointer;vertical-align:middle}',
      '.ac-tariff-health242 i{display:block;width:9px;height:9px;border-radius:50%;background:#d98a00;box-shadow:0 0 0 2px rgba(217,138,0,.13)}',
      '.ac-tariff-health242[data-state="green"] i{background:#1d9b50;box-shadow:0 0 0 2px rgba(29,155,80,.13)}',
      '.ac-tariff-health242[data-state="red"] i{background:#c43b3b;box-shadow:0 0 0 2px rgba(196,59,59,.13)}',
      '.ac-tariff-health-modal{display:none;position:fixed;inset:0;z-index:16050;background:rgba(38,22,79,.48);padding:16px;align-items:center;justify-content:center}',
      '.ac-tariff-health-modal.open{display:flex}.ac-tariff-health-card{width:min(430px,100%);background:#fff;color:#26164f;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28)}',
      '.ac-tariff-health-card h3{margin:0 0 5px}.ac-tariff-health-card p{margin:.3rem 0;color:#6b6b76;font-size:12px;line-height:1.4}',
      '.ac-tariff-health-row{display:grid;grid-template-columns:96px 1fr;gap:8px;padding:7px 0;border-bottom:1px solid rgba(122,66,200,.1);font-size:12px}.ac-tariff-health-row b{font-size:11px}',
      '.ac-tariff-health-actions{display:grid;gap:7px;margin-top:12px}.ac-tariff-health-actions button{min-height:40px;border-radius:10px;border:1px solid rgba(122,66,200,.18);background:#fff;color:#26164f;font-weight:800}.ac-tariff-health-actions .primary{background:#7a42c8;color:#fff;border-color:#7a42c8}'
    ].join('');
    document.head.appendChild(st);
  }
  function modal(){
    var m=document.getElementById('acTariffHealth242Modal');
    if(m)return m;
    m=document.createElement('div');m.id='acTariffHealth242Modal';m.className='ac-tariff-health-modal';
    m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-tariff-health-close]'))m.classList.remove('open');});
    document.body.appendChild(m);return m;
  }
  function renderModal(){
    var s=state(),sum=s.summary||{},m=modal();
    var checked=s.checkedAt?new Date(s.checkedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Not yet verified';
    m.innerHTML='<div class="ac-tariff-health-card" role="dialog" aria-modal="true" aria-labelledby="acTariffHealthTitle">'+
      '<h3 id="acTariffHealthTitle"><span style="color:'+colour(s.status)+'">●</span> Tariff health</h3>'+
      '<p><strong>'+esc(label(s.status))+'</strong><br>Companion does not poll for tariff changes. The live feed is checked during its normal tariff load and by the manual refresh below.</p>'+
      '<div class="ac-tariff-health-row"><b>Fixed</b><span>'+esc(sum.fixed||'Checking…')+'</span></div>'+
      '<div class="ac-tariff-health-row"><b>Tracker</b><span>'+esc(sum.tracker||'Checking…')+'</span></div>'+
      '<div class="ac-tariff-health-row"><b>Variable</b><span>'+esc(sum.variable||'Checking…')+'</span></div>'+
      '<div class="ac-tariff-health-row"><b>EV</b><span>'+esc(sum.ev||'Checking…')+'</span></div>'+
      '<p>Last live verification: '+esc(checked)+(s.error?'<br><span style="color:#c43b3b">'+esc(s.error)+'</span>':'')+'</p>'+
      '<div class="ac-tariff-health-actions"><button type="button" class="primary" data-tariff-refresh>↻ Refresh tariff data</button><button type="button" data-tariff-health-close>Close</button></div></div>';
    m.querySelector('[data-tariff-refresh]').addEventListener('click',function(){api.refresh();});
    m.classList.add('open');
  }
  function update(){
    var b=document.getElementById('acTariffHealth242');if(!b)return false;
    var s=state();b.dataset.state=s.status||'amber';b.title=label(s.status);b.setAttribute('aria-label',label(s.status)+'. Tap for details.');return true;
  }
  function install(){
    var version=document.querySelector('.ac-version-mini');if(!version)return false;
    if(document.getElementById('acTariffHealth242'))return update();
    var b=document.createElement('button');b.type='button';b.id='acTariffHealth242';b.className='ac-tariff-health242';b.innerHTML='<i aria-hidden="true"></i>';
    b.addEventListener('click',renderModal);version.insertAdjacentElement('afterend',b);update();return true;
  }
  styles();
  ['checking','verified','changed','error'].forEach(function(n){global.addEventListener('ac:tariffs:'+n,function(){update();});});
  var tries=0,t=setInterval(function(){if(install()||++tries>220)clearInterval(t);},50);
})(window);
